"use client";

import AuthDivider from "@/components/forms/AuthDivider";
import AuthFormError from "@/components/forms/AuthFormError";
import FooterLink from "@/components/forms/FooterLink";
import GoogleAuthButton from "@/components/forms/GoogleAuthButton";
import InputField from "@/components/forms/InputField";
import { Button } from "@/components/ui/button";
import { signInWithEmail } from "@/lib/actions/auth.actions";
import { ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

export default function SignInPage({
	searchParams,
}: {
	searchParams: Promise<{ error?: string | string[] }>;
}) {
	const query = use(searchParams);
	const errorParam = Array.isArray(query.error) ? query.error[0] : query.error;
	const hasAccountLinkingConflict = errorParam === "account_not_linked";
	const router = useRouter();
	const [formError, setFormError] = useState<string | null>(null);
	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<SignInFormData>({
		defaultValues: {
			email: "",
			password: "",
		},
		mode: "onBlur",
	});

	const onSubmit = async (data: SignInFormData) => {
		setFormError(null);

		try {
			const result = await signInWithEmail(data);

			if (!result.success) {
				if (result.code === "EMAIL_NOT_VERIFIED") {
					toast.info("Check your email for a verification link");
					router.push(
						`/verify-email?email=${encodeURIComponent(data.email)}&sent=1`,
					);
					return;
				}

				setFormError(result.error);
				return;
			}

			router.push("/");
		} catch (e) {
			console.error(e);
			setFormError(e instanceof Error ? e.message : "Failed to sign in.");
		}
	};

	return (
		<div className="max-w-md flex flex-col gap-6 mx-auto">
			<h1 className="form-title">Welcome Back</h1>
			{hasAccountLinkingConflict ? (
				<div
					role="alert"
					className="mb-5 flex gap-3 rounded-lg border border-yellow-500/40 bg-yellow-400/10 p-4"
				>
					<ShieldAlert
						className="mt-0.5 size-5 shrink-0 text-yellow-400"
						aria-hidden="true"
					/>
					<div>
						<p className="font-medium text-white">Verify your account first</p>
						<p className="mt-1 text-sm leading-6 text-gray-400">
							This Google email already has an unverified password account. For
							your security, sign in with that password below. We’ll send a fresh
							verification link, and you can connect Google afterward.
						</p>
					</div>
				</div>
			) : errorParam ? (
				<div
					role="alert"
					className="mb-5 rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-gray-400"
				>
					Google sign-in couldn’t be completed. Please try again or use your
					email and password.
				</div>
			) : null}
			<GoogleAuthButton />
			<AuthDivider />
			<form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
				<InputField
					name="email"
					label="Email"
					placeholder="john@example.com"
					register={register}
					error={errors.email}
					validation={{
						required: "Email is required",
						pattern: {
							value: /^\S+@\S+\.\S+$/,
							message: "Enter a valid email address",
						},
					}}
				/>

				<InputField
					name="password"
					label="Password"
					placeholder="Enter your password"
					type="password"
					register={register}
					error={errors.password}
					validation={{ required: "Password is required" }}
				/>

				<AuthFormError message={formError} />

				<Button
					type="submit"
					disabled={isSubmitting}
					aria-busy={isSubmitting}
					className="yellow-btn w-full mt-5"
				>
					{isSubmitting ? "Signing In..." : "Sign In"}
				</Button>

				<FooterLink
					text="Don't have an account?"
					linkText="Sign up"
					href="/sign-up"
				/>
			</form>
		</div>
	);
}
