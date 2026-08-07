import "server-only";

import {
	assertCompletedUser,
	assertVerifiedUser,
	AuthenticationError,
} from "@/lib/auth/access-policy";
import { auth } from "@/lib/better-auth/auth";
import { hasCompletedOnboarding } from "@/lib/data/user-profile";
import { headers } from "next/headers";

export { AuthenticationError } from "@/lib/auth/access-policy";

export async function requireUser() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user) throw new AuthenticationError();

	return {
		id: session.user.id,
		name: session.user.name,
		email: session.user.email,
		emailVerified: session.user.emailVerified,
	};
}

export async function requireVerifiedUser() {
	return assertVerifiedUser(await requireUser());
}

export async function requireCompletedUser() {
	return assertCompletedUser(await requireUser(), hasCompletedOnboarding);
}
