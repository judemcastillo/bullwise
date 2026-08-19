import type {
	BacktestConfiguration,
	BacktestTrade,
	DailySwingBacktestReport,
	UntriggeredSetup,
} from "@/lib/analysis/backtest.types";
import type { DailySwingObjectiveFeatureRecord } from "@/lib/analysis/objective-features.types";
import type { TechnicalAnalysisInstrument } from "@/lib/analysis/technical-analysis.types";

export const DAILY_SWING_SETUP_SCAN_VERSION = "2.0.0";
export const SUPPORTED_DAILY_SWING_SETUP_SCAN_VERSIONS = [
	"1.0.0",
	DAILY_SWING_SETUP_SCAN_VERSION,
] as const;

export type DailySwingSetupResearchPolicy =
	| "none"
	| "broad_development_v1";

export type DailySwingInstrumentSetupScan = {
	instrument: TechnicalAnalysisInstrument;
	backtestVersion: string;
	engineVersion: string;
	strategyVersion: string;
	configuration: BacktestConfiguration;
	window: {
		requestedStartAt: string | null;
		requestedEndAt: string | null;
		firstEvaluatedAt: string | null;
		lastEvaluatedAt: string | null;
		barsAvailable: number;
	};
	signalCounts: DailySwingBacktestReport["signalCounts"];
	eligibility: {
		researchPolicy: DailySwingSetupResearchPolicy;
		setupsEvaluated: number;
		liquidityRejected: number;
	};
	objectiveFeatures: DailySwingObjectiveFeatureRecord[];
	trades: BacktestTrade[];
	untriggeredSetups: UntriggeredSetup[];
};

export type DailySwingSetupScanReport = {
	scanVersion: typeof DAILY_SWING_SETUP_SCAN_VERSION;
	generatedAt: string;
	universeName: string;
	methodology: {
		evaluationPolicy: "every_eligible_completed_bar";
		labelPolicy: "independent_fixed_equity_simulation";
		researchPolicy: DailySwingSetupResearchPolicy;
		description: string;
	};
	aggregate: {
		candidatesReceived: number;
		instrumentsScanned: number;
		coverageExcluded: number;
		analyses: number;
		setups: number;
		liquidityRejected: number;
		triggered: number;
		untriggered: number;
	};
	reports: DailySwingInstrumentSetupScan[];
	warnings: string[];
};
