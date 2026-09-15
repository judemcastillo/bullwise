import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Types } from "mongoose";
import {
	DEFAULT_IN_APP_NEWS,
	decodeCursor,
	encodeCursor,
	internalDestination,
	parseAnnouncement,
	parsePreference,
	safeArticles,
} from "./policy";
import { selectDigestArticles } from "./news-policy";
import Notification from "@/database/models/notification.model";

describe("notification input and content", () => {
	it("defaults to independent daily news and validates saved preferences", () => {
		assert.deepEqual(DEFAULT_IN_APP_NEWS, {
			frequency: "daily",
			categories: ["general_market", "watchlist_news"],
		});
		assert.deepEqual(parsePreference({ frequency: "off", categories: [] }), {
			frequency: "off",
			categories: [],
		});
		assert.throws(() =>
			parsePreference({ frequency: "daily", categories: [] }),
		);
		assert.throws(() =>
			parsePreference({ frequency: "weekly", categories: ["unknown"] }),
		);
		assert.throws(() =>
			parsePreference({
				frequency: "daily",
				categories: ["earnings", "earnings"],
			}),
		);
	});
	it("round trips date/id pagination and rejects malformed cursors", () => {
		const _id = new Types.ObjectId();
		const createdAt = new Date("2026-09-15T12:00:00Z");
		assert.deepEqual(decodeCursor(encodeCursor({ _id, createdAt })), {
			id: _id.toString(),
			createdAt,
		});
		for (const cursor of ["%%%", "abc", "x".repeat(201)])
			assert.throws(() => decodeCursor(cursor));
	});
	it("restricts announcement links and validates operator input", () => {
		assert.equal(internalDestination("/watchlist"), "/watchlist");
		for (const path of [
			"//example.com",
			"/\\example.com",
			"javascript:alert(1)",
			"https://example.com",
			"/\n/evil",
		])
			assert.throws(() => internalDestination(path));
		assert.equal(
			parseAnnouncement({ key: "release-1", title: " Release ", body: "Hello" })
				.title,
			"Release",
		);
		assert.throws(() =>
			parseAnnouncement({ key: "release-1", title: "", body: "Hello" }),
		);
	});
	it("keeps six unique, safe article links", () => {
		const articles = Array.from({ length: 8 }, (_, i) => ({
			headline: `Article ${i}`,
			url: `https://example.com/${i}`,
			source: "Example",
		}));
		const result = safeArticles([
			{ headline: "Unsafe", url: "javascript:alert(1)", source: "" },
			articles[0],
			...articles,
		]);
		assert.equal(result.length, 6);
		assert.equal(new Set(result.map((a) => a.url)).size, 6);
	});
	it("filters digest categories and skips empty news without adding unrelated fallback stories", () => {
		const article = (headline: string, related = ""): MarketNewsArticle => ({
			id: 1,
			headline,
			related,
			category: "general",
			summary: "",
			url: `https://example.com/${encodeURIComponent(headline)}`,
			datetime: 1,
			source: "Example",
		});
		const general = [
			article("Quarterly earnings"),
			article("Inflation slows"),
			article("Market rally"),
		];
		assert.equal(selectDigestArticles(general, [], ["earnings"]).length, 1);
		assert.equal(
			selectDigestArticles(general, [], ["economic_news"]).length,
			1,
		);
		assert.equal(
			selectDigestArticles(general, [article("Fallback")], ["watchlist_news"])
				.length,
			0,
		);
		assert.equal(
			selectDigestArticles(
				[],
				[article("Company results", "TEST")],
				["watchlist_news"],
			).length,
			1,
		);
		assert.deepEqual(selectDigestArticles([], [], ["general_market"]), []);
	});
	it("declares deduplication and inbox lookup indexes", () => {
		const indexes = Notification.schema.indexes() as [
			Record<string, number>,
			{ unique?: boolean },
		][];
		assert.ok(
			indexes.some(
				([fields, options]) =>
					fields.userId === 1 && fields.sourceKey === 1 && options.unique,
			),
		);
		assert.ok(
			indexes.some(([fields]) => fields.userId === 1 && fields.readAt === 1),
		);
	});
});
