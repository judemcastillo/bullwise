import "server-only";
import {
	AccessControlError,
	AuthenticationError,
} from "@/lib/auth/access-policy";
import { NotificationInputError } from "./policy";
export function notificationHttpError(error: unknown) {
	const status =
		error instanceof AuthenticationError
			? 401
			: error instanceof AccessControlError
				? 403
				: error instanceof NotificationInputError
					? 400
					: 500;
	if (status === 500)
		console.error(
			"Notification request failed",
			error instanceof Error ? error.name : "unknown",
		);
	return Response.json(
		{
			error:
				status === 500
					? "Unable to load notifications. Please try again."
					: (error as Error).message,
		},
		{ status, headers: { "Cache-Control": "private, no-store" } },
	);
}
