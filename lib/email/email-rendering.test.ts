import assert from "node:assert/strict";
import { describe, it } from "node:test";
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

describe("transactional email rendering", () => {
	it("escapes names and validates verification URLs", () => {
		const rendered = renderAccountVerificationEmail({
			name: `<Admin & "Owner">`,
			verificationUrl: "https://bullwise.example/verify?token=a&next=b",
		});

		assert.match(rendered.html, /&lt;Admin &amp; &quot;Owner&quot;&gt;/);
		assert.match(
			rendered.html,
			/href="https:\/\/bullwise\.example\/verify\?token=a&amp;next=b"/,
		);
		assert.throws(
			() =>
				renderAccountVerificationEmail({
					name: "User",
					verificationUrl: "javascript:alert(1)",
				}),
			/absolute HTTP or HTTPS/,
		);
	});

	it("preserves safe welcome formatting while removing executable HTML", () => {
		const rendered = renderWelcomeEmail({
			name: "<User>",
			intro:
				'<p onclick="steal()">Focus on <strong>technology</strong><script>alert(1)</script></p>',
			branding: emailBranding,
		});

		assert.match(rendered.html, /Welcome aboard &lt;User&gt;/);
		assert.match(
			rendered.html,
			/<strong style="color:#FDD458;font-weight:700">technology<\/strong>/,
		);
		assert.doesNotMatch(rendered.html, /onclick|<script|alert\(1\)/i);
		assert.match(rendered.html, /href="https:\/\/bullwise\.example\/"/);
		assert.match(rendered.html, /© 2026 Bull Wise/);
		assert.doesNotMatch(rendered.html, /unsubscribe/i);
		assert.doesNotMatch(rendered.html, /{{[A-Za-z]/);
	});
});

describe("market-news email rendering", () => {
	it("includes the date and sanitized summary in plain text", () => {
		const rendered = renderNewsSummaryEmail({
			frequency: "weekly",
			date: "August 10, 2026",
			newsContent:
				'<p onclick="steal()">Markets gained on strong earnings.</p><script>steal()</script>',
			unsubscribeUrl: "https://bullwise.example/unsubscribe?token=abc",
			oneClickUnsubscribeUrl:
				"https://bullwise.example/api/email/unsubscribe?token=abc",
			branding: marketingEmailBranding,
		});

		assert.match(rendered.text, /Weekly Market News Summary from Bull Wise/);
		assert.match(rendered.text, /August 10, 2026/);
		assert.match(rendered.text, /Markets gained on strong earnings\./);
		assert.match(
			rendered.text,
			/Unsubscribe: https:\/\/bullwise\.example\/unsubscribe\?token=abc/,
		);
		assert.doesNotMatch(rendered.text, /onclick|<script|steal\(\)/i);
		assert.doesNotMatch(rendered.text, /<[^>]+>/);
	});

	it("preserves headings, paragraphs, and list items in plain text", () => {
		const rendered = renderNewsSummaryEmail({
			frequency: "daily",
			date: "August 11, 2026",
			newsContent:
				"<h3>Market Overview</h3><p>Stocks rose.</p><h4>Watchlist</h4><ul><li><span>•</span>Alpha gained.</li><li>Beta declined.</li></ul><p>Trading remained active.</p>",
			unsubscribeUrl: "https://bullwise.example/unsubscribe?token=abc",
			oneClickUnsubscribeUrl:
				"https://bullwise.example/api/email/unsubscribe?token=abc",
			branding: marketingEmailBranding,
		});

		assert.match(
			rendered.text,
			/Market Overview\n\nStocks rose\.\n\nWatchlist\n\n- Alpha gained\.\n- Beta declined\.\n\nTrading remained active\./,
		);
	});

	it("sanitizes AI content and keeps one-click unsubscribe headers", () => {
		const rendered = renderNewsSummaryEmail({
			frequency: "daily",
			date: "August 10, 2026\r\nBcc: attacker@example.com",
			newsContent:
				'<h3>Highlights</h3><p onclick="steal()">Market update</p><a href="javascript:steal()">Read</a><script>steal()</script>',
			unsubscribeUrl: "https://bullwise.example/unsubscribe?token=abc",
			oneClickUnsubscribeUrl:
				"https://bullwise.example/api/email/unsubscribe?token=abc",
			branding: marketingEmailBranding,
		});

		assert.equal(
			rendered.subject,
			"📈 Daily Market News Summary - August 10, 2026 Bcc: attacker@example.com",
		);
		assert.equal(
			rendered.headers["List-Unsubscribe"],
			"<https://bullwise.example/api/email/unsubscribe?token=abc>",
		);
		assert.equal(
			rendered.headers["List-Unsubscribe-Post"],
			"List-Unsubscribe=One-Click",
		);
		assert.match(rendered.html, /Highlights/);
		assert.match(rendered.html, /Market update/);
		assert.match(rendered.html, /123 Example Avenue, Example City, EX 12345/);
		assert.match(rendered.html, /© 2026 Bull Wise/);
		assert.doesNotMatch(rendered.html, /onclick|javascript:|<script|steal\(\)/i);
		assert.doesNotMatch(rendered.html, /{{[A-Za-z]/);
	});

	it("rejects unsafe unsubscribe and dashboard URLs", () => {
		assert.throws(
			() =>
				renderNewsSummaryEmail({
					frequency: "weekly",
					date: "August 10, 2026",
					newsContent: "No market news.",
					unsubscribeUrl: "javascript:alert(1)",
					oneClickUnsubscribeUrl: "https://bullwise.example/api/unsubscribe",
					branding: marketingEmailBranding,
				}),
			/absolute HTTP or HTTPS/,
		);
	});
});
