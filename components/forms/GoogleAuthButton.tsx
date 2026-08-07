"use client";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/better-auth/auth-client";
import { useState } from "react";
import { toast } from "sonner";

export default function GoogleAuthButton() {
	const [isPending, setIsPending] = useState(false);

	const continueWithGoogle = async () => {
		setIsPending(true);

		try {
			const result = await authClient.signIn.social({
				provider: "google",
				callbackURL: "/",
				newUserCallbackURL: "/onboarding",
				errorCallbackURL: "/sign-in",
			});

			if (result.error) {
				toast.error("Unable to continue with Google", {
					description: result.error.message,
				});
				setIsPending(false);
			}
		} catch (error) {
			toast.error("Unable to continue with Google", {
				description:
					error instanceof Error ? error.message : "Please try again.",
			});
			setIsPending(false);
		}
	};

	return (
		<Button
			type="button"
			variant="outline"
			disabled={isPending}
			aria-busy={isPending}
			onClick={continueWithGoogle}
			className="h-12 w-full border-gray-600 bg-gray-800 text-base text-gray-400 hover:bg-gray-700 hover:text-white"
		>
			<svg aria-hidden="true" viewBox="0 0 24 24" className="size-5">
				<path
					fill="#4285F4"
					d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.7 4.7 0 0 1-2 3v2.6h3.3c1.9-1.8 2.9-4.4 2.9-7.5Z"
				/>
				<path
					fill="#34A853"
					d="M12 22c2.7 0 5-.9 6.7-2.3l-3.3-2.6c-.9.6-2.1 1-3.4 1-2.6 0-4.9-1.8-5.7-4.2H2.9v2.7A10 10 0 0 0 12 22Z"
				/>
				<path
					fill="#FBBC05"
					d="M6.3 13.9A6 6 0 0 1 6 12c0-.7.1-1.3.3-1.9V7.4H2.9A10 10 0 0 0 2 12c0 1.7.4 3.2 1 4.6l3.3-2.7Z"
				/>
				<path
					fill="#EA4335"
					d="M12 5.9c1.5 0 2.9.5 3.9 1.5l2.9-2.9A9.8 9.8 0 0 0 12 2a10 10 0 0 0-9.1 5.4l3.4 2.7c.8-2.4 3.1-4.2 5.7-4.2Z"
				/>
			</svg>
			{isPending ? "Redirecting..." : "Continue with Google"}
		</Button>
	);
}
