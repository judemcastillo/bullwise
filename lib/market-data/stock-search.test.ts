import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeFinnhubSearchResults } from "./stock-search";

describe("Finnhub stock search normalization", () => {
	it("normalizes explicit US exchange data and watchlist state", () => {
		const results = normalizeFinnhubSearchResults(
			[
				{
					symbol: " aapl ",
					description: " Apple Inc. ",
					displaySymbol: "AAPL",
					type: " Common Stock ",
					exchange: " NASDAQ ",
				},
			],
			["aapl"],
		);

		assert.deepEqual(results, [
			{
				symbol: "AAPL",
				name: "Apple Inc.",
				exchange: "NASDAQ",
				type: "Common Stock",
				isInWatchlist: true,
			},
		]);
	});

	it("preserves explicit international exchange data", () => {
		const [result] = normalizeFinnhubSearchResults(
			[
				{
					symbol: "7203.T",
					description: "Toyota Motor Corp",
					type: "Common Stock",
					exchange: "Tokyo Stock Exchange",
				},
			],
			[],
		);

		assert.equal(result.exchange, "Tokyo Stock Exchange");
	});

	it("does not mistake a display symbol for an exchange", () => {
		const [result] = normalizeFinnhubSearchResults(
			[
				{
					symbol: "MSFT",
					description: "Microsoft Corp",
					displaySymbol: "NASDAQ:MSFT",
					type: "Common Stock",
				},
			],
			[],
		);

		assert.equal(result.exchange, "—");
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
			results.map(({ symbol, name, exchange, type }) => ({
				symbol,
				name,
				exchange,
				type,
			})),
			[
				{
					symbol: "AAPL",
					name: "Apple Inc.",
					exchange: "—",
					type: "Stock",
				},
				{
					symbol: "BARC.L",
					name: "BARC.L",
					exchange: "—",
					type: "Stock",
				},
			],
		);
	});
});
