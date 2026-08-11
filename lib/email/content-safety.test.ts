import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	escapeHtml,
	requireSafeEmailUrl,
	sanitizeEmailHeader,
	sanitizeGeneratedMarketNewsHtml,
	sanitizeGeneratedWelcomeHtml,
} from "@/lib/email/content-safety";

describe("email content safety", () => {
	it("escapes every HTML-sensitive character", () => {
		assert.equal(
			escapeHtml(`<tag a="x">Tom & 'Sam'</tag>`),
			"&lt;tag a=&quot;x&quot;&gt;Tom &amp; &#39;Sam&#39;&lt;/tag&gt;",
		);
	});

	it("removes control characters from email headers", () => {
		assert.equal(
			sanitizeEmailHeader("Daily summary\r\nBcc: attacker@example.com\u0000"),
			"Daily summary Bcc: attacker@example.com",
		);
	});

	it("accepts only absolute HTTP and HTTPS email URLs", () => {
		assert.equal(
			requireSafeEmailUrl("https://bullwise.example/unsubscribe?token=abc"),
			"https://bullwise.example/unsubscribe?token=abc",
		);
		assert.equal(
			requireSafeEmailUrl("http://localhost:3000/unsubscribe"),
			"http://localhost:3000/unsubscribe",
		);
		for (const unsafeUrl of [
			"javascript:alert(1)",
			"//attacker.example/path",
			"/relative/path",
			"https://user:password@example.com/path",
			"https://bullwise.example/path\r\nBcc: attacker@example.com",
		]) {
			assert.throws(() => requireSafeEmailUrl(unsafeUrl), /absolute HTTP or HTTPS/);
		}
	});

	it("sanitizes generated welcome HTML and replaces model-provided styles", () => {
		const rendered = sanitizeGeneratedWelcomeHtml(`
			\`\`\`html
			<p onclick="steal()" style="background-image:url(javascript:steal())">
				Hello Tom & Jane <strong onmouseover="steal()">long-term growth</strong>
				<img src=x onerror="steal()"><script>alert("x")</script>
			</p>
			\`\`\`
		`);

		assert.match(rendered, /^<p class="mobile-text dark-text-secondary"/);
		assert.match(rendered, /Hello Tom &amp; Jane/);
		assert.match(rendered, /<strong style="color:#FDD458;font-weight:700">/);
		assert.doesNotMatch(rendered, /script|onclick|onmouseover|onerror|javascript|<img/i);
	});

	it("sanitizes market-news HTML and constrains generated links", () => {
		const rendered = sanitizeGeneratedMarketNewsHtml(`
			<div class="dark-info-box" style="background-image:url(javascript:steal())">
				<h4 onclick="steal()">Company update</h4>
				<p>Read the latest <strong>ACME</strong> report.</p>
				<a href="javascript:alert(1)" onclick="steal()">Unsafe story</a>
				<a href="https://news.example/story?x=1&y=2" style="position:fixed">Safe story</a>
				<iframe src="https://attacker.example">hidden</iframe>
				<style>body { display: none }</style><script>alert("x")</script>
			</div>
		`);

		assert.match(rendered, /class="dark-info-box"/);
		assert.match(rendered, /<span style="color:#FDD458;font-weight:500">Unsafe story<\/span>/);
		assert.match(
			rendered,
			/href="https:\/\/news\.example\/story\?x=1&amp;y=2" target="_blank" rel="noopener noreferrer"/,
		);
		assert.doesNotMatch(
			rendered,
			/javascript|onclick|position:fixed|iframe|attacker\.example|display: none|<script/i,
		);
	});

	it("renders an escaped paragraph when generated content is plain text", () => {
		const rendered = sanitizeGeneratedMarketNewsHtml("Markets rose & <fell> today");
		assert.match(rendered, /^<p class="mobile-text dark-text-secondary"/);
		assert.match(rendered, /Markets rose &amp;  today/);
	});
});
