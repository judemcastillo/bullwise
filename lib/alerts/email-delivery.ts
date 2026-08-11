export const ALERT_EMAIL_MAX_ATTEMPTS = 5;
export const ALERT_EMAIL_LEASE_MS = 5 * 60_000;
export const ALERT_EMAIL_BATCH_SIZE = 50;

export interface AlertEmailJob {
	id: string;
	userId: string;
	source: "market" | "development_test";
	operator: "crosses_above" | "crosses_below";
	threshold: string;
	observedValue: string;
	triggeredAt: Date;
	instrument: {
		displaySymbol: string;
		name: string;
		quoteCurrency: string;
	};
	attempt: number;
	leaseId: string;
}

export interface AlertEmailRecipient {
	email: string;
	name?: string;
}

export type AlertEmailRecipientLookup =
	| { status: "deliverable"; recipient: AlertEmailRecipient }
	| { status: "suppressed"; reason: string }
	| { status: "unavailable" };

export interface AlertEmailDeliveryStore {
	claimNext(now: Date): Promise<AlertEmailJob | null>;
	markSent(job: AlertEmailJob, deliveredAt: Date): Promise<boolean>;
	markFailed(
		job: AlertEmailJob,
		error: string,
		failedAt: Date,
	): Promise<boolean>;
	markSuppressed(
		job: AlertEmailJob,
		reason: string,
		suppressedAt: Date,
	): Promise<boolean>;
}

export interface AlertEmailRecipientDirectory {
	findByUserId(userId: string): Promise<AlertEmailRecipientLookup>;
}

export interface AlertEmailSender {
	send(job: AlertEmailJob, recipient: AlertEmailRecipient): Promise<void>;
}

export interface AlertEmailDeliverySummary {
	claimed: number;
	sent: number;
	failed: number;
	suppressed: number;
	conflicts: number;
}

function getErrorMessage(error: unknown) {
	return error instanceof Error ? error.message : "Unknown email delivery error";
}

export async function deliverPendingAlertEmails(
	store: AlertEmailDeliveryStore,
	recipients: AlertEmailRecipientDirectory,
	sender: AlertEmailSender,
	options: { now?: () => Date; limit?: number } = {},
): Promise<AlertEmailDeliverySummary> {
	const now = options.now ?? (() => new Date());
	const limit = Math.max(
		1,
		Math.min(options.limit ?? ALERT_EMAIL_BATCH_SIZE, ALERT_EMAIL_BATCH_SIZE),
	);
	const summary: AlertEmailDeliverySummary = {
		claimed: 0,
		sent: 0,
		failed: 0,
		suppressed: 0,
		conflicts: 0,
	};

	for (let index = 0; index < limit; index += 1) {
		const job = await store.claimNext(now());
		if (!job) break;
		summary.claimed += 1;

		try {
			const lookup = await recipients.findByUserId(job.userId);
			if (lookup.status === "suppressed") {
				const recorded = await store.markSuppressed(
					job,
					lookup.reason,
					now(),
				);
				if (recorded) summary.suppressed += 1;
				else summary.conflicts += 1;
				continue;
			}
			if (lookup.status === "unavailable") {
				throw new Error("Alert owner has no deliverable email address");
			}

			await sender.send(job, lookup.recipient);
			const recorded = await store.markSent(job, now());
			if (recorded) summary.sent += 1;
			else summary.conflicts += 1;
		} catch (error) {
			const recorded = await store.markFailed(job, getErrorMessage(error), now());
			if (recorded) summary.failed += 1;
			else summary.conflicts += 1;
		}
	}

	return summary;
}
