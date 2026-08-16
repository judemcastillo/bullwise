import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { BarsRequest } from "@/lib/market-data/types";
import type { AssetClass } from "@/types/instruments";
import { MassiveBarsProvider } from "./massive-bars-client";

function request(
	assetClass: AssetClass,
	providerSymbol: string,
): BarsRequest {
	return {
		instrumentId: `instrument-${assetClass}`,
		assetClass,
		provider: "massive",
		providerSymbol,
		expectedCurrency: "USD",
		pricePrecision: 4,
		interval: "1d",
		from: new Date("2026-08-01T00:00:00.000Z"),
		to: new Date("2026-08-03T00:00:00.000Z"),
	};
}

describe("MassiveBarsProvider", () => {
	it("normalizes bars for equity, forex, crypto, and commodity symbols", async () => {
		const urls: string[] = [];
		const provider = new MassiveBarsProvider({
			apiKey: "test-key",
			fetchImpl: async (input) => {
				urls.push(String(input));
				return new Response(
					JSON.stringify({
						adjusted: true,
						results: [
							{
								t: 1785542400000,
								o: 10.123456,
								h: 12,
								l: 9,
								c: 11.5,
								v: 1234,
								vw: 10.75,
								n: 42,
							},
						],
					}),
					{ status: 200 },
				);
			},
		});
		const cases: Array<[AssetClass, string]> = [
			["equity", "AAPL"],
			["forex", "C:EURUSD"],
			["crypto", "X:BTCUSD"],
			["commodity", "C:XAUUSD"],
		];

		for (const [assetClass, symbol] of cases) {
			const result = await provider.getBars(request(assetClass, symbol));
			assert.equal(result.bars[0].open, "10.1235");
			assert.equal(result.bars[0].transactionCount, 42);
			assert.equal(result.timeliness, "historical");
		}

		assert.equal(urls.length, cases.length);
		assert.match(urls[1], /C%3AEURUSD/);
		assert.match(urls[2], /X%3ABTCUSD/);
	});

	it("sorts, deduplicates, and drops malformed bars", async () => {
		const provider = new MassiveBarsProvider({
			apiKey: "test-key",
			fetchImpl: async () =>
				new Response(
					JSON.stringify({
						results: [
							{ t: 2, o: 2, h: 3, l: 1, c: 2 },
							{ t: 1, o: 1, h: 2, l: 0.5, c: 1.5 },
							{ t: 2, o: 2.1, h: 3, l: 1, c: 2.2 },
							{ t: 3, o: 1, h: 0.5, l: 0.25, c: 1 },
						],
					}),
					{ status: 200 },
				),
		});

		const result = await provider.getBars(request("equity", "AAPL"));

		assert.deepEqual(
			result.bars.map((bar) => bar.startedAt.getTime()),
			[1, 2],
		);
		assert.equal(result.bars[1].open, "2.1");
	});

	it("fails instead of silently returning a truncated range", async () => {
		const provider = new MassiveBarsProvider({
			apiKey: "test-key",
			fetchImpl: async () =>
				new Response(
					JSON.stringify({ results: [], next_url: "https://api.massive.com/next" }),
					{ status: 200 },
				),
		});

		await assert.rejects(
			provider.getBars(request("equity", "AAPL")),
			/exceeded the requested limit/,
		);
	});
});
