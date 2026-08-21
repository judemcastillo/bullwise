import { createHash } from "node:crypto";
import {
	compareClassificationToConstantBaseline,
	evaluateClassificationMetrics,
	fitBaselineLinearModel,
	predictBaselineProbabilities,
} from "@/lib/analysis/baseline-model";
import type { BaselineTrainingConfiguration } from "@/lib/analysis/baseline-model.types";
import type { DailySwingCombinedBroadEpisodeRow } from "@/lib/analysis/combined-broad-episode-dataset.types";
import {
	DAILY_SWING_COMBINED_BROAD_FOLD_DATASET_SHA256,
	DAILY_SWING_COMBINED_BROAD_FOLD_DATASET_VERSION,
	type DailySwingCombinedBroadFoldDataset,
	type DailySwingCombinedBroadFoldPartitionId,
} from "@/lib/analysis/combined-broad-fold-dataset.types";
import {
	DAILY_SWING_COMBINED_BROAD_MODEL_PROTOCOL,
	DAILY_SWING_COMBINED_BROAD_MODEL_PROTOCOL_VERSION,
} from "@/lib/analysis/combined-broad-model-development";
import {
	encodeCombinedBroadFeatureRows,
	fitCombinedBroadFeatureEncoder,
} from "@/lib/analysis/combined-broad-model-features";

type FoldId = "evaluate_2020" | "evaluate_2021" | "evaluate_2022";
type SourceScan = "base" | "expansion";
type EpisodeRow = DailySwingCombinedBroadEpisodeRow & {
	partitionId: DailySwingCombinedBroadFoldPartitionId;
};

export type CombinedBroadDevelopmentActuals = Record<
	(typeof DAILY_SWING_COMBINED_BROAD_MODEL_PROTOCOL.selectionPolicy.robustnessGates)[number]["metric"],
	number | null
>;

type FoldReport = {
	foldId: FoldId;
	fitRows: number;
	evaluationRows: number;
	fitActionableRate: number;
	evaluationActionableRate: number;
	classification: ReturnType<typeof compareClassificationToConstantBaseline>;
	selection: {
		fitNearestRank: number;
		probabilityCutoff: number;
		rows: number;
		actionableRateLift: number | null;
		averageUtilityR: number | null;
		utilityImprovementR: number | null;
	};
};

export type CombinedBroadCandidateReport = {
	candidateId: string;
	l2Penalty: number;
	folds: FoldReport[];
	actuals: CombinedBroadDevelopmentActuals;
	gates: Array<{
		metric: keyof CombinedBroadDevelopmentActuals;
		operator: "=" | ">=";
		threshold: number;
		actual: number | null;
		passed: boolean;
	}>;
	passed: boolean;
};

function round(value: number, precision = 8) {
	const multiplier = 10 ** precision;
	return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
}

function average(values: readonly number[]) {
	if (values.length === 0) throw new Error("Cannot average an empty collection");
	return values.reduce((total, value) => total + value, 0) / values.length;
}

function binaryTargets(rows: readonly EpisodeRow[]) {
	return rows.map((row) => (row.targets.actionableSuccess ? 1 : 0));
}

function utilities(rows: readonly EpisodeRow[]) {
	return rows.map((row) => {
		const value = row.targets.setupUtilityR;
		if (!Number.isFinite(value)) throw new Error(`${row.rowId}.setupUtilityR must be finite`);
		return value;
	});
}

function nearestRank(values: readonly number[], quantile: number) {
	if (values.length === 0) throw new Error("Nearest-rank cutoff requires fit scores");
	const sorted = [...values].sort((left, right) => left - right);
	const rank = Math.max(1, Math.ceil(quantile * sorted.length));
	return { rank, value: sorted[rank - 1] };
}

function partition(dataset: DailySwingCombinedBroadFoldDataset, id: string) {
	return dataset.rows.filter((row) => row.partitionId === id) as EpisodeRow[];
}

function trainingConfiguration(candidate: {
	iterations: number;
	learningRate: number;
	l2Penalty: number;
}): BaselineTrainingConfiguration {
	return {
		optimizer: "batch_gradient_descent",
		iterations: candidate.iterations,
		learningRate: candidate.learningRate,
		l2Penalty: candidate.l2Penalty,
		classificationThreshold: 0.5,
	};
}

function pooledSourceAuc(
	rows: readonly EpisodeRow[],
	probabilities: readonly number[],
	sourceScan: SourceScan,
) {
	const indexes = rows.flatMap((row, index) =>
		row.sourceScan === sourceScan ? [index] : [],
	);
	if (indexes.length < 100) return null;
	const targets = indexes.map((index) =>
		rows[index].targets.actionableSuccess ? 1 : 0,
	);
	const scores = indexes.map((index) => probabilities[index]);
	return evaluateClassificationMetrics(targets, scores, 0.5).rocAuc;
}

export function evaluateCombinedBroadDevelopmentGates(
	actuals: CombinedBroadDevelopmentActuals,
) {
	return DAILY_SWING_COMBINED_BROAD_MODEL_PROTOCOL.selectionPolicy.robustnessGates.map(
		(gate) => {
			const actual = actuals[gate.metric];
			return {
				metric: gate.metric,
				operator: gate.operator,
				threshold: gate.threshold,
				actual,
				passed:
					actual !== null &&
					(gate.operator === "="
						? actual === gate.threshold
						: actual >= gate.threshold),
			};
		},
	);
}

function evaluateCandidate(
	dataset: DailySwingCombinedBroadFoldDataset,
	candidate: {
		candidateId: string;
		iterations: number;
		learningRate: number;
		l2Penalty: number;
	},
): CombinedBroadCandidateReport {
	const outOfFoldRows: EpisodeRow[] = [];
	const outOfFoldProbabilities: number[] = [];
	const folds: FoldReport[] = [];
	for (const fold of DAILY_SWING_COMBINED_BROAD_MODEL_PROTOCOL.walkForwardFolds) {
		const fitRows = partition(dataset, `${fold.foldId}_fit`);
		const evaluationRows = partition(dataset, `${fold.foldId}_evaluation`);
		const encoder = fitCombinedBroadFeatureEncoder(fitRows);
		const fitValues = encodeCombinedBroadFeatureRows(fitRows, encoder);
		const evaluationValues = encodeCombinedBroadFeatureRows(evaluationRows, encoder);
		const fitTargets = binaryTargets(fitRows);
		const evaluationTargets = binaryTargets(evaluationRows);
		const fitActionableRate = average(fitTargets);
		const fitted = fitBaselineLinearModel({
			features: fitValues,
			targets: fitTargets,
			kind: "logistic_regression",
			target: "actionable_success",
			featureNames: encoder.featureNames,
			configuration: trainingConfiguration(candidate),
		});
		const fitProbabilities = predictBaselineProbabilities(fitted, fitValues);
		const evaluationProbabilities = predictBaselineProbabilities(
			fitted,
			evaluationValues,
		);
		const classification = compareClassificationToConstantBaseline(
			evaluationTargets,
			evaluationProbabilities,
			fitActionableRate,
			0.5,
		);
		const cutoff = nearestRank(
			fitProbabilities,
			DAILY_SWING_COMBINED_BROAD_MODEL_PROTOCOL.selectionPolicy.selectionCutoff
				.quantile,
		);
		const selectedIndexes = evaluationProbabilities.flatMap((score, index) =>
			score >= cutoff.value ? [index] : [],
		);
		const evaluationUtilities = utilities(evaluationRows);
		const evaluationActionableRate = average(evaluationTargets);
		const evaluationUtility = average(evaluationUtilities);
		const selectedActionableRate =
			selectedIndexes.length === 0
				? null
				: average(selectedIndexes.map((index) => evaluationTargets[index]));
		const selectedUtility =
			selectedIndexes.length === 0
				? null
				: average(selectedIndexes.map((index) => evaluationUtilities[index]));
		folds.push({
			foldId: fold.foldId,
			fitRows: fitRows.length,
			evaluationRows: evaluationRows.length,
			fitActionableRate: round(fitActionableRate),
			evaluationActionableRate: round(evaluationActionableRate),
			classification,
			selection: {
				fitNearestRank: cutoff.rank,
				probabilityCutoff: round(cutoff.value),
				rows: selectedIndexes.length,
				actionableRateLift:
					selectedActionableRate === null
						? null
						: round(selectedActionableRate - evaluationActionableRate),
				averageUtilityR:
					selectedUtility === null ? null : round(selectedUtility),
				utilityImprovementR:
					selectedUtility === null
						? null
						: round(selectedUtility - evaluationUtility),
			},
		});
		outOfFoldRows.push(...evaluationRows);
		outOfFoldProbabilities.push(...evaluationProbabilities);
	}
	const aucs = folds.flatMap((fold) =>
		fold.classification.model.rocAuc === null
			? []
			: [fold.classification.model.rocAuc],
	);
	const utilityImprovements = folds.flatMap((fold) =>
		fold.selection.utilityImprovementR === null
			? []
			: [fold.selection.utilityImprovementR],
	);
	const actuals: CombinedBroadDevelopmentActuals = {
		folds_with_both_target_classes: aucs.length,
		mean_fold_roc_auc: aucs.length === folds.length ? round(average(aucs)) : null,
		minimum_fold_roc_auc: aucs.length === folds.length ? Math.min(...aucs) : null,
		mean_fold_log_loss_improvement: round(
			average(folds.map((fold) => fold.classification.logLossImprovement)),
		),
		mean_fold_brier_improvement: round(
			average(folds.map((fold) => fold.classification.brierImprovement)),
		),
		folds_with_positive_log_loss_improvement: folds.filter(
			(fold) => fold.classification.logLossImprovement > 0,
		).length,
		folds_with_positive_brier_improvement: folds.filter(
			(fold) => fold.classification.brierImprovement > 0,
		).length,
		folds_with_selected_utility_improvement: utilityImprovements.filter(
			(value) => value > 0,
		).length,
		mean_selected_utility_improvement_r:
			utilityImprovements.length === folds.length
				? round(average(utilityImprovements))
				: null,
		base_pooled_roc_auc: pooledSourceAuc(
			outOfFoldRows,
			outOfFoldProbabilities,
			"base",
		),
		expansion_pooled_roc_auc: pooledSourceAuc(
			outOfFoldRows,
			outOfFoldProbabilities,
			"expansion",
		),
	};
	const gates = evaluateCombinedBroadDevelopmentGates(actuals);
	return {
		candidateId: candidate.candidateId,
		l2Penalty: candidate.l2Penalty,
		folds,
		actuals,
		gates,
		passed: gates.every((gate) => gate.passed),
	};
}

export function selectCombinedBroadDevelopmentWinner(
	candidates: readonly CombinedBroadCandidateReport[],
) {
	const tolerance =
		DAILY_SWING_COMBINED_BROAD_MODEL_PROTOCOL.selectionPolicy.tieTolerance;
	return [...candidates]
		.filter((candidate) => candidate.passed)
		.sort((left, right) => {
			const aucDifference =
				(right.actuals.mean_fold_roc_auc ?? Number.NEGATIVE_INFINITY) -
				(left.actuals.mean_fold_roc_auc ?? Number.NEGATIVE_INFINITY);
			if (Math.abs(aucDifference) > tolerance) return aucDifference;
			const logLossDifference =
				(right.actuals.mean_fold_log_loss_improvement ?? Number.NEGATIVE_INFINITY) -
				(left.actuals.mean_fold_log_loss_improvement ?? Number.NEGATIVE_INFINITY);
			if (Math.abs(logLossDifference) > tolerance) return logLossDifference;
			const brierDifference =
				(right.actuals.mean_fold_brier_improvement ?? Number.NEGATIVE_INFINITY) -
				(left.actuals.mean_fold_brier_improvement ?? Number.NEGATIVE_INFINITY);
			if (Math.abs(brierDifference) > tolerance) return brierDifference;
			return (
				right.l2Penalty - left.l2Penalty ||
				left.candidateId.localeCompare(right.candidateId)
			);
		})[0] ?? null;
}

function validateDataset(
	dataset: DailySwingCombinedBroadFoldDataset,
	datasetSha256: string,
) {
	if (
		datasetSha256.trim().toLowerCase() !==
		DAILY_SWING_COMBINED_BROAD_FOLD_DATASET_SHA256
	) {
		throw new Error("Fold dataset checksum does not match the frozen protocol");
	}
	if (
		dataset.datasetVersion !== DAILY_SWING_COMBINED_BROAD_FOLD_DATASET_VERSION ||
		dataset.materializationPolicy.validationFeaturesDeserialized !== false ||
		dataset.materializationPolicy.validationLabelsDeserialized !== false ||
		dataset.materializationPolicy.testFeaturesDeserialized !== false ||
		dataset.materializationPolicy.testLabelsDeserialized !== false
	) {
		throw new Error("Fold dataset does not satisfy the train-only protocol");
	}
	for (const inventory of dataset.partitions) {
		if (partition(dataset, inventory.partitionId).length !== inventory.episodeRows) {
			throw new Error(`${inventory.partitionId} row count does not reconcile`);
		}
	}
}

export function runDailySwingCombinedBroadModelDevelopment(input: {
	dataset: DailySwingCombinedBroadFoldDataset;
	datasetSha256: string;
	generatedAt?: Date;
}) {
	validateDataset(input.dataset, input.datasetSha256);
	const generatedAt = input.generatedAt ?? new Date();
	if (Number.isNaN(generatedAt.getTime())) throw new Error("generatedAt must be valid");
	const logisticCandidates =
		DAILY_SWING_COMBINED_BROAD_MODEL_PROTOCOL.candidates.filter(
			(candidate) => candidate.kind === "l2_logistic_regression",
		);
	const candidates = logisticCandidates.map((candidate) =>
		evaluateCandidate(input.dataset, candidate),
	);
	const winner = selectCombinedBroadDevelopmentWinner(candidates);
	const finalRows = partition(input.dataset, "final_train");
	let finalArtifact = null;
	if (winner) {
		const candidate = logisticCandidates.find(
			(item) => item.candidateId === winner.candidateId,
		);
		if (!candidate) throw new Error("Selected candidate configuration is missing");
		const encoder = fitCombinedBroadFeatureEncoder(finalRows);
		const values = encodeCombinedBroadFeatureRows(finalRows, encoder);
		const targets = binaryTargets(finalRows);
		const fitted = fitBaselineLinearModel({
			features: values,
			targets,
			kind: "logistic_regression",
			target: "actionable_success",
			featureNames: encoder.featureNames,
			configuration: trainingConfiguration(candidate),
		});
		const probabilities = predictBaselineProbabilities(fitted, values);
		const cutoff = nearestRank(
			probabilities,
			DAILY_SWING_COMBINED_BROAD_MODEL_PROTOCOL.selectionPolicy.selectionCutoff
				.quantile,
		);
		finalArtifact = {
			candidateId: candidate.candidateId,
			configuration: trainingConfiguration(candidate),
			preprocessing: encoder,
			model: {
				kind: fitted.model.kind,
				target: fitted.model.target,
				intercept: fitted.intercept,
				coefficients: Object.fromEntries(
					encoder.featureNames.map((name, index) => [name, fitted.weights[index]]),
				),
				trainingRows: fitted.model.trainingRows,
				finalTrainingLoss: fitted.model.finalTrainingLoss,
			},
			trainingActionableRate: average(targets),
			selectionCutoff: {
				quantile: 0.7,
				nearestRank: cutoff.rank,
				probability: cutoff.value,
			},
		};
	}
	return {
		reportVersion: "1.0.0",
		generatedAt: generatedAt.toISOString(),
		developmentId:
			DAILY_SWING_COMBINED_BROAD_MODEL_PROTOCOL.developmentId,
		protocolVersion: DAILY_SWING_COMBINED_BROAD_MODEL_PROTOCOL_VERSION,
		protocolSha256: createHash("sha256")
			.update(JSON.stringify(DAILY_SWING_COMBINED_BROAD_MODEL_PROTOCOL))
			.digest("hex"),
		dataset: {
			version: input.dataset.datasetVersion,
			sha256: DAILY_SWING_COMBINED_BROAD_FOLD_DATASET_SHA256,
			finalTrainRows: finalRows.length,
		},
		dataAccess: {
			trainFeaturesRead: true,
			trainTargetsRead: true,
			validationFeaturesRead: false,
			validationLabelsRead: false,
			testFeaturesRead: false,
			testLabelsRead: false,
		},
		candidates,
		decision: {
			status: winner ? "advance_to_final_preregistration" : "reject_development",
			selectedCandidateId: winner?.candidateId ?? null,
			description: winner
				? "One candidate passed every train-only walk-forward gate. Freeze the fitted artifact before validation."
				: DAILY_SWING_COMBINED_BROAD_MODEL_PROTOCOL.selectionPolicy.failureRule,
		},
		finalArtifact,
		validationPolicy: {
			status: "sealed",
			criteria:
				DAILY_SWING_COMBINED_BROAD_MODEL_PROTOCOL.validationPolicy.criteria,
		},
		testPolicy: { status: "sealed" },
	};
}
