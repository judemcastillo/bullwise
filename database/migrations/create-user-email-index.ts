import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const runMigration = async () => {
	const { connectToDatabase } = await import("@/database/mongoose");
	const mongoose = await connectToDatabase();

	try {
		const db = mongoose.connection.db;
		if (!db) throw new Error("Mongoose connection is not connected");

		const indexName = await db.collection("user").createIndex(
			{ email: 1 },
			{
				name: "user_email_case_insensitive",
				collation: { locale: "en", strength: 2 },
			},
		);
		console.log(`Ensured MongoDB index ${indexName}.`);
	} finally {
		await mongoose.disconnect();
	}
};

runMigration().catch((error) => {
	console.error(
		"User email index migration failed:",
		error instanceof Error ? error.message : String(error),
	);
	process.exitCode = 1;
});
