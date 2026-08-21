import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BROAD_DEVELOPMENT_CATEGORIES } from "@/lib/analysis/broad-development-universe";
import { BROAD_DEVELOPMENT_V2_EXPANSION_CATEGORIES } from "@/lib/analysis/broad-development-v2-universe";
import { momentumMembershipFor } from "@/lib/analysis/cross-sectional-momentum-source";

describe("ETF cross-sectional momentum source membership", () => {
	it("maps every frozen manifest symbol to one sleeve without using outcomes", () => {
		const memberships = [
			...BROAD_DEVELOPMENT_CATEGORIES.flatMap((category) =>
				category.symbols.map((displaySymbol) =>
					momentumMembershipFor({ sourceScan: "base", displaySymbol }),
				),
			),
			...BROAD_DEVELOPMENT_V2_EXPANSION_CATEGORIES.flatMap((category) =>
				category.candidates.map(({ symbol: displaySymbol }) =>
					momentumMembershipFor({ sourceScan: "expansion", displaySymbol }),
				),
			),
		];
		assert.equal(memberships.length, 130);
		assert.equal(new Set(memberships.map((value) => value.sleeveId)).size, 4);
	});

	it("rejects symbols outside the frozen manifests", () => {
		assert.throws(
			() => momentumMembershipFor({ sourceScan: "base", displaySymbol: "SPY" }),
			/must belong to exactly one frozen category/,
		);
	});
});
