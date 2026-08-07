export type AuthenticatedUser = {
	id: string;
	name: string;
	email: string;
	emailVerified: boolean;
};

export class AccessControlError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "AccessControlError";
	}
}

export class AuthenticationError extends AccessControlError {
	constructor() {
		super("Authentication required");
		this.name = "AuthenticationError";
	}
}

export class EmailVerificationRequiredError extends AccessControlError {
	constructor() {
		super("Verify your email before continuing.");
		this.name = "EmailVerificationRequiredError";
	}
}

export class OnboardingRequiredError extends AccessControlError {
	constructor() {
		super("Complete onboarding before using this feature.");
		this.name = "OnboardingRequiredError";
	}
}

export function assertVerifiedUser<T extends AuthenticatedUser>(user: T): T {
	if (!user.emailVerified) throw new EmailVerificationRequiredError();
	return user;
}

export async function assertCompletedUser<T extends AuthenticatedUser>(
	user: T,
	hasCompletedOnboarding: (userId: string) => Promise<boolean>,
): Promise<T> {
	assertVerifiedUser(user);
	if (!(await hasCompletedOnboarding(user.id))) {
		throw new OnboardingRequiredError();
	}

	return user;
}
