import type {
	BacktestConfiguration,
	BacktestTrade,
	DailySwingBacktestReport,
	UntriggeredSetup,
} from "@/lib/analysis/backtest.types";
import type { TechnicalAnalysisInstrument } from "@/lib/analysis/technical-analysis.types";

export const DAILY_SWING_SETUP_SCAN_VERSION = "1.0.0";

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
		description: string;
	};
	aggregate: {
		instrumentsScanned: number;
		analyses: number;
		setups: number;
		triggered: number;
		untriggered: number;
	};
	reports: DailySwingInstrumentSetupScan[];
	warnings: string[];
};
