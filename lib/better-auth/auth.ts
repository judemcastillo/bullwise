import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";
import { connectToDatabase } from "@/database/mongoose";
import type { Db } from "mongodb";

const createAuth = async () => {
	const mongoose = await connectToDatabase();
	const db = mongoose.connection.db;

	if (!db) {
		throw new Error("MongoDB connection not found");
	}

	return betterAuth({
		database: mongodbAdapter(db as unknown as Db),
		secret: process.env.BETTER_AUTH_SECRET,
		baseURL: process.env.BETTER_AUTH_URL,
		emailAndPassword: {
			enabled: true,
			disableSignUp: false,
			requireEmailVerification: false,
			minPasswordLength: 8,
			maxPasswordLength: 128,
			autoSignIn: true,
		},
		plugins: [nextCookies()],
	});
};

let authInstance: Awaited<ReturnType<typeof createAuth>> | null = null;

export const getAuth = async () => {
	if (authInstance) return authInstance;

	authInstance = await createAuth();
	return authInstance;
};

export const auth = await getAuth();
