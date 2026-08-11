import NotificationsForm from "@/components/settings/NotificationsForm";
import { requireUser } from "@/lib/auth/require-user";
import { getMarketNewsPreference } from "@/lib/email/market-news-preference";

export default async function NotificationSettingsPage() {
	const user = await requireUser();
	const marketNewsPreference = await getMarketNewsPreference(user.id);

	return (
		<NotificationsForm initialPreference={marketNewsPreference} />
	);
}
