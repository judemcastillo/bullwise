// Internal persistence shared by server entry points and operator commands.
import { Types } from "mongoose";
import Notification, {
	type NotificationRecord,
} from "@/database/models/notification.model";
import Preference from "@/database/models/in-app-preference.model";
import { connectToDatabase } from "@/database/mongoose";
import {
	DEFAULT_IN_APP_NEWS,
	NotificationInputError,
	decodeCursor,
	encodeCursor,
	objectId,
	parsePreference,
} from "./policy";
import type { NotificationDto, NotificationPage } from "@/types/notifications";

export async function notificationDatabase() {
	const mongoose = await connectToDatabase();
	if (!mongoose.connection.db) throw new Error("Database unavailable");
	return mongoose.connection.db;
}
export async function notificationsEnabledAt() {
	const db = await notificationDatabase();
	const state = await db
		.collection<{ key: string; enabledAt: Date }>("notification_runtime")
		.findOne({ key: "inbox" });
	return state?.enabledAt ?? null;
}
export function serializeNotification(
	n: NotificationRecord & { _id: Types.ObjectId },
): NotificationDto {
	return {
		id: n._id.toString(),
		type: n.type,
		title: n.title,
		body: n.body,
		articles: n.articles,
		destination: n.destination,
		createdAt: n.createdAt.toISOString(),
		readAt: n.readAt?.toISOString() ?? null,
	};
}
export function pageFilter(userId: string, cursor?: string | null) {
	const after = decodeCursor(cursor);
	return {
		userId,
		...(after
			? {
					$or: [
						{ createdAt: { $lt: after.createdAt } },
						{
							createdAt: after.createdAt,
							_id: { $lt: new Types.ObjectId(after.id) },
						},
					],
				}
			: {}),
	};
}
export async function listNotifications(
	userId: string,
	cursor?: string | null,
): Promise<NotificationPage> {
	await connectToDatabase();
	const rows = await Notification.find(pageFilter(userId, cursor))
		.sort({ createdAt: -1, _id: -1 })
		.limit(21)
		.lean();
	const items = rows.slice(0, 20);
	return {
		items: items.map(serializeNotification),
		nextCursor: rows.length > 20 ? encodeCursor(items[19]) : null,
	};
}
export async function unreadCount(userId: string) {
	await connectToDatabase();
	return Notification.countDocuments({ userId, readAt: null });
}
export async function notificationDetail(userId: string, id: string) {
	await connectToDatabase();
	const item = await Notification.findOne({ userId, _id: objectId(id) }).lean();
	return item ? serializeNotification(item) : null;
}
export async function markNotificationRead(
	userId: string,
	id: string,
	now = new Date(),
) {
	await connectToDatabase();
	const filter = { userId, _id: objectId(id) };
	await Notification.updateOne(
		{ ...filter, readAt: null },
		{ $set: { readAt: now } },
	);
	const item = await Notification.findOne(filter).lean();
	return item ? serializeNotification(item) : null;
}
export function markAllFilter(userId: string, cutoff: Date) {
	return { userId, readAt: null, createdAt: { $lte: cutoff } };
}
export async function markAllNotificationsRead(userId: string, cutoff: Date) {
	await connectToDatabase();
	await Notification.updateMany(markAllFilter(userId, cutoff), {
		$set: { readAt: cutoff },
	});
}
export async function createNotification(
	input: Omit<NotificationRecord, "readAt" | "createdAt"> & {
		createdAt?: Date;
	},
) {
	await connectToDatabase();
	try {
		await Notification.updateOne(
			{ userId: input.userId, sourceKey: input.sourceKey },
			{
				$setOnInsert: {
					...input,
					createdAt: input.createdAt ?? new Date(),
					readAt: null,
				},
			},
			{ upsert: true },
		);
	} catch (error) {
		if (!(
			error &&
			typeof error === "object" &&
			"code" in error &&
			error.code === 11000
		))
			throw error;
	}
}
export async function getInAppPreference(userId: string) {
	await connectToDatabase();
	const value = await Preference.findOne({ userId }).lean();
	return value
		? { frequency: value.frequency, categories: [...value.categories] }
		: {
				...DEFAULT_IN_APP_NEWS,
				categories: [...DEFAULT_IN_APP_NEWS.categories],
			};
}
export async function saveInAppPreference(userId: string, input: unknown) {
	const value = parsePreference(input);
	if (!(await notificationsEnabledAt())) {
		throw new NotificationInputError(
			"In-app preferences are not available yet. Please try again later.",
		);
	}
	await Preference.updateOne(
		{ userId },
		{ $set: value },
		{ upsert: true, runValidators: true },
	);
	return value;
}
