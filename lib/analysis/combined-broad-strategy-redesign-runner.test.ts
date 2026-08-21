import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { DailySwingCombinedBroadDataset } from "@/lib/analysis/combined-broad-dataset.types";
import {
	benchmarkRiskAt,
	runDailySwingCombinedBroadStrategyRedesign,
} from "@/lib/analysis/combined-broad-strategy-redesign-runner";
import { DAILY_SWING_COMBINED_BROAD_STRATEGY_REDESIGN_PROTOCOL } from "@/lib/analysis/combined-broad-strategy-redesign";

function dateAt(day: number) {
	return new Date(Date.UTC(2018, 0, 1 + day, 5)).toISOString();
}

function benchmark(direction: "up" | "down" = "up") {
	return {
		providerSymbol: "SPY",
		interval: "1d",
		adjusted: true,
		bars: Array.from({ length: 1_826 }, (_, index) => ({
			startedAt: dateAt(index),
			close: direction === "up" ? 100 + index * 0.1 : 300 - index * 0.1,
		})),
	};
}

function syntheticDataset() {
	const years = [2020, 2021, 2022] as const;
	const rows = years.flatMap((year) =>
		Array.from({ length: 200 }, (_, index) => {
			const positive = index % 10 < 6;
			return {
				rowId: `${year}-${index}`,
				instrumentId: `fixture:${year}:${index}`,
				displaySymbol: `F${index}`,
				sourceScan: index % 2 === 0 ? ("base" as const) : ("expansion" as const),
				signalAt: `${year}-06-01T05:00:00.000Z`,
				resolvedAt: `${year}-06-02T05:00:00.000Z`,
				features: {
					direction: "long" as const,
					setupType: index % 2 === 0 ? ("breakout" as const) : ("pullback" as const),
				},
				labels: {
					triggered: true,
					profitable: positive,
					netRMultiple: positive ? 1 : -1,
					exitReason: positive ? ("target_2" as const) : ("stop_loss" as const),
					targetOneReached: positive,
					maximumFavorableExcursionPercent: positive ? 2 : 0,
					maximumAdverseExcursionPercent: positive ? 0 : -1,
				},
				split: "train" as const,
			};
		}),
	);
	return {
		datasetVersion: "3.0.0",
		rows,
		splits: {
			train: { rows: rows.length },
			validation: { rows: 10 },
			test: { rows: 10 },
		},
	} as unknown as DailySwingCombinedBroadDataset;
}

function run(dataset = syntheticDataset()) {
	const protocol = DAILY_SWING_COMBINED_BROAD_STRATEGY_REDESIGN_PROTOCOL;
	return runDailySwingCombinedBroadStrategyRedesign({
		dataset,
		datasetSha256: protocol.sources.combinedDataset.sha256,
		baseBenchmark: benchmark(),
		baseHistorySha256: protocol.sources.baseHistory.sha256,
		expansionBenchmark: benchmark(),
		expansionHistorySha256: protocol.sources.expansionHistory.sha256,
		rejectedAudit: { decision: { status: "redesign_strategy_mechanics" } },
		rejectedAuditSha256: protocol.sources.rejectedStrategyAudit.sha256,
		generatedAt: new Date("2026-08-21T12:00:00.000Z"),
	});
}

describe("combined broad strategy redesign runner", () => {
	it("applies the completed-bar SPY regime rule", () => {
		const signalAt = "2022-12-01T05:00:00.000Z";
		const riskOn = benchmarkRiskAt(benchmark(), signalAt);
		const riskOff = benchmarkRiskAt(benchmark("down"), signalAt);
		assert.equal(riskOn.eligible, true);
		assert.equal(riskOn.reason, "risk_on");
		assert.equal(riskOff.eligible, false);
		assert.equal(riskOff.reason, "risk_filter_failed");
	});

	it("passes only when all nine frozen train gates pass", () => {
		const report = run();
		assert.equal(report.generatedAt, "2026-08-21T12:00:00.000Z");
		assert.equal(report.overall.rows, 600);
		assert.equal(report.overall.averageSetupUtilityR, 0.2);
		assert.equal(report.gates.length, 9);
		assert.equal(report.gates[0].passed, false);
		assert.equal(report.decision.passed, false);
		assert.equal(report.decision.authorizesValidationAccess, false);
		assert.equal(report.decision.authorizesProductSignals, false);
		assert.equal(report.dataAccess.validationFeaturesRead, false);
		assert.equal(report.dataAccess.testLabelsRead, false);
		assert.ok(report.cohorts.every((cohort) => !("symbol" in cohort)));
	});

	it("fails closed for checksum and rejected-audit drift", () => {
		const protocol = DAILY_SWING_COMBINED_BROAD_STRATEGY_REDESIGN_PROTOCOL;
		assert.throws(
			() =>
				runDailySwingCombinedBroadStrategyRedesign({
					dataset: syntheticDataset(),
					datasetSha256: "changed",
					baseBenchmark: benchmark(),
					baseHistorySha256: protocol.sources.baseHistory.sha256,
					expansionBenchmark: benchmark(),
					expansionHistorySha256: protocol.sources.expansionHistory.sha256,
					rejectedAudit: { decision: { status: "redesign_strategy_mechanics" } },
					rejectedAuditSha256: protocol.sources.rejectedStrategyAudit.sha256,
				}),
			/checksum does not match/,
		);
		assert.throws(
			() =>
				runDailySwingCombinedBroadStrategyRedesign({
					dataset: syntheticDataset(),
					datasetSha256: protocol.sources.combinedDataset.sha256,
					baseBenchmark: benchmark(),
					baseHistorySha256: protocol.sources.baseHistory.sha256,
					expansionBenchmark: benchmark(),
					expansionHistorySha256: protocol.sources.expansionHistory.sha256,
					rejectedAudit: { decision: { status: "unexpected" } },
					rejectedAuditSha256: protocol.sources.rejectedStrategyAudit.sha256,
				}),
			/frozen rejection decision/,
		);
	});
});
