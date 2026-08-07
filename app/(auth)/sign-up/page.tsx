"use client";
import AuthDivider from "@/components/forms/AuthDivider";
import AuthFormError from "@/components/forms/AuthFormError";
import FooterLink from "@/components/forms/FooterLink";
import GoogleAuthButton from "@/components/forms/GoogleAuthButton";
import InputField from "@/components/forms/InputField";
import { Button } from "@/components/ui/button";
import { signUpWithEmail } from "@/lib/actions/auth.actions";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

export default function SignUpPage() {
	const router = useRouter();
	const [formError, setFormError] = useState<string | null>(null);
	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<SignUpFormData>({
		defaultValues: {
			fullName: "",
			email: "",
			password: "",
		},

		mode: "onBlur",
	});

	const onSubmit = async (data: SignUpFormData) => {
		setFormError(null);

		try {
			const result = await signUpWithEmail(data);

			if (!result.success) {
				setFormError(result.error);
				return;
			}

			router.push(
				`/verify-email?email=${encodeURIComponent(data.email)}&sent=1`,
			);
		} catch (e) {
			console.error(e);
			setFormError(
				e instanceof Error ? e.message : "Failed to create an account.",
			);
		}
	};
	return (
		<div className="mx-auto w-full max-w-md">
			<div className="mb-6">
				<h1 className="text-3xl font-bold text-gray-400">Create account</h1>
				<p className="mt-2 text-sm text-gray-500">
					Build a smarter watchlist with personalized market insights.
				</p>
			</div>

			<GoogleAuthButton />
			<AuthDivider label="or" />

			<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
				<InputField
					name="fullName"
					label="Full Name"
					placeholder="John Doe"
					register={register}
					error={errors.fullName}
					validation={{
						required: "Full name is required",
						minLength: {
							value: 2,
							message: "Full name must be at least 2 characters",
						},
					}}
				/>
				<InputField
					name="email"
					label="Email"
					placeholder="contact@jsmastery.com"
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
					placeholder="Enter a strong password"
					type="password"
					register={register}
					error={errors.password}
					validation={{
						required: "Password is required",
						minLength: {
							value: 8,
							message: "Password must be at least 8 characters",
						},
					}}
				/>
				<AuthFormError message={formError} />
				<Button
					type="submit"
					disabled={isSubmitting}
					aria-busy={isSubmitting}
					className="yellow-btn mt-2 w-full"
				>
					{isSubmitting ? "Creating account..." : "Create account"}
				</Button>
				<FooterLink
					text="Already have an account?"
					linkText="Sign in"
					href="/sign-in"
				/>
			</form>

			<p className="mt-10 text-center text-xs leading-5 text-gray-500">
				By creating an account, you agree to our{" "}
				<Link
					href="/terms#terms-of-use"
					target="_blank"
					rel="noreferrer"
					className="underline underline-offset-2 hover:text-yellow-400"
				>
					Terms of Use
				</Link>{" "}
				and{" "}
				<Link
					href="/privacy"
					target="_blank"
					rel="noreferrer"
					className="underline underline-offset-2 hover:text-yellow-400"
				>
					Privacy Policy
				</Link>
				.
			</p>
		</div>
	);
}
