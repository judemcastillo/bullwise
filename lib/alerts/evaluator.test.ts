import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { MarketQuote } from "@/lib/market-data/types";
import {
	buildOneTimeAlertDedupeKey,
	comparePriceValues,
	evaluatePriceAlert,
} from "./evaluator";

const now = new Date("2026-08-01T12:00:00.000Z");

function quote(overrides: Partial<MarketQuote> = {}): MarketQuote {
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

function evaluate(
	overrides: Partial<Parameters<typeof evaluatePriceAlert>[0]> = {},
) {
	return evaluatePriceAlert({
		status: "active",
		operator: "crosses_above",
		threshold: "100",
		previousValue: "99",
		expectedCurrency: "USD",
		quote: quote(),
		now,
		...overrides,
	});
}

describe("comparePriceValues", () => {
	it("compares decimal values without floating-point rounding", () => {
		assert.equal(comparePriceValues("100000000.000000001", "100000000"), 1);
		assert.equal(comparePriceValues("1.2300", "1.23"), 0);
		assert.equal(comparePriceValues("1e-8", "0.00000002"), -1);
	});

	it("rejects zero, negative, and malformed prices", () => {
		assert.equal(comparePriceValues("0", "1"), null);
		assert.equal(comparePriceValues("-1", "1"), null);
		assert.equal(comparePriceValues("not-a-price", "1"), null);
	});
});

describe("evaluatePriceAlert", () => {
	it("triggers when price crosses above the threshold", () => {
		assert.deepEqual(evaluate(), {
			shouldTrigger: true,
			reason: "triggered",
			nextObservedValue: "101",
		});
	});

	it("triggers when either direction reaches the threshold exactly", () => {
		assert.equal(
			evaluate({ quote: quote({ price: "100" }) }).shouldTrigger,
			true,
		);
		assert.equal(
			evaluate({
				operator: "crosses_below",
				previousValue: "101",
				quote: quote({ price: "100.000" }),
			}).shouldTrigger,
			true,
		);
	});

	it("triggers when price crosses below the threshold", () => {
		assert.deepEqual(
			evaluate({
				operator: "crosses_below",
				previousValue: "101",
				quote: quote({ price: "99" }),
			}),
			{
				shouldTrigger: true,
				reason: "triggered",
				nextObservedValue: "99",
			},
		);
	});

	it("does not repeat while the price remains beyond the threshold", () => {
		assert.deepEqual(evaluate({ previousValue: "100.5" }), {
			shouldTrigger: false,
			reason: "no_crossing",
			nextObservedValue: "101",
		});
	});

	it("primes alerts that do not yet have a previous observation", () => {
		assert.deepEqual(evaluate({ previousValue: null }), {
			shouldTrigger: false,
			reason: "primed",
			nextObservedValue: "101",
		});
	});

	it("skips paused and previously triggered one-time alerts", () => {
		assert.deepEqual(evaluate({ status: "paused" }), {
			shouldTrigger: false,
			reason: "inactive",
		});
		assert.deepEqual(evaluate({ status: "triggered" }), {
			shouldTrigger: false,
			reason: "inactive",
		});
	});

	it("rejects stale quotes without changing the observation", () => {
		assert.deepEqual(
			evaluate({
				quote: quote({
					observedAt: new Date("2026-08-01T11:50:00.000Z"),
				}),
			}),
			{ shouldTrigger: false, reason: "stale_quote" },
		);
	});

	it("rejects quotes in the wrong currency", () => {
		assert.deepEqual(evaluate({ quote: quote({ currency: "EUR" }) }), {
			shouldTrigger: false,
			reason: "currency_mismatch",
		});
	});

	it("rejects malformed prices and future quote timestamps", () => {
		assert.deepEqual(evaluate({ quote: quote({ price: "NaN" }) }), {
			shouldTrigger: false,
			reason: "invalid_quote",
		});
		assert.deepEqual(
			evaluate({
				quote: quote({
					observedAt: new Date("2026-08-01T12:02:00.000Z"),
				}),
			}),
			{ shouldTrigger: false, reason: "invalid_quote" },
		);
	});
});

describe("buildOneTimeAlertDedupeKey", () => {
	it("is stable for retries of the same one-time alert", () => {
		assert.equal(
			buildOneTimeAlertDedupeKey("alert-123"),
			"price-alert:alert-123:once",
		);
		assert.equal(
			buildOneTimeAlertDedupeKey(" alert-123 "),
			"price-alert:alert-123:once",
		);
	});
});
