import { Button } from "@/components/ui/button";
import { unsubscribeFromDailyNews } from "@/app/unsubscribe/actions";
import { verifyDailyNewsUnsubscribeToken } from "@/lib/email/unsubscribe-token";
import Image from "next/image";
import Link from "next/link";

export default async function UnsubscribePage({
	searchParams,
}: {
	searchParams: Promise<{ token?: string; status?: string }>;
}) {
	const { token, status } = await searchParams;
	const success = status === "success";
	const tokenIsValid = token
		? verifyDailyNewsUnsubscribeToken(token) !== null
		: false;
	const invalid = status === "invalid" || (!success && !tokenIsValid);

	return (
		<main className="flex min-h-screen items-center justify-center bg-black px-5 py-12 ">
			<section className="w-full max-w-lg rounded-xl border border-gray-700 bg-gray-900 p-8 text-center shadow-xl">
				<Link href="/" className="inline-flex">
					<Image
						src="/assets/icons/logo.svg"
						alt="Bull Wise"
						width={210}
						height={48}
						loading="eager"
						className="h-9 w-auto"
					/>
				</Link>

				<h1 className="mt-8 text-2xl font-bold text-white">
					{success
						? "You're unsubscribed"
						: invalid
							? "This link is not valid"
							: "Unsubscribe from market news emails?"}
				</h1>
				<p className="mt-3 text-sm leading-6 text-gray-400">
					{success
						? "Bull Wise will no longer send you market news summaries. Your account and price-alert emails are unchanged."
						: invalid
							? "The unsubscribe link is missing or has been changed. You can still update this preference in Notification settings."
							: "You will stop receiving personalized market news summaries. Account and price-alert emails will continue."}
				</p>

				{token && tokenIsValid && !success && !invalid ? (
					<form action={unsubscribeFromDailyNews} className="mt-7">
						<input type="hidden" name="token" value={token} />
						<Button type="submit" className="yellow-btn h-10 px-6">
							Confirm unsubscribe
						</Button>
					</form>
				) : null}

				<Link
					href={success || invalid ? "/settings/notifications" : "/"}
					className="mt-6 inline-block text-sm text-yellow-400 underline-offset-4 hover:underline"
				>
					{success || invalid ? "Manage notification settings" : "Keep my emails"}
				</Link>
			</section>
		</main>
	);
}
