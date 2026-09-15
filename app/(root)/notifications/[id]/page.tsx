import { notFound } from "next/navigation";
import { requireCompletedUser } from "@/lib/auth/require-user";
import { notificationDetail } from "@/lib/notifications/store";
import NotificationDetail from "@/components/notifications/NotificationDetail";
export default async function NotificationPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const user = await requireCompletedUser();
	const { id } = await params;
	if (!/^[a-f\d]{24}$/i.test(id)) notFound();
	const item = await notificationDetail(user.id, id);
	if (!item) notFound();
	return (
		<div className="mx-auto w-full max-w-3xl py-6">
			<NotificationDetail item={item} />
		</div>
	);
}
