import "server-only";

import { randomUUID } from "node:crypto";
import { ObjectId } from "mongodb";
import AlertEvent from "@/database/models/alert-event.model";
import { connectToDatabase } from "@/database/mongoose";
import {
	ALERT_EMAIL_LEASE_MS,
	ALERT_EMAIL_MAX_ATTEMPTS,
	type AlertEmailDeliveryStore,
	type AlertEmailJob,
	type AlertEmailRecipientDirectory,
} from "@/lib/alerts/email-delivery";
import { getEmailEligibility } from "@/lib/email/communication-eligibility";

const MAX_ERROR_LENGTH = 500;

function retryAt(failedAt: Date, attempt: number) {
	const delayMinutes = Math.min(2 ** Math.max(0, attempt - 1), 60);
	return new Date(failedAt.getTime() + delayMinutes * 60_000);
}

function asJob(event: {
	_id: { toString(): string };
	userId: string;
	source: AlertEmailJob["source"];
	operator: AlertEmailJob["operator"];
	threshold: { toString(): string };
	observedValue: { toString(): string };
	triggeredAt: Date;
	instrumentSnapshot: AlertEmailJob["instrument"];
	delivery: { email: { attempts: number; leaseId?: string } };
}): AlertEmailJob {
	if (!event.delivery.email.leaseId) {
		throw new Error("Claimed alert email is missing its lease ID");
	}

	return {
		id: event._id.toString(),
		userId: event.userId,
		source: event.source,
		operator: event.operator,
		threshold: event.threshold.toString(),
		observedValue: event.observedValue.toString(),
		triggeredAt: event.triggeredAt,
		instrument: event.instrumentSnapshot,
		attempt: event.delivery.email.attempts,
		leaseId: event.delivery.email.leaseId,
	};
}

export class MongoAlertEmailDeliveryStore
	implements AlertEmailDeliveryStore
{
	constructor(
		private readonly eventScope?: { eventId: string; userId: string },
	) {}

	async claimNext(now: Date): Promise<AlertEmailJob | null> {
		await connectToDatabase();
		const leaseId = randomUUID();
		const scope = this.eventScope
			? {
					_id: new ObjectId(this.eventScope.eventId),
					userId: this.eventScope.userId,
				}
			: {};
		const event = await AlertEvent.findOneAndUpdate(
			{
				...scope,
				"delivery.email.attempts": { $lt: ALERT_EMAIL_MAX_ATTEMPTS },
				$or: [
					{ "delivery.email.status": "pending" },
					{
						"delivery.email.status": "failed",
						$or: [
							{ "delivery.email.nextAttemptAt": { $lte: now } },
							{ "delivery.email.nextAttemptAt": { $exists: false } },
						],
					},
					{
						"delivery.email.status": "processing",
						"delivery.email.leaseExpiresAt": { $lte: now },
					},
				],
			},
			{
				$set: {
					"delivery.email.status": "processing",
					"delivery.email.leaseId": leaseId,
					"delivery.email.leaseExpiresAt": new Date(
						now.getTime() + ALERT_EMAIL_LEASE_MS,
					),
					"delivery.email.lastAttemptAt": now,
				},
				$inc: { "delivery.email.attempts": 1 },
				$unset: {
					"delivery.email.nextAttemptAt": 1,
					"delivery.email.error": 1,
				},
			},
			{ returnDocument: "after", sort: { triggeredAt: 1, _id: 1 } },
		).lean();

		return event ? asJob(event as never) : null;
	}

	async markSent(job: AlertEmailJob, deliveredAt: Date): Promise<boolean> {
		const result = await AlertEvent.updateOne(
			{
				_id: new ObjectId(job.id),
				userId: job.userId,
				"delivery.email.status": "processing",
				"delivery.email.leaseId": job.leaseId,
			},
			{
				$set: {
					"delivery.email.status": "sent",
					"delivery.email.deliveredAt": deliveredAt,
				},
				$unset: {
					"delivery.email.leaseId": 1,
					"delivery.email.leaseExpiresAt": 1,
					"delivery.email.nextAttemptAt": 1,
					"delivery.email.error": 1,
				},
			},
		);

		return result.modifiedCount === 1;
	}

	async markFailed(
		job: AlertEmailJob,
		error: string,
		failedAt: Date,
	): Promise<boolean> {
		const result = await AlertEvent.updateOne(
			{
				_id: new ObjectId(job.id),
				userId: job.userId,
				"delivery.email.status": "processing",
				"delivery.email.leaseId": job.leaseId,
			},
			{
				$set: {
					"delivery.email.status": "failed",
					"delivery.email.error": error.slice(0, MAX_ERROR_LENGTH),
					"delivery.email.nextAttemptAt": retryAt(failedAt, job.attempt),
				},
				$unset: {
					"delivery.email.leaseId": 1,
					"delivery.email.leaseExpiresAt": 1,
				},
			},
		);

		return result.modifiedCount === 1;
	}

	async markSuppressed(
		job: AlertEmailJob,
		reason: string,
		suppressedAt: Date,
	): Promise<boolean> {
		const result = await AlertEvent.updateOne(
			{
				_id: new ObjectId(job.id),
				userId: job.userId,
				"delivery.email.status": "processing",
				"delivery.email.leaseId": job.leaseId,
			},
			{
				$set: {
					"delivery.email.status": "suppressed",
					"delivery.email.suppressedAt": suppressedAt,
					"delivery.email.error": `Suppressed: ${reason}`.slice(
						0,
						MAX_ERROR_LENGTH,
					),
				},
				$unset: {
					"delivery.email.leaseId": 1,
					"delivery.email.leaseExpiresAt": 1,
					"delivery.email.nextAttemptAt": 1,
				},
			},
		);

		return result.modifiedCount === 1;
	}
}

type BetterAuthUser = {
	_id: ObjectId;
	id?: string;
	email?: string | null;
	name?: string | null;
};

export class BetterAuthAlertEmailRecipientDirectory
	implements AlertEmailRecipientDirectory
{
	async findByUserId(userId: string) {
		const eligibility = await getEmailEligibility({
			userId,
			request: { messageType: "price_alert" },
		});
		if (!eligibility.eligible) {
			return { status: "suppressed" as const, reason: eligibility.reason };
		}

		const mongoose = await connectToDatabase();
		const db = mongoose.connection.db;
		if (!db) throw new Error("Mongoose connection is not connected");

		const identityFilters: Array<Record<string, unknown>> = [{ id: userId }];
		if (ObjectId.isValid(userId)) {
			identityFilters.push({ _id: new ObjectId(userId) });
		}

		const user = await db.collection<BetterAuthUser>("user").findOne(
			{ $or: identityFilters },
			{ projection: { email: 1, name: 1 } },
		);
		if (!user || typeof user.email !== "string" || !user.email.trim()) {
			return { status: "unavailable" as const };
		}

		return {
			status: "deliverable" as const,
			recipient: {
				email: user.email.trim(),
				name: typeof user.name === "string" ? user.name : undefined,
			},
		};
	}
}
