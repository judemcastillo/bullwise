import type { DailySwingAnalysisDataset } from "@/lib/analysis/analysis-dataset.types";
import type {
	BaselineFeatureEncoder,
	BaselineLinearModel,
	ClassificationMetrics,
} from "@/lib/analysis/baseline-model.types";
import type { DailySwingEpisodeTrainingDataset } from "@/lib/analysis/episode-dataset.types";
import type {
	DailySwingEpisodeExperimentPreregistration,
} from "@/lib/analysis/episode-experiment.types";

export const DAILY_SWING_EPISODE_VALIDATION_VERSION = "1.0.0";

export type EpisodeValidationMetric =
	DailySwingEpisodeExperimentPreregistration["validationPolicy"]["criteria"][number]["metric"];

export type EpisodeValidationCriterion = {
	metric: EpisodeValidationMetric;
	operator: ">=";
	threshold: number;
	actual: number | null;
	passed: boolean;
};

export type DailySwingEpisodeValidationReport = {
	validationVersion: typeof DAILY_SWING_EPISODE_VALIDATION_VERSION;
	generatedAt: string;
	experiment: {
		id: DailySwingEpisodeExperimentPreregistration["experimentId"];
		preregistrationVersion: DailySwingEpisodeExperimentPreregistration["preregistrationVersion"];
		preregistrationSha256: string;
	};
	datasets: {
		source: {
			datasetVersion: DailySwingAnalysisDataset["datasetVersion"];
			sha256: string;
			universeName: string;
			trainSourceRows: number;
			validationSourceRows: number;
			testSourceRows: number;
		};
		training: {
			datasetVersion: DailySwingEpisodeTrainingDataset["datasetVersion"];
			sha256: string;
			episodeRows: number;
		};
	};
	splitAccess: {
		sourceTrainFeaturesRead: false;
		sourceTrainLabelsRead: false;
		validationFeaturesRead: true;
		validationLabelsRead: true;
		testFeaturesRead: false;
		testLabelsRead: false;
		description: string;
	};
	configuration: DailySwingEpisodeExperimentPreregistration["model"];
	preprocessing: BaselineFeatureEncoder;
	model: BaselineLinearModel;
	selection: {
		method: "nearest_rank_training_probability_quantile";
		trainingScoreQuantile: 0.7;
		nearestRank: number;
		probabilityCutoff: number;
		description: string;
	};
	validation: {
		allEpisodes: {
			rows: number;
			actionableSuccesses: number;
			actionableSuccessRate: number;
			averageSetupUtilityR: number;
		};
		selectedEpisodes: {
			rows: number;
			actionableSuccesses: number;
			actionableSuccessRate: number | null;
			actionableSuccessRateLift: number | null;
			averageSetupUtilityR: number | null;
			averageSetupUtilityRImprovement: number | null;
		};
		classification: {
			model: ClassificationMetrics;
			constantBaseline: ClassificationMetrics;
			logLossImprovement: number;
			brierImprovement: number;
			rocAucImprovement: number | null;
		};
	};
	developmentGate: {
		passed: boolean;
		criteria: EpisodeValidationCriterion[];
		decision: "advance_to_one_shot_test" | "reject_candidate";
		description: string;
	};
	testPolicy: {
		status: "sealed";
		featuresRead: false;
		labelsRead: false;
		description: string;
	};
	warnings: string[];
};
