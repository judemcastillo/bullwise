import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	deliverInboxNewsWorkflow,
	parseInboxNewsRequest,
	type NewsDeliveryDependencies,
} from "./news-workflow";
const request = {
	userId: "alice",
	frequency: "daily" as const,
	periodKey: "2026-09-15",
	scheduledAt: "2026-09-15T12:00:00Z",
};
function fixture() {
	let saved = 0;
	let fetched = 0;
	const deps: NewsDeliveryDependencies = {
		enabledAt: async () => new Date("2026-09-15T10:00:00Z"),
		eligible: async () => true,
		preference: async () => ({
			frequency: "daily",
			categories: ["general_market"],
		}),
		exists: async () => saved > 0,
		articles: async () => {
			fetched++;
			return [
				{ headline: "News", url: "https://example.com", source: "Example" },
			];
		},
		save: async () => {
			saved++;
		},
	};
	return { deps, saved: () => saved, fetched: () => fetched };
}
describe("in-app news workflow", () => {
	it("delivers without email eligibility and skips duplicate retrieval on retry", async () => {
		const f = fixture();
		assert.equal(
			(await deliverInboxNewsWorkflow(request, f.deps)).status,
			"delivered",
		);
		assert.equal(
			(await deliverInboxNewsWorkflow(request, f.deps)).status,
			"duplicate",
		);
		assert.equal(f.saved(), 1);
		assert.equal(f.fetched(), 1);
	});
	it("does not backfill schedules preceding activation", async () => {
		const f = fixture();
		f.deps.enabledAt = async () => new Date("2026-09-16T00:00:00Z");
		assert.equal(
			(await deliverInboxNewsWorkflow(request, f.deps)).status,
			"disabled",
		);
		assert.equal(f.fetched(), 0);
	});
	it("respects off and weekly preferences for a daily delivery", async () => {
		for (const frequency of ["off", "weekly"] as const) {
			const f = fixture();
			f.deps.preference = async () => ({
				frequency,
				categories: ["general_market"],
			});
			assert.equal(
				(await deliverInboxNewsWorkflow(request, f.deps)).status,
				"preference_changed",
			);
			assert.equal(f.fetched(), 0);
		}
	});
	it("skips empty news and users no longer eligible", async () => {
		const f = fixture();
		f.deps.articles = async () => [];
		assert.equal(
			(await deliverInboxNewsWorkflow(request, f.deps)).status,
			"no_news",
		);
		assert.equal(f.saved(), 0);
		f.deps.eligible = async () => false;
		assert.equal(
			(await deliverInboxNewsWorkflow(request, f.deps)).status,
			"ineligible",
		);
	});
	it("honors opting out during article retrieval", async () => {
		const f = fixture();
		let read = 0;
		f.deps.preference = async () => ({
			frequency: ++read === 1 ? "daily" : "off",
			categories: ["general_market"],
		});
		assert.equal(
			(await deliverInboxNewsWorkflow(request, f.deps)).status,
			"preference_changed",
		);
		assert.equal(f.saved(), 0);
	});
	it("propagates save failure so the background worker retries", async () => {
		const f = fixture();
		f.deps.save = async () => {
			throw new Error("Temporary database error");
		};
		await assert.rejects(
			deliverInboxNewsWorkflow(request, f.deps),
			/Temporary/,
		);
	});
	it("validates schedule and period consistency", () => {
		assert.deepEqual(parseInboxNewsRequest(request), request);
		assert.throws(() =>
			parseInboxNewsRequest({ ...request, periodKey: "2026-09-14" }),
		);
		assert.throws(() =>
			parseInboxNewsRequest({ ...request, scheduledAt: null }),
		);
	});
});
