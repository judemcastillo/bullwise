import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { auditProviderSeries } from "@/lib/analysis/provider-audit";
import type { MarketBar, MarketBars } from "@/lib/market-data/types";

function series(provider: string, priceMultiplier = 1, missingDate = -1): MarketBars {
	const bars: MarketBar[] = Array.from({ length: 500 }, (_, index) => ({
		startedAt: new Date(Date.UTC(2024, 0, 1 + index)),
		open: String((100 + index * 0.1) * priceMultiplier),
		high: String((101 + index * 0.1) * priceMultiplier),
		low: String((99 + index * 0.1) * priceMultiplier),
		close: String((100.5 + index * 0.1) * priceMultiplier),
		volume: String(1_000_000 + index),
	})).filter((_, index) => index !== missingDate);
	return {
		instrumentId: `instrument-${provider}`,
		provider,
		providerSymbol: "SPY",
		currency: "USD",
		interval: "1d",
		from: bars[0].startedAt,
		to: bars.at(-1)!.startedAt,
		adjusted: true,
		timeliness: "historical",
		bars,
	};
}

describe("historical provider audit", () => {
	it("recognizes equivalent returns but rejects a stale adjusted-price factor", () => {
		const audit = auditProviderSeries(
			"SPY",
			series("massive"),
			series("alpaca", 0.9),
		);
		assert.equal(audit.overlappingBars, 500);
		assert.equal(audit.medianAbsoluteReturnDifferenceBps, 0);
		assert.equal(audit.latestCloseDifferenceBps, 1000);
		assert.equal(audit.passed, false);
		assert.ok(audit.findings.includes("Latest close differs materially"));
	});

	it("tolerates one isolated divergence while reporting it", () => {
		const candidate = series("alpaca", 1, 250);
		candidate.bars[300] = {
			...candidate.bars[300],
			close: String(Number(candidate.bars[300].close) * 1.2),
			volume: "100",
		};
		const audit = auditProviderSeries("SPY", series("massive"), candidate);
		assert.equal(audit.overlappingBars, 499);
		assert.ok((audit.maximumAbsoluteReturnDifferenceBps ?? 0) > 1_000);
		assert.equal(audit.passed, true);
	});
});
