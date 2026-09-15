import { requireCompletedUser } from "@/lib/auth/require-user";
import { NotificationList } from "@/components/notifications/NotificationList";
export default async function NotificationsPage() {
	await requireCompletedUser();
	return (
		<section className="mx-auto w-full max-w-3xl py-6">
			<h1 className="mb-6 text-2xl font-semibold text-gray-100">
				Notifications
			</h1>
			<div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-950">
				<NotificationList />
			</div>
		</section>
	);
}
