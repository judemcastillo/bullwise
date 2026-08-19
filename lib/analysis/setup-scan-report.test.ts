import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import { writeDailySwingSetupScanReport } from "@/lib/analysis/setup-scan-report";
import type { DailySwingSetupScanReport } from "@/lib/analysis/setup-scan.types";

function report(): DailySwingSetupScanReport {
	return {
		scanVersion: "2.0.0",
		generatedAt: "2026-08-19T00:00:00.000Z",
		universeName: "test",
		methodology: {
			evaluationPolicy: "every_eligible_completed_bar",
			labelPolicy: "independent_fixed_equity_simulation",
			researchPolicy: "none",
			description: "test",
		},
		aggregate: {
			candidatesReceived: 0,
			instrumentsScanned: 0,
			coverageExcluded: 0,
			analyses: 0,
			setups: 0,
			liquidityRejected: 0,
			triggered: 0,
			untriggered: 0,
		},
		reports: [],
		warnings: ["test"],
	};
}

describe("large setup-scan report writer", () => {
	it("writes valid JSON atomically and preserves no-overwrite behavior", async () => {
		const directory = await mkdtemp(resolve(tmpdir(), "bullwise-scan-writer-"));
		const output = resolve(directory, "report.json");
		try {
			const expected = report();
			await writeDailySwingSetupScanReport(output, expected);
			assert.deepEqual(JSON.parse(await readFile(output, "utf8")), expected);
			await assert.rejects(
				writeDailySwingSetupScanReport(output, expected),
				(error: NodeJS.ErrnoException) => error.code === "EEXIST",
			);
			await writeFile(output, "old");
			await writeDailySwingSetupScanReport(output, expected, { force: true });
			assert.deepEqual(JSON.parse(await readFile(output, "utf8")), expected);
		} finally {
			await rm(directory, { recursive: true, force: true });
		}
	});
});
