import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeFinnhubSearchResults } from "./stock-search";

describe("Finnhub stock search normalization", () => {
	it("normalizes search data and watchlist state", () => {
		const results = normalizeFinnhubSearchResults(
			[
				{
					symbol: " aapl ",
					description: " Apple Inc. ",
					displaySymbol: "AAPL",
					type: " Common Stock ",
				},
			],
			["aapl"],
		);

		assert.deepEqual(results, [
			{
				symbol: "AAPL",
				name: "Apple Inc.",
				type: "Common Stock",
				isInWatchlist: true,
			},
		]);
	});

	it("filters malformed symbols and deduplicates valid results", () => {
		const results = normalizeFinnhubSearchResults(
			[
				null,
				{},
				{ symbol: "AAPL<script>", description: "Unsafe" },
				{ symbol: "AAPL", description: "Apple Inc." },
				{ symbol: "aapl", description: "Duplicate" },
				{ symbol: "BARC.L", description: 42, type: null },
			],
			[],
		);

		assert.deepEqual(
			results.map(({ symbol, name, type, isInWatchlist }) => ({
				symbol,
				name,
				type,
				isInWatchlist,
			})),
			[
				{
					symbol: "AAPL",
					name: "Apple Inc.",
					type: "Stock",
					isInWatchlist: false,
				},
				{
					symbol: "BARC.L",
					name: "BARC.L",
					type: "Stock",
					isInWatchlist: false,
				},
			],
		);
	});
});
