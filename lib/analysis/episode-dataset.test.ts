import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
	AnalysisDatasetFeatureVector,
	AnalysisDatasetRow,
	AnalysisDatasetSplit,
	DailySwingAnalysisDataset,
} from "@/lib/analysis/analysis-dataset.types";
import {
	buildDailySwingEpisodeTrainingDataset,
	selectEpisodeFirstRows,
} from "@/lib/analysis/episode-dataset";
import type { DailySwingEpisodeTrainingDataset } from "@/lib/analysis/episode-dataset.types";
import { preregisterDailySwingEpisodeExperiment } from "@/lib/analysis/episode-experiment";

const SHA = "a".repeat(64);

function features(direction: "long" | "short" = "long"): AnalysisDatasetFeatureVector {
	return {
		direction,
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
}

function row(input: {
	id: string;
	split: AnalysisDatasetSplit;
	signalDay: number;
	resolvedDay: number;
	triggered?: boolean;
	r?: number;
	direction?: "long" | "short";
}): AnalysisDatasetRow {
	const triggered = input.triggered ?? true;
	const r = triggered ? (input.r ?? 1) : null;
	return {
		rowId: input.id,
		instrumentId: "instrument-a",
		displaySymbol: "AAA",
		signalAt: new Date(Date.UTC(2020, 0, 1 + input.signalDay)).toISOString(),
		resolvedAt: new Date(Date.UTC(2020, 0, 1 + input.resolvedDay)).toISOString(),
		split: input.split,
		features: features(input.direction),
		labels: {
			triggered,
			profitable: triggered ? r! > 0 : null,
			netRMultiple: r,
			exitReason: triggered ? "maximum_holding_period" : "expired_untriggered",
			targetOneReached: triggered ? r! >= 1 : null,
			maximumFavorableExcursionPercent: triggered ? Math.max(0, r!) : null,
			maximumAdverseExcursionPercent: triggered ? Math.min(0, r!) : null,
		},
	};
}

function sealedRow(split: "validation" | "test", id: string) {
	const result = row({ id, split, signalDay: 10, resolvedDay: 11 });
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

function sourceDataset() {
	return {
		datasetVersion: "1.1.0",
		source: {
			kind: "exhaustive_setup_scan",
			universeName: "episode fixture",
		},
		rows: [
			row({ id: "a1", split: "train", signalDay: 0, resolvedDay: 3, r: 1 }),
			row({ id: "a2", split: "train", signalDay: 1, resolvedDay: 8, r: -1 }),
			row({
				id: "a3",
				split: "train",
				signalDay: 4,
				resolvedDay: 5,
				triggered: false,
			}),
			row({ id: "a4", split: "train", signalDay: 6, resolvedDay: 7, r: 0.5 }),
			sealedRow("validation", "validation"),
			sealedRow("test", "test"),
		],
	} as unknown as DailySwingAnalysisDataset;
}

describe("daily swing episode training dataset", () => {
	it("materializes only first-signal train episodes and keeps non-train data sealed", () => {
		const dataset = buildDailySwingEpisodeTrainingDataset({
			dataset: sourceDataset(),
			datasetSha256: SHA,
			generatedAt: new Date("2026-08-19T00:00:00.000Z"),
		});

		assert.deepEqual(dataset.rows.map((item) => item.rowId), ["a1", "a3", "a4"]);
		assert.deepEqual(dataset.rows.map((item) => item.targets), [
			{ actionableSuccess: true, setupUtilityR: 1 },
			{ actionableSuccess: false, setupUtilityR: 0 },
			{ actionableSuccess: true, setupUtilityR: 0.5 },
		]);
		assert.equal(dataset.splits.train.sourceRows, 4);
		assert.equal(dataset.splits.train.episodeRows, 3);
		assert.equal(dataset.splits.validation.episodeRows, null);
		assert.equal(dataset.materializationPolicy.validationFeaturesRead, false);
		assert.equal(dataset.materializationPolicy.testLabelsRead, false);
		assert.equal(dataset.trainingSummary.actionableSuccessRate, 0.66666667);
		assert.equal(dataset.trainingSummary.averageSetupUtilityR, 0.5);
	});

	it("applies episode selection independently inside each split", () => {
		const train = row({
			id: "train-long-resolution",
			split: "train",
			signalDay: 0,
			resolvedDay: 20,
		});
		const validationFirst = row({
			id: "validation-first",
			split: "validation",
			signalDay: 10,
			resolvedDay: 11,
		});
		const validationRepeat = row({
			id: "validation-repeat",
			split: "validation",
			signalDay: 11,
			resolvedDay: 12,
		});

		assert.deepEqual(selectEpisodeFirstRows([train], "train").map((item) => item.rowId), [
			"train-long-resolution",
		]);
		assert.deepEqual(
			selectEpisodeFirstRows(
				[validationFirst, validationRepeat],
				"validation",
			).map((item) => item.rowId),
			["validation-first"],
		);
		assert.throws(
			() => selectEpisodeFirstRows([train, validationFirst], "train"),
			/row from another split/,
		);
	});

	it("is deterministic", () => {
		const generatedAt = new Date("2026-08-19T00:00:00.000Z");
		const first = buildDailySwingEpisodeTrainingDataset({
			dataset: sourceDataset(),
			datasetSha256: SHA,
			generatedAt,
		});
		const second = buildDailySwingEpisodeTrainingDataset({
			dataset: sourceDataset(),
			datasetSha256: SHA,
			generatedAt,
		});
		assert.deepEqual(first, second);
	});
});

describe("daily swing episode experiment preregistration", () => {
	it("freezes one model and nine validation gates from training data only", () => {
		const seed = buildDailySwingEpisodeTrainingDataset({
			dataset: sourceDataset(),
			datasetSha256: SHA,
			generatedAt: new Date("2026-08-19T00:00:00.000Z"),
		});
		const dataset = {
			...seed,
			rows: Array.from({ length: 200 }, (_, index) => ({
				...seed.rows[index % seed.rows.length],
				rowId: `training-${index}`,
			})),
			trainingSummary: { ...seed.trainingSummary, rows: 200 },
		} satisfies DailySwingEpisodeTrainingDataset;
		const registeredAt = new Date("2026-08-19T01:00:00.000Z");
		const first = preregisterDailySwingEpisodeExperiment({
			dataset,
			datasetSha256: "b".repeat(64),
			registeredAt,
		});
		const second = preregisterDailySwingEpisodeExperiment({
			dataset,
			datasetSha256: "b".repeat(64),
			registeredAt,
		});

		assert.deepEqual(first, second);
		assert.equal(first.model.target, "actionable_success");
		assert.equal(first.model.l2Penalty, 0.01);
		assert.equal(first.selectionPolicy.trainingScoreQuantile, 0.7);
		assert.equal(first.validationPolicy.criteria.length, 9);
		assert.equal(first.validationPolicy.modelSelectionOrTuning, false);
		assert.equal(first.testPolicy.featuresRead, false);
		assert.equal(first.testPolicy.labelsRead, false);
	});
});
