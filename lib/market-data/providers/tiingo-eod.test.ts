import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TiingoEodProvider } from "./tiingo-eod-client";
import type { BarsRequest } from "../types";

function request(overrides: Partial<BarsRequest> = {}): BarsRequest {
	return {
		instrumentId: "instrument-spy",
		assetClass: "equity",
		provider: "tiingo",
		providerSymbol: "SPY",
		expectedCurrency: "USD",
		pricePrecision: 2,
		interval: "1d",
		from: new Date("2007-01-01T00:00:00.000Z"),
		to: new Date("2015-12-31T23:59:59.999Z"),
		...overrides,
	};
}

describe("TiingoEodProvider", () => {
	it("requests and parses dividend-and-split-adjusted EOD bars", async () => {
		let requestedUrl: URL | undefined;
		let requestedHeaders: Headers | undefined;
		const provider = new TiingoEodProvider({
			apiToken: "test-token",
			fetchImpl: async (input, init) => {
				requestedUrl = new URL(String(input));
				requestedHeaders = new Headers(init?.headers);
				return new Response(
					JSON.stringify([
						{
							date: "2007-01-04T00:00:00.000Z",
							open: 200,
							high: 204,
							low: 198,
							close: 202,
							volume: 500,
							adjOpen: 100.123,
							adjHigh: 102,
							adjLow: 99,
							adjClose: 101,
							adjVolume: 1000.5,
						},
						{
							date: "2007-01-03T00:00:00.000Z",
							adjOpen: 99,
							adjHigh: 101,
							adjLow: 98,
							adjClose: 100,
							adjVolume: 900,
						},
					]),
					{ status: 200 },
				);
			},
		});

		const result = await provider.getBars(request());

		assert.equal(result.bars.length, 2);
		assert.equal(result.bars[0].startedAt.toISOString(), "2007-01-03T00:00:00.000Z");
		assert.equal(result.bars[1].open, "100.12");
		assert.equal(result.bars[1].volume, "1000.5");
		assert.equal(result.adjusted, true);
		assert.equal(requestedUrl?.pathname, "/tiingo/daily/spy/prices");
		assert.equal(requestedUrl?.searchParams.get("startDate"), "2007-01-01");
		assert.equal(requestedUrl?.searchParams.get("endDate"), "2015-12-31");
		assert.equal(requestedHeaders?.get("Authorization"), "Token test-token");
	});

	it("surfaces provider errors without exposing the token", async () => {
		const provider = new TiingoEodProvider({
			apiToken: "secret-token",
			fetchImpl: async () =>
				new Response(JSON.stringify({ detail: "Symbol not found" }), { status: 404 }),
		});
		await assert.rejects(provider.getBars(request()), (error: Error) => {
			assert.match(error.message, /Symbol not found/);
			assert.doesNotMatch(error.message, /secret-token/);
			return true;
		});
	});

	it("rejects missing credentials and incompatible requests", async () => {
		const noToken = new TiingoEodProvider({ apiToken: "" });
		await assert.rejects(noToken.getBars(request()), /token is not configured/);
		const provider = new TiingoEodProvider({
			apiToken: "test-token",
			fetchImpl: async () => new Response("[]"),
		});
		await assert.rejects(provider.getBars(request({ interval: "1h" })), /daily intervals/);
		await assert.rejects(provider.getBars(request({ assetClass: "crypto" })), /equities only/);
	});
});
