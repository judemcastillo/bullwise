import PreferencesForm from "@/components/settings/PreferencesForm";
import { requireUser } from "@/lib/auth/require-user";
import { getOnboardingProfile } from "@/lib/data/user-profile";

export default async function PreferencesSettingsPage() {
	const user = await requireUser();
	const profile = await getOnboardingProfile(user.id);

	return <PreferencesForm initialValues={profile.data} />;
}
