import { selectEpisodeFirstBroadRows } from "@/lib/analysis/broad-episode-dataset";
import {
	DAILY_SWING_BROAD_WALK_FORWARD_FOLDS,
	type DailySwingBroadFeatureVector,
} from "@/lib/analysis/broad-dataset.types";
import {
	DAILY_SWING_COMBINED_BROAD_DATASET_SHA256,
	DAILY_SWING_COMBINED_BROAD_TRAIN_SOURCE_ROWS,
	type DailySwingCombinedBroadEpisodeRow,
} from "@/lib/analysis/combined-broad-episode-dataset.types";
import {
	DAILY_SWING_COMBINED_BROAD_FINAL_EPISODE_SHA256,
	DAILY_SWING_COMBINED_BROAD_FOLD_DATASET_VERSION,
	DAILY_SWING_COMBINED_BROAD_FOLD_INVENTORY,
	type DailySwingCombinedBroadFoldDataset,
	type DailySwingCombinedBroadFoldPartitionId,
} from "@/lib/analysis/combined-broad-fold-dataset.types";
import {
	DAILY_SWING_COMBINED_BROAD_DATASET_VERSION,
	type DailySwingCombinedBroadDataset,
	type DailySwingCombinedBroadDatasetRow,
} from "@/lib/analysis/combined-broad-dataset.types";
import { ACTIONABLE_SUCCESS_R_THRESHOLD } from "@/lib/analysis/training-diagnostics";

function timestamp(value: string, label: string) {
	const result = new Date(value).getTime();
	if (!Number.isFinite(result)) throw new Error(`${label} must be a valid date`);
	return result;
}

function episodeRow(
	row: DailySwingCombinedBroadDatasetRow,
): DailySwingCombinedBroadEpisodeRow {
	const utility = row.labels.triggered ? row.labels.netRMultiple : 0;
	if (typeof utility !== "number" || !Number.isFinite(utility)) {
		throw new Error(`${row.rowId}.netRMultiple must be finite when triggered`);
	}
	if (row.sourceScan !== "base" && row.sourceScan !== "expansion") {
		throw new Error(`${row.rowId}.sourceScan is invalid`);
	}
	return {
		rowId: row.rowId,
		instrumentId: row.instrumentId,
		displaySymbol: row.displaySymbol,
		sourceScan: row.sourceScan,
		signalAt: row.signalAt,
		resolvedAt: row.resolvedAt,
		features: { ...row.features } as DailySwingBroadFeatureVector,
		targets: {
			actionableSuccess:
				row.labels.triggered && utility >= ACTIONABLE_SUCCESS_R_THRESHOLD,
			setupUtilityR: utility,
		},
	};
}

function rowsBefore(
	rows: readonly DailySwingCombinedBroadDatasetRow[],
	boundary: string,
) {
	const end = timestamp(boundary, "fold boundary");
	return rows.filter(
		(row) =>
			timestamp(row.signalAt, `${row.rowId}.signalAt`) < end &&
			timestamp(row.resolvedAt, `${row.rowId}.resolvedAt`) < end,
	);
}

function rowsBetween(
	rows: readonly DailySwingCombinedBroadDatasetRow[],
	startsAt: string,
	endsBefore: string,
) {
	const start = timestamp(startsAt, "fold start");
	const end = timestamp(endsBefore, "fold end");
	return rows.filter((row) => {
		const signal = timestamp(row.signalAt, `${row.rowId}.signalAt`);
		return (
			signal >= start &&
			signal < end &&
			timestamp(row.resolvedAt, `${row.rowId}.resolvedAt`) < end
		);
	});
}

export function materializeDailySwingCombinedBroadFoldRows(
	trainRows: readonly DailySwingCombinedBroadDatasetRow[],
) {
	return {
		finalTrainRows: selectEpisodeFirstBroadRows(trainRows).map(episodeRow),
		walkForwardFolds: DAILY_SWING_BROAD_WALK_FORWARD_FOLDS.map((fold) => {
			const fitSource = rowsBefore(trainRows, fold.evaluationStartsAt);
			const evaluationSource = rowsBetween(
				trainRows,
				fold.evaluationStartsAt,
				fold.evaluationEndsBefore,
			);
			return {
				foldId: fold.foldId,
				fitSourceRows: fitSource.length,
				evaluationSourceRows: evaluationSource.length,
				fitRows: selectEpisodeFirstBroadRows(fitSource).map(episodeRow),
				evaluationRows:
					selectEpisodeFirstBroadRows(evaluationSource).map(episodeRow),
			};
		}),
	};
}

export function buildDailySwingCombinedBroadFoldDataset(input: {
	dataset: DailySwingCombinedBroadDataset;
	datasetSha256: string;
	generatedAt?: Date;
}): DailySwingCombinedBroadFoldDataset {
	if (
		input.datasetSha256.trim().toLowerCase() !==
		DAILY_SWING_COMBINED_BROAD_DATASET_SHA256
	) {
		throw new Error("Combined broad fold source checksum does not match frozen v3");
	}
	if (
		input.dataset.datasetVersion !== DAILY_SWING_COMBINED_BROAD_DATASET_VERSION ||
		input.dataset.splits.train.rows !==
			DAILY_SWING_COMBINED_BROAD_TRAIN_SOURCE_ROWS ||
		input.dataset.splits.validation.rows !== 25_935 ||
		input.dataset.splits.test.rows !== 25_082 ||
		input.dataset.rows.length !== DAILY_SWING_COMBINED_BROAD_TRAIN_SOURCE_ROWS ||
		input.dataset.rows.some((row) => row.split !== "train")
	) {
		throw new Error("Combined broad fold source is not the exact train inventory");
	}
	const generatedAt = input.generatedAt ?? new Date();
	if (Number.isNaN(generatedAt.getTime())) throw new Error("generatedAt must be valid");
	const materialized = materializeDailySwingCombinedBroadFoldRows(
		input.dataset.rows,
	);
	if (materialized.finalTrainRows.length !== 5_504) {
		throw new Error("Final combined episode inventory must contain exactly 5504 rows");
	}
	for (let index = 0; index < DAILY_SWING_COMBINED_BROAD_FOLD_INVENTORY.length; index += 1) {
		const expected = DAILY_SWING_COMBINED_BROAD_FOLD_INVENTORY[index];
		const actual = materialized.walkForwardFolds[index];
		if (
			actual.foldId !== expected.foldId ||
			actual.fitSourceRows !== expected.fitSourceRows ||
			actual.fitRows.length !== expected.fitEpisodeRows ||
			actual.evaluationSourceRows !== expected.evaluationSourceRows ||
			actual.evaluationRows.length !== expected.evaluationEpisodeRows
		) {
			throw new Error(`${expected.foldId} materialized inventory does not reconcile`);
		}
	}
	const partitions: DailySwingCombinedBroadFoldDataset["partitions"] = [
		{
			partitionId: "final_train",
			foldId: null,
			role: "final_train",
			sourceRows: DAILY_SWING_COMBINED_BROAD_TRAIN_SOURCE_ROWS,
			episodeRows: materialized.finalTrainRows.length,
		},
		...materialized.walkForwardFolds.flatMap((fold) => [
			{
				partitionId: `${fold.foldId}_fit` as DailySwingCombinedBroadFoldPartitionId,
				foldId: fold.foldId,
				role: "fit" as const,
				sourceRows: fold.fitSourceRows,
				episodeRows: fold.fitRows.length,
			},
			{
				partitionId:
					`${fold.foldId}_evaluation` as DailySwingCombinedBroadFoldPartitionId,
				foldId: fold.foldId,
				role: "evaluation" as const,
				sourceRows: fold.evaluationSourceRows,
				episodeRows: fold.evaluationRows.length,
			},
		]),
	];
	const rows: DailySwingCombinedBroadFoldDataset["rows"] = [
		...materialized.finalTrainRows.map((row) => ({
			...row,
			partitionId: "final_train" as const,
		})),
		...materialized.walkForwardFolds.flatMap((fold) => [
			...fold.fitRows.map((row) => ({
				...row,
				partitionId: `${fold.foldId}_fit` as DailySwingCombinedBroadFoldPartitionId,
			})),
			...fold.evaluationRows.map((row) => ({
				...row,
				partitionId:
					`${fold.foldId}_evaluation` as DailySwingCombinedBroadFoldPartitionId,
			})),
		]),
	];
	return {
		datasetVersion: DAILY_SWING_COMBINED_BROAD_FOLD_DATASET_VERSION,
		generatedAt: generatedAt.toISOString(),
		source: {
			combinedBroadDatasetVersion: DAILY_SWING_COMBINED_BROAD_DATASET_VERSION,
			combinedBroadDatasetSha256: DAILY_SWING_COMBINED_BROAD_DATASET_SHA256,
			finalEpisodeDatasetSha256:
				DAILY_SWING_COMBINED_BROAD_FINAL_EPISODE_SHA256,
			trainSourceRows: DAILY_SWING_COMBINED_BROAD_TRAIN_SOURCE_ROWS,
			validationSourceRows: 25_935,
			testSourceRows: 25_082,
		},
		materializationPolicy: {
			materializedSplit: "train",
			episodeSelection: "independently_within_each_partition",
			validationFeaturesDeserialized: false,
			validationLabelsDeserialized: false,
			testFeaturesDeserialized: false,
			testLabelsDeserialized: false,
		},
		partitions,
		rows,
		warnings: [
			"This artifact contains train episodes only, materialized independently for each partition.",
			"Validation and test features and labels remain sealed.",
		],
	};
}
