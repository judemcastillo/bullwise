import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	listFinnhubCryptoSymbols,
	listFinnhubOandaSymbols,
	listFinnhubUsEquitySymbols,
} from "@/lib/market-data/providers/finnhub-forex-client";
import {
	listMassiveCryptoTickers,
	listMassiveForexTickers,
	listMassiveStockTickers,
} from "@/lib/market-data/providers/massive-client";

function jsonResponse(value: unknown) {
	return new Response(JSON.stringify(value), {
		status: 200,
		headers: { "content-type": "application/json" },
	});
}

describe("forex provider catalog clients", () => {
	it("requests and validates the Finnhub OANDA catalog", async () => {
		let requestUrl = "";
		const fetchImpl = (async (input: URL | RequestInfo) => {
			requestUrl = input.toString();
			return jsonResponse([
				{
					description: "Euro vs US Dollar",
					displaySymbol: "EUR/USD",
					symbol: "OANDA:EUR_USD",
				},
				{ malformed: true },
			]);
		}) as typeof fetch;

		const results = await listFinnhubOandaSymbols({
			apiKey: "finnhub-test-key",
			fetchImpl,
		});

		assert.equal(results.length, 1);
		assert.match(requestUrl, /\/forex\/symbol\?/);
		assert.match(requestUrl, /exchange=OANDA/);
	});

	it("follows Massive catalog pagination and deduplicates tickers", async () => {
		let calls = 0;
		const fetchImpl = (async (input: URL | RequestInfo) => {
			calls += 1;
			const url = new URL(input.toString());
			assert.equal(url.searchParams.get("apiKey"), "massive-test-key");

			return calls === 1
				? jsonResponse({
						results: [
							{ ticker: "C:EURUSD", name: "EUR/USD", market: "fx" },
						],
						next_url:
							"https://api.massive.com/v3/reference/tickers?cursor=next",
					})
				: jsonResponse({
						results: [
							{ ticker: "C:EURUSD", name: "EUR/USD", market: "fx" },
							{ ticker: "C:GBPUSD", name: "GBP/USD", market: "fx" },
							{ ticker: "X:BTCUSD", name: "BTC/USD", market: "crypto" },
						],
					});
		}) as typeof fetch;

		const results = await listMassiveForexTickers({
			apiKey: "massive-test-key",
			fetchImpl,
		});

		assert.equal(calls, 2);
		assert.deepEqual(
			results.map(({ ticker }) => ticker),
			["C:EURUSD", "C:GBPUSD"],
		);
	});

	it("requires both provider credentials", async () => {
		await assert.rejects(() => listFinnhubOandaSymbols({ apiKey: "" }));
		await assert.rejects(() => listMassiveForexTickers({ apiKey: "" }));
	});

	it("requests the Finnhub equity and crypto catalogs", async () => {
		const urls: string[] = [];
		const fetchImpl = (async (input: URL | RequestInfo) => {
			urls.push(input.toString());
			return jsonResponse([
				{
					description: "Valid",
					displaySymbol: "BTC-USD",
					symbol: "COINBASE:BTC-USD",
				},
			]);
		}) as typeof fetch;

		await listFinnhubUsEquitySymbols({ apiKey: "key", fetchImpl });
		await listFinnhubCryptoSymbols({
			exchange: "coinbase",
			apiKey: "key",
			fetchImpl,
		});

		assert.match(urls[0], /\/stock\/symbol\?/);
		assert.match(urls[0], /exchange=US/);
		assert.match(urls[1], /\/crypto\/symbol\?/);
		assert.match(urls[1], /exchange=COINBASE/);
	});

	it("filters Massive pages to the requested market", async () => {
		const fetchImpl = (async () =>
			jsonResponse({
				results: [
					{ ticker: "AAPL", name: "Apple", market: "stocks" },
					{ ticker: "X:BTCUSD", name: "Bitcoin", market: "crypto" },
				],
			})) as typeof fetch;

		const stocks = await listMassiveStockTickers({ apiKey: "key", fetchImpl });
		const crypto = await listMassiveCryptoTickers({ apiKey: "key", fetchImpl });

		assert.deepEqual(stocks.map(({ ticker }) => ticker), ["AAPL"]);
		assert.deepEqual(crypto.map(({ ticker }) => ticker), ["X:BTCUSD"]);
	});
});
