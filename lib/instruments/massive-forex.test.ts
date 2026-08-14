import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	normalizeMassiveForexCatalogEntry,
	parseMassiveForexTicker,
} from "./massive-forex";

describe("Massive forex catalog normalization", () => {
	it("parses provider symbols without conflating the pair currencies", () => {
		assert.deepEqual(parseMassiveForexTicker(" c:eurusd "), {
			ticker: "C:EURUSD",
			baseCurrency: "EUR",
			quoteCurrency: "USD",
		});
		assert.throws(() => parseMassiveForexTicker("EUR/USD"));
	});

	it("normalizes a capability-aware, non-alertable provider entry", () => {
		const entry = normalizeMassiveForexCatalogEntry({
			ticker: "C:EURJPY",
			name: "Euro/Japanese Yen",
			market: "fx",
			active: true,
		});

		assert.equal(entry.baseCurrency, "EUR");
		assert.equal(entry.quoteCurrency, "JPY");
		assert.deepEqual(entry.providerBinding, {
			provider: "massive",
			symbol: "C:EURJPY",
			capabilities: ["catalog", "bars", "indicators"],
			enabled: true,
			priority: 100,
			venue: "global",
			orientation: "direct",
		});
		assert.equal(entry.providerBinding.capabilities.includes("alert_quote"), false);
	});
});
