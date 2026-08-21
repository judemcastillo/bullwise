import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { DailySwingBroadFeatureVector } from "@/lib/analysis/broad-dataset.types";
import { materializeDailySwingCombinedBroadFoldRows } from "@/lib/analysis/combined-broad-fold-dataset";
import type { DailySwingCombinedBroadDatasetRow } from "@/lib/analysis/combined-broad-dataset.types";

function row(input: {
	id: string;
	signalAt: string;
	resolvedAt: string;
	direction?: "long" | "short";
}): DailySwingCombinedBroadDatasetRow {
	return {
		rowId: input.id,
		instrumentId: "backtest:us-etf:ivv",
		displaySymbol: "IVV",
		sourceScan: "base",
		signalAt: input.signalAt,
		resolvedAt: input.resolvedAt,
		split: "train",
		features: {
			direction: input.direction ?? "long",
		} as DailySwingBroadFeatureVector,
		labels: {
			triggered: false,
			profitable: null,
			netRMultiple: null,
			exitReason: "expired_untriggered",
			targetOneReached: null,
			maximumFavorableExcursionPercent: null,
			maximumAdverseExcursionPercent: null,
		},
	};
}

describe("combined broad fold materialization", () => {
	it("selects episodes independently inside fit and evaluation partitions", () => {
		const result = materializeDailySwingCombinedBroadFoldRows([
			row({
				id: "crosses-2020-boundary",
				signalAt: "2019-12-30T05:00:00.000Z",
				resolvedAt: "2020-01-03T05:00:00.000Z",
			}),
			row({
				id: "fit-after-purge",
				signalAt: "2019-12-31T05:00:00.000Z",
				resolvedAt: "2019-12-31T05:00:00.000Z",
			}),
			row({
				id: "evaluation-restart",
				signalAt: "2020-01-02T05:00:00.000Z",
				resolvedAt: "2020-01-02T05:00:00.000Z",
			}),
		]);
		assert.deepEqual(result.finalTrainRows.map((item) => item.rowId), [
			"crosses-2020-boundary",
		]);
		assert.deepEqual(
			result.walkForwardFolds[0].fitRows.map((item) => item.rowId),
			["fit-after-purge"],
		);
		assert.deepEqual(
			result.walkForwardFolds[0].evaluationRows.map((item) => item.rowId),
			["evaluation-restart"],
		);
	});
});
