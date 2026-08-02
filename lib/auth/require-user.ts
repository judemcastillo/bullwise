import "server-only";

import { auth } from "@/lib/better-auth/auth";
import { headers } from "next/headers";

export class AuthenticationError extends Error {
	constructor() {
		super("Authentication required");
		this.name = "AuthenticationError";
	}
}

export async function requireUser() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user) throw new AuthenticationError();

	return {
		id: session.user.id,
		name: session.user.name,
		email: session.user.email,
	};
}
