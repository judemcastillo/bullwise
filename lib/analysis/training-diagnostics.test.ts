import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
	AnalysisDatasetFeatureVector,
	AnalysisDatasetRow,
	DailySwingAnalysisDataset,
} from "@/lib/analysis/analysis-dataset.types";
import { diagnoseDailySwingTrainingData } from "@/lib/analysis/training-diagnostics";

const BASE_FEATURES: AnalysisDatasetFeatureVector = {
	direction: "long",
	setupType: "breakout",
	trendRegime: "bullish",
	volatilityRegime: "normal",
	evidenceStrength: "moderate",
	relativeStrength20Percent: 1,
	volumeZScore20: 1,
	planRiskReward: 2,
	momentumRegime: "bullish",
	participationRegime: "normal",
	sma20DistancePercent: 1,
	sma50DistancePercent: 1,
	sma200DistancePercent: 1,
	sma20SlopePercent: 1,
	sma50SlopePercent: 1,
	rsi14: 55,
	macdHistogramPercent: 1,
	atrPercent: 2,
	return5Percent: 1,
	return20Percent: 1,
	return60Percent: 1,
	realizedVolatility20Percent: 18,
	realizedVolatility60Percent: 16,
	volatilityPercentile: 55,
	relativeStrength60Percent: 1,
};

function trainRow(input: {
	id: string;
	instrumentId: string;
	symbol: string;
	signalDay: number;
	resolvedDay: number;
	direction?: "long" | "short";
	triggered: boolean;
	r?: number;
}) {
	const signalAt = new Date(Date.UTC(2020, 0, 1 + input.signalDay)).toISOString();
	const r = input.triggered ? (input.r ?? 0) : null;
	return {
		rowId: input.id,
		instrumentId: input.instrumentId,
		displaySymbol: input.symbol,
		signalAt,
		resolvedAt: new Date(
			Date.UTC(2020, 0, 1 + input.resolvedDay),
		).toISOString(),
		split: "train",
		features: {
			...BASE_FEATURES,
			direction: input.direction ?? "long",
		},
		labels: {
			triggered: input.triggered,
			profitable: input.triggered ? r! > 0 : null,
			netRMultiple: r,
			exitReason: input.triggered
				? "maximum_holding_period"
				: "expired_untriggered",
			targetOneReached: input.triggered ? r! >= 1 : null,
			maximumFavorableExcursionPercent: input.triggered ? Math.max(0, r!) : null,
			maximumAdverseExcursionPercent: input.triggered ? Math.min(0, r!) : null,
		},
	} satisfies AnalysisDatasetRow;
}

function sealedRow(split: "validation" | "test", id: string) {
	const result = {
		...trainRow({
			id,
			instrumentId: `instrument-${split}`,
			symbol: split.toUpperCase(),
			signalDay: 20,
			resolvedDay: 21,
			triggered: true,
			r: 1,
		}),
		split,
	} as AnalysisDatasetRow;
	Object.defineProperties(result, {
		features: {
			get() {
				throw new Error(`${split} features were accessed`);
			},
		},
		labels: {
			get() {
				throw new Error(`${split} labels were accessed`);
			},
		},
	});
	return result;
}

function dataset() {
	const train = [
		trainRow({
			id: "a1",
			instrumentId: "a",
			symbol: "AAA",
			signalDay: 0,
			resolvedDay: 3,
			triggered: true,
			r: 1,
		}),
		trainRow({
			id: "a2",
			instrumentId: "a",
			symbol: "AAA",
			signalDay: 1,
			resolvedDay: 10,
			triggered: true,
			r: 0.5,
		}),
		trainRow({
			id: "a3",
			instrumentId: "a",
			symbol: "AAA",
			signalDay: 4,
			resolvedDay: 5,
			triggered: false,
		}),
		trainRow({
			id: "a4",
			instrumentId: "a",
			symbol: "AAA",
			signalDay: 5,
			resolvedDay: 6,
			triggered: true,
			r: 0.8,
		}),
		trainRow({
			id: "a-short",
			instrumentId: "a",
			symbol: "AAA",
			signalDay: 2,
			resolvedDay: 4,
			direction: "short",
			triggered: true,
			r: -1,
		}),
		trainRow({
			id: "b1",
			instrumentId: "b",
			symbol: "BBB",
			signalDay: 2,
			resolvedDay: 3,
			triggered: true,
			r: 0.4,
		}),
	];
	return {
		datasetVersion: "1.1.0",
		source: {
			kind: "exhaustive_setup_scan",
			universeName: "diagnostic fixture",
		},
		rows: [
			...train,
			sealedRow("validation", "validation"),
			sealedRow("test", "test"),
		],
	} as unknown as DailySwingAnalysisDataset;
}

describe("daily swing train-only target diagnostics", () => {
	it("collapses only signals suppressed by the selected first setup", () => {
		const report = diagnoseDailySwingTrainingData({
			dataset: dataset(),
			generatedAt: new Date("2026-08-19T00:00:00.000Z"),
		});

		assert.equal(report.episodes.rows, 6);
		assert.equal(report.episodes.episodeCount, 4);
		assert.equal(report.episodes.rowsRemovedByFirstSignalSelection, 2);
		assert.equal(report.episodes.multiRowEpisodes, 2);
		assert.equal(report.episodes.maximumRowsPerEpisode, 2);
		assert.equal(report.repeatOutcomeSimilarity.comparisonsToEpisodeFirst, 2);
		assert.equal(report.repeatOutcomeSimilarity.triggerAgreementPercent, 50);
		assert.equal(
			report.repeatOutcomeSimilarity.profitableAgreementPercentWhenBothTriggered,
			100,
		);
		assert.equal(
			report.repeatOutcomeSimilarity.averageAbsoluteRDifferenceWhenBothTriggered,
			0.5,
		);
	});

	it("defines episode-first actionable success without reading non-train data", () => {
		const generatedAt = new Date("2026-08-19T00:00:00.000Z");
		const first = diagnoseDailySwingTrainingData({
			dataset: dataset(),
			generatedAt,
		});
		const second = diagnoseDailySwingTrainingData({
			dataset: dataset(),
			generatedAt,
		});

		assert.deepEqual(first, second);
		assert.equal(first.nonTrainPolicy.validationLabelsRead, false);
		assert.equal(first.nonTrainPolicy.testLabelsRead, false);
		assert.equal(first.targets.actionableRThreshold, 0.5);
		assert.equal(first.targets.rowLevel.actionableSuccesses, 3);
		assert.equal(first.targets.episodeFirst.rows, 4);
		assert.equal(first.targets.episodeFirst.actionableSuccesses, 1);
		assert.equal(first.targets.episodeFirst.averageSetupUtilityR, 0.1);
		assert.equal(
			first.targetDesign.version,
			"episode-first-actionable-success-v1",
		);
	});
});
