import { requireCompletedUser } from "@/lib/auth/require-user";
import { listNotifications } from "@/lib/notifications/store";
import { notificationHttpError } from "@/lib/notifications/http";
export async function GET(request: Request) {
	try {
		const user = await requireCompletedUser();
		return Response.json(
			await listNotifications(
				user.id,
				new URL(request.url).searchParams.get("cursor"),
			),
			{ headers: { "Cache-Control": "private, no-store" } },
		);
	} catch (error) {
		return notificationHttpError(error);
	}
}
