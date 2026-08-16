import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	hasWatchlistCapacity,
	paginateWatchlist,
	WATCHLIST_MAX_ITEMS,
	WATCHLIST_PAGE_SIZE,
} from "./watchlist-policy";
import {
	getFinnhubWatchlistNewsSymbol,
	getFinnhubWatchlistQuoteSymbol,
	toWatchlistClientItem,
} from "./watchlist-serialization";
import type { ProviderBinding } from "@/types/instruments";

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
			instrument: {
				_id: { toString: () => "instrument-id" },
				canonicalKey: "equity:xnas:aapl",
				assetClass: "equity" as const,
				instrumentType: "listing" as const,
				securityType: "common_stock" as const,
				displaySymbol: "AAPL",
				name: "Apple Inc.",
				venue: "NASDAQ",
				quoteCurrency: "USD",
				providerBindings: [
					{
						provider: "finnhub",
						symbol: "AAPL",
						capabilities: ["catalog", "quote", "alert_quote", "news"],
						enabled: true,
						priority: 100,
						orientation: "direct",
					} satisfies ProviderBinding,
				],
			},
		};

		assert.deepEqual(toWatchlistClientItem(databaseRecord), {
			instrumentId: "instrument-id",
			canonicalKey: "equity:xnas:aapl",
			assetClass: "equity",
			instrumentType: "listing",
			securityType: "common_stock",
			symbol: "AAPL",
			company: "Apple Inc.",
			venue: "NASDAQ",
			baseCurrency: undefined,
			quoteCurrency: "USD",
			calendarId: undefined,
			provider: "finnhub",
			providerSymbol: "AAPL",
			quoteProvider: "finnhub",
			quoteProviderSymbol: "AAPL",
			newsProvider: "finnhub",
			newsProviderSymbol: "AAPL",
			supportsAlerts: true,
		});
	});

	it("keeps catalog-only forex out of Finnhub quote, news, and alert paths", () => {
		const clientItem = toWatchlistClientItem({
			instrument: {
				_id: "forex-instrument-id",
				canonicalKey: "forex:spot:eur:usd",
				assetClass: "forex",
				instrumentType: "spot_pair",
				displaySymbol: "EUR/USD",
				name: "Euro - United States dollar",
				venue: "Global Forex",
				baseCurrency: "EUR",
				quoteCurrency: "USD",
				calendarId: "forex-24x5",
				providerBindings: [
					{
						provider: "finnhub",
						symbol: "OANDA:EUR_USD",
						capabilities: ["catalog"],
						enabled: true,
						priority: 100,
						orientation: "direct",
					},
					{
						provider: "massive",
						symbol: "C:EURUSD",
						capabilities: ["catalog", "bars", "indicators"],
						enabled: true,
						priority: 200,
						orientation: "direct",
					},
					{
						provider: "tradingview",
						symbol: "OANDA:EURUSD",
						capabilities: ["chart"],
						enabled: true,
						priority: 100,
						orientation: "direct",
					},
				] satisfies ProviderBinding[],
			},
		});

		assert.equal(clientItem.quoteProvider, undefined);
		assert.equal(clientItem.newsProvider, undefined);
		assert.equal(clientItem.provider, undefined);
		assert.equal(clientItem.supportsAlerts, false);
		assert.equal(getFinnhubWatchlistQuoteSymbol(clientItem), null);
		assert.equal(getFinnhubWatchlistNewsSymbol(clientItem), null);
	});

	it("keeps commodity spot instruments out of alert and Finnhub quote paths", () => {
		const clientItem = toWatchlistClientItem({
			instrument: {
				_id: "commodity-instrument-id",
				canonicalKey: "commodity:oanda:spot:xau:usd",
				assetClass: "commodity",
				instrumentType: "spot",
				displaySymbol: "XAU/USD",
				name: "Gold Spot / United States dollar",
				venue: "OANDA Spot",
				baseCurrency: "XAU",
				quoteCurrency: "USD",
				calendarId: "commodity-spot-24x5",
				providerBindings: [
					{
						provider: "finnhub",
						symbol: "OANDA:XAU_USD",
						capabilities: ["catalog"],
						enabled: true,
						priority: 100,
						orientation: "direct",
					},
				] satisfies ProviderBinding[],
			},
		});

		assert.equal(clientItem.quoteProvider, undefined);
		assert.equal(clientItem.provider, undefined);
		assert.equal(clientItem.supportsAlerts, false);
		assert.equal(getFinnhubWatchlistQuoteSymbol(clientItem), null);
	});
});
