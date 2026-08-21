import type { AnalysisDatasetLabels } from "@/lib/analysis/analysis-dataset.types";
import type { DailySwingBroadFeatureVector } from "@/lib/analysis/broad-dataset.types";
import type { DAILY_SWING_TARGET_DESIGN_VERSION } from "@/lib/analysis/training-diagnostics.types";

export const DAILY_SWING_BROAD_EPISODE_DATASET_VERSION = "1.0.0";
export const DAILY_SWING_BROAD_DATASET_SHA256 =
	"bcb6870affcaed823d188703776a30ffed9d571e60440a7257c5742bd94ed23e";

export type DailySwingBroadEpisodeRow = {
	rowId: string;
	instrumentId: string;
	displaySymbol: string;
	signalAt: string;
	resolvedAt: string;
	features: DailySwingBroadFeatureVector;
	targets: {
		actionableSuccess: boolean;
		setupUtilityR: number;
	};
};

export type DailySwingBroadEpisodeDataset = {
	datasetVersion: typeof DAILY_SWING_BROAD_EPISODE_DATASET_VERSION;
	generatedAt: string;
	source: {
		broadDatasetVersion: "2.0.0";
		broadDatasetSha256: typeof DAILY_SWING_BROAD_DATASET_SHA256;
		universeName: "daily-swing-broad-development-v1";
		trainSourceRows: number;
		validationSourceRows: number;
		testSourceRows: number;
	};
	episodePolicy: {
		application: "independently_within_each_fold_and_final_split";
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
	targetDesign: {
		version: typeof DAILY_SWING_TARGET_DESIGN_VERSION;
		actionableRThreshold: number;
		primaryTarget: "actionable_success";
		secondaryTarget: "setup_utility_r";
	};
	coverage: {
		targetTrainingEpisodes: number;
		trainEpisodeRows: number;
		passes: boolean;
	};
	walkForwardInventory: Array<{
		foldId: "evaluate_2020" | "evaluate_2021" | "evaluate_2022";
		fitSourceRows: number;
		fitEpisodeRows: number;
		evaluationSourceRows: number;
		evaluationEpisodeRows: number;
	}>;
	rows: DailySwingBroadEpisodeRow[];
	warnings: string[];
};

export type EpisodeSelectableBroadRow = {
	rowId: string;
	instrumentId: string;
	displaySymbol: string;
	signalAt: string;
	resolvedAt: string;
	features: Pick<DailySwingBroadFeatureVector, "direction">;
	labels: AnalysisDatasetLabels;
};
