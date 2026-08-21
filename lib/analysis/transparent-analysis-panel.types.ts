export const TRANSPARENT_ANALYSIS_PANEL_VERSION = "1.0.0";
export const TRANSPARENT_ANALYSIS_PANEL_DISCLAIMER =
	"Descriptive market context—not investment advice or a trading signal.";

export type AnalysisPanelContext = "constructive" | "mixed" | "defensive";
export type AnalysisPanelStatus = "ready" | "partial" | "unavailable";

export type AnalysisPanelEvidenceFactor<TState extends string> = {
	state: TState;
	evidence: string[];
	counterEvidence: string[];
};

export type AnalysisPanelLevel = {
	kind: "support" | "resistance";
	price: string;
	distancePercent: number;
	touches: number;
	source: "swing_cluster" | "range_boundary";
};

export type AnalysisPanelDataQuality = {
	provider: string;
	interval: "1d";
	adjusted: true;
	barsUsed: number;
	firstBarAt: string;
	lastBarAt: string;
	completedThrough: string;
	warnings: string[];
};

export type AnalysisPanelUnavailableReason =
	| "unsupported_instrument"
	| "bars_provider_unavailable"
	| "completed_session_unavailable"
	| "invalid_market_data"
	| "insufficient_history"
	| "stale_market_data"
	| "analysis_failed";

type AnalysisPanelBase = {
	version: typeof TRANSPARENT_ANALYSIS_PANEL_VERSION;
	disclaimer: typeof TRANSPARENT_ANALYSIS_PANEL_DISCLAIMER;
};

export type AnalysisPanelAvailableResponse = AnalysisPanelBase & {
	status: Exclude<AnalysisPanelStatus, "unavailable">;
	instrument: {
		canonicalKey: string;
		displaySymbol: string;
		name: string;
		currency: string;
	};
	asOf: string;
	timeframe: {
		interval: "1d";
		description: "Daily context";
	};
	context: AnalysisPanelContext;
	factors: {
		trend: AnalysisPanelEvidenceFactor<"bullish" | "mixed" | "bearish">;
		momentum: AnalysisPanelEvidenceFactor<"bullish" | "mixed" | "bearish">;
		volatility: AnalysisPanelEvidenceFactor<"low" | "normal" | "high">;
		participation: AnalysisPanelEvidenceFactor<
			"weak" | "normal" | "strong" | "unavailable"
		>;
	};
	levels: {
		support: AnalysisPanelLevel[];
		resistance: AnalysisPanelLevel[];
	};
	dataQuality: AnalysisPanelDataQuality;
};

export type AnalysisPanelUnavailableResponse = AnalysisPanelBase & {
	status: "unavailable";
	reason: AnalysisPanelUnavailableReason;
	message: string;
	dataQuality?: AnalysisPanelDataQuality;
};

export type AnalysisPanelResponse =
	| AnalysisPanelAvailableResponse
	| AnalysisPanelUnavailableResponse;
