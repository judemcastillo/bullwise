import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { InstrumentMarketDataService } from "./service";
import type {
	BarsProvider,
	BarsRequest,
	MarketBars,
	MarketDataInstrument,
	MarketQuote,
	QuoteProvider,
	QuoteRequest,
} from "./types";
import type { AssetClass, ProviderBinding } from "@/types/instruments";

const from = new Date("2026-08-01T00:00:00.000Z");
const to = new Date("2026-08-02T00:00:00.000Z");

function binding(
	provider: string,
	symbol: string,
	capabilities: ProviderBinding["capabilities"],
	orientation: ProviderBinding["orientation"] = "direct",
): ProviderBinding {
	return {
		provider,
		symbol,
		capabilities,
		enabled: true,
		priority: 100,
		orientation,
	};
}

function instrument(
	assetClass: AssetClass,
	providerBindings: ProviderBinding[],
): MarketDataInstrument {
	return {
		instrumentId: `instrument-${assetClass}`,
		canonicalKey: `${assetClass}:test:usd`,
		assetClass,
		displaySymbol: "TEST/USD",
		quoteCurrency: "USD",
		pricePrecision: 4,
		calendarId: assetClass === "crypto" ? "crypto-24x7" : undefined,
		providerBindings,
	};
}

class FakeQuoteProvider implements QuoteProvider {
	readonly provider = "finnhub";
	requests: QuoteRequest[][] = [];

	async getQuotes(requests: QuoteRequest[]) {
		this.requests.push(requests);
		const request = requests[0];
		const quote: MarketQuote = {
			instrumentId: request.instrumentId,
			provider: this.provider,
			providerSymbol: request.providerSymbol,
			price: "2",
			currency: request.expectedCurrency,
			observedAt: new Date("2026-08-01T12:00:00.000Z"),
			marketState: "unknown",
			timeliness: "unknown",
		};
		return new Map([[request.instrumentId, quote]]);
	}
}

class FakeBarsProvider implements BarsProvider {
	readonly provider = "massive";
	requests: BarsRequest[] = [];

	async getBars(request: BarsRequest): Promise<MarketBars> {
		this.requests.push(request);
		return {
			instrumentId: request.instrumentId,
			provider: this.provider,
			providerSymbol: request.providerSymbol,
			currency: request.expectedCurrency,
			interval: request.interval,
			from: request.from,
			to: request.to,
			adjusted: true,
			timeliness: "historical",
			bars: [
				{
					startedAt: from,
					open: "2",
					high: "4",
					low: "1",
					close: "2.5",
					volume: "100",
				},
			],
		};
	}
}

describe("InstrumentMarketDataService", () => {
	it("uses a quote-capable binding and caches short-lived quotes", async () => {
		const quotes = new FakeQuoteProvider();
		const service = new InstrumentMarketDataService({
			quoteProviders: [quotes],
		});
		const value = instrument("equity", [
			binding("finnhub", "AAPL", ["catalog", "quote", "alert_quote"]),
		]);

		const first = await service.getQuote(value);
		const second = await service.getQuote(value);

		assert.equal(first.price, "2");
		assert.equal(second, first);
		assert.equal(quotes.requests.length, 1);
	});

	it("serves Massive historical bars for every enabled asset class", async () => {
		const bars = new FakeBarsProvider();
		const service = new InstrumentMarketDataService({ barsProviders: [bars] });

		for (const assetClass of [
			"equity",
			"forex",
			"crypto",
			"commodity",
		] as const) {
			const result = await service.getBars(
				instrument(assetClass, [
					binding("massive", `${assetClass}:USD`, ["catalog", "bars"]),
				]),
				{ interval: "1d", from, to },
			);
			assert.equal(result.bars.length, 1);
		}

		assert.deepEqual(
			bars.requests.map((request) => request.assetClass),
			["equity", "forex", "crypto", "commodity"],
		);
	});

	it("does not treat catalog-only Finnhub bindings as quote providers", async () => {
		const quotes = new FakeQuoteProvider();
		const service = new InstrumentMarketDataService({
			quoteProviders: [quotes],
		});
		const value = instrument("forex", [
			binding("finnhub", "OANDA:EUR_USD", ["catalog"]),
		]);

		await assert.rejects(service.getQuote(value), /No quote provider is available/);
		assert.equal(quotes.requests.length, 0);
	});

	it("inverts prices and OHLC ranges for inverse provider bindings", async () => {
		const quotes = new FakeQuoteProvider();
		const bars = new FakeBarsProvider();
		const service = new InstrumentMarketDataService({
			quoteProviders: [quotes],
			barsProviders: [bars],
		});
		const value = instrument("forex", [
			binding("finnhub", "USDTEST", ["quote"], "inverse"),
			binding("massive", "C:USDTEST", ["bars"], "inverse"),
		]);

		const quote = await service.getQuote(value);
		const history = await service.getBars(value, { interval: "1d", from, to });

		assert.equal(quote.price, "0.5");
		assert.deepEqual(history.bars[0], {
			startedAt: from,
			open: "0.5",
			high: "1",
			low: "0.25",
			close: "0.4",
		});
	});
});
