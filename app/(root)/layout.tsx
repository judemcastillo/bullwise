import Header from "@/components/Header";
import { getRequestSession } from "@/lib/auth/require-user";
import { hasCompletedOnboarding } from "@/lib/data/user-profile";
import { redirect } from "next/navigation";
import React from "react";

export default async function Layout({
	children,
}: {
	children: React.ReactNode;
}) {
	const session = await getRequestSession();

	if (!session?.user) redirect("/sign-in");
	if (!session.user.emailVerified) {
		redirect("/verify-email");
	}
	if (!(await hasCompletedOnboarding(session.user.id))) redirect("/onboarding");

	const user = {
		id: session.user.id,
		name: session.user.name,
		email: session.user.email,
	};
	return (
		<main className="min-h-screen text-gray-400">
			<Header user={user} />
			<div className="container py-10">{children}</div>
		</main>
	);
}
