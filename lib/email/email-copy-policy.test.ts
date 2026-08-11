import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	NEWS_SUMMARY_EMAIL_PROMPT,
	PERSONALIZED_WELCOME_EMAIL_PROMPT,
} from "@/lib/inngest/prompts";
import {
	INACTIVE_USER_REMINDER_EMAIL_TEMPLATE,
	NEWS_SUMMARY_EMAIL_TEMPLATE,
	STOCK_ALERT_LOWER_EMAIL_TEMPLATE,
	STOCK_ALERT_UPPER_EMAIL_TEMPLATE,
	VERIFICATION_EMAIL_TEMPLATE,
	VOLUME_ALERT_EMAIL_TEMPLATE,
	WELCOME_EMAIL_TEMPLATE,
} from "@/lib/nodemailer/templates";

describe("email copy policy", () => {
	it("does not retain obsolete development metadata or placeholder links", () => {
		const copy = [
			VERIFICATION_EMAIL_TEMPLATE,
			WELCOME_EMAIL_TEMPLATE,
			NEWS_SUMMARY_EMAIL_TEMPLATE,
			STOCK_ALERT_UPPER_EMAIL_TEMPLATE,
			STOCK_ALERT_LOWER_EMAIL_TEMPLATE,
			VOLUME_ALERT_EMAIL_TEMPLATE,
			INACTIVE_USER_REMINDER_EMAIL_TEMPLATE,
		].join("\n");

		assert.doesNotMatch(copy, /stock-market-dev\.vercel\.app/i);
		assert.doesNotMatch(copy, /ik\.imagekit\.io/i);
		assert.doesNotMatch(copy, /200 Market Street|San Francisco, CA/i);
		assert.doesNotMatch(copy, /href=["']#["']/i);
		assert.doesNotMatch(copy, /©\s*2025/i);
	});

	it("keeps AI-generated email copy grounded and non-advisory", () => {
		assert.match(
			PERSONALIZED_WELCOME_EMAIL_PROMPT,
			/Do not invent stocks, holdings, investment timelines/i,
		);
		assert.match(
			NEWS_SUMMARY_EMAIL_PROMPT,
			/Summarize only facts, figures, headlines, and URLs present/i,
		);
		assert.match(
			NEWS_SUMMARY_EMAIL_PROMPT,
			/Do not recommend buying, selling, or holding/i,
		);
		assert.doesNotMatch(
			`${PERSONALIZED_WELCOME_EMAIL_PROMPT}\n${NEWS_SUMMARY_EMAIL_PROMPT}`,
			/spot opportunities before|smart choice right now|safe stock to own|good time to buy/i,
		);
		assert.doesNotMatch(NEWS_SUMMARY_EMAIL_PROMPT, /example\.com\/article/i);
	});
});
