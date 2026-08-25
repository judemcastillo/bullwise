import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
	DailyMarketAnalysisError,
	DailyMarketAnalysisLoading,
	DailyMarketAnalysisView,
	analysisEndpointForInstrument,
	isAnalysisPanelResponse,
} from "@/components/instruments/DailyMarketAnalysisCard";
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
