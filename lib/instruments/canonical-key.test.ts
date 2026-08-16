import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	buildCanonicalKey,
	inferInstrumentType,
	isCanonicalKey,
	parseCanonicalKeyRouteParam,
} from "./canonical-key";

describe("canonical instrument keys", () => {
	it("builds normalized listing and pair identities", () => {
		assert.equal(
			buildCanonicalKey({
				assetClass: "equity",
				venue: "XNAS",
				symbol: "AAPL",
			}),
			"equity:xnas:aapl",
		);
		assert.equal(
			buildCanonicalKey({
				assetClass: "forex",
				baseCurrency: "EUR",
				quoteCurrency: "USD",
			}),
			"forex:spot:eur:usd",
		);
	});

	it("keeps crypto assets, venues, and quote currencies distinct", () => {
		const keys = [
			buildCanonicalKey({
				assetClass: "crypto",
				instrumentType: "asset",
				symbol: "BTC",
			}),
			buildCanonicalKey({
				assetClass: "crypto",
				instrumentType: "spot_pair",
				venue: "COINBASE",
				baseCurrency: "BTC",
				quoteCurrency: "USD",
			}),
			buildCanonicalKey({
				assetClass: "crypto",
				instrumentType: "spot_pair",
				venue: "BINANCE",
				baseCurrency: "BTC",
				quoteCurrency: "USDT",
			}),
		];

		assert.deepEqual(keys, [
			"crypto:asset:btc",
			"crypto:coinbase:spot:btc:usd",
			"crypto:binance:spot:btc:usdt",
		]);
		assert.equal(new Set(keys).size, keys.length);
	});

	it("includes futures contract month or continuous roll identity", () => {
		assert.equal(
			buildCanonicalKey({
				assetClass: "commodity",
				instrumentType: "future",
				venue: "XNYM",
				productCode: "CL",
				contractMonth: "2026-10",
			}),
			"commodity:xnym:future:cl:2026-10",
		);
		assert.equal(
			buildCanonicalKey({
				assetClass: "commodity",
				instrumentType: "continuous_future",
				venue: "XNYM",
				productCode: "CL",
				roll: "front",
			}),
			"commodity:xnym:continuous:cl:front",
		);
	});

	it("rejects ambiguous path segments and invalid contract months", () => {
		assert.throws(
			() =>
				buildCanonicalKey({
					assetClass: "equity",
					venue: "NASDAQ/US",
					symbol: "AAPL",
				}),
			/valid canonical identifier segment/,
		);
		assert.throws(
			() =>
				buildCanonicalKey({
					assetClass: "commodity",
					instrumentType: "future",
					venue: "XNYM",
					productCode: "CL",
					contractMonth: "2026-13",
				}),
			/YYYY-MM/,
		);
	});

	it("validates keys and infers types represented by their asset identity", () => {
		assert.equal(isCanonicalKey("equity:xnas:aapl"), true);
		assert.equal(isCanonicalKey("equity:xnas:AAPL"), false);
		assert.equal(isCanonicalKey("equity/xnas/aapl"), false);
		assert.equal(
			inferInstrumentType({
				assetClass: "forex",
				baseCurrency: "eur",
				quoteCurrency: "usd",
			}),
			"spot_pair",
		);
	});

	it("parses encoded canonical keys from dynamic route segments", () => {
		assert.equal(
			parseCanonicalKeyRouteParam("forex%3Aspot%3Aeur%3Ausd"),
			"forex:spot:eur:usd",
		);
		assert.equal(
			parseCanonicalKeyRouteParam("FOREX:SPOT:EUR:USD"),
			"forex:spot:eur:usd",
		);
		assert.equal(parseCanonicalKeyRouteParam("forex%3Aspot%3Aeur%ZZusd"), null);
		assert.equal(parseCanonicalKeyRouteParam("forex/spot/eur/usd"), null);
	});
});
