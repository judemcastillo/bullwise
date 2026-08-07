import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { escapeHtml, renderAlertEmail } from "@/lib/alerts/email-template";
import type { AlertEmailJob } from "@/lib/alerts/email-delivery";
import {
	INACTIVE_USER_REMINDER_EMAIL_TEMPLATE,
	NEWS_SUMMARY_EMAIL_TEMPLATE,
	STOCK_ALERT_LOWER_EMAIL_TEMPLATE,
	STOCK_ALERT_UPPER_EMAIL_TEMPLATE,
	VERIFICATION_EMAIL_TEMPLATE,
	VOLUME_ALERT_EMAIL_TEMPLATE,
	WELCOME_EMAIL_TEMPLATE,
} from "@/lib/nodemailer/templates";

function assertDarkMobileCanvas(html: string) {
	assert.match(html, /^<!doctype html>/i);
	assert.match(html, /<meta name="color-scheme" content="dark"\s*\/?>/);
	assert.match(
		html,
		/<meta name="supported-color-schemes" content="dark"\s*\/?>/,
	);
	assert.match(html, /color-scheme:\s*dark only/);
	assert.match(
		html,
		/<body[^>]*class="email-body"[^>]*bgcolor="#050505"/,
	);
	assert.match(
		html,
		/class="email-background"[^>]*bgcolor="#050505"/,
	);
	assert.match(html, /class="email-container"[^>]*bgcolor="#141414"/);
	assert.doesNotMatch(html, /mix-blend-mode/i);
	assert.doesNotMatch(html, /gmail-color-fix/);
	assert.doesNotMatch(html, /linear-gradient/i);
}

describe("shared email template canvas", () => {
	const templates = [
		["verification", VERIFICATION_EMAIL_TEMPLATE],
		["welcome", WELCOME_EMAIL_TEMPLATE],
		["news summary", NEWS_SUMMARY_EMAIL_TEMPLATE],
		["upper stock alert", STOCK_ALERT_UPPER_EMAIL_TEMPLATE],
		["lower stock alert", STOCK_ALERT_LOWER_EMAIL_TEMPLATE],
		["volume alert", VOLUME_ALERT_EMAIL_TEMPLATE],
		["inactive user reminder", INACTIVE_USER_REMINDER_EMAIL_TEMPLATE],
	] as const;

	for (const [name, html] of templates) {
		it(`keeps the ${name} template dark in mobile email clients`, () => {
			assertDarkMobileCanvas(html);
		});
	}
});

describe("alert email template", () => {
	it("escapes instrument data and renders neutral alert language", () => {
		const job: AlertEmailJob = {
			id: "event-1",
			userId: "user-1",
			source: "development_test",
			operator: "crosses_below",
			threshold: "100",
			observedValue: "99.5",
			triggeredAt: new Date("2026-08-01T12:00:00.000Z"),
			instrument: {
				displaySymbol: "<BTC>",
				name: "A & B",
				quoteCurrency: "USD",
			},
			attempt: 1,
			leaseId: "lease-1",
		};
		const rendered = renderAlertEmail(job);

		assert.match(rendered.subject, /crossed below/);
		assert.match(rendered.subject, /^\[Test\]/);
		assert.match(rendered.html, /Development test email/);
		assert.ok(rendered.html.includes("&lt;BTC&gt;"));
		assert.ok(rendered.html.includes("A &amp; B"));
		assert.match(rendered.html, /Triggered at 2026-08-01 12:00:00 \(UTC\)/);
		assert.match(rendered.text, /at 2026-08-01 12:00:00 \(UTC\)\./);
		assert.match(rendered.html, /not financial advice/i);
		assert.doesNotMatch(rendered.html, /good time to buy/i);
		assert.match(rendered.html, /<h1[^>]*color:\s*#ffffff/);
		assert.match(rendered.html, /<p[^>]*color:\s*#ffffff[^>]*>\s*The price crossed/);
		assertDarkMobileCanvas(rendered.html);
	});

	it("escapes all HTML-sensitive characters", () => {
		assert.equal(
			escapeHtml(`<tag a="x">Tom & 'Sam'</tag>`),
			"&lt;tag a=&quot;x&quot;&gt;Tom &amp; &#39;Sam&#39;&lt;/tag&gt;",
		);
	});
});
