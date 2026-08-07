import OnboardingForm from "@/components/forms/OnboardingForm";
import { auth } from "@/lib/better-auth/auth";
import { getOnboardingProfile } from "@/lib/data/user-profile";
import { headers } from "next/headers";
import Image from "next/image";
import { redirect } from "next/navigation";

export default async function OnboardingPage() {
	const session = await auth.api.getSession({ headers: await headers() });

	if (!session?.user) redirect("/sign-in");
	if (!session.user.emailVerified) {
		redirect(`/verify-email?email=${encodeURIComponent(session.user.email)}`);
	}
	const profile = await getOnboardingProfile(session.user.id);
	if (profile.completed) redirect("/");

	return (
		<main className="min-h-screen bg-gray-900 px-6 py-8 sm:py-12">
			<div className="mx-auto w-full max-w-2xl">
				<Image
					src="/assets/icons/logo.svg"
					alt="Bull Wise Logo"
					width={260}
					height={60}
					className="mx-auto mb-8 h-8 w-auto"
				/>
				<section className="rounded-xl border border-gray-600 bg-gray-800 p-6 shadow-2xl sm:p-8">
					<div className="mb-7 text-center">
						<p className="mb-2 text-sm font-semibold uppercase tracking-wider text-yellow-400">
							Account verified
						</p>
						<h1 className="mb-3 text-3xl font-bold text-white">
							Welcome, {session.user.name}
						</h1>
						<p className="mx-auto max-w-xl leading-7 text-gray-400">
							Tell us how you invest so Bull Wise can personalize your market
							news, insights, and watchlist experience.
						</p>
					</div>
					<OnboardingForm
						initialValues={profile.data}
						initialStep={profile.step}
					/>
				</section>
			</div>
		</main>
	);
}
