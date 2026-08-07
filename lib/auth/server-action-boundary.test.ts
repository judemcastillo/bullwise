import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";

const source = (relativePath: string) =>
	readFileSync(new URL(relativePath, import.meta.url), "utf8");

describe("Server Action security boundary", () => {
	it("keeps arbitrary fetches and privileged reads out of public actions", () => {
		const finnhubActions = source("../actions/finnhub.actions.ts");
		const watchlistActions = source("../actions/watchlist.actions.ts");

		assert.doesNotMatch(finnhubActions, /export\s+(?:async\s+function|const)\s+(?:fetchJSON|getNews)\b/);
		assert.doesNotMatch(
			watchlistActions,
			/export\s+(?:async\s+function|const)\s+getWatchlistSymbols(?:ByUserId|ForUser)\b/,
		);
		assert.equal(
			existsSync(new URL("../actions/user.actions.ts", import.meta.url)),
			false,
		);
	});

	it("marks privileged data modules as server-only", () => {
		for (const relativePath of [
			"../market-data/finnhub.ts",
			"../data/watchlist.ts",
			"../data/news-email-users.ts",
		]) {
			assert.match(source(relativePath), /^import "server-only";/);
		}
	});

	it("requires completed product access below every protected action", () => {
		assert.match(
			source("../actions/finnhub.actions.ts"),
			/requireCompletedUser\(\)/,
		);
		assert.match(
			source("../data/watchlist.ts"),
			/requireCompletedUser\(\)/,
		);
		assert.match(
			source("../data/user-alerts.ts"),
			/requireCompletedUser\(\)/,
		);
	});

	it("removes the legacy preferences route", () => {
		assert.equal(
			existsSync(
				new URL("../../app/(root)/preferences/page.tsx", import.meta.url),
			),
			false,
		);
	});

	it("shows one account-creation disclosure without a checkbox", () => {
		const authActions = source("../actions/auth.actions.ts");
		const signUpPage = source("../../app/(auth)/sign-up/page.tsx");

		assert.match(authActions, /validateSignUpData\(input\)/);
		assert.match(signUpPage, /By creating an account, you agree to our/);
		assert.match(signUpPage, /href="\/terms#terms-of-use"/);
		assert.match(signUpPage, /href="\/terms#privacy-policy"/);
		assert.doesNotMatch(signUpPage, /type="checkbox"/);
		assert.doesNotMatch(signUpPage, /register\("consent"/);
	});

	it("keeps one combined legal document available before authentication", () => {
		const proxySource = source("../../proxy.ts");
		const termsPage = source("../../app/(legal)/terms/page.tsx");
		const privacyRedirect = source("../../app/(legal)/privacy/page.tsx");

		assert.match(proxySource, /terms\|privacy/);
		assert.match(termsPage, /id: "terms-of-use"/);
		assert.match(termsPage, /id: "privacy-policy"/);
		assert.match(
			privacyRedirect,
			/permanentRedirect\("\/terms#privacy-policy"\)/,
		);
	});
});
