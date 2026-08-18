import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AlpacaBarsProvider } from "./alpaca-bars-client";
import type { BarsRequest } from "../types";

function request(overrides: Partial<BarsRequest> = {}): BarsRequest {
	return {
		instrumentId: "instrument-spy",
		assetClass: "equity",
		provider: "alpaca",
		providerSymbol: "SPY",
		expectedCurrency: "USD",
		pricePrecision: 2,
		interval: "1d",
		from: new Date("2016-01-01T00:00:00.000Z"),
		to: new Date("2026-01-01T00:00:00.000Z"),
		...overrides,
	};
}

describe("AlpacaBarsProvider", () => {
	it("requests adjusted historical SIP bars and paginates", async () => {
		const urls: URL[] = [];
		const headers: Headers[] = [];
		let call = 0;
		const provider = new AlpacaBarsProvider({
			apiKeyId: "key-id",
			apiSecretKey: "secret-key",
			fetchImpl: async (input, init) => {
				urls.push(new URL(String(input)));
				headers.push(new Headers(init?.headers));
				call += 1;
				return new Response(
					JSON.stringify(
						call === 1
							? {
									bars: [
										{
											t: "2020-01-02T05:00:00Z",
											o: 100.123,
											h: 102,
											l: 99,
											c: 101,
											v: 1000,
											vw: 100.5,
											n: 20,
										},
									],
									next_page_token: "page-2",
								}
							: {
									bars: [
										{
											t: "2020-01-03T05:00:00Z",
											o: 101,
											h: 103,
											l: 100,
											c: 102,
											v: 1100,
										},
									],
									next_page_token: null,
								},
					),
					{ status: 200 },
				);
			},
		});

		const result = await provider.getBars(request());

		assert.equal(result.bars.length, 2);
		assert.equal(result.bars[0].open, "100.12");
		assert.equal(result.bars[0].transactionCount, 20);
		assert.equal(result.adjusted, true);
		assert.equal(urls[0].searchParams.get("feed"), "sip");
		assert.equal(urls[0].searchParams.get("adjustment"), "all");
		assert.equal(urls[1].searchParams.get("page_token"), "page-2");
		assert.equal(headers[0].get("APCA-API-KEY-ID"), "key-id");
		assert.equal(headers[0].get("APCA-API-SECRET-KEY"), "secret-key");
	});

	it("refuses to fall back when historical SIP access is denied", async () => {
		const provider = new AlpacaBarsProvider({
			apiKeyId: "key-id",
			apiSecretKey: "secret-key",
			fetchImpl: async () =>
				new Response(JSON.stringify({ message: "subscription does not permit SIP" }), {
					status: 403,
				}),
		});

		await assert.rejects(
			provider.getBars(request()),
			/IEX fallback is intentionally disabled/,
		);
	});

	it("rejects non-daily and non-equity requests", async () => {
		const provider = new AlpacaBarsProvider({
			apiKeyId: "key-id",
			apiSecretKey: "secret-key",
			fetchImpl: async () => new Response("{}"),
		});
		await assert.rejects(
			provider.getBars(request({ interval: "1h" })),
			/daily intervals/,
		);
		await assert.rejects(
			provider.getBars(request({ assetClass: "crypto" })),
			/equities only/,
		);
	});
});
