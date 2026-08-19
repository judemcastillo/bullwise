import type { DailySwingEpisodeTrainingDataset } from "@/lib/analysis/episode-dataset.types";

export const DAILY_SWING_EPISODE_EXPERIMENT_ID =
	"daily-swing-episode-actionable-logistic-v1";
export const DAILY_SWING_EPISODE_EXPERIMENT_PREREGISTRATION_VERSION = "1.0.0";

export type DailySwingEpisodeExperimentPreregistration = {
	preregistrationVersion: typeof DAILY_SWING_EPISODE_EXPERIMENT_PREREGISTRATION_VERSION;
	experimentId: typeof DAILY_SWING_EPISODE_EXPERIMENT_ID;
	registeredAt: string;
	trainingDataset: {
		datasetVersion: DailySwingEpisodeTrainingDataset["datasetVersion"];
		sha256: string;
		sourceAnalysisDatasetSha256: string;
		rows: number;
	};
	hypothesis: string;
	model: {
		kind: "l2_logistic_regression";
		target: "actionable_success";
		optimizer: "batch_gradient_descent";
		iterations: 600;
		learningRate: 0.03;
		l2Penalty: 0.01;
		features: "signal_time_numeric_and_categorical_without_instrument_identity";
		preprocessing: "train_median_imputation_and_standardization";
	};
	selectionPolicy: {
		method: "fixed_train_score_quantile";
		trainingScoreQuantile: 0.7;
		description: string;
	};
	validationPolicy: {
		status: "one_shot_authorized_after_preregistration";
		episodeSelection: "independently_within_validation";
		modelSelectionOrTuning: false;
		criteria: Array<{
			metric:
				| "validation_episode_rows"
				| "validation_actionable_successes"
				| "roc_auc"
				| "log_loss_improvement"
				| "brier_score_improvement"
				| "selected_episode_rows"
				| "selected_actionable_success_rate_lift"
				| "selected_average_setup_utility_r"
				| "selected_average_setup_utility_r_improvement";
			operator: ">=";
			threshold: number;
		}>;
		decisionRule: string;
	};
	testPolicy: {
		status: "sealed";
		featuresRead: false;
		labelsRead: false;
		openingCondition: string;
	};
	warnings: string[];
};
