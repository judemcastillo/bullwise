import { selectEpisodeFirstBroadRows } from "@/lib/analysis/broad-episode-dataset";
import {
	DAILY_SWING_BROAD_SPLIT_BOUNDARIES,
	DAILY_SWING_BROAD_WALK_FORWARD_FOLDS,
} from "@/lib/analysis/broad-dataset.types";
import { BROAD_DEVELOPMENT_DATA_POLICY } from "@/lib/analysis/broad-development-universe";
import {
	DAILY_SWING_COMBINED_BROAD_DATASET_SHA256,
	DAILY_SWING_COMBINED_BROAD_EPISODE_DATASET_VERSION,
	DAILY_SWING_COMBINED_BROAD_TRAIN_SOURCE_ROWS,
	type DailySwingCombinedBroadEpisodeDataset,
} from "@/lib/analysis/combined-broad-episode-dataset.types";
import {
	DAILY_SWING_COMBINED_BROAD_DATASET_VERSION,
	DAILY_SWING_COMBINED_BROAD_UNIVERSE_NAME,
	type DailySwingCombinedBroadDataset,
	type DailySwingCombinedBroadDatasetRow,
} from "@/lib/analysis/combined-broad-dataset.types";
import { ACTIONABLE_SUCCESS_R_THRESHOLD } from "@/lib/analysis/training-diagnostics";
import { DAILY_SWING_TARGET_DESIGN_VERSION } from "@/lib/analysis/training-diagnostics.types";

function timestamp(value: string, label: string) {
	const result = new Date(value).getTime();
	if (!Number.isFinite(result)) throw new Error(`${label} must be a valid date`);
	return result;
}

function requireSource(input: {
	dataset: DailySwingCombinedBroadDataset;
	datasetSha256: string;
}) {
	if (
		input.datasetSha256.trim().toLowerCase() !==
		DAILY_SWING_COMBINED_BROAD_DATASET_SHA256
	) {
		throw new Error(
			"Combined broad episode source checksum does not match the frozen v3 dataset",
		);
	}
	if (
		input.dataset.datasetVersion !== DAILY_SWING_COMBINED_BROAD_DATASET_VERSION ||
		input.dataset.source.universeName !==
			DAILY_SWING_COMBINED_BROAD_UNIVERSE_NAME ||
		input.dataset.splitPolicy.validationStartsAt !==
			DAILY_SWING_BROAD_SPLIT_BOUNDARIES.validationStartsAt ||
		input.dataset.splitPolicy.testStartsAt !==
			DAILY_SWING_BROAD_SPLIT_BOUNDARIES.testStartsAt ||
		input.dataset.splitPolicy.episodeSelection !==
			"independently_within_each_fold_and_final_split"
	) {
		throw new Error(
			"Combined broad episode source does not match the frozen dataset policy",
		);
	}
}

function finiteUtility(row: DailySwingCombinedBroadDatasetRow) {
	if (!row.labels.triggered) return 0;
	const value = row.labels.netRMultiple;
	if (typeof value !== "number" || !Number.isFinite(value)) {
		throw new Error(`${row.rowId}.netRMultiple must be finite when triggered`);
	}
	return value;
}

function rowsBefore(
	rows: readonly DailySwingCombinedBroadDatasetRow[],
	boundary: string,
) {
	const boundaryTimestamp = timestamp(boundary, "fold boundary");
	return rows.filter(
		(row) =>
			timestamp(row.signalAt, `${row.rowId}.signalAt`) < boundaryTimestamp &&
			timestamp(row.resolvedAt, `${row.rowId}.resolvedAt`) < boundaryTimestamp,
	);
}

function rowsBetween(
	rows: readonly DailySwingCombinedBroadDatasetRow[],
	startsAt: string,
	endsBefore: string,
) {
	const startTimestamp = timestamp(startsAt, "fold start");
	const endTimestamp = timestamp(endsBefore, "fold end");
	return rows.filter((row) => {
		const signalAt = timestamp(row.signalAt, `${row.rowId}.signalAt`);
		return (
			signalAt >= startTimestamp &&
			signalAt < endTimestamp &&
			timestamp(row.resolvedAt, `${row.rowId}.resolvedAt`) < endTimestamp
		);
	});
}

export function buildDailySwingCombinedBroadEpisodeDataset(input: {
	dataset: DailySwingCombinedBroadDataset;
	datasetSha256: string;
	generatedAt?: Date;
}): DailySwingCombinedBroadEpisodeDataset {
	requireSource(input);
	const generatedAt = input.generatedAt ?? new Date();
	if (Number.isNaN(generatedAt.getTime())) throw new Error("generatedAt must be valid");
	const trainRows: DailySwingCombinedBroadDatasetRow[] = [];
	for (const row of input.dataset.rows) {
		if (row.split === "train") trainRows.push(row);
	}
	if (
		input.dataset.splits.train.rows !==
			DAILY_SWING_COMBINED_BROAD_TRAIN_SOURCE_ROWS ||
		trainRows.length !== DAILY_SWING_COMBINED_BROAD_TRAIN_SOURCE_ROWS
	) {
		throw new Error(
			`Combined broad train source must contain exactly ${DAILY_SWING_COMBINED_BROAD_TRAIN_SOURCE_ROWS} rows`,
		);
	}
	const selectedRows = selectEpisodeFirstBroadRows(trainRows);
	const walkForwardInventory = DAILY_SWING_BROAD_WALK_FORWARD_FOLDS.map(
		(policy, index) => {
			const fitRows = rowsBefore(trainRows, policy.evaluationStartsAt);
			const evaluationRows = rowsBetween(
				trainRows,
				policy.evaluationStartsAt,
				policy.evaluationEndsBefore,
			);
			const sourceFold = input.dataset.walkForwardFolds[index];
			if (
				sourceFold?.foldId !== policy.foldId ||
				sourceFold.fit.rows !== fitRows.length ||
				sourceFold.evaluation.rows !== evaluationRows.length
			) {
				throw new Error(`${policy.foldId} source inventory does not reconcile`);
			}
			return {
				foldId: policy.foldId,
				fitSourceRows: fitRows.length,
				fitEpisodeRows: selectEpisodeFirstBroadRows(fitRows).length,
				evaluationSourceRows: evaluationRows.length,
				evaluationEpisodeRows:
					selectEpisodeFirstBroadRows(evaluationRows).length,
			};
		},
	);
	const rows = selectedRows.map((row) => {
		const utility = finiteUtility(row);
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
			features: { ...row.features },
			targets: {
				actionableSuccess:
					row.labels.triggered &&
					utility >= ACTIONABLE_SUCCESS_R_THRESHOLD,
				setupUtilityR: utility,
			},
		};
	});
	const targetTrainingEpisodes =
		BROAD_DEVELOPMENT_DATA_POLICY.targetTrainingEpisodes;
	return {
		datasetVersion: DAILY_SWING_COMBINED_BROAD_EPISODE_DATASET_VERSION,
		generatedAt: generatedAt.toISOString(),
		source: {
			combinedBroadDatasetVersion: DAILY_SWING_COMBINED_BROAD_DATASET_VERSION,
			combinedBroadDatasetSha256:
				DAILY_SWING_COMBINED_BROAD_DATASET_SHA256,
			universeName: DAILY_SWING_COMBINED_BROAD_UNIVERSE_NAME,
			trainSourceRows: trainRows.length,
			validationSourceRows: input.dataset.splits.validation.rows,
			testSourceRows: input.dataset.splits.test.rows,
		},
		episodePolicy: {
			application: "independently_within_each_fold_and_final_split",
			groupingKeys: ["instrumentId", "direction"],
			selection: "first_signal_while_prior_selected_setup_is_unresolved",
			sameResolutionSessionPolicy: "suppress",
			description:
				"For each instrument and direction, select the first signal and suppress later signals through its resolution session. Repeat independently in every partition.",
		},
		materializationPolicy: {
			materializedSplit: "train",
			validationFeaturesRead: false,
			validationLabelsRead: false,
			testFeaturesRead: false,
			testLabelsRead: false,
			description:
				"Only train rows are selected and materialized. Non-train source counts come from frozen dataset metadata; their features and labels are not accessed.",
		},
		targetDesign: {
			version: DAILY_SWING_TARGET_DESIGN_VERSION,
			actionableRThreshold: ACTIONABLE_SUCCESS_R_THRESHOLD,
			primaryTarget: "actionable_success",
			secondaryTarget: "setup_utility_r",
		},
		coverage: {
			targetTrainingEpisodes,
			trainEpisodeRows: rows.length,
			passes: rows.length >= targetTrainingEpisodes,
		},
		walkForwardInventory,
		rows,
		warnings: [
			"This artifact contains combined train episodes and targets only.",
			"Walk-forward counts apply episode selection independently; validation and test remain unmaterialized.",
			"Coverage passing is not evidence of predictive value or profitability.",
		],
	};
}
