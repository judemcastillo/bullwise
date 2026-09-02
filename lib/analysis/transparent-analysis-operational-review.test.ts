import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
	buildTransparentAnalysisOperationalReview,
	validateTransparentAnalysisOperationalReviewArguments,
	writeTransparentAnalysisOperationalReview,
} from "@/lib/analysis/transparent-analysis-operational-review";

function request(recordedDate: string, overrides: Record<string, unknown> = {}) {
	return JSON.stringify({
		recordedDate,
		version: "1.0.0",
		event: "transparent_analysis_request",
		outcome: "ready",
		httpStatus: 200,
		duration: "1s_to_2_99s",
		historyBars: "400_to_499",
		...overrides,
	});
}

describe("transparent analysis formal operational review", () => {
	it("passes only when every frozen operational gate passes", () => {
		const lines = Array.from({ length: 50 }, (_, index) =>
			request(`2026-08-${String(24 + (index % 7)).padStart(2, "0")}`),
		);
		const review = buildTransparentAnalysisOperationalReview({
			contents: `${lines.join("\n")}\n`,
			createdAt: new Date("2026-09-02T10:00:00.000Z"),
		});

		assert.equal(review.decision, "pass_operational_review");
		assert.equal(review.coverage.validRequests, 50);
		assert.equal(review.coverage.distinctDays, 7);
		assert.equal(review.rates.availablePercent, 100);
		assert.equal(review.gates.length, 9);
		assert.ok(review.gates.every((gate) => gate.passed));
		assert.match(review.source.sha256, /^[a-f0-9]{64}$/);
	});

	it("requires investigation for recurrent missing factors and critical failures", () => {
		const lines = Array.from({ length: 50 }, (_, index) =>
			request(`2026-08-${String(24 + (index % 7)).padStart(2, "0")}`, index < 2
				? { outcome: "partial", partialReasons: ["participation_unavailable"] }
				: {}),
		);
		lines.push(JSON.stringify({
			recordedDate: "2026-08-30",
			version: "1.0.0",
			event: "transparent_analysis_operational_failure",
			stage: "target_bars",
			category: "authorization",
		}));
		const review = buildTransparentAnalysisOperationalReview({
			contents: `${lines.join("\n")}\n`,
			createdAt: new Date("2026-09-02T10:00:00.000Z"),
		});

		assert.equal(review.decision, "investigate_before_ai_contract");
		assert.equal(
			review.gates.find(({ id }) => id === "participation_unavailability")?.passed,
			false,
		);
		assert.equal(
			review.gates.find(({ id }) => id === "critical_operational_failures")?.passed,
			false,
		);
	});

	it("writes once and accepts no review overrides", async () => {
		const root = mkdtempSync(join(tmpdir(), "bullwise-review-"));
		const path = join(root, "review.json");
		try {
			const review = buildTransparentAnalysisOperationalReview({
				contents: "",
				createdAt: new Date("2026-09-02T10:00:00.000Z"),
			});
			await writeTransparentAnalysisOperationalReview(path, review);
			assert.deepEqual(JSON.parse(readFileSync(path, "utf8")), review);
			await assert.rejects(
				writeTransparentAnalysisOperationalReview(path, review),
				(error: NodeJS.ErrnoException) => error.code === "EEXIST",
			);
			assert.deepEqual(validateTransparentAnalysisOperationalReviewArguments([]), {
				help: false,
			});
			assert.throws(
				() => validateTransparentAnalysisOperationalReviewArguments(["--force"]),
				/Unsupported argument/,
			);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});
});
