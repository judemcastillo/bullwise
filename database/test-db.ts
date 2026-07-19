import { loadEnvConfig } from "@next/env";
import mongoose from "mongoose";

loadEnvConfig(process.cwd());

const connectionUri = process.env.MONGODB_URI;

const formatError = (error: unknown) => {
	const message = error instanceof Error ? error.message : String(error);
	const safeMessage = connectionUri
		? message.split(connectionUri).join("<redacted MongoDB URI>")
		: message;

	return safeMessage.replace(
		/mongodb(?:\+srv)?:\/\/[^@\s]+@/gi,
		"mongodb://<credentials>@",
	);
};

const testDatabaseConnection = async () => {
	if (!connectionUri) {
		throw new Error("MONGODB_URI is not set in the environment.");
	}

	const startedAt = performance.now();

	try {
		await mongoose.connect(connectionUri, {
			bufferCommands: false,
			serverSelectionTimeoutMS: 10_000,
		});

		const database = mongoose.connection.db;

		if (!database) {
			throw new Error("MongoDB connected without an available database handle.");
		}

		const ping = await database.admin().ping();
		const durationMs = Math.round(performance.now() - startedAt);

		if (ping.ok !== 1) {
			throw new Error("MongoDB did not return a successful ping response.");
		}

		console.log(`MongoDB connection successful (${durationMs} ms).`);
	} finally {
		await mongoose.disconnect();
	}
};

testDatabaseConnection().catch((error) => {
	console.error(`MongoDB connection failed: ${formatError(error)}`);
	process.exitCode = 1;
});
