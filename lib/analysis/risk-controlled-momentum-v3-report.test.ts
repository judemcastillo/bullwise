import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { writeRiskControlledMomentumV3Report } from "@/lib/analysis/risk-controlled-momentum-v3-report";

describe("risk-controlled momentum v3 report writer", () => {
	it("writes once and refuses to replace a report", async () => {
		const directory = await mkdtemp(join(tmpdir(), "bullwise-v3-report-"));
		try {
			const path = join(directory, "report.json");
			const report = { decision: { status: "synthetic" } };
			const output = await writeRiskControlledMomentumV3Report(path, report);
			assert.equal(await readFile(path, "utf8"), output);
			await assert.rejects(
				writeRiskControlledMomentumV3Report(path, report),
				(error: NodeJS.ErrnoException) => error.code === "EEXIST",
			);
		} finally {
			await rm(directory, { recursive: true, force: true });
		}
	});
});
