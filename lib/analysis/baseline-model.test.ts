import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
	AnalysisDatasetFeatureVector,
	AnalysisDatasetRow,
	DailySwingAnalysisDataset,
} from "@/lib/analysis/analysis-dataset.types";
import { trainDailySwingBaselineModels } from "@/lib/analysis/baseline-model";

function features(x: number, y: number): AnalysisDatasetFeatureVector {
	return {
		direction: "long",
		setupType: x > 0 ? "breakout" : "pullback",
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
		sma20SlopePercent: x / 10,
		sma50SlopePercent: x / 10,
		rsi14: 50 + x,
		macdHistogramPercent: x / 10,
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

function row(
	index: number,
	split: AnalysisDatasetRow["split"],
): AnalysisDatasetRow {
	const x = (((index * 11) % 41) - 20) / 10;
	const y = (((index * 17) % 43) - 21) / 10;
	const triggered = x > 0;
	const profitable = triggered ? y > 0 : null;
	const netRMultiple = triggered ? y + 0.25 * x : null;
	const signalAt = new Date(Date.UTC(2020, 0, 1 + index)).toISOString();
	return {
		rowId: `TEST|${signalAt}`,
		instrumentId: "instrument-test",
		displaySymbol: "TEST",
		signalAt,
		resolvedAt: new Date(Date.UTC(2020, 0, 2 + index)).toISOString(),
		split,
		features: features(x, y),
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

function dataset() {
	const train = Array.from({ length: 400 }, (_, index) => row(index, "train"));
	const validation = Array.from({ length: 160 }, (_, index) =>
		row(index + 400, "validation"),
	);
	const test = Array.from({ length: 40 }, (_, index) => row(index + 560, "test"));
	for (const testRow of test) {
		Object.defineProperty(testRow, "labels", {
			get() {
				throw new Error("sealed test labels were accessed");
			},
		});
	}
	return {
		datasetVersion: "1.1.0",
		source: {
			kind: "exhaustive_setup_scan",
			universeName: "synthetic development",
		},
		rows: [...train, ...validation, ...test],
	} as unknown as DailySwingAnalysisDataset;
}

describe("daily swing baseline model training", () => {
	it("fits useful validation baselines while leaving test labels sealed", () => {
		const input = dataset();
		const report = trainDailySwingBaselineModels({
			dataset: input,
			generatedAt: new Date("2026-08-19T00:00:00.000Z"),
		});

		assert.equal(report.testPolicy.labelsRead, false);
		assert.equal(report.dataset.testRows, 40);
		const expectedTrainMean =
			input.rows
				.filter((item) => item.split === "train")
				.reduce((total, item) => total + item.features.return5Percent, 0) / 400;
		assert.equal(
			report.preprocessing.numeric.find(
				(feature) => feature.name === "return5Percent",
			)?.mean,
			Math.round(expectedTrainMean * 1e8) / 1e8,
		);
		assert.ok((report.validation.trigger.model.rocAuc ?? 0) > 0.95);
		assert.ok(report.validation.trigger.logLossImprovement > 0);
		assert.ok((report.validation.profitability.model.rocAuc ?? 0) > 0.95);
		assert.ok(report.validation.profitability.logLossImprovement > 0);
		assert.ok((report.validation.expectedR.model.rSquared ?? 0) > 0.9);
		assert.ok(report.validation.expectedR.rootMeanSquaredErrorImprovement > 0);
	});

	it("is deterministic and rejects sequential datasets", () => {
		const input = dataset();
		const generatedAt = new Date("2026-08-19T00:00:00.000Z");
		const first = trainDailySwingBaselineModels({ dataset: input, generatedAt });
		const second = trainDailySwingBaselineModels({ dataset: input, generatedAt });
		assert.deepEqual(first, second);

		input.source.kind = "sequential_backtest";
		assert.throws(
			() => trainDailySwingBaselineModels({ dataset: input }),
			/requires an exhaustive setup-scan dataset/,
		);
	});
});
