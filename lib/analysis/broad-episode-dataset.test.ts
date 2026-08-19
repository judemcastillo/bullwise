import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildDailySwingBroadEpisodeDataset } from "@/lib/analysis/broad-episode-dataset";
import { DAILY_SWING_BROAD_DATASET_SHA256 } from "@/lib/analysis/broad-episode-dataset.types";
import type {
	DailySwingBroadDataset,
	DailySwingBroadDatasetRow,
	DailySwingBroadFeatureVector,
} from "@/lib/analysis/broad-dataset.types";

function row(input: {
	id: string;
	signalAt: string;
	resolvedAt: string;
	direction?: "long" | "short";
}): DailySwingBroadDatasetRow {
	return {
		rowId: input.id,
		instrumentId: "backtest:etf:ivv",
		displaySymbol: "IVV",
		signalAt: input.signalAt,
		resolvedAt: input.resolvedAt,
		split: "train",
		features: {
			direction: input.direction ?? "long",
		} as DailySwingBroadFeatureVector,
		labels: {
			triggered: false,
			profitable: null,
			netRMultiple: null,
			exitReason: "expired_untriggered",
			targetOneReached: null,
			maximumFavorableExcursionPercent: null,
			maximumAdverseExcursionPercent: null,
		},
	};
}

function sealedRow(
	id: string,
	split: "validation" | "test",
	signalAt: string,
) {
	return {
		rowId: id,
		instrumentId: "backtest:etf:ivv",
		displaySymbol: "IVV",
		signalAt,
		resolvedAt: signalAt,
		split,
		get features(): never {
			throw new Error(`${split} features were read`);
		},
		get labels(): never {
			throw new Error(`${split} labels were read`);
		},
	} as DailySwingBroadDatasetRow;
}

function dataset(): DailySwingBroadDataset {
	const rows = [
		row({
			id: "a",
			signalAt: "2019-01-02T05:00:00.000Z",
			resolvedAt: "2019-01-04T05:00:00.000Z",
		}),
		row({
			id: "b",
			signalAt: "2019-01-03T05:00:00.000Z",
			resolvedAt: "2019-01-04T05:00:00.000Z",
		}),
		row({
			id: "e",
			signalAt: "2019-01-03T05:00:00.000Z",
			resolvedAt: "2019-01-03T05:00:00.000Z",
			direction: "short",
		}),
		row({
			id: "c",
			signalAt: "2019-01-04T05:00:00.000Z",
			resolvedAt: "2019-01-04T05:00:00.000Z",
		}),
		row({
			id: "d",
			signalAt: "2019-01-07T05:00:00.000Z",
			resolvedAt: "2019-01-08T05:00:00.000Z",
		}),
		row({
			id: "f",
			signalAt: "2020-06-01T04:00:00.000Z",
			resolvedAt: "2020-06-03T04:00:00.000Z",
		}),
		row({
			id: "g",
			signalAt: "2021-06-01T04:00:00.000Z",
			resolvedAt: "2021-06-03T04:00:00.000Z",
		}),
		row({
			id: "h",
			signalAt: "2022-06-01T04:00:00.000Z",
			resolvedAt: "2022-06-03T04:00:00.000Z",
		}),
		sealedRow("v", "validation", "2023-06-01T04:00:00.000Z"),
		sealedRow("t", "test", "2025-06-02T04:00:00.000Z"),
	];
	return {
		datasetVersion: "2.0.0",
		generatedAt: "2026-08-19T08:27:22.526Z",
		source: {
			setupScanSha256:
				"142b4477f302abbb4f3dd8d38a9efb7265e861271a51549d3bf442296cb16217",
			setupScanVersion: "2.0.0",
			objectiveFeatureVersion: "1.0.0",
			universeName: "daily-swing-broad-development-v1",
			backtestVersions: ["1.3.0"],
			engineVersions: ["1.0.0"],
			strategyVersions: ["daily-swing-v1-draft"],
		},
		featureAvailability: {
			asOf: "signalAt",
			policy: "completed_signal_bar_only",
			instrumentIdentityUsedAsFeature: false,
			description: "fixture",
		},
		eligibility: {
			coverageExcludedInstruments: 1,
			liquidityRejectedSetups: 0,
			eligibleOutcomeRowsBeforeBoundaryPurge: rows.length,
		},
		splitPolicy: {
			version: "1.0.0",
			method: "fixed_calendar_expanding_walk_forward_with_resolution_purge",
			validationStartsAt: "2023-01-01T00:00:00.000Z",
			testStartsAt: "2025-01-01T00:00:00.000Z",
			purgedFinalBoundaryRows: 0,
			episodeSelection: "independently_within_each_fold_and_final_split",
			description: "fixture",
		},
		walkForwardFolds: [
			{
				foldId: "evaluate_2020",
				fit: { startsAt: rows[0].signalAt, endsAt: rows[4].signalAt, rows: 5, signalSessions: 4 },
				evaluation: { startsAt: rows[5].signalAt, endsAt: rows[5].signalAt, rows: 1, signalSessions: 1 },
				boundaries: { evaluationStartsAt: "2020-01-01T00:00:00.000Z", evaluationEndsBefore: "2021-01-01T00:00:00.000Z" },
				purgedFitBoundaryRows: 0,
				purgedEvaluationBoundaryRows: 0,
			},
			{
				foldId: "evaluate_2021",
				fit: { startsAt: rows[0].signalAt, endsAt: rows[5].signalAt, rows: 6, signalSessions: 5 },
				evaluation: { startsAt: rows[6].signalAt, endsAt: rows[6].signalAt, rows: 1, signalSessions: 1 },
				boundaries: { evaluationStartsAt: "2021-01-01T00:00:00.000Z", evaluationEndsBefore: "2022-01-01T00:00:00.000Z" },
				purgedFitBoundaryRows: 0,
				purgedEvaluationBoundaryRows: 0,
			},
			{
				foldId: "evaluate_2022",
				fit: { startsAt: rows[0].signalAt, endsAt: rows[6].signalAt, rows: 7, signalSessions: 6 },
				evaluation: { startsAt: rows[7].signalAt, endsAt: rows[7].signalAt, rows: 1, signalSessions: 1 },
				boundaries: { evaluationStartsAt: "2022-01-01T00:00:00.000Z", evaluationEndsBefore: "2023-01-01T00:00:00.000Z" },
				purgedFitBoundaryRows: 0,
				purgedEvaluationBoundaryRows: 0,
			},
		],
		splits: {
			train: { startsAt: rows[0].signalAt, endsAt: rows[7].signalAt, rows: 8, signalSessions: 7 },
			validation: { startsAt: rows[8].signalAt, endsAt: rows[8].signalAt, rows: 1, signalSessions: 1 },
			test: { startsAt: rows[9].signalAt, endsAt: rows[9].signalAt, rows: 1, signalSessions: 1 },
		},
		rows,
		warnings: [],
	};
}

describe("daily swing broad train episode dataset", () => {
	it("selects first unresolved episodes independently and leaves sealed rows unread", () => {
		const result = buildDailySwingBroadEpisodeDataset({
			dataset: dataset(),
			datasetSha256: DAILY_SWING_BROAD_DATASET_SHA256,
			generatedAt: new Date("2026-08-19T09:00:00.000Z"),
		});

		assert.deepEqual(result.rows.map((item) => item.rowId), ["a", "e", "d", "f", "g", "h"]);
		assert.equal(result.coverage.trainEpisodeRows, 6);
		assert.equal(result.coverage.passes, false);
		assert.deepEqual(
			result.walkForwardInventory.map((fold) => [fold.fitEpisodeRows, fold.evaluationEpisodeRows]),
			[[3, 1], [4, 1], [5, 1]],
		);
		assert.equal(result.materializationPolicy.validationLabelsRead, false);
		assert.equal(result.materializationPolicy.testLabelsRead, false);
	});

	it("materializes the frozen target only from selected train labels", () => {
		const source = dataset();
		source.rows[0].labels = {
			triggered: true,
			profitable: true,
			netRMultiple: 0.6,
			exitReason: "target_2",
			targetOneReached: true,
			maximumFavorableExcursionPercent: 4,
			maximumAdverseExcursionPercent: -1,
		};
		const result = buildDailySwingBroadEpisodeDataset({
			dataset: source,
			datasetSha256: DAILY_SWING_BROAD_DATASET_SHA256,
		});
		assert.deepEqual(result.rows[0].targets, {
			actionableSuccess: true,
			setupUtilityR: 0.6,
		});
		assert.equal("trainingSummary" in result, false);
	});

	it("rejects source checksum drift", () => {
		assert.throws(
			() =>
				buildDailySwingBroadEpisodeDataset({
					dataset: dataset(),
					datasetSha256: "0".repeat(64),
				}),
			/checksum/,
		);
	});
});
