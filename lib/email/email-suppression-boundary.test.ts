import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const source = (relativePath: string) =>
	readFileSync(new URL(relativePath, import.meta.url), "utf8");

describe("email suppression delivery boundary", () => {
	it("checks suppression before verification and welcome delivery", () => {
		const nodemailerSource = source("../nodemailer/index.ts");

		assert.match(nodemailerSource, /getEmailEligibilityByEmail/);
		assert.match(nodemailerSource, /messageType: "email_verification"/);
		assert.match(nodemailerSource, /messageType: "account_welcome"/);
		assert.match(nodemailerSource, /messageType: "market_news"/);
		assert.match(nodemailerSource, /sendMailWithSuppressionCapture/);
	});

	it("terminates suppressed alert deliveries instead of retrying them", () => {
		const directorySource = source("../data/alert-email-delivery.ts");
		const deliverySource = source("../alerts/email-delivery.ts");

		assert.match(directorySource, /messageType: "price_alert"/);
		assert.match(directorySource, /status: "suppressed"/);
		assert.match(deliverySource, /store\.markSuppressed/);
		assert.match(deliverySource, /summary\.suppressed/);
	});

	it("authenticates provider events before parsing or writing them", () => {
		const routeSource = source("../../app/api/email/events/route.ts");
		const authenticationPosition = routeSource.indexOf(
			"verifyEmailEventWebhook",
			routeSource.indexOf("export async function POST"),
		);
		const parsingPosition = routeSource.indexOf("JSON.parse(body)");
		const persistencePosition = routeSource.indexOf(
			"recordEmailSuppressionByEmail(parsed.data)",
		);

		assert.ok(authenticationPosition >= 0);
		assert.ok(authenticationPosition < parsingPosition);
		assert.ok(parsingPosition < persistencePosition);
		assert.match(routeSource, /EMAIL_EVENT_WEBHOOK_MAX_BODY_BYTES/);
	});
});
