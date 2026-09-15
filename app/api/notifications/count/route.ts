import { requireCompletedUser } from "@/lib/auth/require-user";
import { unreadCount } from "@/lib/notifications/store";
import { notificationHttpError } from "@/lib/notifications/http";
export async function GET() {
	try {
		const user = await requireCompletedUser();
		return Response.json(
			{ count: await unreadCount(user.id) },
			{ headers: { "Cache-Control": "private, no-store" } },
		);
	} catch (error) {
		return notificationHttpError(error);
	}
}
