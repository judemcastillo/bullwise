import type { DailySwingCombinedBroadEpisodeRow } from "@/lib/analysis/combined-broad-episode-dataset.types";

export const DAILY_SWING_COMBINED_BROAD_FOLD_DATASET_VERSION = "1.0.0";
export const DAILY_SWING_COMBINED_BROAD_FOLD_SOURCE_SHA256 =
	"3ce82ae982ef3ac39df72fc3205788536e907cb187db061995c53730ab9b2030";
export const DAILY_SWING_COMBINED_BROAD_FINAL_EPISODE_SHA256 =
	"0233cf9961e916e3079694ce0c887ba7f38ca4b5870271e9e769b563abea2a6b";
export const DAILY_SWING_COMBINED_BROAD_FOLD_DATASET_SHA256 =
	"6bc63cb4559b2334708110fcd15719eb52d7f0bb9100b8f0032e4e42a1e0f9c9";

export type DailySwingCombinedBroadFoldPartitionId =
	| "final_train"
	| "evaluate_2020_fit"
	| "evaluate_2020_evaluation"
	| "evaluate_2021_fit"
	| "evaluate_2021_evaluation"
	| "evaluate_2022_fit"
	| "evaluate_2022_evaluation";

export const DAILY_SWING_COMBINED_BROAD_FOLD_INVENTORY = [
	{
		foldId: "evaluate_2020",
		fitSourceRows: 29_969,
		fitEpisodeRows: 2_757,
		evaluationSourceRows: 10_742,
		evaluationEpisodeRows: 1_031,
	},
	{
		foldId: "evaluate_2021",
		fitSourceRows: 41_939,
		fitEpisodeRows: 3_813,
		evaluationSourceRows: 13_212,
		evaluationEpisodeRows: 1_197,
	},
	{
		foldId: "evaluate_2022",
		fitSourceRows: 56_770,
		fitEpisodeRows: 5_014,
		evaluationSourceRows: 3_140,
		evaluationEpisodeRows: 468,
	},
] as const;

export type DailySwingCombinedBroadFoldDataset = {
	datasetVersion: typeof DAILY_SWING_COMBINED_BROAD_FOLD_DATASET_VERSION;
	generatedAt: string;
	source: {
		combinedBroadDatasetVersion: "3.0.0";
		combinedBroadDatasetSha256: typeof DAILY_SWING_COMBINED_BROAD_FOLD_SOURCE_SHA256;
		finalEpisodeDatasetSha256: typeof DAILY_SWING_COMBINED_BROAD_FINAL_EPISODE_SHA256;
		trainSourceRows: 60_381;
		validationSourceRows: 25_935;
		testSourceRows: 25_082;
	};
	materializationPolicy: {
		materializedSplit: "train";
		episodeSelection: "independently_within_each_partition";
		validationFeaturesDeserialized: false;
		validationLabelsDeserialized: false;
		testFeaturesDeserialized: false;
		testLabelsDeserialized: false;
	};
	partitions: Array<{
		partitionId: DailySwingCombinedBroadFoldPartitionId;
		foldId:
			| (typeof DAILY_SWING_COMBINED_BROAD_FOLD_INVENTORY)[number]["foldId"]
			| null;
		role: "final_train" | "fit" | "evaluation";
		sourceRows: number;
		episodeRows: number;
	}>;
	rows: Array<
		DailySwingCombinedBroadEpisodeRow & {
			partitionId: DailySwingCombinedBroadFoldPartitionId;
		}
	>;
	warnings: string[];
};
