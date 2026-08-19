import type {
	AnalysisDatasetFeatureVector,
	DailySwingAnalysisDataset,
} from "@/lib/analysis/analysis-dataset.types";
import type { DAILY_SWING_TARGET_DESIGN_VERSION } from "@/lib/analysis/training-diagnostics.types";

export const DAILY_SWING_EPISODE_DATASET_VERSION = "1.0.0";

export type EpisodeTrainingTarget = {
	actionableSuccess: boolean;
	setupUtilityR: number;
};

export type EpisodeTrainingRow = {
	rowId: string;
	instrumentId: string;
	displaySymbol: string;
	signalAt: string;
	resolvedAt: string;
	features: AnalysisDatasetFeatureVector;
	targets: EpisodeTrainingTarget;
};

export type DailySwingEpisodeTrainingDataset = {
	datasetVersion: typeof DAILY_SWING_EPISODE_DATASET_VERSION;
	generatedAt: string;
	source: {
		analysisDatasetVersion: DailySwingAnalysisDataset["datasetVersion"];
		analysisDatasetSha256: string;
		kind: DailySwingAnalysisDataset["source"]["kind"];
		universeName: string;
	};
	targetDesign: {
		version: typeof DAILY_SWING_TARGET_DESIGN_VERSION;
		actionableRThreshold: number;
		primaryTarget: "actionable_success";
		secondaryTarget: "setup_utility_r";
	};
	episodePolicy: {
		application: "independently_within_each_split";
		groupingKeys: ["instrumentId", "direction"];
		selection: "first_signal_while_prior_selected_setup_is_unresolved";
		sameResolutionSessionPolicy: "suppress";
		description: string;
	};
	materializationPolicy: {
		materializedSplit: "train";
		validationFeaturesRead: false;
		validationLabelsRead: false;
		testFeaturesRead: false;
		testLabelsRead: false;
		description: string;
	};
	splits: {
		train: { sourceRows: number; episodeRows: number };
		validation: { sourceRows: number; episodeRows: null; status: "sealed" };
		test: { sourceRows: number; episodeRows: null; status: "sealed" };
	};
	trainingSummary: {
		rows: number;
		actionableSuccesses: number;
		actionableSuccessRate: number;
		averageSetupUtilityR: number;
	};
	rows: EpisodeTrainingRow[];
	warnings: string[];
};
