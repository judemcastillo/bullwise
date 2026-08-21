import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { DailySwingBroadFeatureVector } from "@/lib/analysis/broad-dataset.types";
import type { DailySwingCombinedBroadEpisodeRow } from "@/lib/analysis/combined-broad-episode-dataset.types";
import {
	COMBINED_BROAD_CATEGORICAL_FEATURES,
	COMBINED_BROAD_NUMERIC_FEATURES,
	encodeCombinedBroadFeatureRows,
	fitCombinedBroadFeatureEncoder,
} from "@/lib/analysis/combined-broad-model-features";

function row(id: string, value: number): DailySwingCombinedBroadEpisodeRow {
	const features = Object.fromEntries(
		COMBINED_BROAD_NUMERIC_FEATURES.map((name) => [name, value]),
	) as unknown as DailySwingBroadFeatureVector;
	for (const [name, categories] of Object.entries(
		COMBINED_BROAD_CATEGORICAL_FEATURES,
	)) {
		(features as unknown as Record<string, unknown>)[name] = categories[0];
	}
	return {
		rowId: id,
		instrumentId: "backtest:us-etf:ivv",
		displaySymbol: "IVV",
		sourceScan: "base",
		signalAt: "2020-01-02T05:00:00.000Z",
		resolvedAt: "2020-01-03T05:00:00.000Z",
		features,
		targets: { actionableSuccess: value > 0, setupUtilityR: value },
	};
}

describe("combined broad model preprocessing", () => {
	it("fits all 50 fields on fit rows and encodes a deterministic width", () => {
		const fitRows = [row("a", -1), row("b", 0), row("c", 1)];
		const encoder = fitCombinedBroadFeatureEncoder(fitRows);
		const encoded = encodeCombinedBroadFeatureRows(fitRows, encoder);
		assert.equal(
			encoder.numeric.length + encoder.categorical.length,
			50,
		);
		assert.ok(encoded.every((values) => values.length === encoder.featureNames.length));
		assert.ok(encoded.flat().every(Number.isFinite));
	});

	it("uses fit-only nullable imputation and missingness indicators", () => {
		const fitRows = [row("a", 1), row("b", 3)];
		fitRows[0].features.relativeStrength20Percent = null;
		const encoder = fitCombinedBroadFeatureEncoder(fitRows);
		const evaluation = row("evaluation", 1_000_000);
		evaluation.features.relativeStrength20Percent = null;
		const encoded = encodeCombinedBroadFeatureRows([evaluation], encoder)[0];
		const missingIndex = encoder.featureNames.indexOf(
			"missing:relativeStrength20Percent",
		);
		assert.equal(
			encoder.numeric.find(
				(feature) => feature.name === "relativeStrength20Percent",
			)?.median,
			3,
		);
		assert.equal(encoded[missingIndex], 1);
		assert.ok(encoded.every(Number.isFinite));
	});

	it("rejects feature-schema drift", () => {
		const invalid = row("invalid", 1);
		(invalid.features as unknown as Record<string, unknown>).instrumentId = "leak";
		assert.throws(
			() => fitCombinedBroadFeatureEncoder([invalid]),
			/exactly the 50 frozen feature fields/,
		);
	});
});
