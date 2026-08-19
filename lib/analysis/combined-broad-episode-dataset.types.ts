import type { DailySwingBroadFeatureVector } from "@/lib/analysis/broad-dataset.types";
import type { DailySwingCombinedBroadSourceScan } from "@/lib/analysis/combined-broad-dataset.types";
import type { DAILY_SWING_TARGET_DESIGN_VERSION } from "@/lib/analysis/training-diagnostics.types";

export const DAILY_SWING_COMBINED_BROAD_EPISODE_DATASET_VERSION = "1.0.0";
export const DAILY_SWING_COMBINED_BROAD_DATASET_SHA256 =
	"3ce82ae982ef3ac39df72fc3205788536e907cb187db061995c53730ab9b2030";

export type DailySwingCombinedBroadEpisodeRow = {
	rowId: string;
	instrumentId: string;
	displaySymbol: string;
	sourceScan: DailySwingCombinedBroadSourceScan;
	signalAt: string;
	resolvedAt: string;
	features: DailySwingBroadFeatureVector;
	targets: {
		actionableSuccess: boolean;
		setupUtilityR: number;
	};
};

export type DailySwingCombinedBroadEpisodeDataset = {
	datasetVersion: typeof DAILY_SWING_COMBINED_BROAD_EPISODE_DATASET_VERSION;
	generatedAt: string;
	source: {
		combinedBroadDatasetVersion: "3.0.0";
		combinedBroadDatasetSha256: typeof DAILY_SWING_COMBINED_BROAD_DATASET_SHA256;
		universeName: "daily-swing-broad-development-v2-combined";
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
	rows: DailySwingCombinedBroadEpisodeRow[];
	warnings: string[];
};
