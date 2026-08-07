export type ValidatedSignUpData = {
	fullName: string;
	email: string;
	password: string;
};

export type SignUpValidationResult =
	| { success: true; data: ValidatedSignUpData }
	| { success: false; error: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateSignUpData(input: unknown): SignUpValidationResult {
	if (!input || typeof input !== "object" || Array.isArray(input)) {
		return { success: false, error: "Invalid sign-up details." };
	}

	const candidate = input as Record<string, unknown>;
	const fullName =
		typeof candidate.fullName === "string" ? candidate.fullName.trim() : "";
	const email =
		typeof candidate.email === "string"
			? candidate.email.trim().toLowerCase()
			: "";
	const password =
		typeof candidate.password === "string" ? candidate.password : "";

	if (fullName.length < 2 || fullName.length > 100) {
		return {
			success: false,
			error: "Name must be between 2 and 100 characters.",
		};
	}

	if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
		return { success: false, error: "Enter a valid email address." };
	}

	if (password.length < 8 || password.length > 128) {
		return {
			success: false,
			error: "Password must be between 8 and 128 characters.",
		};
	}

	return {
		success: true,
		data: { fullName, email, password },
	};
}
