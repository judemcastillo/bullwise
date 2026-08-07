"use client";

import { Button } from "@/components/ui/button";
import { resendVerificationEmail as resendVerificationEmailAction } from "@/lib/actions/auth.actions";
import { MailCheck, MailWarning } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const maskEmail = (email: string) => {
	const [localPart, domain] = email.split("@");
	if (!localPart || !domain) return email;

	const visible = localPart.slice(0, Math.min(2, localPart.length));
	return `${visible}${"•".repeat(Math.max(3, localPart.length - visible.length))}@${domain}`;
};

const verificationErrorMessage = (error?: string) => {
	if (error === "TOKEN_EXPIRED") {
		return "That verification link has expired. Request a new one below.";
	}

	if (error) {
		return "That verification link is invalid or has already been used.";
	}

	return null;
};

export default function VerifyEmailCard({
	email,
	error,
	initialCooldownSeconds = 0,
}: {
	email?: string;
	error?: string;
	initialCooldownSeconds?: number;
}) {
	const [isSending, setIsSending] = useState(false);
	const [cooldownSeconds, setCooldownSeconds] = useState(
		initialCooldownSeconds,
	);
	const errorMessage = verificationErrorMessage(error);

	useEffect(() => {
		if (cooldownSeconds <= 0) return;

		const timer = window.setTimeout(() => {
			setCooldownSeconds((seconds) => Math.max(0, seconds - 1));
		}, 1000);

		return () => window.clearTimeout(timer);
	}, [cooldownSeconds]);

	const resendVerification = async () => {
		if (!email) return;

		setIsSending(true);
		try {
			const result = await resendVerificationEmailAction(email);

			setCooldownSeconds(result.retryAfterSeconds);
			toast.success("Verification request received", {
				description:
					"If this account still needs verification, a new link will arrive shortly.",
			});
		} catch (error) {
			toast.error("Unable to resend verification email", {
				description:
					error instanceof Error ? error.message : "Please try again.",
			});
		} finally {
			setIsSending(false);
		}
	};

	return (
		<div className="w-full max-w-md rounded-xl border border-gray-600 bg-gray-800 p-6 text-center shadow-2xl sm:p-8">
			<div
				className={`mx-auto mb-5 flex size-14 items-center justify-center rounded-full ${
					errorMessage
						? "bg-red-500/10 text-red-500"
						: "bg-yellow-400/10 text-yellow-400"
				}`}
			>
				{errorMessage ? (
					<MailWarning className="size-7" aria-hidden="true" />
				) : (
					<MailCheck className="size-7" aria-hidden="true" />
				)}
			</div>
			<h1 className="mb-3 text-2xl font-bold text-white">
				{errorMessage ? "Verification link unavailable" : "Check your email"}
			</h1>
			<p className="text-sm leading-6 text-gray-400">
				{errorMessage ? (
					errorMessage
				) : (
					<>
						We sent a verification link
						{email ? (
							<>
								{" "}to{" "}
								<span className="font-medium text-white">{maskEmail(email)}</span>
							</>
						) : null}
						. Open it to verify your account and continue. The link expires in
						one hour.
					</>
				)}
			</p>

			{email ? (
				<Button
					type="button"
					variant="outline"
					disabled={isSending || cooldownSeconds > 0}
					onClick={resendVerification}
					className="mt-6 h-11 w-full border-gray-600 bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white"
				>
					{isSending
						? "Sending..."
						: cooldownSeconds > 0
							? `Resend in ${cooldownSeconds}s`
							: "Resend verification email"}
				</Button>
			) : null}

			<p className="mt-6 text-sm text-gray-500">
				Wrong email?{" "}
				<Link href="/sign-up" className="footer-link">
					Create another account
				</Link>
			</p>
		</div>
	);
}
