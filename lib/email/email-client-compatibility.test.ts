import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AlertEmailJob } from "@/lib/alerts/email-delivery";
import { renderAlertEmail } from "@/lib/alerts/email-template";
import {
	renderAccountVerificationEmail,
	renderNewsSummaryEmail,
	renderWelcomeEmail,
} from "@/lib/email/email-rendering";

const emailBranding = {
	dashboardUrl: "https://bullwise.example/",
	logoUrl: "https://bullwise.example/assets/icons/logo-email.png",
	dashboardPreviewUrl:
		"https://bullwise.example/assets/images/dashboard-preview.png",
	currentYear: "2026",
};

const marketingEmailBranding = {
	...emailBranding,
	postalAddress: "123 Example Avenue, Example City, EX 12345",
};

type RenderedEmail = {
	subject: string;
	text: string;
	html: string;
	headers?: Record<string, string>;
};

type EmailFixture = {
	name: string;
	message: RenderedEmail;
	hasButton: boolean;
};

function createAlertJob(
	operator: AlertEmailJob["operator"],
	id: string,
): AlertEmailJob {
	return {
		id,
		userId: "user-1",
		source: "development_test",
		operator,
		threshold: "100",
		observedValue: operator === "crosses_above" ? "101" : "99",
		triggeredAt: new Date("2026-08-11T08:30:00.000Z"),
		instrument: {
			displaySymbol: "ACME",
			name: "Acme Holdings",
			quoteCurrency: "USD",
		},
		attempt: 1,
		leaseId: `lease-${id}`,
	};
}

function createFixtures(): EmailFixture[] {
	const newsContent =
		'<h3>Market Highlights</h3><p>Acme published a market update.</p><a href="https://news.example/article">Read Full Story</a>';
	const createNews = (frequency: "daily" | "weekly") =>
		renderNewsSummaryEmail({
			frequency,
			date: "August 11, 2026",
			newsContent,
			unsubscribeUrl: "https://bullwise.example/unsubscribe?token=abc",
			oneClickUnsubscribeUrl:
				"https://bullwise.example/api/email/unsubscribe?token=abc",
			branding: marketingEmailBranding,
		});

	return [
		{
			name: "verification",
			message: renderAccountVerificationEmail({
				name: "Email Client Test",
				verificationUrl: "https://bullwise.example/verify-email?token=abc",
			}),
			hasButton: true,
		},
		{
			name: "welcome",
			message: renderWelcomeEmail({
				name: "Email Client Test",
				intro:
					"<p>Use your watchlist and alerts to follow the companies you research.</p>",
				branding: emailBranding,
			}),
			hasButton: true,
		},
		{
			name: "price alert above",
			message: renderAlertEmail(createAlertJob("crosses_above", "above")),
			hasButton: true,
		},
		{
			name: "price alert below",
			message: renderAlertEmail(createAlertJob("crosses_below", "below")),
			hasButton: true,
		},
		{ name: "daily news", message: createNews("daily"), hasButton: false },
		{ name: "weekly news", message: createNews("weekly"), hasButton: false },
	];
}

function assertSharedEmailContract(message: RenderedEmail) {
	assert.ok(message.subject.length > 0);
	assert.doesNotMatch(message.subject, /[\r\n]/);
	assert.ok(message.text.trim().length > 0);
	assert.match(message.html, /^<!doctype html>/i);
	assert.match(message.html, /<html[^>]+lang=["']en["']/i);
	assert.match(message.html, /<meta[^>]+charset=["']?utf-8/i);
	assert.match(
		message.html,
		/<meta[^>]+name=["']viewport["'][^>]+width=device-width/i,
	);
	assert.doesNotMatch(message.html, /{{[A-Za-z][^}]*}}/);
	assert.doesNotMatch(message.html, /javascript:|data:text\/html/i);

	for (const match of message.html.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)) {
		assert.match(match[1], /^https?:\/\//i);
	}

	for (const match of message.html.matchAll(/<table\b[^>]*>/gi)) {
		assert.match(match[0], /role=["']presentation["']/i);
		assert.match(match[0], /cellspacing=["']0["']/i);
		assert.match(match[0], /cellpadding=["']0["']/i);
		assert.match(match[0], /border=["']0["']/i);
	}

	for (const match of message.html.matchAll(/<img\b[^>]*>/gi)) {
		assert.match(match[0], /alt=["'][^"']+["']/i);
		assert.match(match[0], /width=["']\d+["']/i);
		assert.match(match[0], /style=["'][^"']*display:\s*block/i);
		assert.doesNotMatch(match[0], /\.svg(?:[?"'])/i);
	}
}

function assertGmailCompatibility(message: RenderedEmail) {
	assert.ok(
		Buffer.byteLength(message.html, "utf8") < 102 * 1024,
		"Gmail may clip messages at approximately 102 KB",
	);
	assert.match(
		message.html,
		/<body[^>]+bgcolor=["']#050505["'][^>]+style=["'][^"']*margin:\s*0[^"']*padding:\s*0/i,
	);
	assert.match(message.html, /@media only screen and \(max-width:\s*600px\)/i);
	assert.match(
		message.html,
		/<table[^>]+role=["']presentation["'][^>]+width=["']100%["']/i,
	);
	assert.match(message.html, /class=["']email-container["'][^>]+max-width:/i);
}

function assertOutlookCompatibility(message: RenderedEmail, hasButton: boolean) {
	assert.match(message.html, /<!--\[if mso\]>/i);
	assert.match(message.html, /<o:AllowPNG\s*\/>/i);
	assert.match(message.html, /<o:PixelsPerInch>96<\/o:PixelsPerInch>/i);
	assert.doesNotMatch(
		message.html,
		/display:\s*(?:flex|grid)|position:\s*(?:fixed|sticky)/i,
	);
	if (hasButton) {
		assert.match(
			message.html,
			/<td[^>]+bgcolor=["']#FDD458["'][^>]*>[\s\S]{0,500}<a[^>]+href=/i,
		);
	}
}

function assertAppleMailCompatibility(message: RenderedEmail) {
	assert.match(
		message.html,
		/<meta[^>]+name=["']x-apple-disable-message-reformatting["']/i,
	);
	assert.match(
		message.html,
		/<meta[^>]+name=["']format-detection["'][^>]+content=["']telephone=no["']/i,
	);
	assert.match(message.html, /name=["']color-scheme["'][^>]+content=["']dark["']/i);
	assert.match(
		message.html,
		/name=["']supported-color-schemes["'][^>]+content=["']dark["']/i,
	);
	assert.match(message.html, /font-family:/i);
}

describe("active email client compatibility", () => {
	for (const fixture of createFixtures()) {
		it(`renders ${fixture.name} with a complete email-safe structure`, () => {
			assertSharedEmailContract(fixture.message);
		});

		it(`keeps ${fixture.name} within the Gmail compatibility contract`, () => {
			assertGmailCompatibility(fixture.message);
		});

		it(`keeps ${fixture.name} within the Outlook compatibility contract`, () => {
			assertOutlookCompatibility(fixture.message, fixture.hasButton);
		});

		it(`keeps ${fixture.name} within the Apple Mail compatibility contract`, () => {
			assertAppleMailCompatibility(fixture.message);
		});
	}

	it("renders distinct Daily and Weekly News titles and subscription copy", () => {
		const fixtures = createFixtures();
		const daily = fixtures.find(({ name }) => name === "daily news")!;
		const weekly = fixtures.find(({ name }) => name === "weekly news")!;

		assert.match(daily.message.subject, /Daily Market News Summary/);
		assert.match(daily.message.html, /Daily Market News Summary/);
		assert.match(weekly.message.subject, /Weekly Market News Summary/);
		assert.match(weekly.message.html, /Weekly Market News Summary/);
		assert.match(daily.message.html, /subscribed to Bull Wise market news/i);
		assert.doesNotMatch(daily.message.html, /created a Bull Wise alert/i);
	});

	it("keeps RFC 8058 one-click headers on both news frequencies", () => {
		const newsFixtures = createFixtures().filter(({ name }) =>
			name.endsWith("news"),
		);

		for (const { message } of newsFixtures) {
			assert.equal(
				message.headers?.["List-Unsubscribe-Post"],
				"List-Unsubscribe=One-Click",
			);
			assert.match(message.headers?.["List-Unsubscribe"] ?? "", /^<https:\/\//);
		}
	});
});
