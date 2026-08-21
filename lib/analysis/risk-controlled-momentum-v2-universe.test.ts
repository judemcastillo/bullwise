import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	RISK_CONTROLLED_MOMENTUM_V2_COMPUTED_MANIFEST_SHA256,
	RISK_CONTROLLED_MOMENTUM_V2_EXCLUDED_SYMBOLS,
	RISK_CONTROLLED_MOMENTUM_V2_INCEPTION_CUTOFF,
	RISK_CONTROLLED_MOMENTUM_V2_MANIFEST_SHA256,
	RISK_CONTROLLED_MOMENTUM_V2_SLEEVES,
	RISK_CONTROLLED_MOMENTUM_V2_SYMBOLS,
} from "@/lib/analysis/risk-controlled-momentum-v2-universe";

describe("risk-controlled momentum v2 metadata universe", () => {
	it("freezes 48 unique, non-overlapping ETFs across four equal sleeves", () => {
		assert.equal(RISK_CONTROLLED_MOMENTUM_V2_SLEEVES.length, 4);
		assert.ok(
			RISK_CONTROLLED_MOMENTUM_V2_SLEEVES.every(
				(sleeve) => sleeve.candidates.length === 12,
			),
		);
		assert.equal(RISK_CONTROLLED_MOMENTUM_V2_SYMBOLS.length, 48);
		assert.equal(new Set(RISK_CONTROLLED_MOMENTUM_V2_SYMBOLS).size, 48);
		const excluded = new Set<string>(RISK_CONTROLLED_MOMENTUM_V2_EXCLUDED_SYMBOLS);
		assert.ok(RISK_CONTROLLED_MOMENTUM_V2_SYMBOLS.every((symbol) => !excluded.has(symbol)));
	});

	it("records only pre-cutoff active and tradable Alpaca U.S. equities", () => {
		for (const sleeve of RISK_CONTROLLED_MOMENTUM_V2_SLEEVES) {
			for (const candidate of sleeve.candidates) {
				assert.ok(candidate.inceptionDate <= RISK_CONTROLLED_MOMENTUM_V2_INCEPTION_CUTOFF);
				assert.equal(candidate.alpaca.assetClass, "us_equity");
				assert.equal(candidate.alpaca.status, "active");
				assert.equal(candidate.alpaca.tradable, true);
				assert.match(candidate.objectiveSource, /^https:\/\//);
				assert.ok(candidate.objective.length > 10);
			}
		}
	});

	it("matches the frozen canonical manifest checksum", () => {
		assert.equal(
			RISK_CONTROLLED_MOMENTUM_V2_COMPUTED_MANIFEST_SHA256,
			RISK_CONTROLLED_MOMENTUM_V2_MANIFEST_SHA256,
		);
	});
});
