import { connectToDatabase } from "@/database/mongoose";
import {
	createNotification,
	notificationDatabase,
	notificationsEnabledAt,
} from "./store";
import { filledEligibleRecipientPage } from "./recipients";
import { parseAnnouncement } from "./policy";
import type { ClientSession } from "mongoose";

type AnnouncementInput = ReturnType<typeof parseAnnouncement>;
interface Publication extends AnnouncementInput {
	publishedAt: Date;
	audienceCount: number;
	complete: boolean;
}
interface Recipient {
	key: string;
	userId: string;
	delivered: boolean;
}
async function countRecipients(cutoff: Date) {
	let count = 0;
	let cursor = "";
	while (true) {
		const page = await filledEligibleRecipientPage(cutoff, cursor);
		count += page.recipients.length;
		if (page.nextCursor === null) return count;
		cursor = page.nextCursor;
	}
}
function assertSamePublication(
	existing: Publication,
	input: AnnouncementInput,
) {
	if (
		existing.title !== input.title ||
		existing.body !== input.body ||
		existing.destination !== input.destination
	)
		throw new Error(
			"This announcement key already has different content. Use a new key.",
		);
}
async function snapshotAudience(
	input: AnnouncementInput,
	session: ClientSession,
) {
	const db = await notificationDatabase();
	const publications = db.collection<Publication>("notification_announcements");
	const recipients = db.collection<Recipient>(
		"notification_announcement_recipients",
	);
	const existing = await publications.findOne({ key: input.key }, { session });
	if (existing) {
		assertSamePublication(existing, input);
		return existing;
	}
	const publishedAt = new Date();
	let audienceCount = 0;
	let cursor = "";
	// Snapshot read concern freezes verification and onboarding eligibility for the publication.
	while (true) {
		const page = await filledEligibleRecipientPage(publishedAt, cursor, session);
		if (page.recipients.length)
			await recipients.insertMany(
				page.recipients.map(({ userId }) => ({
					key: input.key,
					userId,
					delivered: false,
				})),
				{ session },
			);
		audienceCount += page.recipients.length;
		if (page.nextCursor === null) break;
		cursor = page.nextCursor;
	}
	const publication = { ...input, publishedAt, audienceCount, complete: false };
	await publications.insertOne(publication, { session });
	return publication;
}
export async function publishAnnouncement(value: unknown, publish = false) {
	const input = parseAnnouncement(value);
	const db = await notificationDatabase();
	const existing = await db
		.collection<Publication>("notification_announcements")
		.findOne({ key: input.key });
	if (existing) assertSamePublication(existing, input);
	if (!publish)
		return {
			mode: "preview",
			recipients:
				existing?.audienceCount ?? (await countRecipients(new Date())),
			title: input.title,
			body: input.body,
			destination: input.destination,
		};
	if (!(await notificationsEnabledAt()))
		throw new Error("Initialize notifications before publishing.");
	const mongoose = await connectToDatabase();
	const session = await mongoose.startSession();
	try {
		await session.withTransaction(() => snapshotAudience(input, session), {
			readConcern: { level: "snapshot" },
			writeConcern: { w: "majority" },
		});
	} finally {
		await session.endSession();
	}
	const recipients = db.collection<Recipient>(
		"notification_announcement_recipients",
	);
	let delivered = 0;
	while (true) {
		const page = await recipients
			.find({ key: input.key, delivered: false })
			.sort({ userId: 1 })
			.limit(100)
			.toArray();
		if (!page.length) break;
		for (const recipient of page) {
			await createNotification({
				userId: recipient.userId,
				sourceKey: `announcement:${input.key}`,
				type: "announcement",
				title: input.title,
				body: input.body,
				articles: [],
				destination: input.destination,
			});
			await recipients.updateOne(
				{ _id: recipient._id },
				{ $set: { delivered: true } },
			);
			delivered++;
		}
	}
	await db
		.collection<Publication>("notification_announcements")
		.updateOne({ key: input.key }, { $set: { complete: true } });
	return { mode: "published", delivered };
}
