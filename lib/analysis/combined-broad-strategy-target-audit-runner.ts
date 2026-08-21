import { createHash } from "node:crypto";
import type { DailySwingCombinedBroadEpisodeRow } from "@/lib/analysis/combined-broad-episode-dataset.types";
import {
	DAILY_SWING_COMBINED_BROAD_FOLD_DATASET_VERSION,
	type DailySwingCombinedBroadFoldDataset,
	type DailySwingCombinedBroadFoldPartitionId,
} from "@/lib/analysis/combined-broad-fold-dataset.types";
import {
	DAILY_SWING_COMBINED_BROAD_STRATEGY_TARGET_AUDIT_PROTOCOL,
	DAILY_SWING_COMBINED_BROAD_STRATEGY_TARGET_AUDIT_VERSION,
} from "@/lib/analysis/combined-broad-strategy-target-audit";

type EvaluationFold = "evaluate_2020" | "evaluate_2021" | "evaluate_2022";
type EpisodeRow = DailySwingCombinedBroadEpisodeRow & {
	partitionId: DailySwingCombinedBroadFoldPartitionId;
};
type AuditRow = EpisodeRow & { evaluationFold: EvaluationFold };
type TrainDiagnosticReport = {
	nextResearchDecision?: { status?: unknown };
};

type UtilityMetrics = {
	rows: number;
	actionableSuccessRate: number;
	averageSetupUtilityR: number;
	medianSetupUtilityR: number;
	lossRate: number;
	flatRate: number;
	modestGainRate: number;
	actionableGainRate: number;
	grossPositiveUtilityR: number;
	grossNegativeUtilityR: number;
	profitFactor: number | null;
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

function feature(row: EpisodeRow, name: string) {
	const value = (row.features as unknown as Record<string, unknown>)[name];
	if (typeof value !== "string") throw new Error(`${row.rowId}.${name} must be a string`);
	return value;
}

function utility(row: EpisodeRow) {
	const value = row.targets.setupUtilityR;
	if (!Number.isFinite(value)) throw new Error(`${row.rowId}.setupUtilityR must be finite`);
	return value;
}

function utilityMetrics(rows: readonly AuditRow[]): UtilityMetrics {
	const utilities = rows.map(utility);
	const threshold =
		DAILY_SWING_COMBINED_BROAD_STRATEGY_TARGET_AUDIT_PROTOCOL.utilityDefinition
			.actionableSuccessThresholdR;
	const positive = utilities.filter((value) => value > 0);
	const negative = utilities.filter((value) => value < 0);
	const grossPositive = positive.reduce((total, value) => total + value, 0);
	const grossNegative = negative.reduce((total, value) => total + value, 0);
	return {
		rows: rows.length,
		actionableSuccessRate: round(
			average(rows.map((row) => (row.targets.actionableSuccess ? 1 : 0))),
		),
		averageSetupUtilityR: round(average(utilities)),
		medianSetupUtilityR: round(median(utilities)),
		lossRate: round(negative.length / rows.length),
		flatRate: round(utilities.filter((value) => value === 0).length / rows.length),
		modestGainRate: round(
			utilities.filter((value) => value > 0 && value < threshold).length /
				rows.length,
		),
		actionableGainRate: round(
			utilities.filter((value) => value >= threshold).length / rows.length,
		),
		grossPositiveUtilityR: round(grossPositive),
		grossNegativeUtilityR: round(grossNegative),
		profitFactor:
			grossNegative === 0 ? null : round(grossPositive / Math.abs(grossNegative)),
	};
}

function profitFactorPass(metrics: UtilityMetrics, threshold: number) {
	return metrics.grossNegativeUtilityR === 0
		? metrics.grossPositiveUtilityR > 0
		: metrics.profitFactor !== null && metrics.profitFactor >= threshold;
}

function groupRows(
	rows: readonly AuditRow[],
	value: (row: AuditRow) => string,
) {
	const groups = new Map<string, AuditRow[]>();
	for (const row of rows) {
		const key = value(row);
		const group = groups.get(key);
		if (group) group.push(row);
		else groups.set(key, [row]);
	}
	return groups;
}

const COHORT_DEFINITIONS = [
	{ id: "evaluation_fold", value: (row: AuditRow) => row.evaluationFold },
	{ id: "source_scan", value: (row: AuditRow) => row.sourceScan },
	{ id: "direction", value: (row: AuditRow) => feature(row, "direction") },
	{ id: "setup_type", value: (row: AuditRow) => feature(row, "setupType") },
	{ id: "trend_regime", value: (row: AuditRow) => feature(row, "trendRegime") },
	{
		id: "volatility_regime",
		value: (row: AuditRow) => feature(row, "volatilityRegime"),
	},
	{
		id: "direction_x_setup_type",
		value: (row: AuditRow) =>
			`${feature(row, "direction")}|${feature(row, "setupType")}`,
	},
	{
		id: "setup_type_x_trend_regime",
		value: (row: AuditRow) =>
			`${feature(row, "setupType")}|${feature(row, "trendRegime")}`,
	},
	{
		id: "trend_regime_x_volatility_regime",
		value: (row: AuditRow) =>
			`${feature(row, "trendRegime")}|${feature(row, "volatilityRegime")}`,
	},
] as const;

function buildCohorts(rows: readonly AuditRow[]) {
	const minimumRows =
		DAILY_SWING_COMBINED_BROAD_STRATEGY_TARGET_AUDIT_PROTOCOL.cohortAudit
			.minimumRows;
	return COHORT_DEFINITIONS.flatMap((definition) =>
		[...groupRows(rows, definition.value).entries()]
			.filter(([, group]) => group.length >= minimumRows)
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([value, group]) => ({
				cohort: definition.id,
				value,
				...utilityMetrics(group),
			})),
	);
}

function buildCandidates(rows: readonly AuditRow[]) {
	const policy =
		DAILY_SWING_COMBINED_BROAD_STRATEGY_TARGET_AUDIT_PROTOCOL
			.strategyCandidateNomination;
	const candidates = groupRows(
		rows,
		(row) => `${feature(row, "direction")}|${feature(row, "setupType")}`,
	);
	return [...candidates.entries()]
		.sort(([left], [right]) => left.localeCompare(right))
		.map(([cohort, group]) => {
			const overall = utilityMetrics(group);
			const folds = (["evaluate_2020", "evaluate_2021", "evaluate_2022"] as const).map(
				(foldId) => {
					const foldRows = group.filter((row) => row.evaluationFold === foldId);
					return {
						foldId,
						...(foldRows.length === 0 ? { rows: 0, metrics: null } : {
							rows: foldRows.length,
							metrics: utilityMetrics(foldRows),
						}),
					};
				},
			);
			const foldMetrics = folds.flatMap((fold) =>
				fold.metrics === null ? [] : [fold.metrics],
			);
			const foldUtilities = foldMetrics.map((metrics) => metrics.averageSetupUtilityR);
			const utilityRange =
				foldUtilities.length === folds.length
					? round(Math.max(...foldUtilities) - Math.min(...foldUtilities))
					: null;
			const gates = [
				{
					id: "minimum_total_rows",
					actual: overall.rows,
					threshold: policy.minimumTotalRows,
					passed: overall.rows >= policy.minimumTotalRows,
				},
				{
					id: "minimum_rows_per_evaluation_fold",
					actual: Math.min(...folds.map((fold) => fold.rows)),
					threshold: policy.minimumRowsPerEvaluationFold,
					passed: folds.every(
						(fold) => fold.rows >= policy.minimumRowsPerEvaluationFold,
					),
				},
				{
					id: "minimum_overall_average_utility_r",
					actual: overall.averageSetupUtilityR,
					threshold: policy.minimumOverallAverageUtilityR,
					passed:
						overall.averageSetupUtilityR >= policy.minimumOverallAverageUtilityR,
				},
				{
					id: "minimum_evaluation_fold_average_utility_r",
					actual:
						foldMetrics.length === folds.length
							? Math.min(...foldUtilities)
							: null,
					threshold: policy.minimumEvaluationFoldAverageUtilityR,
					passed:
						foldMetrics.length === folds.length &&
						foldUtilities.every(
							(value) => value >= policy.minimumEvaluationFoldAverageUtilityR,
						),
				},
				{
					id: "maximum_evaluation_fold_average_utility_range_r",
					actual: utilityRange,
					threshold: policy.maximumEvaluationFoldAverageUtilityRangeR,
					passed:
						utilityRange !== null &&
						utilityRange <= policy.maximumEvaluationFoldAverageUtilityRangeR,
				},
				{
					id: "minimum_overall_profit_factor",
					actual: overall.profitFactor,
					threshold: policy.minimumOverallProfitFactor,
					passed: profitFactorPass(overall, policy.minimumOverallProfitFactor),
				},
				{
					id: "minimum_evaluation_fold_profit_factor",
					actual:
						foldMetrics.length === folds.length
							? Math.min(
									...foldMetrics.map((metrics) =>
										metrics.profitFactor ?? Number.POSITIVE_INFINITY,
									),
								)
							: null,
					threshold: policy.minimumEvaluationFoldProfitFactor,
					passed:
						foldMetrics.length === folds.length &&
						foldMetrics.every((metrics) =>
							profitFactorPass(
								metrics,
								policy.minimumEvaluationFoldProfitFactor,
							),
						),
				},
			];
			return {
				cohort,
				overall,
				folds,
				averageUtilityRangeR: utilityRange,
				gates,
				nominated: gates.every((gate) => gate.passed),
			};
		});
}

function validateInputs(input: {
	dataset: DailySwingCombinedBroadFoldDataset;
	datasetSha256: string;
	trainDiagnosticReport: TrainDiagnosticReport;
	trainDiagnosticReportSha256: string;
}) {
	const protocol = DAILY_SWING_COMBINED_BROAD_STRATEGY_TARGET_AUDIT_PROTOCOL;
	if (input.datasetSha256.toLowerCase() !== protocol.sources.foldDataset.sha256) {
		throw new Error("Fold dataset checksum does not match the strategy audit protocol");
	}
	if (
		input.trainDiagnosticReportSha256.toLowerCase() !==
		protocol.sources.trainDiagnosticReport.sha256
	) {
		throw new Error("Train diagnostic checksum does not match the strategy audit protocol");
	}
	if (
		input.trainDiagnosticReport.nextResearchDecision?.status !==
		protocol.sources.trainDiagnosticReport.decision
	) {
		throw new Error("Train diagnostic does not contain the frozen rejection decision");
	}
	if (
		input.dataset.datasetVersion !== DAILY_SWING_COMBINED_BROAD_FOLD_DATASET_VERSION ||
		input.dataset.materializationPolicy.validationFeaturesDeserialized !== false ||
		input.dataset.materializationPolicy.validationLabelsDeserialized !== false ||
		input.dataset.materializationPolicy.testFeaturesDeserialized !== false ||
		input.dataset.materializationPolicy.testLabelsDeserialized !== false
	) {
		throw new Error("Fold dataset does not satisfy the sealed-split policy");
	}
}

function evaluationRows(dataset: DailySwingCombinedBroadFoldDataset) {
	const protocol = DAILY_SWING_COMBINED_BROAD_STRATEGY_TARGET_AUDIT_PROTOCOL;
	const rows = protocol.dataAccess.partitions.flatMap((partitionId) => {
		const partitionRows = dataset.rows.filter(
			(row) => row.partitionId === partitionId,
		) as EpisodeRow[];
		const inventory = dataset.partitions.find(
			(item) => item.partitionId === partitionId,
		);
		if (!inventory || inventory.episodeRows !== partitionRows.length) {
			throw new Error(`${partitionId} row count does not reconcile`);
		}
		const evaluationFold = partitionId.replace("_evaluation", "") as EvaluationFold;
		const ids = new Set<string>();
		return partitionRows.map((row) => {
			if (ids.has(row.rowId)) {
				throw new Error(`Duplicate row ID within ${partitionId}: ${row.rowId}`);
			}
			ids.add(row.rowId);
			return { ...row, evaluationFold };
		});
	});
	if (rows.length !== protocol.dataAccess.expectedRows) {
		throw new Error("Strategy audit population does not match the frozen row count");
	}
	const ids = new Set<string>();
	for (const row of rows) {
		if (ids.has(row.rowId)) throw new Error(`Duplicate evaluation row ID: ${row.rowId}`);
		ids.add(row.rowId);
		const expected =
			utility(row) >= protocol.utilityDefinition.actionableSuccessThresholdR;
		if (row.targets.actionableSuccess !== expected) {
			throw new Error(`${row.rowId} violates the frozen actionable-success identity`);
		}
	}
	return rows;
}

export function runDailySwingCombinedBroadStrategyTargetAudit(input: {
	dataset: DailySwingCombinedBroadFoldDataset;
	datasetSha256: string;
	trainDiagnosticReport: TrainDiagnosticReport;
	trainDiagnosticReportSha256: string;
	generatedAt?: Date;
}) {
	validateInputs(input);
	const generatedAt = input.generatedAt ?? new Date();
	if (Number.isNaN(generatedAt.getTime())) throw new Error("generatedAt must be valid");
	const rows = evaluationRows(input.dataset);
	const threshold =
		DAILY_SWING_COMBINED_BROAD_STRATEGY_TARGET_AUDIT_PROTOCOL.utilityDefinition
			.actionableSuccessThresholdR;
	const positiveRows = rows.filter((row) => utility(row) > 0);
	const modestRows = positiveRows.filter((row) => utility(row) < threshold);
	const positiveUtility = positiveRows.reduce((total, row) => total + utility(row), 0);
	const modestUtility = modestRows.reduce((total, row) => total + utility(row), 0);
	const compressionThreshold =
		DAILY_SWING_COMBINED_BROAD_STRATEGY_TARGET_AUDIT_PROTOCOL
			.targetCompressionAudit.flagWhenPositiveUtilityShareBelowThresholdIsAtLeast;
	const targetCompression = {
		positiveUtilityRows: positiveRows.length,
		positiveUtilityRowsBelowActionableThreshold: modestRows.length,
		shareOfPositiveRowsBelowActionableThreshold:
			positiveRows.length === 0 ? null : round(modestRows.length / positiveRows.length),
		positiveUtilityR: round(positiveUtility),
		positiveUtilityRBelowActionableThreshold: round(modestUtility),
		shareOfPositiveUtilityRBelowActionableThreshold:
			positiveUtility === 0 ? null : round(modestUtility / positiveUtility),
		flagged:
			positiveUtility > 0 && modestUtility / positiveUtility >= compressionThreshold,
	};
	const candidates = buildCandidates(rows);
	const nominatedCandidates = candidates
		.filter((candidate) => candidate.nominated)
		.map((candidate) => candidate.cohort);
	return {
		reportVersion: "1.0.0",
		generatedAt: generatedAt.toISOString(),
		auditId: DAILY_SWING_COMBINED_BROAD_STRATEGY_TARGET_AUDIT_PROTOCOL.auditId,
		auditVersion: DAILY_SWING_COMBINED_BROAD_STRATEGY_TARGET_AUDIT_VERSION,
		protocolSha256: createHash("sha256")
			.update(
				JSON.stringify(DAILY_SWING_COMBINED_BROAD_STRATEGY_TARGET_AUDIT_PROTOCOL),
			)
			.digest("hex"),
		inputs: {
			foldDatasetSha256: input.datasetSha256.toLowerCase(),
			trainDiagnosticReportSha256: input.trainDiagnosticReportSha256.toLowerCase(),
		},
		dataAccess: {
			partitions: [
				...DAILY_SWING_COMBINED_BROAD_STRATEGY_TARGET_AUDIT_PROTOCOL.dataAccess
					.partitions,
			],
			rows: rows.length,
			fitPartitionsUsed: false,
			validationFeaturesRead: false,
			validationLabelsRead: false,
			testFeaturesRead: false,
			testLabelsRead: false,
		},
		overall: utilityMetrics(rows),
		targetConsistency: {
			checkedRows: rows.length,
			violations: 0,
			passed: true,
		},
		targetCompression,
		cohorts: buildCohorts(rows),
		strategyCandidates: candidates,
		decision: {
			status:
				nominatedCandidates.length > 0
					? "nominate_for_separate_strategy_experiment"
					: "redesign_strategy_mechanics",
			nominatedCandidates,
			targetHypothesisEligible: targetCompression.flagged,
			authorizesStrategyChange: false,
			authorizesModelFitting: false,
			authorizesValidationAccess: false,
		},
		warnings: [
			"This is exploratory train-only evidence, not proof of profitability.",
			"Nominated cohorts require a separately frozen experiment before validation.",
			"No instrument-level outcomes are included.",
		],
	};
}
