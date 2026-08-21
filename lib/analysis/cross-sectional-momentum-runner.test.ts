import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ETF_CROSS_SECTIONAL_MOMENTUM_DEVELOPMENT_PROTOCOL } from "@/lib/analysis/cross-sectional-momentum-development";
import {
	momentumCandidateAt,
	momentumFormationSchedule,
	runEtfCrossSectionalMomentumDevelopment,
	selectMomentumSleevesAt,
	type MomentumBar,
	type MomentumInstrumentHistory,
} from "@/lib/analysis/cross-sectional-momentum-runner";

const PROTOCOL = ETF_CROSS_SECTIONAL_MOMENTUM_DEVELOPMENT_PROTOCOL;

function fixtureBars(dailyReturn: number): MomentumBar[] {
	const bars: MomentumBar[] = [];
	let price = 100;
	for (
		let at = Date.parse("2018-01-01T00:00:00.000Z");
		at < Date.parse(PROTOCOL.dataAccess.portfolioEndsBefore);
		at += 86_400_000
	) {
		const day = new Date(at).getUTCDay();
		if (day === 0 || day === 6) continue;
		price *= 1 + dailyReturn;
		bars.push({
			startedAt: new Date(at).toISOString(),
			open: price * 0.999,
			close: price,
			volume: 2_000_000,
		});
	}
	return bars;
}

function fixtureUniverse(): MomentumInstrumentHistory[] {
	return Array.from(
		{ length: PROTOCOL.universe.expectedEligibleInstruments },
		(_, index) => {
			const sleeve = PROTOCOL.universe.sleeves[index % PROTOCOL.universe.sleeves.length];
			return {
				instrumentId: `fixture:${index.toString().padStart(3, "0")}`,
				displaySymbol: `F${index.toString().padStart(3, "0")}`,
				sourceScan: index % 3 === 0 ? "expansion" : "base",
				sourceCategory: sleeve.sourceCategories[0],
				sleeveId: sleeve.sleeveId,
				bars: fixtureBars(0.00005 + (index % 11) * 0.000002),
			};
		},
	);
}

describe("ETF cross-sectional momentum evaluator", () => {
	it("uses the final completed benchmark session in every frozen formation month", () => {
		const benchmark = { displaySymbol: "SPY" as const, bars: fixtureBars(0.00008) };
		const schedule = momentumFormationSchedule(benchmark);
		assert.equal(schedule.length, 36);
		for (const signalAt of schedule) {
			const month = signalAt.slice(0, 7);
			const inMonth = benchmark.bars.filter((bar) => bar.startedAt.startsWith(month));
			assert.equal(signalAt, inMonth.at(-1)!.startedAt);
		}
	});

	it("uses only bars available through the completed signal session", () => {
		const bars = fixtureBars(0.0002);
		const signalIndex = 500;
		const signalAt = bars[signalIndex].startedAt;
		const instrument: MomentumInstrumentHistory = {
			instrumentId: "fixture:no-lookahead",
			displaySymbol: "SAFE",
			sourceScan: "base",
			sourceCategory: "base:us_style",
			sleeveId: "us_broad_style_factor",
			bars,
		};
		const before = momentumCandidateAt({ instrument, signalAt, targetNotional: 24_750 });
		const changedFuture = {
			...instrument,
			bars: bars.map((bar, index) =>
				index > signalIndex ? { ...bar, close: bar.close * 100 } : bar,
			),
		};
		const after = momentumCandidateAt({
			instrument: changedFuture,
			signalAt,
			targetNotional: 24_750,
		});
		assert.deepEqual(after, before);
		assert.equal(before.available, true);
		assert.equal(before.eligible, true);
	});

	it("ranks within sleeves and breaks exact ties by display symbol", () => {
		const bars = fixtureBars(0.0002);
		const signalAt = bars[500].startedAt;
		const executionAt = bars[501].startedAt;
		const make = (instrumentId: string, displaySymbol: string) => ({
			instrumentId,
			displaySymbol,
			sourceScan: "base" as const,
			sourceCategory: "base:us_style",
			sleeveId: "us_broad_style_factor" as const,
			bars,
		});
		const decision = selectMomentumSleevesAt({
			instruments: [make("fixture:z", "ZZZ"), make("fixture:a", "AAA")],
			signalAt,
			executionAt,
			equity: 100_000,
		});
		assert.equal(
			decision.selectedInstrumentIds.us_broad_style_factor,
			"fixture:a",
		);
		assert.equal(decision.availableCandidates.us_broad_style_factor, 2);
	});

	it("produces deterministic aggregate-only shared-capital evidence", () => {
		const instruments = fixtureUniverse();
		const benchmark = { displaySymbol: "SPY" as const, bars: fixtureBars(0.00008) };
		const input = {
			instruments,
			benchmark,
			baseHistorySha256: PROTOCOL.sources.baseHistory.sha256,
			expansionHistorySha256: PROTOCOL.sources.expansionHistory.sha256,
			rejectedSymmetricReport: {
				decision: { status: PROTOCOL.sources.rejectedSymmetricStrategy.decision },
			},
			rejectedSymmetricReportSha256:
				PROTOCOL.sources.rejectedSymmetricStrategy.sha256,
			generatedAt: new Date("2026-08-21T00:00:00.000Z"),
		};
		const report = runEtfCrossSectionalMomentumDevelopment(input);
		const repeated = runEtfCrossSectionalMomentumDevelopment(input);
		assert.deepEqual(repeated, report);
		assert.equal(report.base.monthlyHoldingPeriods, 36);
		assert.equal(report.base.monthsWithAnyInvestment, 36);
		assert.equal(report.cohorts.length, 6);
		assert.equal(report.gates.length, 13);
		assert.equal(report.benchmarks.staticSleeves.monthlyHoldingPeriods, 36);
		assert.equal(report.benchmarks.spyBuyAndHold.monthlyHoldingPeriods, 36);
		assert.ok(report.stress.endingEquity < report.base.endingEquity);
		assert.equal(report.dataAccess.validationFeaturesRead, false);
		assert.equal(report.dataAccess.validationLabelsRead, false);
		assert.equal(report.dataAccess.testFeaturesRead, false);
		assert.equal(report.dataAccess.testLabelsRead, false);
		const serialized = JSON.stringify(report);
		assert.doesNotMatch(serialized, /fixture:\d/);
		assert.doesNotMatch(serialized, /"selectedIds"|"displaySymbol"|"instrumentId"/);
	});

	it("fails closed before evaluation when a frozen checksum differs", () => {
		assert.throws(
			() =>
				runEtfCrossSectionalMomentumDevelopment({
					instruments: [],
					benchmark: { displaySymbol: "SPY", bars: [] },
					baseHistorySha256: "0".repeat(64),
					expansionHistorySha256: PROTOCOL.sources.expansionHistory.sha256,
					rejectedSymmetricReport: {},
					rejectedSymmetricReportSha256:
						PROTOCOL.sources.rejectedSymmetricStrategy.sha256,
				}),
			/Base history checksum does not match/,
		);
	});
});
