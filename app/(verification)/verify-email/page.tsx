import VerifyEmailCard from "@/components/forms/VerifyEmailCard";
import { VERIFICATION_EMAIL_COOLDOWN_SECONDS } from "@/lib/auth/verification-email-policy";
import { auth } from "@/lib/better-auth/auth";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function VerifyEmailPage({
	searchParams,
}: {
	searchParams: Promise<{
		email?: string | string[];
		complete?: string | string[];
		error?: string | string[];
		sent?: string | string[];
	}>;
}) {
	const session = await auth.api.getSession({ headers: await headers() });
	const params = await searchParams;
	const complete = Array.isArray(params.complete)
		? params.complete[0]
		: params.complete;

	if (session?.user.emailVerified) {
		redirect(complete === "1" ? "/onboarding" : "/");
	}

	const emailParam = params.email;
	const email =
		session?.user.email ??
		(Array.isArray(emailParam) ? emailParam[0] : emailParam);
	const errorParam = params.error;
	const error = Array.isArray(errorParam) ? errorParam[0] : errorParam;
	const sentParam = Array.isArray(params.sent) ? params.sent[0] : params.sent;

	return (
		<main className="flex min-h-screen flex-col items-center justify-center bg-gray-900 px-6 py-10">
		<Link href="/sign-in" className="mb-10">
			<Image
				src="/assets/icons/logo.svg"
				alt="Bull Wise Logo"
				width={260}
				height={60}
				className="h-8 w-auto"
			/>
		</Link>
		<VerifyEmailCard
			email={email}
			error={error}
			initialCooldownSeconds={
				sentParam === "1" ? VERIFICATION_EMAIL_COOLDOWN_SECONDS : 0
			}
		/>
		</main>
	);
}
