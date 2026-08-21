import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildDailySwingCombinedBroadEpisodeDataset } from "@/lib/analysis/combined-broad-episode-dataset";
import { DAILY_SWING_COMBINED_BROAD_DATASET_SHA256 } from "@/lib/analysis/combined-broad-episode-dataset.types";
import type { DailySwingBroadFeatureVector } from "@/lib/analysis/broad-dataset.types";
import type {
	DailySwingCombinedBroadDataset,
	DailySwingCombinedBroadDatasetRow,
} from "@/lib/analysis/combined-broad-dataset.types";

function row(input: {
	id: string;
	signalAt: string;
	resolvedAt: string;
	direction?: "long" | "short";
	sourceScan?: "base" | "expansion";
}): DailySwingCombinedBroadDatasetRow {
	return {
		rowId: input.id,
		instrumentId: "backtest:us-etf:ivv",
		displaySymbol: "IVV",
		sourceScan: input.sourceScan ?? "base",
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
		instrumentId: "backtest:us-etf:ivv",
		displaySymbol: "IVV",
		sourceScan: "expansion",
		signalAt,
		resolvedAt: signalAt,
		split,
		get features(): never {
			throw new Error(`${split} features were read`);
		},
		get labels(): never {
			throw new Error(`${split} labels were read`);
		},
	} as DailySwingCombinedBroadDatasetRow;
}

function dataset(): DailySwingCombinedBroadDataset {
	const earlyRows = [
		row({
			id: "a",
			signalAt: "2019-01-02T05:00:00.000Z",
			resolvedAt: "2019-01-04T05:00:00.000Z",
		}),
		row({
			id: "b",
			signalAt: "2019-01-03T05:00:00.000Z",
			resolvedAt: "2019-01-04T05:00:00.000Z",
			sourceScan: "expansion",
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
			sourceScan: "expansion",
		}),
	];
	const fillerTemplate = row({
		id: "filler",
		signalAt: "2019-12-02T05:00:00.000Z",
		resolvedAt: "2019-12-02T05:00:00.000Z",
	});
	const fillerRows = Array.from({ length: 60_373 }, (_, index) => ({
		...fillerTemplate,
		rowId: `filler-${index}`,
	}));
	const yearlyRows = [
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
			sourceScan: "expansion",
		}),
	];
	const sealedRows = [
		sealedRow("v", "validation", "2023-06-01T04:00:00.000Z"),
		sealedRow("t", "test", "2025-06-02T04:00:00.000Z"),
	];
	const rows = [...earlyRows, ...fillerRows, ...yearlyRows, ...sealedRows];
	return {
		datasetVersion: "3.0.0",
		generatedAt: "2026-08-19T10:25:13.706Z",
		source: {
			universeName: "daily-swing-broad-development-v2-combined",
			scans: [],
			objectiveFeatureVersion: "1.0.0",
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
			coverageExcludedInstruments: 3,
			liquidityRejectedSetups: 0,
			eligibleOutcomeRowsBeforeBoundaryPurge: rows.length,
			bySource: {
				base: {
					coverageExcludedInstruments: 1,
					liquidityRejectedSetups: 0,
					eligibleOutcomeRowsBeforeBoundaryPurge: 6,
				},
				expansion: {
					coverageExcludedInstruments: 2,
					liquidityRejectedSetups: 0,
					eligibleOutcomeRowsBeforeBoundaryPurge: 4,
				},
			},
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
				fit: { startsAt: earlyRows[0].signalAt, endsAt: fillerTemplate.signalAt, rows: 60_378, signalSessions: 5 },
				evaluation: { startsAt: yearlyRows[0].signalAt, endsAt: yearlyRows[0].signalAt, rows: 1, signalSessions: 1 },
				boundaries: { evaluationStartsAt: "2020-01-01T00:00:00.000Z", evaluationEndsBefore: "2021-01-01T00:00:00.000Z" },
				purgedFitBoundaryRows: 0,
				purgedEvaluationBoundaryRows: 0,
			},
			{
				foldId: "evaluate_2021",
				fit: { startsAt: earlyRows[0].signalAt, endsAt: yearlyRows[0].signalAt, rows: 60_379, signalSessions: 6 },
				evaluation: { startsAt: yearlyRows[1].signalAt, endsAt: yearlyRows[1].signalAt, rows: 1, signalSessions: 1 },
				boundaries: { evaluationStartsAt: "2021-01-01T00:00:00.000Z", evaluationEndsBefore: "2022-01-01T00:00:00.000Z" },
				purgedFitBoundaryRows: 0,
				purgedEvaluationBoundaryRows: 0,
			},
			{
				foldId: "evaluate_2022",
				fit: { startsAt: earlyRows[0].signalAt, endsAt: yearlyRows[1].signalAt, rows: 60_380, signalSessions: 7 },
				evaluation: { startsAt: yearlyRows[2].signalAt, endsAt: yearlyRows[2].signalAt, rows: 1, signalSessions: 1 },
				boundaries: { evaluationStartsAt: "2022-01-01T00:00:00.000Z", evaluationEndsBefore: "2023-01-01T00:00:00.000Z" },
				purgedFitBoundaryRows: 0,
				purgedEvaluationBoundaryRows: 0,
			},
		],
		splits: {
			train: { startsAt: earlyRows[0].signalAt, endsAt: yearlyRows[2].signalAt, rows: 60_381, signalSessions: 8 },
			validation: { startsAt: sealedRows[0].signalAt, endsAt: sealedRows[0].signalAt, rows: 1, signalSessions: 1 },
			test: { startsAt: sealedRows[1].signalAt, endsAt: sealedRows[1].signalAt, rows: 1, signalSessions: 1 },
		},
		rows,
		warnings: [],
	};
}

describe("daily swing combined broad train episode dataset", () => {
	it("selects train episodes, preserves source provenance, and leaves sealed rows unread", () => {
		const result = buildDailySwingCombinedBroadEpisodeDataset({
			dataset: dataset(),
			datasetSha256: DAILY_SWING_COMBINED_BROAD_DATASET_SHA256,
			generatedAt: new Date("2026-08-19T11:00:00.000Z"),
		});
		assert.deepEqual(result.rows.map((item) => item.rowId), ["a", "e", "d", "filler-0", "f", "g", "h"]);
		assert.deepEqual(result.rows.map((item) => item.sourceScan), ["base", "base", "expansion", "base", "base", "base", "expansion"]);
		assert.equal(result.coverage.trainEpisodeRows, 7);
		assert.equal(result.coverage.passes, false);
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
		const result = buildDailySwingCombinedBroadEpisodeDataset({
			dataset: source,
			datasetSha256: DAILY_SWING_COMBINED_BROAD_DATASET_SHA256,
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
				buildDailySwingCombinedBroadEpisodeDataset({
					dataset: dataset(),
					datasetSha256: "0".repeat(64),
				}),
			/checksum/,
		);
	});

	it("requires the exact frozen train source inventory", () => {
		const source = dataset();
		source.splits.train.rows -= 1;
		assert.throws(
			() =>
				buildDailySwingCombinedBroadEpisodeDataset({
					dataset: source,
					datasetSha256: DAILY_SWING_COMBINED_BROAD_DATASET_SHA256,
				}),
			/exactly 60381 rows/,
		);
	});
});
