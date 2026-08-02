"use server";

import { after } from "next/server";
import { headers } from "next/headers";
import { auth } from "../better-auth/auth";
import { inngest } from "../inngest/client";

type AuthActionResult =
	| { success: true }
	| { success: false; error: string };

const getAuthErrorMessage = (error: unknown, fallback: string) => {
	if (!error || typeof error !== "object" || !("body" in error)) {
		return fallback;
	}

	const body = error.body;

	if (!body || typeof body !== "object") return fallback;

	if (
		"code" in body &&
		(body.code === "USER_ALREADY_EXISTS" ||
			body.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL")
	) {
		return "An account with this email already exists.";
	}

	return "message" in body && typeof body.message === "string"
		? body.message
		: fallback;
};

export const signUpWithEmail = async ({
	email,
	password,
	fullName,
	investmentGoals,
	riskTolerance,
	country,
	preferredIndustry,
}: SignUpFormData): Promise<AuthActionResult> => {
	try {
		const response = await auth.api.signUpEmail({
			body: {
				email,
				password,
				name: fullName,
			},
		});

		if (response) {
			after(async () => {
				try {
					await inngest.send({
						name: "app/user.created",
						data: {
							email,
							name: fullName,
							country,
							investmentGoals,
							preferredIndustry,
							riskTolerance,
						},
					});
				} catch (error) {
					console.error("Failed to queue sign-up email", error);
				}
			});
		}

		return { success: true };
	} catch (e) {
		console.error("Sign up failed", e);
		return {
			success: false,
			error: getAuthErrorMessage(e, "Failed to create an account."),
		};
	}
};

export const signOut = async () => {
	try {
		await auth.api.signOut({
			headers: await headers(),
		});
	} catch (e) {
		console.log("Sign out failed", e);
		return { success: false, error: "Sign out failed" };
	}
};
export const signInWithEmail = async ({
	email,
	password,
}: SignInFormData): Promise<AuthActionResult> => {
	try {
		await auth.api.signInEmail({
			body: {
				email,
				password,
			},
		});

		return { success: true };
	} catch (e) {
		console.error("Sign in failed", e);
		return {
			success: false,
			error: getAuthErrorMessage(e, "Invalid email or password."),
		};
	}
};
