import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { RISK_CONTROLLED_MOMENTUM_V3_PROTOCOL } from "@/lib/analysis/risk-controlled-momentum-v3-development";
import {
	RISK_CONTROLLED_MOMENTUM_V2_SLEEVES,
	RISK_CONTROLLED_MOMENTUM_V2_SYMBOLS,
} from "@/lib/analysis/risk-controlled-momentum-v2-universe";
import {
	riskControlledMomentumCandidateAt,
	riskControlledMomentumFormationSchedule,
	riskControlledMomentumMultiplier,
	runRiskControlledMomentumV3Development,
	selectRiskControlledMomentumSleevesAt,
	type RiskControlledMomentumBar,
	type RiskControlledMomentumInstrumentHistory,
} from "@/lib/analysis/risk-controlled-momentum-v3-runner";

const PROTOCOL = RISK_CONTROLLED_MOMENTUM_V3_PROTOCOL;

function fixtureBars(offset = 0): RiskControlledMomentumBar[] {
	const bars: RiskControlledMomentumBar[] = [];
	let price = 100 + offset;
	let session = 0;
	for (
		let at = Date.parse("2007-01-01T00:00:00.000Z");
		at < Date.parse(PROTOCOL.dataAccess.portfolioEndsBefore);
		at += 86_400_000
	) {
		const day = new Date(at).getUTCDay();
		if (day === 0 || day === 6) continue;
		const dailyReturn = 0.00018 + Math.sin((session + offset) / 7) * 0.0015;
		price *= 1 + dailyReturn;
		bars.push({
			startedAt: new Date(at).toISOString(),
			open: price * (1 - Math.cos((session + offset) / 5) * 0.0002),
			close: price,
			volume: 5_000_000,
		});
		session += 1;
	}
	return bars;
}

function fixtureUniverse(): RiskControlledMomentumInstrumentHistory[] {
	const membership = new Map(
		RISK_CONTROLLED_MOMENTUM_V2_SLEEVES.flatMap((sleeve) =>
			sleeve.candidates.map((candidate) => [candidate.symbol, sleeve.sleeveId] as const),
		),
	);
	return RISK_CONTROLLED_MOMENTUM_V2_SYMBOLS.map((symbol, index) => ({
		instrumentId: `fixture:${symbol.toLowerCase()}`,
		displaySymbol: symbol,
		sleeveId: membership.get(symbol)!,
		bars: fixtureBars(index),
	}));
}

describe("risk-controlled momentum v3 evaluator", () => {
	it("freezes 84 month-end formation sessions", () => {
		const benchmark = { displaySymbol: "SPY" as const, bars: fixtureBars() };
		const schedule = riskControlledMomentumFormationSchedule(benchmark);
		assert.equal(schedule.length, 84);
		for (const signalAt of schedule) {
			const inMonth = benchmark.bars.filter((bar) =>
				bar.startedAt.startsWith(signalAt.slice(0, 7)),
			);
			assert.equal(signalAt, inMonth.at(-1)!.startedAt);
		}
	});

	it("uses no bars after the completed signal session", () => {
		const bars = fixtureBars();
		const signalIndex = 600;
		const signalAt = bars[signalIndex].startedAt;
		const instrument: RiskControlledMomentumInstrumentHistory = {
			instrumentId: "fixture:ijk",
			displaySymbol: "IJK",
			sleeveId: "us_broad_style_factor",
			bars,
		};
		const before = riskControlledMomentumCandidateAt({
			instrument,
			signalAt,
			targetNotional: 24_750,
		});
		const after = riskControlledMomentumCandidateAt({
			instrument: {
				...instrument,
				bars: bars.map((bar, index) =>
					index > signalIndex ? { ...bar, close: bar.close * 100 } : bar,
				),
			},
			signalAt,
			targetNotional: 24_750,
		});
		assert.deepEqual(after, before);
		assert.equal(before.available, true);
	});

	it("ranks only within sleeves and applies the symbol tie breaker", () => {
		const bars = fixtureBars();
		const signalAt = bars[600].startedAt;
		const executionAt = bars[601].startedAt;
		const make = (instrumentId: string, displaySymbol: string) => ({
			instrumentId,
			displaySymbol,
			sleeveId: "us_broad_style_factor" as const,
			bars,
		});
		const result = selectRiskControlledMomentumSleevesAt({
			instruments: [make("fixture:z", "ZZZ"), make("fixture:a", "AAA")],
			signalAt,
			executionAt,
			equity: 100_000,
		});
		assert.equal(result.selectedInstrumentIds.us_broad_style_factor, "fixture:a");
		assert.equal(result.availableCandidates.us_broad_style_factor, 2);
	});

	it("changes winners only from completed formation data", () => {
		const firstBars = fixtureBars();
		const secondBars = fixtureBars();
		const firstSignalIndex = 600;
		const secondSignalIndex = 900;
		firstBars[firstSignalIndex - 21] = {
			...firstBars[firstSignalIndex - 21],
			close: firstBars[firstSignalIndex - 21].close * 2,
		};
		secondBars[secondSignalIndex - 21] = {
			...secondBars[secondSignalIndex - 21],
			close: secondBars[secondSignalIndex - 21].close * 3,
		};
		const instruments = [
			{
				instrumentId: "fixture:ijk",
				displaySymbol: "IJK",
				sleeveId: "us_broad_style_factor" as const,
				bars: firstBars,
			},
			{
				instrumentId: "fixture:ijj",
				displaySymbol: "IJJ",
				sleeveId: "us_broad_style_factor" as const,
				bars: secondBars,
			},
		];
		const first = selectRiskControlledMomentumSleevesAt({
			instruments,
			signalAt: firstBars[firstSignalIndex].startedAt,
			executionAt: firstBars[firstSignalIndex + 1].startedAt,
			equity: 100_000,
		});
		const second = selectRiskControlledMomentumSleevesAt({
			instruments,
			signalAt: firstBars[secondSignalIndex].startedAt,
			executionAt: firstBars[secondSignalIndex + 1].startedAt,
			equity: 100_000,
		});
		assert.equal(first.selectedInstrumentIds.us_broad_style_factor, "fixture:ijk");
		assert.equal(second.selectedInstrumentIds.us_broad_style_factor, "fixture:ijj");
	});

	it("uses the frozen sample-covariance volatility multiplier", () => {
		assert.equal(riskControlledMomentumMultiplier([]), 0);
		assert.equal(riskControlledMomentumMultiplier([[0.01, -0.01]]), 0);
		assert.equal(riskControlledMomentumMultiplier([Array(19).fill(0)]), 0);
		const alternating = Array.from({ length: 19 }, (_, index) =>
			index % 2 === 0 ? 0.03 : -0.03,
		);
		const multiplier = riskControlledMomentumMultiplier([
			alternating,
			alternating,
		]);
		assert.ok(multiplier > 0);
		assert.ok(multiplier < 1);
	});

	it("produces deterministic aggregate-only evidence and all comparators", () => {
		const input = {
			instruments: fixtureUniverse(),
			benchmark: { displaySymbol: "SPY" as const, bars: fixtureBars(2) },
			historySha256: PROTOCOL.sources.history.sha256,
			generatedAt: new Date("2026-08-21T12:00:00.000Z"),
		};
		const report = runRiskControlledMomentumV3Development(input);
		const repeated = runRiskControlledMomentumV3Development(input);
		assert.deepEqual(repeated, report);
		assert.equal(report.base.monthlyHoldingPeriods, 84);
		assert.equal(report.inputs.coverageEligibleInstruments, 48);
		assert.equal(report.coverage.bySleeve.length, 4);
		assert.equal(report.selectionBySleeve.length, 4);
		assert.equal(report.gates.length, 19);
		assert.ok(report.riskMultiplierSummary.observations > 1_000);
		assert.ok(report.riskMultiplierSummary.maximum <= 1);
		assert.ok(report.stress.endingEquity < report.base.endingEquity);
		assert.ok(report.base.annualizedOneWayTurnoverPercent > 0);
		assert.equal(report.comparators.unscaledMomentum.monthlyHoldingPeriods, 84);
		assert.equal(report.comparators.staticSleeves.monthlyHoldingPeriods, 84);
		assert.equal(report.comparators.spyBuyAndHold.monthlyHoldingPeriods, 84);
		assert.equal(report.dataAccess.protected2016PlusDataRead, false);
		assert.deepEqual(
			new Set(Object.keys(report.actuals)),
			new Set(PROTOCOL.developmentGates.map((gate) => gate.metric)),
		);
		const serialized = JSON.stringify(report);
		assert.doesNotMatch(serialized, /"instrumentId"|"displaySymbol"|"selectedIds"/);
		for (const symbol of RISK_CONTROLLED_MOMENTUM_V2_SYMBOLS) {
			assert.doesNotMatch(serialized, new RegExp(`"${symbol}"`));
		}
	});

	it("does not execute a new monthly decision on the signal-day open", () => {
		const instruments = fixtureUniverse();
		const benchmark = { displaySymbol: "SPY" as const, bars: fixtureBars(2) };
		const signalAt = riskControlledMomentumFormationSchedule(benchmark)[0];
		const input = {
			instruments,
			benchmark,
			historySha256: PROTOCOL.sources.history.sha256,
			generatedAt: new Date("2026-08-21T12:00:00.000Z"),
		};
		const before = runRiskControlledMomentumV3Development(input);
		const changed = instruments.map((instrument) => ({
			...instrument,
			bars: instrument.bars.map((bar) =>
				bar.startedAt === signalAt ? { ...bar, open: bar.open * 50 } : bar,
			),
		}));
		const after = runRiskControlledMomentumV3Development({ ...input, instruments: changed });
		assert.deepEqual(after, before);
	});

	it("applies the frozen outcome-blind coverage rule without replacement", () => {
		const instruments = fixtureUniverse();
		instruments[0] = { ...instruments[0], bars: instruments[0].bars.slice(-1_999) };
		const report = runRiskControlledMomentumV3Development({
			instruments,
			benchmark: { displaySymbol: "SPY", bars: fixtureBars(2) },
			historySha256: PROTOCOL.sources.history.sha256,
			generatedAt: new Date("2026-08-21T12:00:00.000Z"),
		});
		assert.equal(report.inputs.coverageEligibleInstruments, 47);
		assert.equal(report.actuals.coverage_eligible_instruments, 47);
		assert.equal(report.actuals.minimum_coverage_eligible_per_sleeve, 11);
	});

	it("fails on checksum drift before reading input rows", () => {
		assert.throws(
			() =>
				runRiskControlledMomentumV3Development({
					instruments: [],
					benchmark: { displaySymbol: "SPY", bars: [] },
					historySha256: "0".repeat(64),
				}),
			/Tiingo history checksum does not match/,
		);
	});
});
