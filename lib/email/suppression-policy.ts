import { createHmac, timingSafeEqual } from "node:crypto";
import type {
	EmailSuppressionReason,
	EmailSuppressionSource,
} from "@/lib/email/communication-policy";

export const EMAIL_EVENT_WEBHOOK_MAX_AGE_MS = 5 * 60_000;
export const EMAIL_EVENT_WEBHOOK_FUTURE_SKEW_MS = 60_000;
export const EMAIL_EVENT_WEBHOOK_MAX_BODY_BYTES = 64 * 1024;

const MAX_EMAIL_LENGTH = 320;
const MAX_EVENT_ID_LENGTH = 200;
const MAX_PROVIDER_LENGTH = 100;

export interface EmailSuppressionEvent {
	eventId: string;
	type: Extract<EmailSuppressionReason, "hard_bounce" | "complaint">;
	source: Extract<EmailSuppressionSource, "provider_webhook" | "smtp_response">;
	email: string;
	provider: string;
	occurredAt: Date;
}

export function isEmailEventWebhookSecretConfigured(
	secret: string | undefined,
): secret is string {
	return Boolean(
		secret &&
			Buffer.byteLength(secret, "utf8") >= 32 &&
			!/^replace-with/i.test(secret),
	);
}

export function normalizeRecipientEmail(value: string) {
	return value.trim().toLowerCase();
}

function isValidEmail(value: string) {
	return (
		value.length > 3 &&
		value.length <= MAX_EMAIL_LENGTH &&
		!/[\u0000-\u001f\u007f]/.test(value) &&
		/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
	);
}

export function parseEmailSuppressionEvent(
	input: unknown,
):
	| { success: true; data: EmailSuppressionEvent }
	| { success: false; error: string } {
	if (!input || typeof input !== "object" || Array.isArray(input)) {
		return { success: false, error: "Invalid email event payload." };
	}

	const record = input as Record<string, unknown>;
	const eventId = typeof record.eventId === "string" ? record.eventId.trim() : "";
	const provider =
		typeof record.provider === "string"
			? record.provider.trim().toLowerCase()
			: "";
	const email =
		typeof record.email === "string"
			? normalizeRecipientEmail(record.email)
			: "";
	const occurredAt =
		typeof record.occurredAt === "string"
			? new Date(record.occurredAt)
			: new Date(Number.NaN);

	if (
		!eventId ||
		eventId.length > MAX_EVENT_ID_LENGTH ||
		/[\u0000-\u001f\u007f]/.test(eventId)
	) {
		return { success: false, error: "Invalid email event identifier." };
	}
	if (
		!provider ||
		provider.length > MAX_PROVIDER_LENGTH ||
		!/^[a-z0-9._-]+$/.test(provider)
	) {
		return { success: false, error: "Invalid email event provider." };
	}
	if (record.type !== "hard_bounce" && record.type !== "complaint") {
		return { success: false, error: "Unsupported email event type." };
	}
	if (!isValidEmail(email)) {
		return { success: false, error: "Invalid email event recipient." };
	}
	if (!Number.isFinite(occurredAt.getTime())) {
		return { success: false, error: "Invalid email event timestamp." };
	}

	return {
		success: true,
		data: {
			eventId,
				type: record.type,
				source: "provider_webhook",
			email,
			provider,
			occurredAt,
		},
	};
}

export function createEmailEventWebhookSignature({
	body,
	timestamp,
	secret,
}: {
	body: string;
	timestamp: string;
	secret: string;
}) {
	return `v1=${createHmac("sha256", secret)
		.update(`${timestamp}.${body}`, "utf8")
		.digest("hex")}`;
}

export function verifyEmailEventWebhook({
	body,
	timestamp,
	signature,
	secret,
	now = new Date(),
}: {
	body: string;
	timestamp: string | null;
	signature: string | null;
	secret: string;
	now?: Date;
}) {
	if (!isEmailEventWebhookSecretConfigured(secret) || !timestamp || !signature) {
		return false;
	}
	if (!/^\d{10,13}$/.test(timestamp)) return false;

	const timestampValue = Number(timestamp);
	const timestampMs = timestamp.length === 10 ? timestampValue * 1000 : timestampValue;
	const age = now.getTime() - timestampMs;
	if (
		!Number.isFinite(age) ||
		age > EMAIL_EVENT_WEBHOOK_MAX_AGE_MS ||
		age < -EMAIL_EVENT_WEBHOOK_FUTURE_SKEW_MS
	) {
		return false;
	}

	const expected = createEmailEventWebhookSignature({ body, timestamp, secret });
	const expectedBuffer = Buffer.from(expected, "utf8");
	const actualBuffer = Buffer.from(signature, "utf8");
	return (
		expectedBuffer.length === actualBuffer.length &&
		timingSafeEqual(expectedBuffer, actualBuffer)
	);
}

type SmtpDeliveryError = {
	responseCode?: unknown;
	response?: unknown;
	rejected?: unknown;
};

export function isPermanentRecipientSmtpFailure(
	error: unknown,
	recipientEmail: string,
) {
	if (!error || typeof error !== "object") return false;
	const candidate = error as SmtpDeliveryError;
	const response =
		typeof candidate.response === "string" ? candidate.response : "";
	const responseCode =
		typeof candidate.responseCode === "number"
			? candidate.responseCode
			: Number(response.match(/^\s*(\d{3})/)?.[1]);

	if (responseCode < 500 || responseCode >= 600) return false;
	if (!/(?:^|\s)5\.1\.\d{1,3}(?=\s|$)/.test(response)) return false;

	if (Array.isArray(candidate.rejected) && candidate.rejected.length > 0) {
		const normalizedRecipient = normalizeRecipientEmail(recipientEmail);
		return candidate.rejected.some(
			(value) =>
				typeof value === "string" &&
				normalizeRecipientEmail(value) === normalizedRecipient,
		);
	}

	return true;
}
