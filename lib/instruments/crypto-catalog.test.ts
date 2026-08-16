import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	normalizeFinnhubCoinbaseCatalogEntry,
	normalizeMassiveCryptoCatalogEntry,
	reconcileCoinbaseCryptoCatalogs,
} from "@/lib/instruments/crypto-catalog";

describe("Coinbase crypto catalog reconciliation", () => {
	it("creates a venue-specific spot pair shared by all three providers", () => {
		const finnhub = normalizeFinnhubCoinbaseCatalogEntry({
			description: "COINBASE SOL-USD",
			displaySymbol: "SOL-USD",
			symbol: "COINBASE:SOL-USD",
		});
		const massive = normalizeMassiveCryptoCatalogEntry({
			ticker: "X:SOLUSD",
			name: "Solana - United States dollar",
			market: "crypto",
			active: true,
			base_currency_symbol: "SOL",
			base_currency_name: "Solana",
			currency_symbol: "USD",
			currency_name: "United States dollar",
		});

		const definitions = reconcileCoinbaseCryptoCatalogs([finnhub], [massive]);

		assert.equal(definitions.length, 1);
		assert.equal(
			definitions[0].canonicalKey,
			"crypto:coinbase:spot:sol:usd",
		);
		assert.equal(definitions[0].name, "Solana / United States dollar");
		assert.deepEqual(
			definitions[0].providerBindings.map(({ provider, symbol }) => ({
				provider,
				symbol,
			})),
			[
				{ provider: "finnhub", symbol: "COINBASE:SOL-USD" },
				{ provider: "massive", symbol: "X:SOLUSD" },
				{ provider: "tradingview", symbol: "COINBASE:SOLUSD" },
			],
		);
		assert.deepEqual(definitions[0].providerBindings[0].capabilities, [
			"catalog",
		]);
	});

	it("rejects a Finnhub binding that differs from its display pair", () => {
		assert.throws(
			() =>
				normalizeFinnhubCoinbaseCatalogEntry({
					description: "COINBASE BTC-USD",
					displaySymbol: "BTC-USD",
					symbol: "COINBASE:ETH-USD",
				}),
			/Finnhub Coinbase symbol does not match its display pair/,
		);
	});

	it("rejects a Massive ticker that differs from its currency pair", () => {
		assert.throws(
			() =>
				normalizeMassiveCryptoCatalogEntry({
					ticker: "X:ETHUSD",
					name: "Bitcoin - United States dollar",
					market: "crypto",
					base_currency_symbol: "BTC",
					base_currency_name: "Bitcoin",
					currency_symbol: "USD",
					currency_name: "United States dollar",
				}),
			/Massive crypto ticker does not match its currency pair/,
		);
	});

	it("excludes pairs that are not shared with Massive", () => {
		const finnhub = normalizeFinnhubCoinbaseCatalogEntry({
			description: "COINBASE BTC-USD",
			displaySymbol: "BTC-USD",
			symbol: "COINBASE:BTC-USD",
		});

		assert.deepEqual(reconcileCoinbaseCryptoCatalogs([finnhub], []), []);
	});

	it("excludes shared crypto pairs that do not use USD", () => {
		const finnhub = normalizeFinnhubCoinbaseCatalogEntry({
			description: "COINBASE BTC-EUR",
			displaySymbol: "BTC-EUR",
			symbol: "COINBASE:BTC-EUR",
		});
		const massive = normalizeMassiveCryptoCatalogEntry({
			ticker: "X:BTCEUR",
			name: "Bitcoin - Euro",
			market: "crypto",
			base_currency_symbol: "BTC",
			base_currency_name: "Bitcoin",
			currency_symbol: "EUR",
			currency_name: "Euro",
		});

		assert.deepEqual(reconcileCoinbaseCryptoCatalogs([finnhub], [massive]), []);
	});

	it("excludes USD pairs that do not resolve on TradingView", () => {
		const finnhub = normalizeFinnhubCoinbaseCatalogEntry({
			description: "COINBASE MATIC-USD",
			displaySymbol: "MATIC-USD",
			symbol: "COINBASE:MATIC-USD",
		});
		const massive = normalizeMassiveCryptoCatalogEntry({
			ticker: "X:MATICUSD",
			name: "Polygon - United States dollar",
			market: "crypto",
			base_currency_symbol: "MATIC",
			base_currency_name: "Polygon",
			currency_symbol: "USD",
			currency_name: "United States dollar",
		});

		assert.deepEqual(reconcileCoinbaseCryptoCatalogs([finnhub], [massive]), []);
	});
});
