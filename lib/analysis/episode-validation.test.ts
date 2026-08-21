import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
	AnalysisDatasetFeatureVector,
	AnalysisDatasetRow,
	AnalysisDatasetSplit,
	DailySwingAnalysisDataset,
} from "@/lib/analysis/analysis-dataset.types";
import { buildDailySwingEpisodeTrainingDataset } from "@/lib/analysis/episode-dataset";
import { preregisterDailySwingEpisodeExperiment } from "@/lib/analysis/episode-experiment";
import type { DailySwingEpisodeExperimentPreregistration } from "@/lib/analysis/episode-experiment.types";
import { evaluateDailySwingEpisodeValidation } from "@/lib/analysis/episode-validation";

const SOURCE_SHA = "a".repeat(64);
const TRAINING_SHA = "b".repeat(64);
const PREREGISTRATION_SHA = "c".repeat(64);

function features(x: number): AnalysisDatasetFeatureVector {
	return {
		direction: "long",
		setupType: x >= 0.6 ? "breakout" : "pullback",
		trendRegime: "bullish",
		volatilityRegime: "normal",
		evidenceStrength: x >= 0.6 ? "strong" : "weak",
		relativeStrength20Percent: x,
		volumeZScore20: x,
		planRiskReward: 1.5 + x,
		momentumRegime: x >= 0.6 ? "bullish" : "mixed",
		participationRegime: x >= 0.6 ? "strong" : "weak",
		sma20DistancePercent: x,
		sma50DistancePercent: x,
		sma200DistancePercent: x,
		sma20SlopePercent: x,
		sma50SlopePercent: x,
		rsi14: 40 + x * 30,
		macdHistogramPercent: x,
		atrPercent: 2 - x,
		return5Percent: x,
		return20Percent: x,
		return60Percent: x,
		realizedVolatility20Percent: 20 - x,
		realizedVolatility60Percent: 18 - x,
		volatilityPercentile: 50 - x,
		relativeStrength60Percent: x,
	};
}

function row(
	index: number,
	split: AnalysisDatasetSplit,
): AnalysisDatasetRow {
	const x = (index % 100) / 100;
	const actionableSuccess = x >= 0.6;
	const signalAt = new Date(Date.UTC(2020, 0, 1 + index)).toISOString();
	return {
		rowId: `${split}-${index}`,
		instrumentId: "synthetic-instrument",
		displaySymbol: "SYN",
		signalAt,
		resolvedAt: signalAt,
		split,
		features: features(x),
		labels: {
			triggered: actionableSuccess,
			profitable: actionableSuccess ? true : null,
			netRMultiple: actionableSuccess ? 1 : null,
			exitReason: actionableSuccess
				? "target_2"
				: "expired_untriggered",
			targetOneReached: actionableSuccess ? true : null,
			maximumFavorableExcursionPercent: actionableSuccess ? 2 : null,
			maximumAdverseExcursionPercent: actionableSuccess ? -0.25 : null,
		},
	};
}

function sealRows(
	rows: AnalysisDatasetRow[],
	message: string,
	options: { features?: boolean; labels?: boolean } = {
		features: true,
		labels: true,
	},
) {
	for (const item of rows) {
		if (options.features) {
			Object.defineProperty(item, "features", {
				get() {
					throw new Error(`${message} features were accessed`);
				},
			});
		}
		if (options.labels) {
			Object.defineProperty(item, "labels", {
				get() {
					throw new Error(`${message} labels were accessed`);
				},
			});
		}
	}
}

function fixture() {
	const train = Array.from({ length: 240 }, (_, index) => row(index, "train"));
	const validation = Array.from({ length: 240 }, (_, index) =>
		row(index + 400, "validation"),
	);
	const test = Array.from({ length: 20 }, (_, index) =>
		row(index + 800, "test"),
	);
	const sourceDataset = {
		datasetVersion: "1.1.0",
		source: {
			kind: "exhaustive_setup_scan",
			universeName: "synthetic episode validation",
		},
		rows: [...train, ...validation, ...test],
	} as unknown as DailySwingAnalysisDataset;
	const trainingDataset = buildDailySwingEpisodeTrainingDataset({
		dataset: sourceDataset,
		datasetSha256: SOURCE_SHA,
		generatedAt: new Date("2026-08-19T00:00:00.000Z"),
	});
	const preregistration = preregisterDailySwingEpisodeExperiment({
		dataset: trainingDataset,
		datasetSha256: TRAINING_SHA,
		registeredAt: new Date("2026-08-19T01:00:00.000Z"),
	});
	sealRows(train, "source train");
	sealRows(test, "test");
	return { sourceDataset, trainingDataset, preregistration, validation };
}

function evaluate(input: ReturnType<typeof fixture>) {
	return evaluateDailySwingEpisodeValidation({
		sourceDataset: input.sourceDataset,
		sourceDatasetSha256: SOURCE_SHA,
		trainingDataset: input.trainingDataset,
		trainingDatasetSha256: TRAINING_SHA,
		preregistration: input.preregistration,
		preregistrationSha256: PREREGISTRATION_SHA,
		generatedAt: new Date("2026-08-19T02:00:00.000Z"),
	});
}

describe("daily swing episode validation evaluator", () => {
	it("executes the frozen gates on synthetic validation while train source and test stay sealed", () => {
		const report = evaluate(fixture());

		assert.equal(report.datasets.training.episodeRows, 240);
		assert.equal(report.validation.allEpisodes.rows, 240);
		assert.equal(report.selection.nearestRank, 168);
		assert.equal(report.configuration.iterations, 600);
		assert.equal(report.configuration.learningRate, 0.03);
		assert.equal(report.configuration.l2Penalty, 0.01);
		assert.equal(report.model.target, "actionable_success");
		assert.equal(report.developmentGate.criteria.length, 9);
		assert.ok((report.validation.classification.model.rocAuc ?? 0) > 0.99);
		assert.equal(report.developmentGate.passed, true);
		assert.equal(report.developmentGate.decision, "advance_to_one_shot_test");
		assert.equal(report.splitAccess.sourceTrainFeaturesRead, false);
		assert.equal(report.splitAccess.sourceTrainLabelsRead, false);
		assert.equal(report.testPolicy.featuresRead, false);
		assert.equal(report.testPolicy.labelsRead, false);
	});

	it("is deterministic for the same synthetic inputs", () => {
		const input = fixture();
		assert.deepEqual(evaluate(input), evaluate(input));
	});

	it("rejects checksum and preregistration changes before opening validation", () => {
		const input = fixture();
		sealRows(input.validation, "validation");
		assert.throws(
			() =>
				evaluateDailySwingEpisodeValidation({
					sourceDataset: input.sourceDataset,
					sourceDatasetSha256: SOURCE_SHA,
					trainingDataset: input.trainingDataset,
					trainingDatasetSha256: "d".repeat(64),
					preregistration: input.preregistration,
					preregistrationSha256: PREREGISTRATION_SHA,
				}),
			/checksum does not match the preregistration/,
		);

		const tampered = JSON.parse(
			JSON.stringify(input.preregistration),
		) as DailySwingEpisodeExperimentPreregistration;
		tampered.validationPolicy.criteria[0].threshold = 1;
		assert.throws(
			() =>
				evaluateDailySwingEpisodeValidation({
					sourceDataset: input.sourceDataset,
					sourceDatasetSha256: SOURCE_SHA,
					trainingDataset: input.trainingDataset,
					trainingDatasetSha256: TRAINING_SHA,
					preregistration: tampered,
					preregistrationSha256: PREREGISTRATION_SHA,
				}),
			/does not match the frozen experiment contract/,
		);
	});
});
