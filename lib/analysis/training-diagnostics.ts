import {
	DAILY_SWING_ANALYSIS_DATASET_VERSION,
	type AnalysisDatasetRow,
	type DailySwingAnalysisDataset,
} from "@/lib/analysis/analysis-dataset.types";
import {
	DAILY_SWING_TARGET_DESIGN_VERSION,
	DAILY_SWING_TRAINING_DIAGNOSTIC_VERSION,
	type DailySwingTrainingDiagnosticReport,
	type TrainingTargetSummary,
} from "@/lib/analysis/training-diagnostics.types";

export const ACTIONABLE_SUCCESS_R_THRESHOLD = 0.5;

type Episode = {
	instrumentId: string;
	displaySymbol: string;
	direction: AnalysisDatasetRow["features"]["direction"];
	rows: AnalysisDatasetRow[];
	selectedResolvedAt: number;
};

function round(value: number, precision = 8) {
	const multiplier = 10 ** precision;
	return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
}

function timestamp(value: string, label: string) {
	const result = new Date(value).getTime();
	if (!Number.isFinite(result)) throw new Error(`${label} must be a valid date`);
	return result;
}

function percentile(values: readonly number[], fraction: number) {
	if (values.length === 0) throw new Error("A percentile requires values");
	const sorted = [...values].sort((left, right) => left - right);
	return sorted[Math.ceil(fraction * sorted.length) - 1];
}

function buildEpisodes(rows: AnalysisDatasetRow[]) {
	const groups = new Map<string, AnalysisDatasetRow[]>();
	for (const row of rows) {
		const key = `${row.instrumentId}|${row.features.direction}`;
		const group = groups.get(key) ?? [];
		group.push(row);
		groups.set(key, group);
	}
	const episodes: Episode[] = [];
	for (const group of groups.values()) {
		group.sort(
			(left, right) =>
				timestamp(left.signalAt, `${left.rowId}.signalAt`) -
				timestamp(right.signalAt, `${right.rowId}.signalAt`),
		);
		let current: Episode | null = null;
		for (const row of group) {
			const signalAt = timestamp(row.signalAt, `${row.rowId}.signalAt`);
			const resolvedAt = timestamp(row.resolvedAt, `${row.rowId}.resolvedAt`);
			if (resolvedAt < signalAt) {
				throw new Error(`${row.rowId} resolves before its signal`);
			}
			if (current && signalAt <= current.selectedResolvedAt) {
				current.rows.push(row);
				continue;
			}
			current = {
				instrumentId: row.instrumentId,
				displaySymbol: row.displaySymbol,
				direction: row.features.direction,
				rows: [row],
				selectedResolvedAt: resolvedAt,
			};
			episodes.push(current);
		}
	}
	episodes.sort(
		(left, right) =>
			timestamp(left.rows[0].signalAt, `${left.rows[0].rowId}.signalAt`) -
			timestamp(right.rows[0].signalAt, `${right.rows[0].rowId}.signalAt`) ||
			left.displaySymbol.localeCompare(right.displaySymbol),
	);
	return episodes;
}

function finiteR(row: AnalysisDatasetRow) {
	const value = row.labels.netRMultiple;
	if (typeof value !== "number" || !Number.isFinite(value)) {
		throw new Error(`${row.rowId}.netRMultiple must be finite when triggered`);
	}
	return value;
}

function summarizeTargets(rows: AnalysisDatasetRow[]): TrainingTargetSummary {
	if (rows.length === 0) throw new Error("Target diagnostics require rows");
	const triggeredRows = rows.filter((row) => row.labels.triggered);
	const profitableTriggered = triggeredRows.filter((row) => {
		if (typeof row.labels.profitable !== "boolean") {
			throw new Error(`${row.rowId}.profitable must be boolean when triggered`);
		}
		return row.labels.profitable;
	}).length;
	const triggeredR = triggeredRows.map(finiteR);
	const utilities = rows.map((row) =>
		row.labels.triggered ? finiteR(row) : 0,
	);
	const actionableSuccesses = rows.filter(
		(row) =>
			row.labels.triggered &&
			finiteR(row) >= ACTIONABLE_SUCCESS_R_THRESHOLD,
	).length;
	const utilityMean =
		utilities.reduce((total, value) => total + value, 0) / utilities.length;
	const utilityVariance =
		utilities.reduce((total, value) => total + (value - utilityMean) ** 2, 0) /
		utilities.length;
	return {
		rows: rows.length,
		triggered: triggeredRows.length,
		triggerRate: round(triggeredRows.length / rows.length),
		profitableTriggered,
		profitRateAmongTriggered:
			triggeredRows.length === 0
				? null
				: round(profitableTriggered / triggeredRows.length),
		actionableSuccesses,
		actionableSuccessRate: round(actionableSuccesses / rows.length),
		averageNetRAmongTriggered:
			triggeredR.length === 0
				? null
				: round(
						triggeredR.reduce((total, value) => total + value, 0) /
							triggeredR.length,
					),
		averageSetupUtilityR: round(utilityMean),
		setupUtilityRStandardDeviation: round(Math.sqrt(utilityVariance)),
	};
}

function repeatSimilarity(episodes: Episode[]) {
	let comparisons = 0;
	let triggerAgreements = 0;
	let profitableComparisons = 0;
	let profitableAgreements = 0;
	const absoluteRDifferences: number[] = [];
	for (const episode of episodes) {
		const first = episode.rows[0];
		for (const repeated of episode.rows.slice(1)) {
			comparisons += 1;
			if (first.labels.triggered === repeated.labels.triggered) {
				triggerAgreements += 1;
			}
			if (first.labels.triggered && repeated.labels.triggered) {
				if (
					typeof first.labels.profitable !== "boolean" ||
					typeof repeated.labels.profitable !== "boolean"
				) {
					throw new Error("Triggered repeat rows require profitability labels");
				}
				profitableComparisons += 1;
				if (first.labels.profitable === repeated.labels.profitable) {
					profitableAgreements += 1;
				}
				absoluteRDifferences.push(
					Math.abs(finiteR(first) - finiteR(repeated)),
				);
			}
		}
	}
	return {
		comparisonsToEpisodeFirst: comparisons,
		triggerAgreementPercent:
			comparisons === 0 ? null : round((triggerAgreements / comparisons) * 100),
		profitableAgreementPercentWhenBothTriggered:
			profitableComparisons === 0
				? null
				: round((profitableAgreements / profitableComparisons) * 100),
		averageAbsoluteRDifferenceWhenBothTriggered:
			absoluteRDifferences.length === 0
				? null
				: round(
						absoluteRDifferences.reduce((total, value) => total + value, 0) /
							absoluteRDifferences.length,
					),
	};
}

export function diagnoseDailySwingTrainingData(input: {
	dataset: DailySwingAnalysisDataset;
	datasetSha256?: string;
	generatedAt?: Date;
}): DailySwingTrainingDiagnosticReport {
	if (input.dataset.datasetVersion !== DAILY_SWING_ANALYSIS_DATASET_VERSION) {
		throw new Error(
			`Dataset version ${input.dataset.datasetVersion} is not supported; expected ${DAILY_SWING_ANALYSIS_DATASET_VERSION}`,
		);
	}
	if (input.dataset.source.kind !== "exhaustive_setup_scan") {
		throw new Error("Training diagnostics require an exhaustive setup-scan dataset");
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
	const episodes = buildEpisodes(trainRows);
	const episodeFirstRows = episodes.map((episode) => episode.rows[0]);
	const sizes = episodes.map((episode) => episode.rows.length);
	const instrumentIds = [...new Set(episodes.map((episode) => episode.instrumentId))];
	const byInstrument = instrumentIds
		.map((instrumentId) => {
			const instrumentEpisodes = episodes.filter(
				(episode) => episode.instrumentId === instrumentId,
			);
			const rows = instrumentEpisodes.reduce(
				(total, episode) => total + episode.rows.length,
				0,
			);
			return {
				instrumentId,
				displaySymbol: instrumentEpisodes[0].displaySymbol,
				rows,
				episodes: instrumentEpisodes.length,
				reductionPercent: round(
					((rows - instrumentEpisodes.length) / rows) * 100,
				),
				maximumRowsPerEpisode: Math.max(
					...instrumentEpisodes.map((episode) => episode.rows.length),
				),
			};
		})
		.sort(
			(left, right) =>
				right.reductionPercent - left.reductionPercent ||
				left.displaySymbol.localeCompare(right.displaySymbol),
		);
	return {
		diagnosticVersion: DAILY_SWING_TRAINING_DIAGNOSTIC_VERSION,
		generatedAt: generatedAt.toISOString(),
		dataset: {
			datasetVersion: input.dataset.datasetVersion,
			sha256: input.datasetSha256?.trim() || null,
			sourceKind: input.dataset.source.kind,
			universeName: input.dataset.source.universeName,
			trainRows: trainRows.length,
			validationRows,
			testRows,
		},
		nonTrainPolicy: {
			validationFeaturesRead: false,
			validationLabelsRead: false,
			testFeaturesRead: false,
			testLabelsRead: false,
			description:
				"Validation and test rows are counted by split only. All episode and target diagnostics use train rows exclusively.",
		},
		episodeDefinition: {
			groupingKeys: ["instrumentId", "direction"],
			selection: "first_signal_while_prior_selected_setup_is_unresolved",
			sameResolutionSessionPolicy: "suppress",
			description:
				"Select the first setup, suppress later same-direction signals through its resolution session, then begin a new episode. Suppressed rows never extend the episode.",
		},
		episodes: {
			rows: trainRows.length,
			episodeCount: episodes.length,
			rowsRemovedByFirstSignalSelection: trainRows.length - episodes.length,
			reductionPercent: round(
				((trainRows.length - episodes.length) / trainRows.length) * 100,
			),
			singletonEpisodes: sizes.filter((size) => size === 1).length,
			multiRowEpisodes: sizes.filter((size) => size > 1).length,
			rowsInMultiRowEpisodes: sizes
				.filter((size) => size > 1)
				.reduce((total, size) => total + size, 0),
			averageRowsPerEpisode: round(trainRows.length / episodes.length),
			medianRowsPerEpisode: percentile(sizes, 0.5),
			p90RowsPerEpisode: percentile(sizes, 0.9),
			maximumRowsPerEpisode: Math.max(...sizes),
		},
		repeatOutcomeSimilarity: repeatSimilarity(episodes),
		byInstrument,
		targets: {
			actionableRThreshold: ACTIONABLE_SUCCESS_R_THRESHOLD,
			rowLevel: summarizeTargets(trainRows),
			episodeFirst: summarizeTargets(episodeFirstRows),
		},
		targetDesign: {
			version: DAILY_SWING_TARGET_DESIGN_VERSION,
			population: "episode_first_signals",
			primaryTarget: "actionable_success",
			primaryDefinition:
				"1 only when the selected first setup triggers and realizes at least +0.5 net R after costs; otherwise 0.",
			secondaryTarget: "setup_utility_r",
			secondaryDefinition:
				"Net R after costs for a triggered selected setup; exactly 0 for an untriggered selected setup.",
			rationale: [
				"One direct target avoids compounding separate trigger and conditional-profit model errors.",
				"A +0.5R threshold represents economically meaningful success rather than any result barely above zero.",
				"First-signal episode selection mirrors a deployable rule and reduces repeated-label dominance.",
				"Zero utility for untriggered setups represents no capital deployment without pretending the setup won or lost.",
			],
		},
		warnings: [
			"This report is descriptive target research using train rows only; it does not authorize another test evaluation.",
			"Episode-first filtering must be applied independently and chronologically inside each future split.",
			"Resolution timing determines when a new setup becomes eligible, but target values never influence episode selection.",
			"The redesigned target must be frozen before any new validation experiment is run.",
		],
	};
}
