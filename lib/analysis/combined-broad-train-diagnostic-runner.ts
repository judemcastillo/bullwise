import { createHash } from "node:crypto";
import {
	fitBaselineLinearModel,
	predictBaselineProbabilities,
} from "@/lib/analysis/baseline-model";
import type { BaselineTrainingConfiguration } from "@/lib/analysis/baseline-model.types";
import type { DailySwingCombinedBroadEpisodeRow } from "@/lib/analysis/combined-broad-episode-dataset.types";
import type {
	DailySwingCombinedBroadFoldDataset,
	DailySwingCombinedBroadFoldPartitionId,
} from "@/lib/analysis/combined-broad-fold-dataset.types";
import { DAILY_SWING_COMBINED_BROAD_FOLD_DATASET_VERSION } from "@/lib/analysis/combined-broad-fold-dataset.types";
import { DAILY_SWING_COMBINED_BROAD_MODEL_PROTOCOL } from "@/lib/analysis/combined-broad-model-development";
import {
	COMBINED_BROAD_CATEGORICAL_FEATURES,
	encodeCombinedBroadFeatureRows,
	fitCombinedBroadFeatureEncoder,
	type CombinedBroadFeatureEncoder,
} from "@/lib/analysis/combined-broad-model-features";
import {
	DAILY_SWING_COMBINED_BROAD_TRAIN_DIAGNOSTIC_PROTOCOL,
	DAILY_SWING_COMBINED_BROAD_TRAIN_DIAGNOSTIC_VERSION,
} from "@/lib/analysis/combined-broad-train-diagnostics";

type FoldId = "evaluate_2020" | "evaluate_2021" | "evaluate_2022";
type EpisodeRow = DailySwingCombinedBroadEpisodeRow & {
	partitionId: DailySwingCombinedBroadFoldPartitionId;
};

type ScoredRow = EpisodeRow & {
	foldId: FoldId;
	probability: number;
};

type CohortMetric = {
	cohort: string;
	value: string;
	rows: number;
	actionableSuccessRate: number;
	averageSetupUtilityR: number;
	medianSetupUtilityR: number;
};

type RejectedDevelopmentReport = {
	decision?: { status?: unknown };
	candidates?: Array<{ candidateId?: unknown }>;
};

function round(value: number, precision = 8) {
	const multiplier = 10 ** precision;
	return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
}

function average(values: readonly number[]) {
	if (values.length === 0) throw new Error("Cannot average an empty collection");
	return values.reduce((total, value) => total + value, 0) / values.length;
}

function median(values: readonly number[]) {
	if (values.length === 0) throw new Error("Cannot take the median of an empty collection");
	const sorted = [...values].sort((left, right) => left - right);
	const middle = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 0
		? (sorted[middle - 1] + sorted[middle]) / 2
		: sorted[middle];
}

function partition(dataset: DailySwingCombinedBroadFoldDataset, id: string) {
	return dataset.rows.filter((row) => row.partitionId === id) as EpisodeRow[];
}

function utility(row: EpisodeRow) {
	if (!Number.isFinite(row.targets.setupUtilityR)) {
		throw new Error(`${row.rowId}.setupUtilityR must be finite`);
	}
	return row.targets.setupUtilityR;
}

function cohortMetric(
	cohort: string,
	value: string,
	rows: readonly ScoredRow[],
): CohortMetric {
	const utilities = rows.map(utility);
	return {
		cohort,
		value,
		rows: rows.length,
		actionableSuccessRate: round(
			average(rows.map((row) => (row.targets.actionableSuccess ? 1 : 0))),
		),
		averageSetupUtilityR: round(average(utilities)),
		medianSetupUtilityR: round(median(utilities)),
	};
}

function categoricalValue(row: EpisodeRow, name: string) {
	const value = (row.features as unknown as Record<string, unknown>)[name];
	if (typeof value !== "string") throw new Error(`${row.rowId}.${name} must be a string`);
	return value;
}

function buildCohorts(rows: readonly ScoredRow[]) {
	const minimumRows =
		DAILY_SWING_COMBINED_BROAD_TRAIN_DIAGNOSTIC_PROTOCOL.cohortStability
			.minimumRows;
	const definitions: Array<{
		name: string;
		value: (row: ScoredRow) => string;
	}> = [
		{ name: "evaluation_fold", value: (row) => row.foldId },
		{ name: "source_scan", value: (row) => row.sourceScan },
		{ name: "direction", value: (row) => categoricalValue(row, "direction") },
		{ name: "setup_type", value: (row) => categoricalValue(row, "setupType") },
		{ name: "trend_regime", value: (row) => categoricalValue(row, "trendRegime") },
		{
			name: "volatility_regime",
			value: (row) => categoricalValue(row, "volatilityRegime"),
		},
	];
	return definitions.flatMap((definition) => {
		const groups = new Map<string, ScoredRow[]>();
		for (const row of rows) {
			const value = definition.value(row);
			groups.set(value, [...(groups.get(value) ?? []), row]);
		}
		return [...groups.entries()]
			.filter(([, group]) => group.length >= minimumRows)
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([value, group]) => cohortMetric(definition.name, value, group));
	});
}

function rawMissingRate(rows: readonly EpisodeRow[], name: string) {
	return average(
		rows.map((row) =>
			(row.features as unknown as Record<string, unknown>)[name] === null ? 1 : 0,
		),
	);
}

function totalVariationDistance(
	fitRows: readonly EpisodeRow[],
	evaluationRows: readonly EpisodeRow[],
	name: string,
	categories: readonly string[],
) {
	return (
		categories.reduce((total, category) => {
			const fitRate =
				fitRows.filter((row) => categoricalValue(row, name) === category).length /
				fitRows.length;
			const evaluationRate =
				evaluationRows.filter((row) => categoricalValue(row, name) === category)
					.length / evaluationRows.length;
			return total + Math.abs(fitRate - evaluationRate);
		}, 0) / 2
	);
}

function topByAbsoluteMetric<T extends Record<string, unknown>>(
	rows: readonly T[],
	metric: keyof T,
) {
	const limit =
		DAILY_SWING_COMBINED_BROAD_TRAIN_DIAGNOSTIC_PROTOCOL.featureDrift
			.reportLimitPerMetric;
	return [...rows]
		.sort((left, right) => {
			const difference =
				Math.abs(right[metric] as number) - Math.abs(left[metric] as number);
			return difference || String(left.feature).localeCompare(String(right.feature));
		})
		.slice(0, limit);
}

function featureDrift(
	foldId: FoldId,
	fitRows: readonly EpisodeRow[],
	evaluationRows: readonly EpisodeRow[],
	encoder: CombinedBroadFeatureEncoder,
) {
	const encodedEvaluation = encodeCombinedBroadFeatureRows(evaluationRows, encoder);
	const numeric = encoder.numeric.map((feature) => {
		const column = encoder.featureNames.indexOf(`numeric:${feature.name}`);
		if (column < 0) throw new Error(`Encoded numeric feature ${feature.name} is missing`);
		return {
			feature: feature.name,
			evaluationStandardizedMean: round(
				average(encodedEvaluation.map((values) => values[column])),
			),
			missingRateDifference: round(
				rawMissingRate(evaluationRows, feature.name) -
					rawMissingRate(fitRows, feature.name),
			),
		};
	});
	const categorical = Object.entries(COMBINED_BROAD_CATEGORICAL_FEATURES).map(
		([name, categories]) => ({
			feature: name,
			totalVariationDistance: round(
				totalVariationDistance(fitRows, evaluationRows, name, categories),
			),
		}),
	);
	return {
		foldId,
		numericStandardizedMean: topByAbsoluteMetric(
			numeric,
			"evaluationStandardizedMean",
		),
		missingRateDifference: topByAbsoluteMetric(numeric, "missingRateDifference"),
		categoricalTotalVariationDistance: topByAbsoluteMetric(
			categorical,
			"totalVariationDistance",
		),
	};
}

function averageRanks(values: readonly number[]) {
	const indexed = values
		.map((value, index) => ({ value, index }))
		.sort((left, right) => left.value - right.value || left.index - right.index);
	const ranks = Array<number>(values.length);
	for (let start = 0; start < indexed.length; ) {
		let end = start + 1;
		while (end < indexed.length && indexed[end].value === indexed[start].value) end++;
		const rank = (start + 1 + end) / 2;
		for (let index = start; index < end; index++) ranks[indexed[index].index] = rank;
		start = end;
	}
	return ranks;
}

function spearman(left: readonly number[], right: readonly number[]) {
	if (left.length !== right.length || left.length < 2) return null;
	const leftRanks = averageRanks(left);
	const rightRanks = averageRanks(right);
	const leftMean = average(leftRanks);
	const rightMean = average(rightRanks);
	let covariance = 0;
	let leftVariance = 0;
	let rightVariance = 0;
	for (let index = 0; index < left.length; index++) {
		const leftDelta = leftRanks[index] - leftMean;
		const rightDelta = rightRanks[index] - rightMean;
		covariance += leftDelta * rightDelta;
		leftVariance += leftDelta ** 2;
		rightVariance += rightDelta ** 2;
	}
	const denominator = Math.sqrt(leftVariance * rightVariance);
	return denominator === 0 ? null : round(covariance / denominator);
}

function scoreBins(rows: readonly ScoredRow[]) {
	const bins =
		DAILY_SWING_COMBINED_BROAD_TRAIN_DIAGNOSTIC_PROTOCOL.scoreDiagnostics.bins;
	const sorted = [...rows].sort(
		(left, right) =>
			left.probability - right.probability || left.rowId.localeCompare(right.rowId),
	);
	const grouped = Array.from({ length: bins }, () => [] as ScoredRow[]);
	for (const [index, row] of sorted.entries()) {
		grouped[Math.min(bins - 1, Math.floor((index * bins) / sorted.length))].push(row);
	}
	return grouped.map((group, index) => ({
		bin: index + 1,
		rows: group.length,
		averagePredictedProbability: round(
			average(group.map((row) => row.probability)),
		),
		actionableSuccessRate: round(
			average(group.map((row) => (row.targets.actionableSuccess ? 1 : 0))),
		),
		averageSetupUtilityR: round(average(group.map(utility))),
	}));
}

function foldScoreMetric(foldId: FoldId, rows: readonly ScoredRow[]) {
	const sorted = [...rows].sort(
		(left, right) =>
			right.probability - left.probability || left.rowId.localeCompare(right.rowId),
	);
	const top = sorted.slice(0, Math.max(1, Math.ceil(sorted.length / 10)));
	const allUtility = average(rows.map(utility));
	const allSuccess = average(
		rows.map((row) => (row.targets.actionableSuccess ? 1 : 0)),
	);
	return {
		foldId,
		rows: rows.length,
		topDecileRows: top.length,
		spearmanScoreToUtility: spearman(
			rows.map((row) => row.probability),
			rows.map(utility),
		),
		topDecileUtilityImprovementR: round(average(top.map(utility)) - allUtility),
		topDecileActionableSuccessRateLift: round(
			average(top.map((row) => (row.targets.actionableSuccess ? 1 : 0))) -
				allSuccess,
		),
	};
}

function validateInputs(input: {
	dataset: DailySwingCombinedBroadFoldDataset;
	datasetSha256: string;
	rejectedDevelopmentReport: RejectedDevelopmentReport;
	rejectedDevelopmentReportSha256: string;
}) {
	const protocol = DAILY_SWING_COMBINED_BROAD_TRAIN_DIAGNOSTIC_PROTOCOL;
	if (input.datasetSha256.toLowerCase() !== protocol.sources.foldDataset.sha256) {
		throw new Error("Fold dataset checksum does not match the diagnostic protocol");
	}
	if (
		input.rejectedDevelopmentReportSha256.toLowerCase() !==
		protocol.sources.rejectedDevelopmentReport.sha256
	) {
		throw new Error("Rejected development report checksum does not match the diagnostic protocol");
	}
	if (
		input.dataset.datasetVersion !== DAILY_SWING_COMBINED_BROAD_FOLD_DATASET_VERSION ||
		input.dataset.materializationPolicy.validationFeaturesDeserialized !== false ||
		input.dataset.materializationPolicy.validationLabelsDeserialized !== false ||
		input.dataset.materializationPolicy.testFeaturesDeserialized !== false ||
		input.dataset.materializationPolicy.testLabelsDeserialized !== false
	) {
		throw new Error("Fold dataset does not satisfy the train-only diagnostic protocol");
	}
	if (
		input.rejectedDevelopmentReport.decision?.status !==
			protocol.sources.rejectedDevelopmentReport.decision ||
		!input.rejectedDevelopmentReport.candidates?.some(
			(candidate) => candidate.candidateId === protocol.representativeModel.candidateId,
		)
	) {
		throw new Error("Development report is not the frozen rejected experiment");
	}
	const evaluationRowIds = new Set<string>();
	for (const partitionId of protocol.dataAccess.partitions) {
		const expected = input.dataset.partitions.find(
			(inventory) => inventory.partitionId === partitionId,
		)?.episodeRows;
		const rows = partition(input.dataset, partitionId);
		if (expected === undefined || rows.length !== expected || rows.length === 0) {
			throw new Error(`${partitionId} row count does not reconcile`);
		}
		const partitionRowIds = new Set<string>();
		for (const row of rows) {
			if (partitionRowIds.has(row.rowId)) {
				throw new Error(`Duplicate row ID within ${partitionId}: ${row.rowId}`);
			}
			partitionRowIds.add(row.rowId);
			if (partitionId.endsWith("_evaluation")) {
				if (evaluationRowIds.has(row.rowId)) {
					throw new Error(`Duplicate out-of-fold evaluation row ID: ${row.rowId}`);
				}
				evaluationRowIds.add(row.rowId);
			}
		}
	}
}

function representativeConfiguration(): BaselineTrainingConfiguration {
	const candidate = DAILY_SWING_COMBINED_BROAD_MODEL_PROTOCOL.candidates.find(
		(item) =>
			item.candidateId ===
			DAILY_SWING_COMBINED_BROAD_TRAIN_DIAGNOSTIC_PROTOCOL.representativeModel
				.candidateId,
	);
	if (!candidate || candidate.kind !== "l2_logistic_regression") {
		throw new Error("Frozen representative model configuration is missing");
	}
	return {
		optimizer: "batch_gradient_descent",
		iterations: candidate.iterations,
		learningRate: candidate.learningRate,
		l2Penalty: candidate.l2Penalty,
		classificationThreshold: 0.5,
	};
}

export function runDailySwingCombinedBroadTrainDiagnostics(input: {
	dataset: DailySwingCombinedBroadFoldDataset;
	datasetSha256: string;
	rejectedDevelopmentReport: RejectedDevelopmentReport;
	rejectedDevelopmentReportSha256: string;
	generatedAt?: Date;
}) {
	validateInputs(input);
	const generatedAt = input.generatedAt ?? new Date();
	if (Number.isNaN(generatedAt.getTime())) throw new Error("generatedAt must be valid");
	const configuration = representativeConfiguration();
	const scoredRows: ScoredRow[] = [];
	const drift = [];
	for (const fold of DAILY_SWING_COMBINED_BROAD_MODEL_PROTOCOL.walkForwardFolds) {
		const foldId = fold.foldId as FoldId;
		const fitRows = partition(input.dataset, `${foldId}_fit`);
		const evaluationRows = partition(input.dataset, `${foldId}_evaluation`);
		const encoder = fitCombinedBroadFeatureEncoder(fitRows);
		const fitted = fitBaselineLinearModel({
			features: encodeCombinedBroadFeatureRows(fitRows, encoder),
			targets: fitRows.map((row) => (row.targets.actionableSuccess ? 1 : 0)),
			kind: "logistic_regression",
			target: "actionable_success",
			featureNames: encoder.featureNames,
			configuration,
		});
		const probabilities = predictBaselineProbabilities(
			fitted,
			encodeCombinedBroadFeatureRows(evaluationRows, encoder),
		);
		scoredRows.push(
			...evaluationRows.map((row, index) => ({
				...row,
				foldId,
				probability: probabilities[index],
			})),
		);
		drift.push(featureDrift(foldId, fitRows, evaluationRows, encoder));
	}
	const foldMetrics = DAILY_SWING_COMBINED_BROAD_MODEL_PROTOCOL.walkForwardFolds.map(
		(fold) => {
			const foldRows = scoredRows.filter((row) => row.foldId === fold.foldId);
			return foldScoreMetric(fold.foldId as FoldId, foldRows);
		},
	);
	const cohorts = buildCohorts(scoredRows);
	const evaluationFoldCohorts = cohorts.filter(
		(cohort) => cohort.cohort === "evaluation_fold",
	);
	const actionableRates = evaluationFoldCohorts.map(
		(cohort) => cohort.actionableSuccessRate,
	);
	const averageUtilities = evaluationFoldCohorts.map(
		(cohort) => cohort.averageSetupUtilityR,
	);
	const allNumeric = drift.flatMap((fold) => fold.numericStandardizedMean);
	const allMissing = drift.flatMap((fold) => fold.missingRateDifference);
	const allCategorical = drift.flatMap(
		(fold) => fold.categoricalTotalVariationDistance,
	);
	const actuals = {
		evaluationFoldActionableRateRange:
			actionableRates.length === 0
				? null
				: round(Math.max(...actionableRates) - Math.min(...actionableRates)),
		evaluationFoldAverageUtilityRangeR:
			averageUtilities.length === 0
				? null
				: round(Math.max(...averageUtilities) - Math.min(...averageUtilities)),
		maximumAbsoluteStandardizedMean: Math.max(
			...allNumeric.map((item) => Math.abs(item.evaluationStandardizedMean)),
		),
		maximumAbsoluteMissingRateDifference: Math.max(
			...allMissing.map((item) => Math.abs(item.missingRateDifference)),
		),
		maximumCategoricalTotalVariationDistance: Math.max(
			...allCategorical.map((item) => item.totalVariationDistance),
		),
	};
	const flagValues = [
		actuals.evaluationFoldActionableRateRange,
		actuals.evaluationFoldAverageUtilityRangeR,
		actuals.maximumAbsoluteStandardizedMean,
		actuals.maximumAbsoluteMissingRateDifference,
		actuals.maximumCategoricalTotalVariationDistance,
	];
	const flags = DAILY_SWING_COMBINED_BROAD_TRAIN_DIAGNOSTIC_PROTOCOL.diagnosticFlags.map(
		(flag, index) => ({
			id: flag.id,
			metric: flag.metric,
			threshold: flag.threshold,
			actual: flagValues[index],
			flagged: flagValues[index] !== null && flagValues[index]! > flag.threshold,
		}),
	);
	const utilityImprovements = foldMetrics.map(
		(fold) => fold.topDecileUtilityImprovementR,
	);
	const correlations = foldMetrics.flatMap((fold) =>
		fold.spearmanScoreToUtility === null ? [] : [fold.spearmanScoreToUtility],
	);
	const decisionActuals = {
		foldsWithPositiveTopDecileUtilityImprovement: utilityImprovements.filter(
			(value) => value > 0,
		).length,
		meanTopDecileUtilityImprovementR: round(average(utilityImprovements)),
		meanSpearmanScoreToUtility:
			correlations.length === foldMetrics.length ? round(average(correlations)) : null,
	};
	const requirements =
		DAILY_SWING_COMBINED_BROAD_TRAIN_DIAGNOSTIC_PROTOCOL.nextResearchDecision
			.expectedUtilityCandidateRequires;
	const eligibleToProposeExpectedUtilityProtocol =
		decisionActuals.foldsWithPositiveTopDecileUtilityImprovement >=
			requirements.minimumFoldsWithPositiveTopDecileUtilityImprovement &&
		decisionActuals.meanTopDecileUtilityImprovementR >=
			requirements.minimumMeanTopDecileUtilityImprovementR &&
		decisionActuals.meanSpearmanScoreToUtility !== null &&
		decisionActuals.meanSpearmanScoreToUtility >=
			requirements.minimumMeanSpearmanScoreToUtility;
	return {
		reportVersion: "1.0.0",
		generatedAt: generatedAt.toISOString(),
		diagnosticId:
			DAILY_SWING_COMBINED_BROAD_TRAIN_DIAGNOSTIC_PROTOCOL.diagnosticId,
		diagnosticVersion:
			DAILY_SWING_COMBINED_BROAD_TRAIN_DIAGNOSTIC_VERSION,
		protocolSha256: createHash("sha256")
			.update(JSON.stringify(DAILY_SWING_COMBINED_BROAD_TRAIN_DIAGNOSTIC_PROTOCOL))
			.digest("hex"),
		inputs: {
			foldDatasetSha256: input.datasetSha256.toLowerCase(),
			rejectedDevelopmentReportSha256:
				input.rejectedDevelopmentReportSha256.toLowerCase(),
		},
		dataAccess: {
			partitions: [
				...DAILY_SWING_COMBINED_BROAD_TRAIN_DIAGNOSTIC_PROTOCOL.dataAccess
					.partitions,
			],
			validationFeaturesRead: false,
			validationLabelsRead: false,
			testFeaturesRead: false,
			testLabelsRead: false,
		},
		representativeModel: {
			candidateId:
				DAILY_SWING_COMBINED_BROAD_TRAIN_DIAGNOSTIC_PROTOCOL.representativeModel
					.candidateId,
			configuration,
			status: "rejected_diagnostic_only",
		},
		cohortStability: cohorts,
		featureDrift: drift,
		scoreDiagnostics: {
			pooledDeciles: scoreBins(scoredRows),
			folds: foldMetrics,
		},
		diagnosticFlagActuals: actuals,
		flags,
		nextResearchDecision: {
			actuals: decisionActuals,
			eligibleToProposeExpectedUtilityProtocol,
			authorizesModelFitting: false,
			status: eligibleToProposeExpectedUtilityProtocol
				? "eligible_to_propose_separate_expected_utility_protocol"
				: "revisit_strategy_target_or_signal_time_features",
		},
		warnings: [
			"This is train-only diagnostic evidence, not validation or test evidence.",
			"The representative classifier remains rejected and cannot produce customer signals.",
			"No instrument-level outcomes are included.",
		],
	};
}
