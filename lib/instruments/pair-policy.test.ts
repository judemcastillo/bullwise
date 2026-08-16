import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { usesUsd } from "@/lib/instruments/pair-policy";

describe("pair catalog policy", () => {
	it("keeps direct and inverse USD pairs", () => {
		assert.equal(usesUsd({ baseCurrency: "BTC", quoteCurrency: "USD" }), true);
		assert.equal(usesUsd({ baseCurrency: "usd", quoteCurrency: "jpy" }), true);
	});

	it("rejects pairs that do not use USD", () => {
		assert.equal(usesUsd({ baseCurrency: "EUR", quoteCurrency: "JPY" }), false);
		assert.equal(usesUsd({ baseCurrency: "BTC", quoteCurrency: "USDT" }), false);
	});
});
