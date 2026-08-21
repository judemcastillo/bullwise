import {
	DAILY_SWING_EPISODE_DATASET_VERSION,
	type DailySwingEpisodeTrainingDataset,
} from "@/lib/analysis/episode-dataset.types";
import {
	DAILY_SWING_EPISODE_EXPERIMENT_ID,
	DAILY_SWING_EPISODE_EXPERIMENT_PREREGISTRATION_VERSION,
	type DailySwingEpisodeExperimentPreregistration,
} from "@/lib/analysis/episode-experiment.types";
import { DAILY_SWING_TARGET_DESIGN_VERSION } from "@/lib/analysis/training-diagnostics.types";

function sha256(value: string, label: string) {
	const normalized = value.trim().toLowerCase();
	if (!/^[a-f0-9]{64}$/.test(normalized)) {
		throw new Error(`${label} must be a 64-character hexadecimal SHA-256`);
	}
	return normalized;
}

export function preregisterDailySwingEpisodeExperiment(input: {
	dataset: DailySwingEpisodeTrainingDataset;
	datasetSha256: string;
	registeredAt?: Date;
}): DailySwingEpisodeExperimentPreregistration {
	if (input.dataset.datasetVersion !== DAILY_SWING_EPISODE_DATASET_VERSION) {
		throw new Error(
			`Episode dataset version ${input.dataset.datasetVersion} is not supported; expected ${DAILY_SWING_EPISODE_DATASET_VERSION}`,
		);
	}
	if (input.dataset.targetDesign.version !== DAILY_SWING_TARGET_DESIGN_VERSION) {
		throw new Error("The episode dataset does not use the frozen target design");
	}
	if (input.dataset.rows.length !== input.dataset.trainingSummary.rows) {
		throw new Error("Episode dataset row count does not match its training summary");
	}
	if (input.dataset.rows.length < 200) {
		throw new Error("At least 200 training episodes are required to preregister");
	}
	if (
		input.dataset.materializationPolicy.validationFeaturesRead !== false ||
		input.dataset.materializationPolicy.validationLabelsRead !== false ||
		input.dataset.materializationPolicy.testFeaturesRead !== false ||
		input.dataset.materializationPolicy.testLabelsRead !== false
	) {
		throw new Error("Preregistration requires sealed validation and test data");
	}
	const registeredAt = input.registeredAt ?? new Date();
	if (Number.isNaN(registeredAt.getTime())) throw new Error("registeredAt must be valid");
	return {
		preregistrationVersion:
			DAILY_SWING_EPISODE_EXPERIMENT_PREREGISTRATION_VERSION,
		experimentId: DAILY_SWING_EPISODE_EXPERIMENT_ID,
		registeredAt: registeredAt.toISOString(),
		trainingDataset: {
			datasetVersion: input.dataset.datasetVersion,
			sha256: sha256(input.datasetSha256, "datasetSha256"),
			sourceAnalysisDatasetSha256: sha256(
				input.dataset.source.analysisDatasetSha256,
				"source analysis dataset SHA-256",
			),
			rows: input.dataset.rows.length,
		},
		hypothesis:
			"A regularized linear model trained on independent episode-first signals can rank economically actionable setups better than the constant training-rate baseline without relying on instrument identity.",
		model: {
			kind: "l2_logistic_regression",
			target: "actionable_success",
			optimizer: "batch_gradient_descent",
			iterations: 600,
			learningRate: 0.03,
			l2Penalty: 0.01,
			features:
				"signal_time_numeric_and_categorical_without_instrument_identity",
			preprocessing: "train_median_imputation_and_standardization",
		},
		selectionPolicy: {
			method: "fixed_train_score_quantile",
			trainingScoreQuantile: 0.7,
			description:
				"After fitting, freeze the cutoff at the 70th percentile of training predictions. Apply that numeric cutoff unchanged to validation; do not select a validation percentile.",
		},
		validationPolicy: {
			status: "one_shot_authorized_after_preregistration",
			episodeSelection: "independently_within_validation",
			modelSelectionOrTuning: false,
			criteria: [
				{ metric: "validation_episode_rows", operator: ">=", threshold: 200 },
				{
					metric: "validation_actionable_successes",
					operator: ">=",
					threshold: 40,
				},
				{ metric: "roc_auc", operator: ">=", threshold: 0.6 },
				{ metric: "log_loss_improvement", operator: ">=", threshold: 0.005 },
				{
					metric: "brier_score_improvement",
					operator: ">=",
					threshold: 0.002,
				},
				{ metric: "selected_episode_rows", operator: ">=", threshold: 40 },
				{
					metric: "selected_actionable_success_rate_lift",
					operator: ">=",
					threshold: 0.05,
				},
				{
					metric: "selected_average_setup_utility_r",
					operator: ">=",
					threshold: 0.1,
				},
				{
					metric: "selected_average_setup_utility_r_improvement",
					operator: ">=",
					threshold: 0.05,
				},
			],
			decisionRule:
				"Every criterion must pass in the single validation run. Any failure rejects this candidate; thresholds, features, optimizer, and selection policy will not be changed and rerun on validation.",
		},
		testPolicy: {
			status: "sealed",
			featuresRead: false,
			labelsRead: false,
			openingCondition:
				"Test may be opened once only if every preregistered validation criterion passes and the fitted model plus training-derived cutoff are frozen unchanged.",
		},
		warnings: [
			"This preregistration authorizes one validation experiment, not customer signals or live trading.",
			"The effective training sample is small; passing validation would still require one-shot test evaluation and forward paper validation.",
		],
	};
}
