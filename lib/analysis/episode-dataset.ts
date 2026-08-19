import {
	DAILY_SWING_ANALYSIS_DATASET_VERSION,
	type AnalysisDatasetRow,
	type AnalysisDatasetSplit,
	type DailySwingAnalysisDataset,
} from "@/lib/analysis/analysis-dataset.types";
import {
	DAILY_SWING_EPISODE_DATASET_VERSION,
	type DailySwingEpisodeTrainingDataset,
} from "@/lib/analysis/episode-dataset.types";
import { ACTIONABLE_SUCCESS_R_THRESHOLD } from "@/lib/analysis/training-diagnostics";
import { DAILY_SWING_TARGET_DESIGN_VERSION } from "@/lib/analysis/training-diagnostics.types";

function round(value: number, precision = 8) {
	const multiplier = 10 ** precision;
	return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
}

function timestamp(value: string, label: string) {
	const result = new Date(value).getTime();
	if (!Number.isFinite(result)) throw new Error(`${label} must be a valid date`);
	return result;
}

function finiteR(row: AnalysisDatasetRow) {
	const value = row.labels.netRMultiple;
	if (typeof value !== "number" || !Number.isFinite(value)) {
		throw new Error(`${row.rowId}.netRMultiple must be finite when triggered`);
	}
	return value;
}

export function selectEpisodeFirstRows(
	rows: readonly AnalysisDatasetRow[],
	split: AnalysisDatasetSplit,
) {
	if (rows.some((row) => row.split !== split)) {
		throw new Error(`Episode selection for ${split} received a row from another split`);
	}
	const groups = new Map<string, AnalysisDatasetRow[]>();
	for (const row of rows) {
		const key = `${row.instrumentId}|${row.features.direction}`;
		const group = groups.get(key) ?? [];
		group.push(row);
		groups.set(key, group);
	}
	const selected: AnalysisDatasetRow[] = [];
	for (const group of groups.values()) {
		group.sort(
			(left, right) =>
				timestamp(left.signalAt, `${left.rowId}.signalAt`) -
				timestamp(right.signalAt, `${right.rowId}.signalAt`) ||
				left.rowId.localeCompare(right.rowId),
		);
		let selectedResolvedAt = Number.NEGATIVE_INFINITY;
		for (const row of group) {
			const signalAt = timestamp(row.signalAt, `${row.rowId}.signalAt`);
			const resolvedAt = timestamp(row.resolvedAt, `${row.rowId}.resolvedAt`);
			if (resolvedAt < signalAt) {
				throw new Error(`${row.rowId} resolves before its signal`);
			}
			if (signalAt <= selectedResolvedAt) continue;
			selected.push(row);
			selectedResolvedAt = resolvedAt;
		}
	}
	return selected.sort(
		(left, right) =>
			timestamp(left.signalAt, `${left.rowId}.signalAt`) -
			timestamp(right.signalAt, `${right.rowId}.signalAt`) ||
			left.displaySymbol.localeCompare(right.displaySymbol) ||
			left.rowId.localeCompare(right.rowId),
	);
}

export function buildDailySwingEpisodeTrainingDataset(input: {
	dataset: DailySwingAnalysisDataset;
	datasetSha256: string;
	generatedAt?: Date;
}): DailySwingEpisodeTrainingDataset {
	if (input.dataset.datasetVersion !== DAILY_SWING_ANALYSIS_DATASET_VERSION) {
		throw new Error(
			`Dataset version ${input.dataset.datasetVersion} is not supported; expected ${DAILY_SWING_ANALYSIS_DATASET_VERSION}`,
		);
	}
	if (input.dataset.source.kind !== "exhaustive_setup_scan") {
		throw new Error("Episode training requires an exhaustive setup-scan dataset");
	}
	const sourceSha256 = input.datasetSha256.trim();
	if (!/^[a-f0-9]{64}$/i.test(sourceSha256)) {
		throw new Error("datasetSha256 must be a 64-character hexadecimal SHA-256");
	}
	const generatedAt = input.generatedAt ?? new Date();
	if (Number.isNaN(generatedAt.getTime())) throw new Error("generatedAt must be valid");
	const trainRows = input.dataset.rows.filter((row) => row.split === "train");
	const validationRows = input.dataset.rows.filter(
		(row) => row.split === "validation",
	).length;
	const testRows = input.dataset.rows.filter((row) => row.split === "test").length;
	if (trainRows.length === 0 || validationRows === 0 || testRows === 0) {
		throw new Error("Train, validation, and test splits are required");
	}
	const selectedRows = selectEpisodeFirstRows(trainRows, "train");
	const rows = selectedRows.map((row) => {
		const utility = row.labels.triggered ? finiteR(row) : 0;
		return {
			rowId: row.rowId,
			instrumentId: row.instrumentId,
			displaySymbol: row.displaySymbol,
			signalAt: row.signalAt,
			resolvedAt: row.resolvedAt,
			features: { ...row.features },
			targets: {
				actionableSuccess:
					row.labels.triggered && utility >= ACTIONABLE_SUCCESS_R_THRESHOLD,
				setupUtilityR: utility,
			},
		};
	});
	const actionableSuccesses = rows.filter(
		(row) => row.targets.actionableSuccess,
	).length;
	return {
		datasetVersion: DAILY_SWING_EPISODE_DATASET_VERSION,
		generatedAt: generatedAt.toISOString(),
		source: {
			analysisDatasetVersion: input.dataset.datasetVersion,
			analysisDatasetSha256: sourceSha256.toLowerCase(),
			kind: input.dataset.source.kind,
			universeName: input.dataset.source.universeName,
		},
		targetDesign: {
			version: DAILY_SWING_TARGET_DESIGN_VERSION,
			actionableRThreshold: ACTIONABLE_SUCCESS_R_THRESHOLD,
			primaryTarget: "actionable_success",
			secondaryTarget: "setup_utility_r",
		},
		episodePolicy: {
			application: "independently_within_each_split",
			groupingKeys: ["instrumentId", "direction"],
			selection: "first_signal_while_prior_selected_setup_is_unresolved",
			sameResolutionSessionPolicy: "suppress",
			description:
				"Within one split, select the first setup for each instrument and direction, suppress later signals through that selected setup's resolution session, then begin a new episode. A selected setup from another split can never suppress this split's first setup.",
		},
		materializationPolicy: {
			materializedSplit: "train",
			validationFeaturesRead: false,
			validationLabelsRead: false,
			testFeaturesRead: false,
			testLabelsRead: false,
			description:
				"Only train episodes and targets are materialized. Validation is opened once by the preregistered experiment; test remains sealed unless every validation gate passes.",
		},
		splits: {
			train: { sourceRows: trainRows.length, episodeRows: rows.length },
			validation: { sourceRows: validationRows, episodeRows: null, status: "sealed" },
			test: { sourceRows: testRows, episodeRows: null, status: "sealed" },
		},
		trainingSummary: {
			rows: rows.length,
			actionableSuccesses,
			actionableSuccessRate: round(actionableSuccesses / rows.length),
			averageSetupUtilityR: round(
				rows.reduce((total, row) => total + row.targets.setupUtilityR, 0) /
					rows.length,
			),
		},
		rows,
		warnings: [
			"This artifact is training-only and does not contain validation or test rows.",
			"Episode selection must be executed independently inside validation and test when their preregistered evaluation is authorized.",
			"Do not regenerate this artifact or change its target after inspecting validation results.",
		],
	};
}
