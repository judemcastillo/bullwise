import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { formatMarketCapValue } from "@/lib/utils";

const source = readFileSync(new URL("./stock-data.ts", import.meta.url), "utf8");

function section(start: string, end: string) {
	const startIndex = source.indexOf(start);
	const endIndex = source.indexOf(end, startIndex + start.length);

	assert.notEqual(startIndex, -1, `Missing ${start}`);
	assert.notEqual(endIndex, -1, `Missing ${end}`);
	return source.slice(startIndex, endIndex);
}

describe("stock data loader boundaries", () => {
	it("keeps quotes fresh and caches slower-moving stock data", () => {
		const quoteLoader = section(
			"export const getStockQuote",
			"export const getStockProfile",
		);
		const profileLoader = section(
			"export const getStockProfile",
			"export const getStockMetrics",
		);
		const metricsLoader = section(
			"export const getStockMetrics",
			"export const getStockDashboardData",
		);

		assert.match(quoteLoader, /fetchStockData<DashboardQuoteData>/);
		assert.doesNotMatch(quoteLoader, /3600|1800/);
		assert.match(profileLoader, /fetchStockData<DashboardProfileData>/);
		assert.match(profileLoader, /3600/);
		assert.match(metricsLoader, /fetchStockData<FinancialsData>/);
		assert.match(metricsLoader, /1800/);
	});

	it("composes the independent loaders for existing stock views", () => {
		const composedLoaders = [
			section("export const getStockDashboardData", "export const getCompanyPeers"),
			section("export const getRelatedStockDetails", "export const getStocksDetails"),
			source.slice(source.indexOf("export const getStocksDetails")),
		];

		for (const loaderSource of composedLoaders) {
			assert.match(loaderSource, /getStockQuote\(cleanSymbol\)/);
			assert.match(loaderSource, /getStockProfile\(cleanSymbol\)/);
		}

		assert.match(composedLoaders[0], /getStockMetrics\(cleanSymbol\)/);
		assert.match(composedLoaders[2], /getStockMetrics\(cleanSymbol\)/);
	});

	it("formats the watchlist market cap from Finnhub millions into USD", () => {
		const watchlistLoader = source.slice(
			source.indexOf("export const getStocksDetails"),
		);

		assert.match(
			watchlistLoader,
			/formatMarketCapValue\(\s*\(profile\.marketCapitalization \|\| 0\) \* 1_000_000/,
		);
		assert.equal(formatMarketCapValue(2_500 * 1_000_000), "$2.50B");
	});
});
