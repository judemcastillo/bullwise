import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { writeMomentumDevelopmentReport } from "@/lib/analysis/cross-sectional-momentum-report";

describe("ETF cross-sectional momentum report writer", () => {
	it("writes once and refuses to replace an existing report", async () => {
		const directory = await mkdtemp(join(tmpdir(), "bullwise-momentum-"));
		const path = join(directory, "report.json");
		try {
			await writeMomentumDevelopmentReport(path, { decision: "first" });
			await assert.rejects(
				writeMomentumDevelopmentReport(path, { decision: "replacement" }),
				(error: NodeJS.ErrnoException) => error.code === "EEXIST",
			);
			assert.deepEqual(JSON.parse(await readFile(path, "utf8")), {
				decision: "first",
			});
		} finally {
			await rm(directory, { recursive: true, force: true });
		}
	});
});
