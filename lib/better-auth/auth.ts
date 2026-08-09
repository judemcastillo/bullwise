import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";
import { connectToDatabase } from "@/database/mongoose";
import { sendAccountVerificationEmail } from "@/lib/nodemailer";
import { createAuthOptions } from "@/lib/better-auth/options";
import {
	createRateLimitedVerificationEmailSender,
} from "@/lib/auth/verification-email-policy";
import { consumeVerificationEmailQuota } from "@/lib/auth/verification-email-rate-limit";
import type { Db } from "mongodb";

const sendVerificationEmail = createRateLimitedVerificationEmailSender({
	consumeQuota: (email) =>
		consumeVerificationEmailQuota({
			email,
			secret: process.env.BETTER_AUTH_SECRET!,
		}),
	deliver: ({ email, name, url }) =>
		sendAccountVerificationEmail({
			email,
			name,
			verificationUrl: url,
		}),
});

const createAuth = async () => {
	const mongoose = await connectToDatabase();
	const db = mongoose.connection.db;

	if (!db) {
		throw new Error("MongoDB connection not found");
	}

	const options = createAuthOptions({
		database: mongodbAdapter(db as unknown as Db),
		secret: process.env.BETTER_AUTH_SECRET!,
		baseURL: process.env.BETTER_AUTH_URL!,
		googleClientId: process.env.GOOGLE_CLIENT_ID!,
		googleClientSecret: process.env.GOOGLE_CLIENT_SECRET!,
		sendVerificationEmail: async ({ user, url }) => {
			await sendVerificationEmail({
				email: user.email,
				name: user.name,
				url,
			});
		},
	});

	return betterAuth({
		...options,
		plugins: [nextCookies()],
	});
};

let authPromise: ReturnType<typeof createAuth> | null = null;

export const getAuth = () => {
	if (!authPromise) {
		authPromise = createAuth().catch((error) => {
			authPromise = null;
			throw error;
		});
	}

	return authPromise;
};
