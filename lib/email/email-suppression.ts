import "server-only";

import { createHash } from "node:crypto";
import CommunicationPreference from "@/database/models/communication-preference.model";
import { connectToDatabase } from "@/database/mongoose";
import {
	COMMUNICATION_PREFERENCE_SCHEMA_VERSION,
	type EmailSuppressionReason,
} from "@/lib/email/communication-policy";
import {
	isPermanentRecipientSmtpFailure,
	normalizeRecipientEmail,
	type EmailSuppressionEvent,
} from "@/lib/email/suppression-policy";
import { ObjectId } from "mongodb";

type BetterAuthUser = {
	_id?: ObjectId;
	id?: string;
	email?: string | null;
};

export type EmailSuppressionRecordResult =
	| { status: "recorded"; userId: string }
	| { status: "unchanged"; userId: string }
	| { status: "recipient_not_found" };

const lowerPriorityReasons: Record<EmailSuppressionReason, EmailSuppressionReason[]> = {
	hard_bounce: [],
	complaint: ["hard_bounce"],
	account_deleted: ["hard_bounce", "complaint"],
};

async function findUserIdByEmail(email: string) {
	const mongoose = await connectToDatabase();
	const db = mongoose.connection.db;
	if (!db) throw new Error("Mongoose connection is not connected");

	const user = await db.collection<BetterAuthUser>("user").findOne(
		{ email: normalizeRecipientEmail(email) },
		{
			projection: { _id: 1, id: 1 },
			collation: { locale: "en", strength: 2 },
		},
	);
	if (!user) return null;
	return typeof user.id === "string" && user.id ? user.id : user._id?.toString() ?? null;
}

export async function recordEmailSuppressionByEmail(
	event: EmailSuppressionEvent,
): Promise<EmailSuppressionRecordResult> {
	const userId = await findUserIdByEmail(event.email);
	if (!userId) return { status: "recipient_not_found" };

	await CommunicationPreference.updateOne(
		{ userId },
		{
			$setOnInsert: {
				userId,
				schemaVersion: COMMUNICATION_PREFERENCE_SCHEMA_VERSION,
				subscriptions: [],
			},
		},
		{ upsert: true },
	);

	const replaceableReasons = lowerPriorityReasons[event.type];
	const result = await CommunicationPreference.updateOne(
		{
			userId,
			$or: [
				{ emailSuppression: { $exists: false } },
				...(replaceableReasons.length > 0
					? [{ "emailSuppression.reason": { $in: replaceableReasons } }]
					: []),
				{
					"emailSuppression.reason": event.type,
					"emailSuppression.recordedAt": { $lte: event.occurredAt },
				},
			],
		},
		{
			$set: {
				emailSuppression: {
					reason: event.type,
					source: event.source,
					recordedAt: event.occurredAt,
					provider: event.provider,
					providerEventId: event.eventId,
				},
			},
		},
	);

	return {
		status: result.modifiedCount === 1 ? "recorded" : "unchanged",
		userId,
	};
}

export async function capturePermanentSmtpFailure({
	error,
	recipientEmail,
	now = new Date(),
}: {
	error: unknown;
	recipientEmail: string;
	now?: Date;
}) {
	if (!isPermanentRecipientSmtpFailure(error, recipientEmail)) return null;

	const response =
		error &&
		typeof error === "object" &&
		"response" in error &&
		typeof error.response === "string"
			? error.response
			: "permanent-recipient-failure";
	const eventId = createHash("sha256")
		.update(
			`${normalizeRecipientEmail(recipientEmail)}\n${response}\n${now.toISOString().slice(0, 13)}`,
		)
		.digest("hex");

	return recordEmailSuppressionByEmail({
		eventId,
		type: "hard_bounce",
		source: "smtp_response",
		email: normalizeRecipientEmail(recipientEmail),
		provider: "gmail_smtp",
		occurredAt: now,
	});
}
