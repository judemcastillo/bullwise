import { loadEnvConfig } from "@next/env";
import type { AnyBulkWriteOperation } from "mongoose";
import {
	createLegacyCommunicationPreferenceSeed,
	type LegacyCommunicationPreferenceSeed,
	type LegacyUserProfileEmailPreference,
} from "@/lib/email/communication-preference-migration";

loadEnvConfig(process.cwd());

const BATCH_SIZE = 250;
const applyChanges = process.argv.includes("--apply");

interface MigrationSummary {
	mode: "dry-run" | "apply";
	scanned: number;
	alreadyPresent: number;
	plannedInserts: number;
	inserted: number;
}

const runMigration = async () => {
	const [{ connectToDatabase }, { default: UserProfile }, { default: CommunicationPreference }] =
		await Promise.all([
			import("@/database/mongoose"),
			import("@/database/models/user-profile.model"),
			import("@/database/models/communication-preference.model"),
		]);
	const mongoose = await connectToDatabase();
	const migratedAt = new Date();
	const summary: MigrationSummary = {
		mode: applyChanges ? "apply" : "dry-run",
		scanned: 0,
		alreadyPresent: 0,
		plannedInserts: 0,
		inserted: 0,
	};

	const flush = async (profiles: LegacyUserProfileEmailPreference[]) => {
		if (profiles.length === 0) return;

		const existing = await CommunicationPreference.find({
			userId: { $in: profiles.map(({ userId }) => userId) },
		})
			.select({ userId: 1, _id: 0 })
			.lean<Array<{ userId: string }>>();
		const existingUserIds = new Set(existing.map(({ userId }) => userId));
		const seeds = profiles
			.filter(({ userId }) => !existingUserIds.has(userId))
			.map((profile) =>
				createLegacyCommunicationPreferenceSeed({ profile, migratedAt }),
			);

		summary.alreadyPresent += profiles.length - seeds.length;
		summary.plannedInserts += seeds.length;
		if (!applyChanges || seeds.length === 0) return;

		const operations: AnyBulkWriteOperation<LegacyCommunicationPreferenceSeed>[] =
			seeds.map((seed) => ({
				updateOne: {
					filter: { userId: seed.userId },
					update: { $setOnInsert: seed },
					upsert: true,
				},
			}));
		const result = await CommunicationPreference.bulkWrite(operations, {
			ordered: false,
		});
		summary.inserted += result.upsertedCount;
	};

	try {
		const cursor = UserProfile.find({})
			.select({
				userId: 1,
				dailyNewsEmailEnabled: 1,
				dailyNewsEmailUnsubscribedAt: 1,
				updatedAt: 1,
				_id: 0,
			})
			.lean<LegacyUserProfileEmailPreference>()
			.cursor();
		let batch: LegacyUserProfileEmailPreference[] = [];

		for await (const profile of cursor) {
			summary.scanned += 1;
			batch.push(profile);
			if (batch.length >= BATCH_SIZE) {
				await flush(batch);
				batch = [];
			}
		}
		await flush(batch);

		console.log(JSON.stringify(summary, null, 2));
		if (!applyChanges) {
			console.log(
				"Dry run only. Re-run with --apply after reviewing this summary.",
			);
		}
	} finally {
		await mongoose.disconnect();
	}
};

runMigration().catch((error) => {
	console.error(
		"Communication-preferences migration failed:",
		error instanceof Error ? error.message : String(error),
	);
	process.exitCode = 1;
});

