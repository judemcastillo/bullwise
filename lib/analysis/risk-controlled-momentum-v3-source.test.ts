import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { RISK_CONTROLLED_MOMENTUM_V3_PROTOCOL } from "@/lib/analysis/risk-controlled-momentum-v3-development";
import { buildRiskControlledMomentumV3HistoryArtifact } from "@/lib/analysis/risk-controlled-momentum-v3-history";
import {
	parseRiskControlledMomentumV3HistoryArtifact,
	verifyRegisteredRiskControlledMomentumV3History,
} from "@/lib/analysis/risk-controlled-momentum-v3-source";
import { RISK_CONTROLLED_MOMENTUM_V2_SYMBOLS } from "@/lib/analysis/risk-controlled-momentum-v2-universe";
import { RISK_CONTROLLED_MOMENTUM_V3_HISTORY_POLICY } from "@/lib/analysis/risk-controlled-momentum-v3-history";
import type { MarketBars } from "@/lib/market-data/types";

function marketBars(symbol: string): MarketBars {
	return {
		instrumentId: `fixture:${symbol.toLowerCase()}`,
		provider: "tiingo",
		providerSymbol: symbol,
		currency: "USD",
		interval: "1d",
		from: new Date(RISK_CONTROLLED_MOMENTUM_V3_HISTORY_POLICY.requestedFrom),
		to: new Date(RISK_CONTROLLED_MOMENTUM_V3_HISTORY_POLICY.requestedTo),
		adjusted: true,
		timeliness: "historical",
		bars: [
			{
				startedAt: new Date("2007-01-03T00:00:00.000Z"),
				open: "100",
				high: "101",
				low: "99",
				close: "100.5",
				volume: "1000000",
			},
		],
	};
}

function artifact() {
	return buildRiskControlledMomentumV3HistoryArtifact({
		marketDataBySymbol: new Map(
			["SPY", ...RISK_CONTROLLED_MOMENTUM_V2_SYMBOLS].map((symbol) => [
				symbol,
				marketBars(symbol),
			]),
		),
		createdAt: new Date("2026-08-21T12:00:00.000Z"),
	});
}

describe("risk-controlled momentum v3 registered source", () => {
	it("parses only the exact adjusted Tiingo artifact contract", () => {
		const parsed = parseRiskControlledMomentumV3HistoryArtifact(artifact());
		assert.equal(parsed.instruments.length, 48);
		assert.equal(parsed.benchmark.displaySymbol, "SPY");
		assert.equal(parsed.instruments[0].bars[0].close, 100.5);
		const changed = structuredClone(artifact()) as Record<string, unknown>;
		(changed.requested as Record<string, unknown>).provider = "alpaca";
		assert.throws(
			() => parseRiskControlledMomentumV3HistoryArtifact(changed),
			/registered policy/,
		);
	});

	it("checks registered bytes and checksum before JSON parsing", () => {
		assert.throws(
			() => verifyRegisteredRiskControlledMomentumV3History(Buffer.from("not-json")),
			/byte size does not match/,
		);
		assert.throws(
			() =>
				verifyRegisteredRiskControlledMomentumV3History(
					Buffer.alloc(RISK_CONTROLLED_MOMENTUM_V3_PROTOCOL.sources.history.bytes),
				),
			/checksum does not match/,
		);
	});
});
