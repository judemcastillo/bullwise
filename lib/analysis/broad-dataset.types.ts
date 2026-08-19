import type {
	AnalysisDatasetFeatureVector,
	AnalysisDatasetLabels,
	AnalysisDatasetSplit,
	AnalysisDatasetSplitSummary,
} from "@/lib/analysis/analysis-dataset.types";
import type { DailySwingObjectiveFeatureValues } from "@/lib/analysis/objective-features.types";

export const DAILY_SWING_BROAD_DATASET_VERSION = "2.0.0";
export const DAILY_SWING_BROAD_SPLIT_POLICY_VERSION = "1.0.0";
export const DAILY_SWING_BROAD_SETUP_SCAN_SHA256 =
	"142b4477f302abbb4f3dd8d38a9efb7265e861271a51549d3bf442296cb16217";

export const DAILY_SWING_BROAD_SPLIT_BOUNDARIES = {
	validationStartsAt: "2023-01-01T00:00:00.000Z",
	testStartsAt: "2025-01-01T00:00:00.000Z",
} as const;

export const DAILY_SWING_BROAD_WALK_FORWARD_FOLDS = [
	{
		foldId: "evaluate_2020",
		evaluationStartsAt: "2020-01-01T00:00:00.000Z",
		evaluationEndsBefore: "2021-01-01T00:00:00.000Z",
	},
	{
		foldId: "evaluate_2021",
		evaluationStartsAt: "2021-01-01T00:00:00.000Z",
		evaluationEndsBefore: "2022-01-01T00:00:00.000Z",
	},
	{
		foldId: "evaluate_2022",
		evaluationStartsAt: "2022-01-01T00:00:00.000Z",
		evaluationEndsBefore: DAILY_SWING_BROAD_SPLIT_BOUNDARIES.validationStartsAt,
	},
] as const;

export type DailySwingBroadFeatureVector = AnalysisDatasetFeatureVector &
	DailySwingObjectiveFeatureValues;

export type DailySwingBroadDatasetRow = {
	rowId: string;
	instrumentId: string;
	displaySymbol: string;
	signalAt: string;
	resolvedAt: string;
	split: AnalysisDatasetSplit;
	features: DailySwingBroadFeatureVector;
	labels: AnalysisDatasetLabels;
};

export type DailySwingBroadWalkForwardFold = {
	foldId: (typeof DAILY_SWING_BROAD_WALK_FORWARD_FOLDS)[number]["foldId"];
	fit: AnalysisDatasetSplitSummary;
	evaluation: AnalysisDatasetSplitSummary;
	boundaries: {
		evaluationStartsAt: string;
		evaluationEndsBefore: string;
	};
	purgedFitBoundaryRows: number;
	purgedEvaluationBoundaryRows: number;
};

export type DailySwingBroadDataset = {
	datasetVersion: typeof DAILY_SWING_BROAD_DATASET_VERSION;
	generatedAt: string;
	source: {
		setupScanSha256: string;
		setupScanVersion: "2.0.0";
		objectiveFeatureVersion: "1.0.0";
		universeName: "daily-swing-broad-development-v1";
		backtestVersions: string[];
		engineVersions: string[];
		strategyVersions: string[];
	};
	featureAvailability: {
		asOf: "signalAt";
		policy: "completed_signal_bar_only";
		instrumentIdentityUsedAsFeature: false;
		description: string;
	};
	eligibility: {
		coverageExcludedInstruments: number;
		liquidityRejectedSetups: number;
		eligibleOutcomeRowsBeforeBoundaryPurge: number;
	};
	splitPolicy: {
		version: typeof DAILY_SWING_BROAD_SPLIT_POLICY_VERSION;
		method: "fixed_calendar_expanding_walk_forward_with_resolution_purge";
		validationStartsAt: typeof DAILY_SWING_BROAD_SPLIT_BOUNDARIES.validationStartsAt;
		testStartsAt: typeof DAILY_SWING_BROAD_SPLIT_BOUNDARIES.testStartsAt;
		purgedFinalBoundaryRows: number;
		episodeSelection: "independently_within_each_fold_and_final_split";
		description: string;
	};
	walkForwardFolds: DailySwingBroadWalkForwardFold[];
	splits: Record<AnalysisDatasetSplit, AnalysisDatasetSplitSummary>;
	rows: DailySwingBroadDatasetRow[];
	warnings: string[];
};
