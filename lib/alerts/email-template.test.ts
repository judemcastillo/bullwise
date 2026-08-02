import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { escapeHtml, renderAlertEmail } from "@/lib/alerts/email-template";
import type { AlertEmailJob } from "@/lib/alerts/email-delivery";

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
		assert.match(rendered.html, /not financial advice/i);
		assert.doesNotMatch(rendered.html, /good time to buy/i);
	});

	it("escapes all HTML-sensitive characters", () => {
		assert.equal(
			escapeHtml(`<tag a="x">Tom & 'Sam'</tag>`),
			"&lt;tag a=&quot;x&quot;&gt;Tom &amp; &#39;Sam&#39;&lt;/tag&gt;",
		);
	});
});
