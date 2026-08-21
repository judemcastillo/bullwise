import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { readFrozenSymmetricTrainHistory } from "@/lib/analysis/symmetric-regime-history-source";

function marketBars(instrumentId: string, providerSymbol: string) {
	return {
		instrumentId,
		provider: "alpaca",
		providerSymbol,
		currency: "USD",
		interval: "1d",
		from: "2022-12-30T05:00:00.000Z",
		to: "2023-01-03T05:00:00.000Z",
		adjusted: true,
		timeliness: "historical",
		bars: [
			{
				startedAt: "2022-12-30T05:00:00.000Z",
				open: "100",
				high: "101",
				low: "99",
				close: "100",
				volume: "1000000",
			},
			{
				startedAt: "2023-01-03T05:00:00.000Z",
				open: "101",
				high: "102",
				low: "100",
				close: "101",
				volume: "1000000",
			},
		],
	};
}

describe("symmetric regime frozen history source", () => {
	it("verifies the complete source and exposes only pre-boundary bars", async () => {
		const directory = await mkdtemp(join(tmpdir(), "bullwise-symmetric-source-"));
		try {
			const path = join(directory, "history.json");
			const value = {
				schemaVersion: "1.0.0",
				universeName: "fixture-universe",
				requested: {
					from: "2022-12-30T05:00:00.000Z",
					to: "2023-01-03T05:00:00.000Z",
					benchmarkSymbol: "SPY",
				},
				benchmarkData: marketBars("benchmark:spy", "SPY"),
				instruments: [
					{
						instrument: {
							instrumentId: "fixture:etf",
							displaySymbol: "FIX",
							assetClass: "equity",
							securityType: "etf",
							etfProfile: "standard",
							currency: "USD",
							pricePrecision: 2,
						},
						marketData: marketBars("fixture:etf", "FIX"),
					},
				],
			};
			const raw = JSON.stringify(value);
			const sha256 = createHash("sha256").update(raw).digest("hex");
			await writeFile(path, raw, "utf8");
			const source = await readFrozenSymmetricTrainHistory({
				path,
				expectedSha256: sha256,
				expectedUniverseName: "fixture-universe",
				periodEndsBefore: "2023-01-01T00:00:00.000Z",
			});
			assert.equal(source.instruments[0].marketData.bars.length, 1);
			assert.equal(source.instruments[0].benchmarkData?.bars.length, 1);
			assert.equal(source.instruments[0].coverageSnapshot.barsAvailable, 2);
			assert.equal(
				source.instruments[0].coverageSnapshot.firstBarAt.toISOString(),
				"2022-12-30T05:00:00.000Z",
			);
			assert.equal(source.instruments[0].configuration?.allowShortSetups, true);
			assert.equal(source.barsAtOrAfterBoundaryUsedForAnalysis, false);
			assert.equal(source.fullHistoryCoverageMetadataUsed, true);
			await assert.rejects(
				readFrozenSymmetricTrainHistory({
					path,
					expectedSha256: "0".repeat(64),
					expectedUniverseName: "fixture-universe",
					periodEndsBefore: "2023-01-01T00:00:00.000Z",
				}),
				/checksum does not match/,
			);
		} finally {
			await rm(directory, { recursive: true, force: true });
		}
	});
});
