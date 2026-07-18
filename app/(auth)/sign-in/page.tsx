"use client";

import FooterLink from "@/components/forms/FooterLink";
import InputField from "@/components/forms/InputField";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";

export default function SignInPage() {
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
		try {
			console.log(data);
		} catch (error) {
			console.error(error);
		}
	};

	return (
		<div>
			<h1 className="form-title">Welcome Back</h1>
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

				<Button
					type="submit"
					disabled={isSubmitting}
					className="yellow-btn w-full mt-5"
				>
					{isSubmitting ? "Signing In" : "Sign In"}
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
