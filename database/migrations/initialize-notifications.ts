import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());
async function main() {
	const { connectToDatabase } = await import("@/database/mongoose");
	const { default: Notification } =
		await import("@/database/models/notification.model");
	const { default: Preference } =
		await import("@/database/models/in-app-preference.model");
	const mongoose = await connectToDatabase();
	try {
		const db = mongoose.connection.db!;
		await Notification.createIndexes();
		await Preference.createIndexes();
		await db
			.collection("alertevents")
			.createIndex({ "delivery.inApp.status": 1, createdAt: 1 });
		await db
			.collection("notification_runtime")
			.createIndex({ key: 1 }, { unique: true });
		await db
			.collection("notification_announcements")
			.createIndex({ key: 1 }, { unique: true });
		await db
			.collection("notification_announcement_recipients")
			.createIndex({ key: 1, userId: 1 }, { unique: true });
		await db
			.collection("notification_announcement_recipients")
			.createIndex({ key: 1, delivered: 1, userId: 1 });
		await db
			.collection("notification_runtime")
			.updateOne(
				{ key: "inbox" },
				{ $setOnInsert: { enabledAt: new Date() } },
				{ upsert: true },
			);
		console.log(
			"Notification indexes created and producers enabled. Existing rollout timestamp preserved.",
		);
	} finally {
		await mongoose.disconnect();
	}
}
main().catch((error) => {
	console.error(
		error instanceof Error
			? error.message
			: "Notification initialization failed",
	);
	process.exitCode = 1;
});
