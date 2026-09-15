"use server";
import { requireCompletedUser } from "@/lib/auth/require-user";
import { AccessControlError } from "@/lib/auth/access-policy";
import { NotificationInputError } from "@/lib/notifications/policy";
import {
	markAllNotificationsRead,
	markNotificationRead,
	saveInAppPreference,
} from "@/lib/notifications/store";

function failure(error: unknown) {
	if (
		error instanceof AccessControlError ||
		error instanceof NotificationInputError
	)
		return { success: false as const, error: error.message };
	console.error(
		"Notification update failed",
		error instanceof Error ? error.name : "unknown",
	);
	return {
		success: false as const,
		error: "Unable to save changes. Please try again.",
	};
}
export async function readNotification(id: string) {
	try {
		const user = await requireCompletedUser();
		const item = await markNotificationRead(user.id, id);
		if (!item)
			return { success: false as const, error: "Notification not found." };
		return { success: true as const, item };
	} catch (error) {
		return failure(error);
	}
}
export async function readAllNotifications() {
	const cutoff = new Date();
	try {
		const user = await requireCompletedUser();
		await markAllNotificationsRead(user.id, cutoff);
		return { success: true as const, cutoff: cutoff.toISOString() };
	} catch (error) {
		return failure(error);
	}
}
export async function updateInAppNewsPreference(input: unknown) {
	try {
		const user = await requireCompletedUser();
		const preference = await saveInAppPreference(user.id, input);
		return { success: true as const, preference };
	} catch (error) {
		return failure(error);
	}
}
