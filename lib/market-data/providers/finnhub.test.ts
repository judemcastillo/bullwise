import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { QuoteRequest } from "@/lib/market-data/types";
import { FinnhubQuoteProvider } from "./finnhub-client";

function request(instrumentId: string, providerSymbol = "AAPL"): QuoteRequest {
	return {
		instrumentId,
		assetClass: "equity",
		provider: "finnhub",
		providerSymbol,
		expectedCurrency: "USD",
	};
}

describe("FinnhubQuoteProvider", () => {
	it("fetches a shared symbol once and maps it to each instrument request", async () => {
		const urls: string[] = [];
		const fetchImpl: typeof fetch = async (input) => {
			urls.push(String(input));
			return new Response(JSON.stringify({ c: 210.25, t: 1754049570 }), {
				status: 200,
				headers: { "content-type": "application/json" },
			});
		};
		const provider = new FinnhubQuoteProvider({
			apiKey: "test-key",
			fetchImpl,
		});

		const quotes = await provider.getQuotes([
			request("instrument-1"),
			request("instrument-2"),
		]);

		assert.equal(urls.length, 1);
		assert.equal(quotes.size, 2);
		assert.equal(quotes.get("instrument-1")?.price, "210.25");
		assert.equal(quotes.get("instrument-1")?.timeliness, "unknown");
		assert.equal(
			quotes.get("instrument-2")?.observedAt.toISOString(),
			"2025-08-01T11:59:30.000Z",
		);
	});

	it("reports a provider failure when no request succeeds", async () => {
		const provider = new FinnhubQuoteProvider({
			apiKey: "test-key",
			fetchImpl: async () => new Response("rate limited", { status: 429 }),
		});

		await assert.rejects(
			provider.getQuotes([request("instrument-1")]),
			/Finnhub did not return any valid quotes/,
		);
	});

	it("bounds concurrent provider requests", async () => {
		let activeRequests = 0;
		let maximumActiveRequests = 0;
		const provider = new FinnhubQuoteProvider({
			apiKey: "test-key",
			maxConcurrency: 2,
			fetchImpl: async () => {
				activeRequests += 1;
				maximumActiveRequests = Math.max(
					maximumActiveRequests,
					activeRequests,
				);
				await new Promise<void>((resolve) => setImmediate(resolve));
				activeRequests -= 1;
				return new Response(JSON.stringify({ c: 100, t: 1754049570 }), {
					status: 200,
				});
			},
		});

		const quotes = await provider.getQuotes(
			Array.from({ length: 6 }, (_, index) =>
				request(`instrument-${index}`, `SYM${index}`),
			),
		);

		assert.equal(quotes.size, 6);
		assert.equal(maximumActiveRequests, 2);
	});
});
