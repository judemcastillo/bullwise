import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	instrumentSearchAliases,
	mergeSearchableInstruments,
	toInstrumentSearchResult,
	type SearchableInstrument,
} from "./search";
import {
	orderPopularInstruments,
	popularInstrumentCanonicalKeys,
} from "./popular";

function instrument(
	overrides: Partial<SearchableInstrument> = {},
): SearchableInstrument {
	return {
		_id: "66b6c81e9d7d5d176c7e1001",
		canonicalKey: "equity:xnas:aapl",
		assetClass: "equity",
		instrumentType: "listing",
		securityType: "common_stock",
		displaySymbol: "AAPL",
		name: "Apple Inc.",
		venue: "NASDAQ",
		providerBindings: [
			{
				provider: "finnhub",
				symbol: "AAPL",
				capabilities: ["catalog", "quote", "alert_quote"],
				enabled: true,
				priority: 100,
				orientation: "direct",
			},
		],
		...overrides,
	};
}

describe("canonical instrument search results", () => {
	it("uses a curated cross-asset popular list instead of alphabetical symbols", () => {
		const keys = popularInstrumentCanonicalKeys();

		assert.equal(keys.length, 10);
		assert.equal(keys[0], "equity:xnas:aapl");
		assert.ok(keys.includes("crypto:coinbase:spot:btc:usd"));
		assert.ok(keys.includes("forex:spot:eur:usd"));
		assert.ok(keys.includes("commodity:oanda:spot:xau:usd"));
		assert.equal(new Set(keys).size, keys.length);
	});

	it("provides asset-specific popular instruments in curated order", () => {
		assert.deepEqual(popularInstrumentCanonicalKeys("crypto").slice(0, 3), [
			"crypto:coinbase:spot:btc:usd",
			"crypto:coinbase:spot:eth:usd",
			"crypto:coinbase:spot:sol:usd",
		]);
		assert.deepEqual(popularInstrumentCanonicalKeys("index"), []);
		assert.deepEqual(
			orderPopularInstruments(
				[
					{ canonicalKey: "equity:xnas:msft" },
					{ canonicalKey: "equity:xnas:aapl" },
				],
				[
					"equity:xnas:aapl",
					"equity:xnas:nvda",
					"equity:xnas:msft",
				],
			),
			[
				{ canonicalKey: "equity:xnas:aapl" },
				{ canonicalKey: "equity:xnas:msft" },
			],
		);
	});

	it("expands compact forex pairs for database-only search", () => {
		assert.deepEqual(instrumentSearchAliases("EURUSD"), [
			"EURUSD",
			"EUR/USD",
			"EUR:USD",
		]);
		assert.deepEqual(instrumentSearchAliases("Euro"), ["Euro"]);
	});

	it("serializes canonical identity and membership", () => {
		const item = instrument();
		assert.deepEqual(
			toInstrumentSearchResult(item, new Set([item._id.toString()])),
			{
				instrumentId: "66b6c81e9d7d5d176c7e1001",
				canonicalKey: "equity:xnas:aapl",
				assetClass: "equity",
				instrumentType: "listing",
				securityType: "common_stock",
				displaySymbol: "AAPL",
				name: "Apple Inc.",
				venue: "NASDAQ",
				provider: "finnhub",
				providerSymbol: "AAPL",
				isInWatchlist: true,
				href: "/instruments/equity%3Axnas%3Aaapl",
			},
		);
	});

	it("deduplicates provider discovery against stored instruments", () => {
		const stored = instrument();
		const duplicate = instrument({ _id: "66b6c81e9d7d5d176c7e1002" });
		const bitcoin = instrument({
			_id: "66b6c81e9d7d5d176c7e1003",
			canonicalKey: "crypto:asset:btc",
			assetClass: "crypto",
			instrumentType: "asset",
			displaySymbol: "BTC",
			name: "Bitcoin",
		});

		assert.deepEqual(
			mergeSearchableInstruments([[stored], [duplicate, bitcoin]], 10).map(
				(item) => item.canonicalKey,
			),
			["equity:xnas:aapl", "crypto:asset:btc"],
		);
	});
});
