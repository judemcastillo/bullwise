import {
	DAILY_SWING_ANALYSIS_DATASET_VERSION,
	type AnalysisDatasetRow,
	type DailySwingAnalysisDataset,
} from "@/lib/analysis/analysis-dataset.types";
import {
	compareClassificationToConstantBaseline,
	encodeBaselineFeatureRows,
	fitBaselineFeatureEncoder,
	fitBaselineLinearModel,
	predictBaselineProbabilities,
} from "@/lib/analysis/baseline-model";
import type { BaselineTrainingConfiguration } from "@/lib/analysis/baseline-model.types";
import { selectEpisodeFirstRows } from "@/lib/analysis/episode-dataset";
import {
	DAILY_SWING_EPISODE_DATASET_VERSION,
	type DailySwingEpisodeTrainingDataset,
	type EpisodeTrainingRow,
} from "@/lib/analysis/episode-dataset.types";
import { preregisterDailySwingEpisodeExperiment } from "@/lib/analysis/episode-experiment";
import {
	DAILY_SWING_EPISODE_EXPERIMENT_ID,
	DAILY_SWING_EPISODE_EXPERIMENT_PREREGISTRATION_VERSION,
	type DailySwingEpisodeExperimentPreregistration,
} from "@/lib/analysis/episode-experiment.types";
import {
	DAILY_SWING_EPISODE_VALIDATION_VERSION,
	type DailySwingEpisodeValidationReport,
	type EpisodeValidationMetric,
} from "@/lib/analysis/episode-validation.types";
import { ACTIONABLE_SUCCESS_R_THRESHOLD } from "@/lib/analysis/training-diagnostics";

const CLASSIFICATION_METRIC_THRESHOLD = 0.5;

function round(value: number, precision = 8) {
	const multiplier = 10 ** precision;
	return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
}

function normalizedSha256(value: string, label: string) {
	const normalized = value.trim().toLowerCase();
	if (!/^[a-f0-9]{64}$/.test(normalized)) {
		throw new Error(`${label} must be a 64-character hexadecimal SHA-256`);
	}
	return normalized;
}

function asAnalysisRow(row: EpisodeTrainingRow): AnalysisDatasetRow {
	return {
		rowId: row.rowId,
		instrumentId: row.instrumentId,
		displaySymbol: row.displaySymbol,
		signalAt: row.signalAt,
		resolvedAt: row.resolvedAt,
		split: "train",
		features: row.features,
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

function finiteTrainingTarget(row: EpisodeTrainingRow) {
	if (typeof row.targets.actionableSuccess !== "boolean") {
		throw new Error(`${row.rowId}.actionableSuccess must be boolean`);
	}
	if (!Number.isFinite(row.targets.setupUtilityR)) {
		throw new Error(`${row.rowId}.setupUtilityR must be finite`);
	}
	return row.targets.actionableSuccess ? 1 : 0;
}

function validationOutcome(row: AnalysisDatasetRow) {
	if (typeof row.labels.triggered !== "boolean") {
		throw new Error(`${row.rowId}.triggered must be boolean`);
	}
	if (!row.labels.triggered) {
		return { actionableSuccess: 0, setupUtilityR: 0 };
	}
	const utility = row.labels.netRMultiple;
	if (typeof utility !== "number" || !Number.isFinite(utility)) {
		throw new Error(`${row.rowId}.netRMultiple must be finite when triggered`);
	}
	return {
		actionableSuccess: utility >= ACTIONABLE_SUCCESS_R_THRESHOLD ? 1 : 0,
		setupUtilityR: utility,
	};
}

function average(values: readonly number[]) {
	if (values.length === 0) throw new Error("An average requires values");
	return values.reduce((total, value) => total + value, 0) / values.length;
}

function nearestRankQuantile(values: readonly number[], quantile: number) {
	if (values.length === 0) throw new Error("A quantile requires values");
	if (!(quantile > 0 && quantile <= 1)) {
		throw new Error("Quantile must be greater than zero and at most one");
	}
	const sorted = [...values].sort((left, right) => left - right);
	const rank = Math.ceil(quantile * sorted.length);
	return { rank, value: sorted[rank - 1] };
}

function validatePreregistration(input: {
	trainingDataset: DailySwingEpisodeTrainingDataset;
	trainingDatasetSha256: string;
	preregistration: DailySwingEpisodeExperimentPreregistration;
}) {
	const expected = preregisterDailySwingEpisodeExperiment({
		dataset: input.trainingDataset,
		datasetSha256: input.trainingDatasetSha256,
		registeredAt: new Date(input.preregistration.registeredAt),
	});
	if (JSON.stringify(input.preregistration) !== JSON.stringify(expected)) {
		throw new Error("Preregistration does not match the frozen experiment contract");
	}
}

export function evaluateDailySwingEpisodeValidation(input: {
	sourceDataset: DailySwingAnalysisDataset;
	sourceDatasetSha256: string;
	trainingDataset: DailySwingEpisodeTrainingDataset;
	trainingDatasetSha256: string;
	preregistration: DailySwingEpisodeExperimentPreregistration;
	preregistrationSha256: string;
	generatedAt?: Date;
}): DailySwingEpisodeValidationReport {
	const sourceSha256 = normalizedSha256(
		input.sourceDatasetSha256,
		"sourceDatasetSha256",
	);
	const trainingSha256 = normalizedSha256(
		input.trainingDatasetSha256,
		"trainingDatasetSha256",
	);
	const preregistrationSha256 = normalizedSha256(
		input.preregistrationSha256,
		"preregistrationSha256",
	);
	if (input.sourceDataset.datasetVersion !== DAILY_SWING_ANALYSIS_DATASET_VERSION) {
		throw new Error("Source dataset version does not match the frozen experiment");
	}
	if (input.trainingDataset.datasetVersion !== DAILY_SWING_EPISODE_DATASET_VERSION) {
		throw new Error("Training dataset version does not match the frozen experiment");
	}
	if (
		input.preregistration.preregistrationVersion !==
			DAILY_SWING_EPISODE_EXPERIMENT_PREREGISTRATION_VERSION ||
		input.preregistration.experimentId !== DAILY_SWING_EPISODE_EXPERIMENT_ID
	) {
		throw new Error("Preregistration identity does not match the frozen experiment");
	}
	if (
		sourceSha256 !== input.trainingDataset.source.analysisDatasetSha256 ||
		sourceSha256 !== input.preregistration.trainingDataset.sourceAnalysisDatasetSha256
	) {
		throw new Error("Source dataset checksum does not match the frozen artifacts");
	}
	if (trainingSha256 !== input.preregistration.trainingDataset.sha256) {
		throw new Error("Training dataset checksum does not match the preregistration");
	}
	validatePreregistration({
		trainingDataset: input.trainingDataset,
		trainingDatasetSha256: trainingSha256,
		preregistration: input.preregistration,
	});
	const generatedAt = input.generatedAt ?? new Date();
	if (Number.isNaN(generatedAt.getTime())) throw new Error("generatedAt must be valid");

	// Source train and test rows are counted by split only. Do not access their
	// features or labels in this one-shot validation evaluator.
	const sourceTrainRows = input.sourceDataset.rows.filter(
		(row) => row.split === "train",
	).length;
	const validationRows = input.sourceDataset.rows.filter(
		(row) => row.split === "validation",
	);
	const testRows = input.sourceDataset.rows.filter((row) => row.split === "test").length;
	if (
		sourceTrainRows !== input.trainingDataset.splits.train.sourceRows ||
		validationRows.length !== input.trainingDataset.splits.validation.sourceRows ||
		testRows !== input.trainingDataset.splits.test.sourceRows
	) {
		throw new Error("Source split counts do not match the frozen training artifact");
	}
	if (validationRows.length === 0 || testRows === 0) {
		throw new Error("Validation and sealed test rows are required");
	}

	const trainRows = input.trainingDataset.rows.map(asAnalysisRow);
	const trainingTargets = input.trainingDataset.rows.map(finiteTrainingTarget);
	const validationEpisodeRows = selectEpisodeFirstRows(
		validationRows,
		"validation",
	);
	const validationOutcomes = validationEpisodeRows.map(validationOutcome);
	const validationTargets = validationOutcomes.map(
		(outcome) => outcome.actionableSuccess,
	);
	const validationUtilities = validationOutcomes.map(
		(outcome) => outcome.setupUtilityR,
	);

	const preprocessing = fitBaselineFeatureEncoder(trainRows);
	const encodedTraining = encodeBaselineFeatureRows(trainRows, preprocessing);
	const encodedValidation = encodeBaselineFeatureRows(
		validationEpisodeRows,
		preprocessing,
	);
	const configuration: BaselineTrainingConfiguration = {
		optimizer: input.preregistration.model.optimizer,
		iterations: input.preregistration.model.iterations,
		learningRate: input.preregistration.model.learningRate,
		l2Penalty: input.preregistration.model.l2Penalty,
		classificationThreshold: CLASSIFICATION_METRIC_THRESHOLD,
	};
	const fitted = fitBaselineLinearModel({
		features: encodedTraining.values,
		targets: trainingTargets,
		kind: "logistic_regression",
		target: "actionable_success",
		featureNames: preprocessing.featureNames,
		configuration,
	});
	const trainingProbabilities = predictBaselineProbabilities(
		fitted,
		encodedTraining.values,
	);
	const validationProbabilities = predictBaselineProbabilities(
		fitted,
		encodedValidation.values,
	);
	const cutoff = nearestRankQuantile(
		trainingProbabilities,
		input.preregistration.selectionPolicy.trainingScoreQuantile,
	);
	const trainPositiveRate = average(trainingTargets);
	const classification = compareClassificationToConstantBaseline(
		validationTargets,
		validationProbabilities,
		trainPositiveRate,
		CLASSIFICATION_METRIC_THRESHOLD,
	);
	const selectedIndexes = validationProbabilities.flatMap((probability, index) =>
		probability >= cutoff.value ? [index] : [],
	);
	const actionableSuccesses = validationTargets.reduce(
		(total, value) => total + value,
		0,
	);
	const actionableSuccessRate = actionableSuccesses / validationTargets.length;
	const averageSetupUtilityR = average(validationUtilities);
	const selectedActionableSuccesses = selectedIndexes.reduce(
		(total, index) => total + validationTargets[index],
		0,
	);
	const selectedActionableSuccessRate =
		selectedIndexes.length === 0
			? null
			: selectedActionableSuccesses / selectedIndexes.length;
	const selectedAverageSetupUtilityR =
		selectedIndexes.length === 0
			? null
			: average(selectedIndexes.map((index) => validationUtilities[index]));
	const actualByMetric: Record<EpisodeValidationMetric, number | null> = {
		validation_episode_rows: validationTargets.length,
		validation_actionable_successes: actionableSuccesses,
		roc_auc: classification.model.rocAuc,
		log_loss_improvement: classification.logLossImprovement,
		brier_score_improvement: classification.brierImprovement,
		selected_episode_rows: selectedIndexes.length,
		selected_actionable_success_rate_lift:
			selectedActionableSuccessRate === null
				? null
				: round(selectedActionableSuccessRate - actionableSuccessRate),
		selected_average_setup_utility_r:
			selectedAverageSetupUtilityR === null
				? null
				: round(selectedAverageSetupUtilityR),
		selected_average_setup_utility_r_improvement:
			selectedAverageSetupUtilityR === null
				? null
				: round(selectedAverageSetupUtilityR - averageSetupUtilityR),
	};
	const criteria = input.preregistration.validationPolicy.criteria.map(
		(criterion) => {
			const actual = actualByMetric[criterion.metric];
			return {
				...criterion,
				actual,
				passed: actual !== null && actual >= criterion.threshold,
			};
		},
	);
	const passed = criteria.every((criterion) => criterion.passed);
	return {
		validationVersion: DAILY_SWING_EPISODE_VALIDATION_VERSION,
		generatedAt: generatedAt.toISOString(),
		experiment: {
			id: input.preregistration.experimentId,
			preregistrationVersion: input.preregistration.preregistrationVersion,
			preregistrationSha256,
		},
		datasets: {
			source: {
				datasetVersion: input.sourceDataset.datasetVersion,
				sha256: sourceSha256,
				universeName: input.sourceDataset.source.universeName,
				trainSourceRows: sourceTrainRows,
				validationSourceRows: validationRows.length,
				testSourceRows: testRows,
			},
			training: {
				datasetVersion: input.trainingDataset.datasetVersion,
				sha256: trainingSha256,
				episodeRows: trainRows.length,
			},
		},
		splitAccess: {
			sourceTrainFeaturesRead: false,
			sourceTrainLabelsRead: false,
			validationFeaturesRead: true,
			validationLabelsRead: true,
			testFeaturesRead: false,
			testLabelsRead: false,
			description:
				"Fitting uses the frozen train-only episode artifact. Validation features and labels are opened for this one-shot evaluation. Source train and test rows are counted by split only.",
		},
		configuration: input.preregistration.model,
		preprocessing,
		model: fitted.model,
		selection: {
			method: "nearest_rank_training_probability_quantile",
			trainingScoreQuantile:
				input.preregistration.selectionPolicy.trainingScoreQuantile,
			nearestRank: cutoff.rank,
			probabilityCutoff: round(cutoff.value),
			description:
				"The cutoff is the nearest-rank 70th percentile of fitted training probabilities: sort ascending and select rank ceil(0.7 × training rows). The resulting numeric cutoff is applied unchanged to validation.",
		},
		validation: {
			allEpisodes: {
				rows: validationTargets.length,
				actionableSuccesses,
				actionableSuccessRate: round(actionableSuccessRate),
				averageSetupUtilityR: round(averageSetupUtilityR),
			},
			selectedEpisodes: {
				rows: selectedIndexes.length,
				actionableSuccesses: selectedActionableSuccesses,
				actionableSuccessRate:
					selectedActionableSuccessRate === null
						? null
						: round(selectedActionableSuccessRate),
				actionableSuccessRateLift:
					actualByMetric.selected_actionable_success_rate_lift,
				averageSetupUtilityR:
					actualByMetric.selected_average_setup_utility_r,
				averageSetupUtilityRImprovement:
					actualByMetric.selected_average_setup_utility_r_improvement,
			},
			classification,
		},
		developmentGate: {
			passed,
			criteria,
			decision: passed ? "advance_to_one_shot_test" : "reject_candidate",
			description: input.preregistration.validationPolicy.decisionRule,
		},
		testPolicy: {
			status: "sealed",
			featuresRead: false,
			labelsRead: false,
			description: input.preregistration.testPolicy.openingCondition,
		},
		warnings: [
			"This report consumes the single authorized validation run and must not be regenerated after its result is inspected.",
			"A validation pass does not authorize customer signals, live execution, or changes to the frozen model before one-shot test evaluation.",
		],
	};
}
