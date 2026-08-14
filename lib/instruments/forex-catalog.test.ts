import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeFinnhubOandaCatalogEntry } from "./finnhub-forex";
import { reconcileForexCatalogs } from "./forex-catalog";
import { normalizeMassiveForexCatalogEntry } from "./massive-forex";

describe("forex catalog reconciliation", () => {
	it("keeps only pairs available in Finnhub and Massive", () => {
		const finnhub = [
			normalizeFinnhubOandaCatalogEntry({
				symbol: "OANDA:EUR_USD",
				displaySymbol: "EUR/USD",
				description: "Euro vs US Dollar",
			}),
			normalizeFinnhubOandaCatalogEntry({
				symbol: "OANDA:GBP_USD",
				displaySymbol: "GBP/USD",
				description: "British Pound vs US Dollar",
			}),
		];
		const massive = [
			normalizeMassiveForexCatalogEntry({
				ticker: "C:EURUSD",
				name: "Euro/United States Dollar",
				market: "fx",
			}),
		];

		const definitions = reconcileForexCatalogs(finnhub, massive);
		assert.equal(definitions.length, 1);
		assert.equal(definitions[0].canonicalKey, "forex:spot:eur:usd");
		assert.equal(definitions[0].displaySymbol, "EUR/USD");
		assert.deepEqual(
			definitions[0].providerBindings.map(({ provider, symbol }) => ({
				provider,
				symbol,
			})),
			[
				{ provider: "finnhub", symbol: "OANDA:EUR_USD" },
				{ provider: "massive", symbol: "C:EURUSD" },
				{ provider: "tradingview", symbol: "OANDA:EURUSD" },
			],
		);
	});

	it("keeps alert capability disabled and applies pip precision", () => {
		const definition = reconcileForexCatalogs(
			[
				normalizeFinnhubOandaCatalogEntry({
					symbol: "OANDA:USD_JPY",
					displaySymbol: "USD/JPY",
					description: "US Dollar vs Japanese Yen",
				}),
			],
			[
				normalizeMassiveForexCatalogEntry({
					ticker: "C:USDJPY",
					name: "US Dollar/Japanese Yen",
					market: "fx",
				}),
			],
		)[0];

		assert.equal(definition.pricePrecision, 3);
		assert.equal(
			definition.providerBindings.some((binding) =>
				binding.capabilities.includes("alert_quote"),
			),
			false,
		);
	});

	it("excludes shared currency pairs that do not use USD", () => {
		const finnhub = normalizeFinnhubOandaCatalogEntry({
			symbol: "OANDA:EUR_JPY",
			displaySymbol: "EUR/JPY",
			description: "Euro vs Japanese Yen",
		});
		const massive = normalizeMassiveForexCatalogEntry({
			ticker: "C:EURJPY",
			name: "Euro/Japanese Yen",
			market: "fx",
		});

		assert.deepEqual(reconcileForexCatalogs([finnhub], [massive]), []);
	});

	it("keeps precious metals out of the currency catalog", () => {
		assert.throws(() =>
			normalizeFinnhubOandaCatalogEntry({
				symbol: "OANDA:XAU_USD",
				displaySymbol: "XAU/USD",
				description: "Gold vs US Dollar",
			}),
		);
		assert.throws(() =>
			normalizeMassiveForexCatalogEntry({
				ticker: "C:XAGUSD",
				name: "Silver/US Dollar",
				market: "fx",
			}),
		);
	});
});
