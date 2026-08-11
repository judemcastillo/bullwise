import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	getEmailBranding,
	getMarketingEmailBranding,
} from "@/lib/email/email-branding";

const ENV_KEYS = [
	"NEXT_PUBLIC_BASE_URL",
	"BETTER_AUTH_URL",
	"EMAIL_MARKETING_POSTAL_ADDRESS",
] as const;

function withEmailEnvironment(
	values: Partial<Record<(typeof ENV_KEYS)[number], string>>,
	callback: () => void,
) {
	const original = Object.fromEntries(
		ENV_KEYS.map((key) => [key, process.env[key]]),
	) as Record<(typeof ENV_KEYS)[number], string | undefined>;

	try {
		for (const key of ENV_KEYS) {
			const value = values[key];
			if (value === undefined) delete process.env[key];
			else process.env[key] = value;
		}
		callback();
	} finally {
		for (const key of ENV_KEYS) {
			const value = original[key];
			if (value === undefined) delete process.env[key];
			else process.env[key] = value;
		}
	}
}

describe("email branding configuration", () => {
	it("derives asset URLs and the copyright year from application configuration", () => {
		withEmailEnvironment(
			{ NEXT_PUBLIC_BASE_URL: "https://bullwise.example/app" },
			() => {
				assert.deepEqual(
					getEmailBranding({ now: new Date("2026-08-11T00:00:00.000Z") }),
					{
						dashboardUrl: "https://bullwise.example/app/",
						logoUrl:
							"https://bullwise.example/app/assets/icons/logo-email.png",
						dashboardPreviewUrl:
							"https://bullwise.example/app/assets/images/dashboard-preview.png",
						currentYear: "2026",
					},
				);
			},
		);
	});

	it("requires a legitimate postal address for optional news email footers", () => {
		withEmailEnvironment(
			{
				BETTER_AUTH_URL: "https://bullwise.example",
				EMAIL_MARKETING_POSTAL_ADDRESS:
					"  123 Example Avenue,\n Example City, EX 12345  ",
			},
			() => {
				assert.equal(
					getMarketingEmailBranding().postalAddress,
					"123 Example Avenue, Example City, EX 12345",
				);
			},
		);
	});

	it("rejects missing and placeholder postal addresses", () => {
		withEmailEnvironment(
			{ NEXT_PUBLIC_BASE_URL: "https://bullwise.example" },
			() => {
				assert.throws(
					() => getMarketingEmailBranding(),
					/EMAIL_MARKETING_POSTAL_ADDRESS/,
				);
			},
		);

		withEmailEnvironment(
			{
				NEXT_PUBLIC_BASE_URL: "https://bullwise.example",
				EMAIL_MARKETING_POSTAL_ADDRESS:
					"replace-with-legitimate-business-postal-address",
			},
			() => {
				assert.throws(
					() => getMarketingEmailBranding(),
					/EMAIL_MARKETING_POSTAL_ADDRESS/,
				);
			},
		);
	});
});
