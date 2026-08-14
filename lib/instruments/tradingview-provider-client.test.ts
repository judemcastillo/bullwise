import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { listResolvableTradingViewEquities } from "@/lib/market-data/providers/tradingview-client";

function jsonResponse(value: unknown, status = 200) {
	return new Response(JSON.stringify(value), {
		status,
		headers: { "content-type": "application/json" },
	});
}

describe("TradingView equity catalog client", () => {
	it("resolves exact symbols in bounded scanner batches", async () => {
		const requests: string[][] = [];
		const fetchImpl = (async (_input: URL | RequestInfo, init?: RequestInit) => {
			const body = JSON.parse(String(init?.body)) as {
				symbols: { tickers: string[] };
			};
			requests.push(body.symbols.tickers);
			return jsonResponse({
				data: body.symbols.tickers
					.filter((symbol) => symbol !== "NASDAQ:MISSING")
					.map((symbol) => ({ s: symbol })),
			});
		}) as typeof fetch;

		const resolved = await listResolvableTradingViewEquities({
			symbols: ["nasdaq:aapl", "NASDAQ:MISSING", "nyse:ibm"],
			fetchImpl,
			batchSize: 2,
		});

		assert.deepEqual(requests, [
			["NASDAQ:AAPL", "NASDAQ:MISSING"],
			["NYSE:IBM"],
		]);
		assert.deepEqual([...resolved], ["NASDAQ:AAPL", "NYSE:IBM"]);
	});

	it("rejects malformed symbols and untrustworthy responses", async () => {
		await assert.rejects(() =>
			listResolvableTradingViewEquities({ symbols: ["AAPL"] }),
		);
		const fetchImpl = (async () => jsonResponse({ data: [] })) as typeof fetch;
		await assert.rejects(() =>
			listResolvableTradingViewEquities({
				symbols: ["NASDAQ:AAPL"],
				fetchImpl,
			}),
		);
	});
});
