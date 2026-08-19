import type {
	BacktestSignalFeatures,
	BacktestSignalQuality,
	BacktestTrade,
} from "@/lib/analysis/backtest.types";

export const DAILY_SWING_ANALYSIS_DATASET_VERSION = "1.1.0";

export type AnalysisDatasetSplit = "train" | "validation" | "test";

export type AnalysisDatasetSplitRatios = {
	train: number;
	validation: number;
	test: number;
};

export type AnalysisDatasetFeatureVector = BacktestSignalFeatures &
	BacktestSignalQuality & {
		direction: BacktestTrade["direction"];
		setupType: BacktestTrade["setupType"];
		trendRegime: BacktestTrade["trendRegime"];
		volatilityRegime: BacktestTrade["volatilityRegime"];
	};

export type AnalysisDatasetLabels = {
	triggered: boolean;
	profitable: boolean | null;
	netRMultiple: number | null;
	exitReason: BacktestTrade["exitReason"] | "expired_untriggered" | "end_of_data_untriggered";
	targetOneReached: boolean | null;
	maximumFavorableExcursionPercent: number | null;
	maximumAdverseExcursionPercent: number | null;
};

export type AnalysisDatasetRow = {
	rowId: string;
	instrumentId: string;
	displaySymbol: string;
	signalAt: string;
	resolvedAt: string;
	split: AnalysisDatasetSplit;
	features: AnalysisDatasetFeatureVector;
	labels: AnalysisDatasetLabels;
};

export type AnalysisDatasetSplitSummary = {
	startsAt: string;
	endsAt: string;
	rows: number;
	signalSessions: number;
};

export type DailySwingAnalysisDataset = {
	datasetVersion: typeof DAILY_SWING_ANALYSIS_DATASET_VERSION;
	generatedAt: string;
	source: {
		kind: "sequential_backtest" | "exhaustive_setup_scan";
		universeName: string;
		batchVersion: string | null;
		setupScanVersion: string | null;
		backtestVersions: string[];
		engineVersions: string[];
		strategyVersions: string[];
	};
	featureAvailability: {
		asOf: "signalAt";
		policy: "completed_signal_bar_only";
		description: string;
	};
	exclusions: {
		frozenConfirmationSymbols: string[];
		additionalSymbols: string[];
		excludedInstruments: string[];
		excludedSetupRows: number;
		purgedBoundaryRows: number;
	};
	splitPolicy: {
		method: "chronological_signal_sessions_with_resolution_purge";
		ratios: AnalysisDatasetSplitRatios;
		validationStartsAt: string;
		testStartsAt: string;
		description: string;
	};
	splits: Record<AnalysisDatasetSplit, AnalysisDatasetSplitSummary>;
	rows: AnalysisDatasetRow[];
};
