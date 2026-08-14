import { loadEnvConfig } from "@next/env";
import { buildFinnhubEquityInstrumentDefinition } from "@/lib/instruments/finnhub-equity";
import type { ObjectId } from "mongodb";

loadEnvConfig(process.cwd());

const applyChanges = process.argv.includes("--apply");
const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";
const LEGACY_WATCHLIST_FILTER = {
	instrumentId: { $exists: false },
	symbol: { $type: "string" },
} as const;

type LegacyWatchlistRow = {
	_id: ObjectId;
	userId: string;
	symbol: string;
};

type FinnhubProfile = {
	name?: string;
	ticker?: string;
	exchange?: string;
	currency?: string;
};

async function getFinnhubProfile(symbol: string): Promise<FinnhubProfile> {
	const token = process.env.FINNHUB_API_KEY?.trim();
	if (!token) throw new Error("FINNHUB_API_KEY is not configured");

	const params = new URLSearchParams({ symbol, token });
	const response = await fetch(
		`${FINNHUB_BASE_URL}/stock/profile2?${params.toString()}`,
		{ signal: AbortSignal.timeout(8000) },
	);
	if (!response.ok) {
		throw new Error(`Finnhub profile request failed with ${response.status}`);
	}
	return (await response.json()) as FinnhubProfile;
}

async function runMigration() {
	const [mongooseModule, instrumentModule, watchlistModule, profileModule] = await Promise.all([
		import("@/database/mongoose"),
		import("@/database/models/instrument.model"),
		import("@/database/models/watchlist.model"),
		import("@/database/models/user-profile.model"),
	]);
	const mongoose = await mongooseModule.connectToDatabase();
	const Instrument = instrumentModule.default;
	const Watchlist = watchlistModule.default;
	const UserProfile = profileModule.default;
	const collection = Watchlist.collection;
	const legacyCount = await collection.countDocuments(LEGACY_WATCHLIST_FILTER);
	const watchlistCounts = await collection
		.aggregate<{ _id: string; count: number }>([
			{ $group: { _id: "$userId", count: { $sum: 1 } } },
		])
		.toArray();
	const countsByUser = new Map(
		watchlistCounts.map(({ _id, count }) => [_id, count]),
	);
	const profiles = await UserProfile.find({})
		.select({ userId: 1, watchlistItemCount: 1 })
		.lean<Array<{ userId: string; watchlistItemCount?: number }>>();
	const counterMismatches = profiles.filter(
		(profile) =>
			profile.watchlistItemCount !== (countsByUser.get(profile.userId) ?? 0),
	);
	const summary = {
		mode: applyChanges ? "apply" : "dry-run",
		legacyRows: legacyCount,
		migratedRows: 0,
		profileCounterMismatches: counterMismatches.length,
		updatedProfileCounters: 0,
	};

	try {
		if (!applyChanges) {
			console.log(JSON.stringify(summary, null, 2));
			console.log(
				"Dry run only. Re-run with --apply to resolve legacy Finnhub symbols and update watchlist rows.",
			);
			return;
		}

		await collection.createIndex(
			{ userId: 1, instrumentId: 1 },
			{
				name: "userId_1_instrumentId_1",
				unique: true,
				partialFilterExpression: { instrumentId: { $type: "objectId" } },
			},
		);

		const cursor = collection.find<LegacyWatchlistRow>(LEGACY_WATCHLIST_FILTER);
		for await (const row of cursor) {
			const providerSymbol = row.symbol.trim().toUpperCase();
			const profile = await getFinnhubProfile(providerSymbol);
			const company = profile.name?.trim() || profile.ticker?.trim();
			if (!company) {
				throw new Error(`Finnhub profile is unavailable for ${providerSymbol}`);
			}

			const definition = buildFinnhubEquityInstrumentDefinition(
				{
					symbol: profile.ticker || providerSymbol,
					company,
					exchange: profile.exchange,
					currency: profile.currency,
				},
				providerSymbol,
			);
			const existing = await Instrument.findOne({
				$or: [
					{ canonicalKey: definition.canonicalKey },
					{
						providerBindings: {
							$elemMatch: { provider: "finnhub", symbol: providerSymbol },
						},
					},
				],
			}).select({ _id: 1 });
			if (existing) {
				await Instrument.collection.updateOne(
					{ _id: existing._id },
					{
						$set: {
							...definition,
							updatedAt: new Date(),
						},
					},
				);
			}
			const instrument =
				existing ??
				(await Instrument.findOneAndUpdate(
					{ canonicalKey: definition.canonicalKey },
					{ $setOnInsert: definition },
					{ upsert: true, returnDocument: "after", runValidators: true },
				));
			if (!instrument) {
				throw new Error(`Unable to resolve ${providerSymbol}`);
			}

			const result = await collection.updateOne(
				{ _id: row._id, instrumentId: { $exists: false } },
				{ $set: { instrumentId: instrument._id } },
			);
			summary.migratedRows += result.modifiedCount;
		}

		const remaining = await collection.countDocuments(LEGACY_WATCHLIST_FILTER);
		if (remaining > 0) {
			throw new Error(`${remaining} legacy watchlist rows remain`);
		}

		const indexes = await collection.indexes();
		if (indexes.some((index) => index.name === "userId_1_symbol_1")) {
			await collection.dropIndex("userId_1_symbol_1");
		}
		await collection.updateMany(
			{ instrumentId: { $type: "objectId" } },
			{ $unset: { symbol: "", company: "" } },
		);

		if (counterMismatches.length > 0) {
			const currentWatchlistCounts = await collection
				.aggregate<{ _id: string; count: number }>([
					{ $match: { instrumentId: { $type: "objectId" } } },
					{ $group: { _id: "$userId", count: { $sum: 1 } } },
				])
				.toArray();
			const currentCountsByUser = new Map(
				currentWatchlistCounts.map(({ _id, count }) => [_id, count]),
			);
			const result = await UserProfile.bulkWrite(
				counterMismatches.map((profile) => ({
					updateOne: {
						filter: { userId: profile.userId },
						update: {
							$set: {
								watchlistItemCount:
									currentCountsByUser.get(profile.userId) ?? 0,
							},
						},
					},
				})),
			);
			summary.updatedProfileCounters = result.modifiedCount;
		}

		console.log(JSON.stringify(summary, null, 2));
	} finally {
		await mongoose.disconnect();
	}
}

runMigration().catch((error) => {
	console.error(
		"Watchlist instrument migration failed:",
		error instanceof Error ? error.message : String(error),
	);
	process.exitCode = 1;
});
