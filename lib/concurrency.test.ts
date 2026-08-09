import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapWithConcurrency } from "./concurrency";

describe("mapWithConcurrency", () => {
	it("bounds active work and preserves input order", async () => {
		let activeTasks = 0;
		let maximumActiveTasks = 0;

		const results = await mapWithConcurrency(
			[5, 4, 3, 2, 1],
			2,
			async (value) => {
				activeTasks += 1;
				maximumActiveTasks = Math.max(maximumActiveTasks, activeTasks);
				await new Promise<void>((resolve) =>
					setTimeout(resolve, value),
				);
				activeTasks -= 1;
				return value * 10;
			},
		);

		assert.equal(maximumActiveTasks, 2);
		assert.deepEqual(results, [50, 40, 30, 20, 10]);
	});

	it("uses at least one worker for a non-positive limit", async () => {
		const results = await mapWithConcurrency([1, 2], 0, async (value) =>
			value * 2,
		);

		assert.deepEqual(results, [2, 4]);
	});

	it("handles an invalid concurrency limit", async () => {
		const results = await mapWithConcurrency([1, 2], Number.NaN, async (value) =>
			value * 2,
		);

		assert.deepEqual(results, [2, 4]);
	});
});
