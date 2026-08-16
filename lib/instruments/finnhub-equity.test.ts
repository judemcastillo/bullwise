import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	buildFinnhubEquityInstrumentDefinition,
	resolveFinnhubEquityVenue,
} from "./finnhub-equity";

describe("Finnhub equity instrument definitions", () => {
	it("maps common US exchange descriptions to stable MIC identities", () => {
		assert.deepEqual(resolveFinnhubEquityVenue("NASDAQ NMS - GLOBAL MARKET"), {
			code: "xnas",
			mic: "XNAS",
			timezone: "America/New_York",
			calendarId: "us-equities",
		});
		assert.equal(resolveFinnhubEquityVenue("NYSE ARCA").mic, "ARCX");
		assert.equal(resolveFinnhubEquityVenue("New York Stock Exchange").mic, "XNYS");
	});

	it("falls back to a safe venue code without claiming a MIC", () => {
		assert.deepEqual(resolveFinnhubEquityVenue("London Stock Exchange"), {
			code: "london-stock-exchange",
			timezone: "Etc/UTC",
		});
		assert.deepEqual(resolveFinnhubEquityVenue("NASDAQ OMX STOCKHOLM"), {
			code: "nasdaq-omx-stockholm",
			timezone: "Etc/UTC",
		});
	});

	it("builds a capability-aware canonical equity definition", () => {
		const definition = buildFinnhubEquityInstrumentDefinition(
			{
				symbol: "aapl",
				company: "Apple Inc.",
				exchange: "NASDAQ NMS - GLOBAL MARKET",
				currency: "usd",
				type: "Common Stock",
			},
			"aapl",
		);

		assert.equal(definition.canonicalKey, "equity:xnas:aapl");
		assert.equal(definition.instrumentType, "listing");
		assert.equal(definition.securityType, "common_stock");
		assert.equal(definition.venueMic, "XNAS");
		assert.equal(definition.quoteCurrency, "USD");
		assert.equal(definition.quantityPrecision, 0);
		assert.deepEqual(definition.providerBindings[0], {
			provider: "finnhub",
			symbol: "AAPL",
			capabilities: ["catalog", "quote", "alert_quote", "news"],
			enabled: true,
			priority: 100,
			venue: "xnas",
			orientation: "direct",
		});
	});

	it("rejects malformed provider identity data", () => {
		assert.throws(
			() =>
				buildFinnhubEquityInstrumentDefinition(
					{
						symbol: "AAPL<script>",
						company: "Unsafe",
						exchange: "NASDAQ",
						currency: "USD",
					},
					"AAPL<script>",
				),
			/invalid equity identity/,
		);
	});
});
