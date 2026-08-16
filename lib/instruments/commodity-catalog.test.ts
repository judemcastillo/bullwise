import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	commoditySpotPricePrecision,
	normalizeFinnhubOandaCommodityEntry,
	normalizeMassiveCommodityEntry,
	reconcileCommoditySpotCatalogs,
} from "@/lib/instruments/commodity-catalog";

describe("commodity spot catalog reconciliation", () => {
	it("creates a canonical OANDA gold spot instrument shared by all providers", () => {
		const finnhub = normalizeFinnhubOandaCommodityEntry({
			description: "Gold vs US Dollar",
			displaySymbol: "XAU/USD",
			symbol: "OANDA:XAU_USD",
		});
		const massive = normalizeMassiveCommodityEntry({
			ticker: "C:XAUUSD",
			name: "Gold (one troy ounce) - United States dollar",
			market: "fx",
			active: true,
		});

		const definition = reconcileCommoditySpotCatalogs([finnhub], [massive])[0];

		assert.equal(definition.canonicalKey, "commodity:oanda:spot:xau:usd");
		assert.equal(definition.assetClass, "commodity");
		assert.equal(definition.instrumentType, "spot");
		assert.equal(definition.pricePrecision, 3);
		assert.equal(definition.quantityPrecision, 3);
		assert.deepEqual(
			definition.providerBindings.map(({ provider, symbol }) => ({
				provider,
				symbol,
			})),
			[
				{ provider: "finnhub", symbol: "OANDA:XAU_USD" },
				{ provider: "massive", symbol: "C:XAUUSD" },
				{ provider: "tradingview", symbol: "OANDA:XAUUSD" },
			],
		);
		assert.equal(
			definition.providerBindings.some((binding) =>
				binding.capabilities.includes("alert_quote"),
			),
			false,
		);
	});

	it("uses silver precision and excludes non-USD pairs", () => {
		const silver = normalizeFinnhubOandaCommodityEntry({
			description: "Silver vs Euro",
			displaySymbol: "XAG/EUR",
			symbol: "OANDA:XAG_EUR",
		});
		const massive = normalizeMassiveCommodityEntry({
			ticker: "C:XAGEUR",
			name: "Silver (one troy ounce) - Euro",
			market: "fx",
		});

		assert.equal(commoditySpotPricePrecision("XAG"), 5);
		assert.deepEqual(reconcileCommoditySpotCatalogs([silver], [massive]), []);
	});

	it("rejects currencies and non-metal forex tickers", () => {
		assert.throws(() =>
			normalizeFinnhubOandaCommodityEntry({
				description: "Euro vs US Dollar",
				displaySymbol: "EUR/USD",
				symbol: "OANDA:EUR_USD",
			}),
		);
		assert.throws(() =>
			normalizeMassiveCommodityEntry({
				ticker: "C:EURUSD",
				name: "Euro/US Dollar",
				market: "fx",
			}),
		);
	});
});
