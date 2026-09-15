import InAppNotificationsForm from "@/components/settings/InAppNotificationsForm";
import { getInAppPreference } from "@/lib/notifications/store";
import NotificationsForm from "@/components/settings/NotificationsForm";
import { requireUser } from "@/lib/auth/require-user";
import { getMarketNewsPreference } from "@/lib/email/market-news-preference";

export default async function NotificationSettingsPage() {
	const user = await requireUser();
	const [marketNewsPreference, inAppPreference] = await Promise.all([
		getMarketNewsPreference(user.id),
		getInAppPreference(user.id),
	]);

	return (
		<div>
			<InAppNotificationsForm initialPreference={inAppPreference} />
			<NotificationsForm initialPreference={marketNewsPreference} />
		</div>
	);
}
