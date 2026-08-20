import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { readDailySwingCombinedBroadTrainSource } from "@/lib/analysis/combined-broad-train-source";

async function sourceFile() {
	const directory = await mkdtemp(join(tmpdir(), "bullwise-combined-source-"));
	const path = join(directory, "source.json");
	const raw =
		'{"datasetVersion":"3.0.0","splits":{"train":{"rows":1},"validation":{"rows":1},"test":{"rows":1}},"rows":[' +
		'{"rowId":"train-row","features":{"direction":"long"},"labels":{"triggered":false},"split":"train"},' +
		'{"rowId":"validation-row","features":{"sealed":invalid_validation_feature},"labels":{"sealed":invalid_validation_label},"split":"validation"},' +
		'{"rowId":"test-row","features":{"sealed":invalid_test_feature},"labels":{"sealed":invalid_test_label},"split":"test"}' +
		'],"warnings":[]}\n';
	await writeFile(path, raw);
	return {
		directory,
		path,
		sha256: createHash("sha256").update(raw).digest("hex"),
	};
}

describe("combined broad train-only source reader", () => {
	it("deserializes train rows without parsing sealed feature or label values", async () => {
		const fixture = await sourceFile();
		try {
			const result = await readDailySwingCombinedBroadTrainSource({
				path: fixture.path,
				expectedSha256: fixture.sha256,
			});
			assert.deepEqual(result.dataset.rows.map((row) => row.rowId), ["train-row"]);
			assert.deepEqual(result.splitCounts, {
				train: 1,
				validation: 1,
				test: 1,
			});
		} finally {
			await rm(fixture.directory, { recursive: true, force: true });
		}
	});

	it("rejects checksum drift before attempting row deserialization", async () => {
		const fixture = await sourceFile();
		try {
			await assert.rejects(
				readDailySwingCombinedBroadTrainSource({
					path: fixture.path,
					expectedSha256: "0".repeat(64),
				}),
				/checksum/,
			);
		} finally {
			await rm(fixture.directory, { recursive: true, force: true });
		}
	});
});
