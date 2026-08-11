import { recordEmailSuppressionByEmail } from "@/lib/email/email-suppression";
import {
	EMAIL_EVENT_WEBHOOK_MAX_BODY_BYTES,
	isEmailEventWebhookSecretConfigured,
	parseEmailSuppressionEvent,
	verifyEmailEventWebhook,
} from "@/lib/email/suppression-policy";

export async function POST(request: Request) {
	const secret = process.env.EMAIL_EVENT_WEBHOOK_SECRET;
	if (!isEmailEventWebhookSecretConfigured(secret)) {
		return Response.json(
			{ error: "Email event ingestion is not configured." },
			{ status: 503 },
		);
	}

	const declaredLength = Number(request.headers.get("content-length"));
	if (
		Number.isFinite(declaredLength) &&
		declaredLength > EMAIL_EVENT_WEBHOOK_MAX_BODY_BYTES
	) {
		return Response.json({ error: "Payload too large." }, { status: 413 });
	}

	const reader = request.body?.getReader();
	if (!reader) {
		return Response.json({ error: "Missing request body." }, { status: 400 });
	}

	const decoder = new TextDecoder("utf-8");
	let body = "";
	let totalBytes = 0;

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			totalBytes += value.byteLength;
			if (totalBytes > EMAIL_EVENT_WEBHOOK_MAX_BODY_BYTES) {
				return Response.json({ error: "Payload too large." }, { status: 413 });
			}

			body += decoder.decode(value, { stream: true });
		}
		body += decoder.decode();
	} finally {
		reader.releaseLock();
	}

	const authenticated = verifyEmailEventWebhook({
		body,
		timestamp: request.headers.get("x-bullwise-email-timestamp"),
		signature: request.headers.get("x-bullwise-email-signature"),
		secret,
	});
	if (!authenticated) {
		return Response.json({ error: "Invalid webhook signature." }, { status: 401 });
	}

	let input: unknown;
	try {
		input = JSON.parse(body);
	} catch {
		return Response.json({ error: "Invalid JSON payload." }, { status: 400 });
	}

	const parsed = parseEmailSuppressionEvent(input);
	if (!parsed.success) {
		return Response.json({ error: parsed.error }, { status: 400 });
	}

	const result = await recordEmailSuppressionByEmail(parsed.data);
	return Response.json(
		{ accepted: true, matchedRecipient: result.status !== "recipient_not_found" },
		{ status: result.status === "recipient_not_found" ? 202 : 200 },
	);
}
