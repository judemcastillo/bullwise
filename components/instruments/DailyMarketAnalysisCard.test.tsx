import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
	DailyMarketAnalysisError,
	DailyMarketAnalysisLoading,
	DailyMarketAnalysisView,
	aiAnalysisEndpointForInstrument,
	analysisEndpointForInstrument,
	isAiAnalysisResponse,
	isAnalysisPanelResponse,
} from "@/components/instruments/DailyMarketAnalysisCard";
import { buildTransparentAnalysisAiInput } from "@/lib/analysis/transparent-analysis-ai-contract";
import { renderTransparentAnalysisAiSelection } from "@/lib/analysis/transparent-analysis-ai-selection-contract";
import { buildTransparentAnalysisAiSelectionV16Input } from "@/lib/analysis/transparent-analysis-ai-selection-v1-6";
import type {
	AnalysisPanelAvailableResponse,
	AnalysisPanelResponse,
} from "@/lib/analysis/transparent-analysis-panel.types";
import { renderToStaticMarkup } from "react-dom/server";

const readyResponse: AnalysisPanelAvailableResponse = {
	version: "1.0.0",
	status: "ready",
	instrument: {
		canonicalKey: "equity:xnas:aapl",
		displaySymbol: "AAPL",
		name: "Apple Inc.",
		currency: "USD",
	},
	asOf: "2026-08-21T20:00:00.000Z",
	timeframe: { interval: "1d", description: "Daily context" },
	context: "constructive",
	factors: {
		trend: {
			state: "bullish",
			evidence: ["Price is above its 200-day moving average."],
			counterEvidence: ["The daily moving averages are not fully aligned."],
		},
		momentum: {
			state: "bullish",
			evidence: ["Daily MACD momentum is positive."],
			counterEvidence: [],
		},
		volatility: {
			state: "normal",
			evidence: ["20-day realized volatility is 18%."],
			counterEvidence: [],
		},
		participation: {
			state: "normal",
			evidence: ["Latest volume is 0.2 standard deviations from its 20-day baseline."],
			counterEvidence: [],
		},
	},
	levels: {
		support: [
			{
				kind: "support",
				price: "220.50",
				distancePercent: -2.4,
				touches: 3,
				source: "swing_cluster",
			},
		],
		resistance: [
			{
				kind: "resistance",
				price: "235.10",
				distancePercent: 4.1,
				touches: 2,
				source: "range_boundary",
			},
		],
	},
	dataQuality: {
		provider: "massive",
		interval: "1d",
		adjusted: true,
		barsUsed: 500,
		firstBarAt: "2024-08-22T04:00:00.000Z",
		lastBarAt: "2026-08-21T04:00:00.000Z",
		completedThrough: "2026-08-21T20:00:00.000Z",
		warnings: [],
	},
	disclaimer: "Descriptive market context—not investment advice or a trading signal.",
};

describe("daily market analysis UI", () => {
	it("never creates an endpoint for a server-known ineligible instrument", () => {
		assert.equal(analysisEndpointForInstrument("equity:arcx:spy", false), null);
		assert.equal(
			analysisEndpointForInstrument("equity:xnas:aapl", true),
			"/api/instruments/equity%3Axnas%3Aaapl/analysis",
		);
		assert.equal(
			aiAnalysisEndpointForInstrument("equity:xnas:aapl"),
			"/api/instruments/equity%3Axnas%3Aaapl/analysis/ai",
		);
	});

	it("accepts only a grounded AI response for the current deterministic panel", () => {
		const baseInput = buildTransparentAnalysisAiInput(readyResponse)!;
		const input = buildTransparentAnalysisAiSelectionV16Input(baseInput);
		const selection = {
			version: "1.0.0" as const,
			overviewFactIds: input.requiredOverviewFactIds,
			factors: (["trend", "momentum", "volatility", "participation"] as const).map((factor) => ({
				factor,
				factIds: input.factors[factor].facts.map(({ id }) => id),
			})),
		};
		const valid = {
			version: "1.0.0",
			status: "ready",
			explanation: renderTransparentAnalysisAiSelection(input, selection),
		};

		assert.equal(isAiAnalysisResponse(valid, readyResponse), true);
		assert.equal(
			isAiAnalysisResponse({
				...valid,
				explanation: { ...valid.explanation, overview: { text: "Buy now.", factIds: [] } },
			}, readyResponse),
			false,
		);
	});

	it("validates the allow-listed API response before rendering", () => {
		assert.equal(isAnalysisPanelResponse(readyResponse), true);
		assert.equal(isAnalysisPanelResponse({ ...readyResponse, signal: "long" }), true);
		assert.equal(isAnalysisPanelResponse({ ...readyResponse, factors: null }), false);
		assert.equal(
			isAnalysisPanelResponse({
				version: "1.0.0",
				status: "unavailable",
				reason: "raw_provider_error",
				message: "secret",
				disclaimer: readyResponse.disclaimer,
			}),
			false,
		);
	});

	it("renders context, evidence, levels, provenance, timestamp, and disclaimer", () => {
		const html = renderToStaticMarkup(<DailyMarketAnalysisView response={readyResponse} />);

		for (const text of [
			"Daily market analysis",
			"Market context · AAPL",
			"Constructive",
			"Supporting evidence",
			"Counter evidence",
			"Nearest price levels",
			"220.50",
			"Data quality and provenance",
			"Generate AI analysis",
			"AI only orders the facts shown above",
			"massive",
			"Aug 21, 2026, 4:00 PM EDT",
			readyResponse.disclaimer,
		]) {
			assert.ok(html.includes(text), `Expected rendered analysis to include ${text}`);
		}
	});

	it("names missing factors in a partial response", () => {
		const partial: AnalysisPanelAvailableResponse = {
			...readyResponse,
			status: "partial",
			factors: {
				...readyResponse.factors,
				participation: {
					state: "unavailable",
					evidence: [],
					counterEvidence: ["Recent volume participation could not be calculated."],
				},
			},
			dataQuality: {
				...readyResponse.dataQuality,
				warnings: ["SPY benchmark data are unavailable; relative strength is omitted."],
			},
		};
		const html = renderToStaticMarkup(<DailyMarketAnalysisView response={partial} />);

		assert.match(html, /Partial analysis/);
		assert.match(html, /participation and SPY-relative strength are unavailable/);
		const participationCard = html.match(/<article\b[^>]*>[\s\S]*?<\/article>/g)![3];
		assert.doesNotMatch(participationCard, /Counter evidence|Recent volume participation could not be calculated/);
		assert.match(html, /Data limitations/);
		assert.ok(html.indexOf("Recent volume participation could not be calculated.") > html.indexOf("Data limitations</h3>"));
	});

	it("keeps bearish and positive short-term facts visible together without expanding details", () => {
		const response = structuredClone(readyResponse);
		response.context = "defensive";
		response.factors.trend.state = "bearish";
		response.factors.trend.evidence = ["The shortest trend slope turned slightly positive."];
		response.factors.trend.counterEvidence = ["Price is below its 200-day moving average."];
		response.factors.momentum.state = "bearish";
		response.factors.momentum.evidence = ["The latest session return is 0.36%."];
		response.factors.momentum.counterEvidence = ["The 20-day return is negative."];
		const html = renderToStaticMarkup(<DailyMarketAnalysisView response={response} />);
		const cards = html.match(/<article\b[^>]*>[\s\S]*?<\/article>/g)!;
		assert.equal(cards.length, 4);
		for (const [index, factor] of [response.factors.trend, response.factors.momentum].entries()) {
			assert.doesNotMatch(cards[index], /<details/);
			for (const fact of [...factor.evidence, ...factor.counterEvidence]) {
				assert.ok(cards[index].includes(fact));
			}
		}
		assert.doesNotMatch(html, /Data limitations/);
	});

	it("keeps mixed indicators grouped under their source factor", () => {
		const response = structuredClone(readyResponse);
		response.context = "mixed";
		response.factors.trend = {
			state: "mixed",
			evidence: ["Price is above its 50-day moving average."],
			counterEvidence: ["Price is below its 200-day moving average."],
		};
		response.factors.momentum = {
			state: "mixed",
			evidence: ["The latest session return is positive."],
			counterEvidence: ["The 20-day return is negative."],
		};
		const html = renderToStaticMarkup(<DailyMarketAnalysisView response={response} />);
		const cards = html.match(/<article\b[^>]*>[\s\S]*?<\/article>/g)!;

		assert.match(cards[0], />mixed</);
		assert.match(cards[0], /Price is above its 50-day moving average/);
		assert.match(cards[0], /Price is below its 200-day moving average/);
		assert.doesNotMatch(cards[0], /latest session return|20-day return/);
		assert.match(cards[1], />mixed</);
		assert.match(cards[1], /latest session return is positive/);
		assert.match(cards[1], /20-day return is negative/);
	});

	it("shows high-volatility evidence and counter-evidence together", () => {
		const response = structuredClone(readyResponse);
		response.factors.volatility = {
			state: "high",
			evidence: ["Twenty-day realized volatility is 42%."],
			counterEvidence: ["The latest daily range was narrower than its recent baseline."],
		};
		const html = renderToStaticMarkup(<DailyMarketAnalysisView response={response} />);
		const volatilityCard = html.match(/<article\b[^>]*>[\s\S]*?<\/article>/g)![2];

		assert.match(volatilityCard, />high</);
		assert.match(volatilityCard, /Twenty-day realized volatility is 42%/);
		assert.match(volatilityCard, /latest daily range was narrower than its recent baseline/);
		assert.doesNotMatch(html, /Data limitations/);
	});

	it("renders explicit empty-state copy for factors with one evidence kind", () => {
		const response = structuredClone(readyResponse);
		response.factors.trend = {
			state: "bullish",
			evidence: ["Price is above its 200-day moving average."],
			counterEvidence: [],
		};
		response.factors.momentum = {
			state: "bearish",
			evidence: [],
			counterEvidence: ["The 20-day return is negative."],
		};
		const html = renderToStaticMarkup(<DailyMarketAnalysisView response={response} />);
		const cards = html.match(/<article\b[^>]*>[\s\S]*?<\/article>/g)!;

		assert.match(cards[0], /Price is above its 200-day moving average/);
		assert.match(cards[0], /No counter evidence was identified/);
		assert.match(cards[1], /No supporting evidence is available/);
		assert.match(cards[1], /The 20-day return is negative/);
	});

	it("renders unavailable, loading, authentication, and retry states accessibly", () => {
		const unavailable: AnalysisPanelResponse = {
			version: "1.0.0",
			status: "unavailable",
			reason: "bars_provider_unavailable",
			message: "Daily market data are temporarily unavailable. Please try again later.",
			disclaimer: readyResponse.disclaimer,
		};
		const unavailableHtml = renderToStaticMarkup(
			<DailyMarketAnalysisView response={unavailable} onRetry={() => undefined} />,
		);
		const loadingHtml = renderToStaticMarkup(<DailyMarketAnalysisLoading />);
		const authHtml = renderToStaticMarkup(<DailyMarketAnalysisError reason="authentication" />);
		const retryHtml = renderToStaticMarkup(
			<DailyMarketAnalysisError reason="request_failed" onRetry={() => undefined} />,
		);

		assert.match(unavailableHtml, /role="status"/);
		assert.ok(unavailableHtml.includes("Retry</button>"));
		assert.match(loadingHtml, /role="status"/);
		assert.match(loadingHtml, /Preparing daily market context/);
		assert.match(authHtml, /role="alert"/);
		assert.match(authHtml, /href="\/sign-in"/);
		assert.match(retryHtml, /role="alert"/);
		assert.ok(retryHtml.includes("Retry</button>"));
	});

	it("removes the legacy recommendation-style preview surface", () => {
		const source = readFileSync(new URL("./DailyMarketAnalysisCard.tsx", import.meta.url), "utf8");
		assert.doesNotMatch(
			source,
			/Overall signal|Confidence|Invalidation|Generate analysis|AI technical analysis|providerSymbol/,
		);
	});
});
