import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
	createMarketNewsDeliveryEvents,
	getMarketNewsPeriodKey,
	isEligibleForScheduledMarketNews,
	MARKET_NEWS_DELIVERY_EVENT,
	MARKET_NEWS_RECIPIENT_PAGE_SIZE,
	parseMarketNewsDeliveryRequest,
} from "@/lib/email/market-news-delivery-policy";
import {
	DAILY_MARKET_NEWS_CRON,
	DAILY_MARKET_NEWS_EVENT,
	DAILY_MARKET_NEWS_FUNCTION_CONFIG,
	MARKET_NEWS_DELIVERY_FUNCTION_CONFIG,
	WEEKLY_MARKET_NEWS_CRON,
	WEEKLY_MARKET_NEWS_EVENT,
	WEEKLY_MARKET_NEWS_FUNCTION_CONFIG,
} from "@/lib/inngest/market-news.config";

describe("market-news Inngest delivery", () => {
	it("defines separate daily and weekly schedules", () => {
		assert.equal(DAILY_MARKET_NEWS_CRON, "0 12 * * *");
		assert.equal(DAILY_MARKET_NEWS_EVENT, "app/send.daily.news");
		assert.deepEqual(DAILY_MARKET_NEWS_FUNCTION_CONFIG.triggers, [
			{ cron: DAILY_MARKET_NEWS_CRON },
			{ event: DAILY_MARKET_NEWS_EVENT },
		]);
		assert.equal(WEEKLY_MARKET_NEWS_CRON, "0 12 * * 1");
		assert.equal(WEEKLY_MARKET_NEWS_EVENT, "app/send.weekly.news");
		assert.deepEqual(WEEKLY_MARKET_NEWS_FUNCTION_CONFIG.triggers, [
			{ cron: WEEKLY_MARKET_NEWS_CRON },
			{ event: WEEKLY_MARKET_NEWS_EVENT },
		]);
	});

	it("bounds scheduler and delivery concurrency", () => {
		assert.equal(MARKET_NEWS_RECIPIENT_PAGE_SIZE, 50);
		assert.equal(DAILY_MARKET_NEWS_FUNCTION_CONFIG.concurrency, 1);
		assert.equal(WEEKLY_MARKET_NEWS_FUNCTION_CONFIG.concurrency, 1);
		assert.equal(MARKET_NEWS_DELIVERY_FUNCTION_CONFIG.concurrency, 4);
		assert.equal(
			MARKET_NEWS_DELIVERY_FUNCTION_CONFIG.idempotency,
			"event.data.deliveryKey",
		);
		assert.deepEqual(MARKET_NEWS_DELIVERY_FUNCTION_CONFIG.triggers, [
			{ event: MARKET_NEWS_DELIVERY_EVENT },
		]);
	});

	it("creates opaque, idempotent recipient events without email addresses", () => {
		const events = createMarketNewsDeliveryEvents({
			userIds: ["user-123", "user-456"],
			frequency: "daily",
			periodKey: "2026-08-10",
		});

		assert.deepEqual(events[0], {
			name: MARKET_NEWS_DELIVERY_EVENT,
			data: {
				userId: "user-123",
				frequency: "daily",
				periodKey: "2026-08-10",
				deliveryKey: "market-news:daily:2026-08-10:user-123",
			},
		});
		assert.doesNotMatch(JSON.stringify(events), /@/);
		assert.deepEqual(parseMarketNewsDeliveryRequest(events[0].data), events[0].data);
		assert.equal(
			parseMarketNewsDeliveryRequest({
				...events[0].data,
				deliveryKey: "changed",
			}),
			null,
		);
	});

	it("uses one weekly idempotency period starting on Monday UTC", () => {
		const monday = new Date("2026-08-10T12:00:00.000Z");
		const sunday = new Date("2026-08-16T23:59:59.000Z");

		assert.equal(getMarketNewsPeriodKey("daily", sunday), "2026-08-16");
		assert.equal(getMarketNewsPeriodKey("weekly", monday), "2026-08-10");
		assert.equal(getMarketNewsPeriodKey("weekly", sunday), "2026-08-10");
	});

	it("requires the current eligible frequency immediately before delivery", () => {
		assert.equal(
			isEligibleForScheduledMarketNews(
				{ eligible: true, reason: "eligible", frequency: "daily" },
				"daily",
			),
			true,
		);
		assert.equal(
			isEligibleForScheduledMarketNews(
				{ eligible: true, reason: "eligible", frequency: "weekly" },
				"daily",
			),
			false,
		);
		assert.equal(
			isEligibleForScheduledMarketNews(
				{ eligible: false, reason: "not_subscribed" },
				"daily",
			),
			false,
		);
	});

	it("does not use the legacy flag or an email address as a step identifier", () => {
		const source = readFileSync(
			new URL("../inngest/functions.ts", import.meta.url),
			"utf8",
		);

		assert.doesNotMatch(source, /news-email-users|isDailyNewsEmailEnabled/);
		assert.doesNotMatch(source, /summarize-news-\$\{user\.email\}/);
		assert.match(source, /listMarketNewsRecipientIdsPage/);
		assert.match(source, /step\.sendEvent/);
		assert.match(source, /"send-market-news-email"/);
	});
});
