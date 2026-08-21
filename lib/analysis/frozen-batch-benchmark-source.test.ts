import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import { readFrozenBatchBenchmark } from "@/lib/analysis/frozen-batch-benchmark-source";

describe("frozen batch benchmark source", () => {
	it("verifies the bundle and returns only pre-boundary SPY bars", async () => {
		const directory = await mkdtemp(resolve(tmpdir(), "bullwise-benchmark-"));
		const path = resolve(directory, "history.json");
		const raw = JSON.stringify({
			schemaVersion: "1.0.0",
			benchmarkData: {
				providerSymbol: "SPY",
				interval: "1d",
				adjusted: true,
				bars: [
					{ startedAt: "2022-12-30T05:00:00.000Z", close: "100" },
					{ startedAt: "2023-01-03T05:00:00.000Z", close: "101" },
				],
			},
			instruments: [{ deliberately: "not deserialized by the reader" }],
		});
		await writeFile(path, raw);
		const sha256 = createHash("sha256").update(raw).digest("hex");
		const result = await readFrozenBatchBenchmark({
			path,
			expectedSha256: sha256,
			periodEndsBefore: "2023-01-01T00:00:00.000Z",
		});
		assert.equal(result.sha256, sha256);
		assert.deepEqual(result.bars, [
			{ startedAt: "2022-12-30T05:00:00.000Z", close: 100 },
		]);
		assert.equal(result.barsAtOrAfterBoundaryUsed, false);
	});

	it("rejects checksum drift before extracting benchmark data", async () => {
		const directory = await mkdtemp(resolve(tmpdir(), "bullwise-benchmark-"));
		const path = resolve(directory, "history.json");
		await writeFile(path, "{}");
		await assert.rejects(
			readFrozenBatchBenchmark({
				path,
				expectedSha256: "0".repeat(64),
				periodEndsBefore: "2023-01-01T00:00:00.000Z",
			}),
			/checksum does not match/,
		);
	});
});
