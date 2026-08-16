import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	processAlertBatch,
	type AlertMonitoringStore,
	type MonitorableAlert,
	type TriggerWriteResult,
} from "./processor";
import type {
	MarketQuote,
	QuoteProvider,
	QuoteRequest,
} from "@/lib/market-data/types";

const now = new Date("2026-08-01T12:00:00.000Z");

function alert(overrides: Partial<MonitorableAlert> = {}): MonitorableAlert {
	return {
		id: "alert-1",
		userId: "user-1",
		instrumentId: "instrument-1",
		status: "active",
		operator: "crosses_above",
		threshold: "100",
		previousValue: "99",
		emailEnabled: true,
		instrument: {
			assetClass: "equity",
			displaySymbol: "TEST",
			name: "Test Instrument",
			quoteCurrency: "USD",
			pricePrecision: 2,
			providerBindings: [
				{
					provider: "test",
					symbol: "TEST",
					capabilities: ["quote", "alert_quote"],
					enabled: true,
					priority: 100,
					orientation: "direct",
				},
			],
		},
		...overrides,
	};
}

function marketQuote(overrides: Partial<MarketQuote> = {}): MarketQuote {
	return {
		instrumentId: "instrument-1",
		provider: "test",
		providerSymbol: "TEST",
		price: "101",
		currency: "USD",
		observedAt: new Date("2026-08-01T11:59:30.000Z"),
		marketState: "unknown",
		timeliness: "unknown",
		...overrides,
	};
}

class FakeProvider implements QuoteProvider {
	readonly provider = "test";
	requests: QuoteRequest[][] = [];
	shouldFail = false;
	quote = marketQuote();

	async getQuotes(requests: QuoteRequest[]) {
		this.requests.push(requests);
		if (this.shouldFail) throw new Error("provider unavailable");
		return new Map([[this.quote.instrumentId, this.quote]]);
	}
}

class FakeStore implements AlertMonitoringStore {
	observed: string[] = [];
	triggered: string[] = [];
	triggeredPrices: string[] = [];
	skipped: string[] = [];
	triggerResult: TriggerWriteResult = "created";

	async recordObservation(alertValue: MonitorableAlert) {
		this.observed.push(alertValue.id);
		return true;
	}

	async recordTrigger(alertValue: MonitorableAlert, quote: MarketQuote) {
		this.triggered.push(alertValue.id);
		this.triggeredPrices.push(quote.price);
		return this.triggerResult;
	}

	async recordSkipped(alertValue: MonitorableAlert) {
		this.skipped.push(alertValue.id);
	}
}

describe("processAlertBatch", () => {
	it("fetches one quote for multiple alerts on the same instrument", async () => {
		const provider = new FakeProvider();
		const store = new FakeStore();
		const alerts = [
			alert(),
			alert({
				id: "alert-2",
				operator: "crosses_below",
				threshold: "90",
				previousValue: "95",
			}),
		];

		const summary = await processAlertBatch({
			alerts,
			providers: new Map([[provider.provider, provider]]),
			store,
			now,
		});

		assert.equal(provider.requests.length, 1);
		assert.equal(provider.requests[0].length, 1);
		assert.deepEqual(store.triggered, ["alert-1"]);
		assert.deepEqual(store.observed, ["alert-2"]);
		assert.equal(summary.triggered, 1);
		assert.equal(summary.observed, 1);
		assert.equal(summary.quotesRequested, 1);
	});

	it("reports duplicate trigger retries without creating another event", async () => {
		const provider = new FakeProvider();
		const store = new FakeStore();
		store.triggerResult = "duplicate";

		const summary = await processAlertBatch({
			alerts: [alert()],
			providers: new Map([[provider.provider, provider]]),
			store,
			now,
		});

		assert.equal(summary.triggered, 0);
		assert.equal(summary.deduplicated, 1);
	});

	it("evaluates inverse alert quotes using the inverted price", async () => {
		const provider = new FakeProvider();
		provider.quote = marketQuote({ price: "0.01" });
		const store = new FakeStore();
		const value = alert();
		value.instrument.providerBindings[0].orientation = "inverse";

		const summary = await processAlertBatch({
			alerts: [value],
			providers: new Map([[provider.provider, provider]]),
			store,
			now,
		});

		assert.equal(summary.triggered, 1);
		assert.deepEqual(store.triggered, ["alert-1"]);
		assert.deepEqual(store.triggeredPrices, ["100"]);
	});

	it("isolates provider failures and defers affected alerts", async () => {
		const provider = new FakeProvider();
		provider.shouldFail = true;
		const store = new FakeStore();

		const originalConsoleError = console.error;
		console.error = () => undefined;
		try {
			const summary = await processAlertBatch({
				alerts: [alert()],
				providers: new Map([[provider.provider, provider]]),
				store,
				now,
			});

			assert.equal(summary.failures, 1);
			assert.deepEqual(store.skipped, ["alert-1"]);
		} finally {
			console.error = originalConsoleError;
		}
	});

	it("does not persist stale quotes as observations", async () => {
		const provider = new FakeProvider();
		provider.quote = marketQuote({
			observedAt: new Date("2026-08-01T11:50:00.000Z"),
		});
		const store = new FakeStore();

		const summary = await processAlertBatch({
			alerts: [alert()],
			providers: new Map([[provider.provider, provider]]),
			store,
			now,
		});

		assert.equal(summary.skipped, 1);
		assert.deepEqual(store.observed, []);
		assert.deepEqual(store.skipped, ["alert-1"]);
	});

	it("skips alerts that have no supported provider binding", async () => {
		const store = new FakeStore();
		const summary = await processAlertBatch({
			alerts: [alert()],
			providers: new Map(),
			store,
			now,
		});

		assert.equal(summary.skipped, 1);
		assert.deepEqual(store.skipped, ["alert-1"]);
	});

	it("does not use a provider binding without alert quote capability", async () => {
		const provider = new FakeProvider();
		const store = new FakeStore();
		const value = alert();
		value.instrument.providerBindings[0].capabilities = ["catalog", "quote"];

		const summary = await processAlertBatch({
			alerts: [value],
			providers: new Map([[provider.provider, provider]]),
			store,
			now,
		});

		assert.equal(provider.requests.length, 0);
		assert.equal(summary.skipped, 1);
	});
});
