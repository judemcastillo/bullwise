import type { AnalysisDatasetSplit, AnalysisDatasetSplitSummary } from "@/lib/analysis/analysis-dataset.types";
import type {
	DailySwingBroadDatasetRow,
	DailySwingBroadWalkForwardFold,
} from "@/lib/analysis/broad-dataset.types";

export const DAILY_SWING_COMBINED_BROAD_DATASET_VERSION = "3.0.0";
export const DAILY_SWING_COMBINED_BROAD_UNIVERSE_NAME =
	"daily-swing-broad-development-v2-combined";
export const DAILY_SWING_BROAD_EXPANSION_SETUP_SCAN_SHA256 =
	"9a21909cdc21ecc49521630cd873bd74f8711a77d276c99392618ba7fb695305";

export type DailySwingCombinedBroadSourceScan = "base" | "expansion";

export type DailySwingCombinedBroadDatasetRow = DailySwingBroadDatasetRow & {
	sourceScan: DailySwingCombinedBroadSourceScan;
};

export type DailySwingCombinedBroadDataset = {
	datasetVersion: typeof DAILY_SWING_COMBINED_BROAD_DATASET_VERSION;
	generatedAt: string;
	source: {
		universeName: typeof DAILY_SWING_COMBINED_BROAD_UNIVERSE_NAME;
		scans: Array<{
			sourceScan: DailySwingCombinedBroadSourceScan;
			universeName: string;
			setupScanSha256: string;
			setupScanVersion: "2.0.0";
			researchPolicy:
				| "broad_development_v1"
				| "broad_development_v2_expansion";
			candidatesReceived: number;
			instrumentsScanned: number;
			coverageExcluded: number;
		}>;
		objectiveFeatureVersion: "1.0.0";
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
		bySource: Record<
			DailySwingCombinedBroadSourceScan,
			{
				coverageExcludedInstruments: number;
				liquidityRejectedSetups: number;
				eligibleOutcomeRowsBeforeBoundaryPurge: number;
			}
		>;
	};
	splitPolicy: {
		version: "1.0.0";
		method: "fixed_calendar_expanding_walk_forward_with_resolution_purge";
		validationStartsAt: "2023-01-01T00:00:00.000Z";
		testStartsAt: "2025-01-01T00:00:00.000Z";
		purgedFinalBoundaryRows: number;
		episodeSelection: "independently_within_each_fold_and_final_split";
		description: string;
	};
	walkForwardFolds: DailySwingBroadWalkForwardFold[];
	splits: Record<AnalysisDatasetSplit, AnalysisDatasetSplitSummary>;
	rows: DailySwingCombinedBroadDatasetRow[];
	warnings: string[];
};
