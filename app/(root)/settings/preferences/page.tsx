import PreferencesForm from "@/components/settings/PreferencesForm";
import { auth } from "@/lib/better-auth/auth";
import { getOnboardingProfile } from "@/lib/data/user-profile";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function PreferencesSettingsPage() {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session?.user) redirect("/sign-in");

	const profile = await getOnboardingProfile(session.user.id);

	return <PreferencesForm initialValues={profile.data} />;
}
