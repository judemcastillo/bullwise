import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	hasWatchlistCapacity,
	paginateWatchlist,
	WATCHLIST_MAX_ITEMS,
	WATCHLIST_PAGE_SIZE,
} from "./watchlist-policy";
import { toWatchlistClientItem } from "./watchlist-serialization";

describe("watchlist policy", () => {
	it("allows no more than 20 saved items", () => {
		assert.equal(WATCHLIST_MAX_ITEMS, 20);
		assert.equal(hasWatchlistCapacity(19), true);
		assert.equal(hasWatchlistCapacity(20), false);
		assert.equal(hasWatchlistCapacity(21), false);
	});

	it("paginates watchlist items in groups of 10", () => {
		const items = Array.from({ length: 20 }, (_, index) => index + 1);
		const firstPage = paginateWatchlist(items, "1");
		const secondPage = paginateWatchlist(items, "2");

		assert.equal(WATCHLIST_PAGE_SIZE, 10);
		assert.deepEqual(firstPage.items, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
		assert.deepEqual(secondPage.items, [11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
		assert.equal(secondPage.currentPage, 2);
		assert.equal(secondPage.totalPages, 2);
		assert.equal(secondPage.totalItems, 20);
	});

	it("normalizes malformed and out-of-range pages", () => {
		const items = Array.from({ length: 12 }, (_, index) => index + 1);

		assert.equal(paginateWatchlist(items, "invalid").currentPage, 1);
		assert.equal(paginateWatchlist(items, "0").currentPage, 1);
		assert.equal(paginateWatchlist(items, "999").currentPage, 2);
		assert.equal(paginateWatchlist(items, ["2", "1"]).currentPage, 2);
	});

	it("removes database-only values before rendering client components", () => {
		const databaseRecord = {
			_id: { toJSON: () => "database-id" },
			__v: 0,
			userId: "user-1",
			symbol: "AAPL",
			company: "Apple Inc.",
			addedAt: new Date("2026-08-10T00:00:00.000Z"),
		};

		assert.deepEqual(toWatchlistClientItem(databaseRecord), {
			symbol: "AAPL",
			company: "Apple Inc.",
		});
	});
});
