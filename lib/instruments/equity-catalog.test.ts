import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	normalizeFinnhubEquityCatalogEntry,
	normalizeMassiveEquityCatalogEntry,
	reconcileEquityCatalogs,
} from "@/lib/instruments/equity-catalog";

describe("US equity catalog reconciliation", () => {
	it("adds Finnhub, Massive, and TradingView bindings to a shared listing", () => {
		const finnhub = normalizeFinnhubEquityCatalogEntry({
			description: "APPLE INC",
			displaySymbol: "AAPL",
			symbol: "AAPL",
			currency: "USD",
			mic: "XNAS",
			type: "Common Stock",
		});
		const massive = normalizeMassiveEquityCatalogEntry({
			ticker: "AAPL",
			name: "Apple Inc.",
			market: "stocks",
			active: true,
			currency_name: "usd",
			primary_exchange: "XNAS",
			type: "CS",
		});

		const definitions = reconcileEquityCatalogs([finnhub], [massive]);

		assert.equal(definitions.length, 1);
		assert.equal(definitions[0].canonicalKey, "equity:xnas:aapl");
		assert.equal(definitions[0].name, "APPLE INC");
		assert.equal(definitions[0].securityType, "common_stock");
		assert.equal(definitions[0].venue, "Nasdaq");
		assert.deepEqual(
			definitions[0].providerBindings.map(({ provider, symbol }) => ({
				provider,
				symbol,
			})),
			[
				{ provider: "finnhub", symbol: "AAPL" },
				{ provider: "massive", symbol: "AAPL" },
				{ provider: "tradingview", symbol: "NASDAQ:AAPL" },
			],
		);
	});

	it("uses Finnhub's concise description instead of Massive's legal name", () => {
		const finnhub = normalizeFinnhubEquityCatalogEntry({
			description: "ARES ACQUISITION CORP III",
			displaySymbol: "AAC.U",
			symbol: "AAC.U",
			mic: "XNYS",
			type: "Unit",
		});
		const massive = normalizeMassiveEquityCatalogEntry({
			ticker: "AAC.U",
			name: "Ares Acquisition Corporation III Units, each consisting of one Class A ordinary share and one-tenth of one redeemable warrant",
			market: "stocks",
			primary_exchange: "XNYS",
			type: "UNIT",
		});

		const [definition] = reconcileEquityCatalogs([finnhub], [massive]);

		assert.equal(definition.name, "ARES ACQUISITION CORP III");
		assert.equal(definition.securityType, "unit");
	});

	it("requires matching symbols and venues", () => {
		const finnhub = normalizeFinnhubEquityCatalogEntry({
			description: "APPLE INC",
			displaySymbol: "AAPL",
			symbol: "AAPL",
			mic: "XNAS",
		});
		const massive = normalizeMassiveEquityCatalogEntry({
			ticker: "AAPL",
			name: "Apple Inc.",
			market: "stocks",
			primary_exchange: "XNYS",
		});

		assert.deepEqual(reconcileEquityCatalogs([finnhub], [massive]), []);
	});
});
