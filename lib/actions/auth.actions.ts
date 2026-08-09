"use server";

import { headers } from "next/headers";
import { getAuth } from "../better-auth/auth";
import { validateSignUpData } from "@/lib/auth/sign-up-policy";
import {
	normalizeVerificationEmail,
	VERIFICATION_EMAIL_COOLDOWN_SECONDS,
} from "@/lib/auth/verification-email-policy";

type AuthActionResult =
	| { success: true }
	| { success: false; error: string; code?: string };

const getAuthErrorCode = (error: unknown) => {
	if (!error || typeof error !== "object" || !("body" in error)) {
		return undefined;
	}

	const body = error.body;
	if (!body || typeof body !== "object" || !("code" in body)) {
		return undefined;
	}

	return typeof body.code === "string" ? body.code : undefined;
};

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

	if ("code" in body && body.code === "EMAIL_NOT_VERIFIED") {
		return "Please verify your email. We sent you a new verification link.";
	}

	return "message" in body && typeof body.message === "string"
		? body.message
		: fallback;
};

export const signUpWithEmail = async (
	input: unknown,
): Promise<AuthActionResult> => {
	const validation = validateSignUpData(input);
	if (!validation.success) return validation;

	const { email, password, fullName } = validation.data;

	try {
		const auth = await getAuth();
		await auth.api.signUpEmail({
			body: {
				email,
				password,
				name: fullName,
				callbackURL: `/verify-email?complete=1&email=${encodeURIComponent(email)}`,
			},
		});

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
		const auth = await getAuth();
		await auth.api.signOut({
			headers: await headers(),
		});
	} catch (e) {
		console.log("Sign out failed", e);
		return { success: false, error: "Sign out failed" };
	}
};

const isValidEmail = (email: string) =>
	email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const resendVerificationEmail = async (emailInput: unknown) => {
	const genericResult = {
		success: true as const,
		retryAfterSeconds: VERIFICATION_EMAIL_COOLDOWN_SECONDS,
	};

	if (typeof emailInput !== "string") return genericResult;

	const email = normalizeVerificationEmail(emailInput);
	if (!isValidEmail(email)) return genericResult;

	try {
		const auth = await getAuth();
		await auth.api.sendVerificationEmail({
			headers: await headers(),
			body: {
				email,
				callbackURL: `/verify-email?complete=1&email=${encodeURIComponent(email)}`,
			},
		});
	} catch (error) {
		// Keep the client response generic so it cannot reveal whether an
		// account exists, is already verified, or has reached its quota.
		console.error("Verification email resend failed", error);
	}

	return genericResult;
};

export const signInWithEmail = async ({
	email,
	password,
}: SignInFormData): Promise<AuthActionResult> => {
	try {
		const auth = await getAuth();
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
			code: getAuthErrorCode(e),
		};
	}
};
