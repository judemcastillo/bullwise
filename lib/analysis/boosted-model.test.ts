import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
	AnalysisDatasetFeatureVector,
	AnalysisDatasetRow,
	DailySwingAnalysisDataset,
} from "@/lib/analysis/analysis-dataset.types";
import { trainDailySwingBoostedModels } from "@/lib/analysis/boosted-model";

function featureVector(x: number, y: number): AnalysisDatasetFeatureVector {
	return {
		direction: "long",
		setupType: "breakout",
		trendRegime: "bullish",
		volatilityRegime: "normal",
		evidenceStrength: "moderate",
		relativeStrength20Percent: x,
		volumeZScore20: y,
		planRiskReward: 2,
		momentumRegime: "bullish",
		participationRegime: "normal",
		sma20DistancePercent: x,
		sma50DistancePercent: x,
		sma200DistancePercent: x,
		sma20SlopePercent: x,
		sma50SlopePercent: x,
		rsi14: 50 + x,
		macdHistogramPercent: x,
		atrPercent: 2,
		return5Percent: x,
		return20Percent: y,
		return60Percent: x + y,
		realizedVolatility20Percent: 18,
		realizedVolatility60Percent: 16,
		volatilityPercentile: 55,
		relativeStrength60Percent: y,
	};
}

function row(index: number, split: AnalysisDatasetRow["split"]): AnalysisDatasetRow {
	const x = (((index * 11) % 41) - 20) / 10;
	const y = (((index * 17) % 43) - 21) / 10;
	const triggered = Math.abs(x) > 0.8;
	const profitable = triggered ? Math.abs(y) > 0.8 : null;
	const netRMultiple = triggered ? Math.abs(y) - 1 : null;
	const signalAt = new Date(Date.UTC(2018, 0, 1 + index)).toISOString();
	return {
		rowId: `NONLINEAR|${signalAt}`,
		instrumentId: "instrument-nonlinear",
		displaySymbol: "NONLINEAR",
		signalAt,
		resolvedAt: new Date(Date.UTC(2018, 0, 2 + index)).toISOString(),
		split,
		features: featureVector(x, y),
		labels: {
			triggered,
			profitable,
			netRMultiple,
			exitReason: triggered ? "maximum_holding_period" : "expired_untriggered",
			targetOneReached: triggered ? profitable : null,
			maximumFavorableExcursionPercent: triggered ? Math.max(0, y) : null,
			maximumAdverseExcursionPercent: triggered ? Math.min(0, y) : null,
		},
	};
}

function nonlinearDataset() {
	const train = Array.from({ length: 800 }, (_, index) => row(index, "train"));
	const validation = Array.from({ length: 300 }, (_, index) =>
		row(index + 800, "validation"),
	);
	const test = Array.from({ length: 100 }, (_, index) => row(index + 1100, "test"));
	for (const testRow of test) {
		Object.defineProperties(testRow, {
			features: {
				get() {
					throw new Error("sealed test features were accessed");
				},
			},
			labels: {
				get() {
					throw new Error("sealed test labels were accessed");
				},
			},
		});
	}
	return {
		datasetVersion: "1.1.0",
		source: {
			kind: "exhaustive_setup_scan",
			universeName: "synthetic nonlinear development",
		},
		rows: [...train, ...validation, ...test],
	} as unknown as DailySwingAnalysisDataset;
}

describe("daily swing boosted model training", () => {
	it("learns nonlinear validation structure while keeping test data sealed", () => {
		const report = trainDailySwingBoostedModels({
			dataset: nonlinearDataset(),
			generatedAt: new Date("2026-08-19T00:00:00.000Z"),
		});

		assert.equal(report.testPolicy.labelsRead, false);
		assert.equal(report.dataset.testRows, 100);
		assert.ok((report.validation.trigger.model.rocAuc ?? 0) > 0.8);
		assert.ok((report.validation.profitability.model.rocAuc ?? 0) > 0.8);
		assert.ok((report.validation.expectedR.model.rSquared ?? 0) > 0.5);
		assert.equal(report.developmentGate.passed, true);
	});

	it("is deterministic for a frozen configuration", () => {
		const input = nonlinearDataset();
		const generatedAt = new Date("2026-08-19T00:00:00.000Z");
		const first = trainDailySwingBoostedModels({ dataset: input, generatedAt });
		const second = trainDailySwingBoostedModels({ dataset: input, generatedAt });
		assert.deepEqual(first, second);
	});
});
