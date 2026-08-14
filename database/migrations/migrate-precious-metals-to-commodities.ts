import { loadEnvConfig } from "@next/env";
import {
	commoditySpotPricePrecision,
	PRECIOUS_METAL_CODES,
	type PreciousMetalCode,
} from "@/lib/instruments/commodity-catalog";
import { buildCanonicalKey } from "@/lib/instruments/canonical-key";
import type { ProviderBinding } from "@/types/instruments";
import type { Types } from "mongoose";

loadEnvConfig(process.cwd());

const applyChanges = process.argv.includes("--apply");

type LegacyMetalInstrument = {
	_id: Types.ObjectId;
	canonicalKey: string;
	status: "active" | "inactive" | "expired";
	displaySymbol: string;
	name: string;
	baseCurrency: PreciousMetalCode;
	quoteCurrency: string;
	providerBindings: ProviderBinding[];
};

function targetDefinition(instrument: LegacyMetalInstrument) {
	const baseCurrency = instrument.baseCurrency.trim().toUpperCase() as PreciousMetalCode;
	const quoteCurrency = instrument.quoteCurrency.trim().toUpperCase();
	if (!PRECIOUS_METAL_CODES.includes(baseCurrency)) {
		throw new Error(`${instrument.canonicalKey} is not a supported precious metal`);
	}

	return {
		canonicalKey: buildCanonicalKey({
			assetClass: "commodity" as const,
			instrumentType: "spot" as const,
			venue: "oanda",
			baseCurrency,
			quoteCurrency,
		}),
		assetClass: "commodity" as const,
		instrumentType: "spot" as const,
		status: instrument.status,
		displaySymbol: `${baseCurrency}/${quoteCurrency}`,
		name: instrument.name,
		venue: "OANDA Spot",
		baseCurrency,
		quoteCurrency,
		pricePrecision: commoditySpotPricePrecision(baseCurrency),
		quantityPrecision: 3,
		timezone: "Etc/UTC",
		calendarId: "commodity-spot-24x5",
		providerBindings: instrument.providerBindings,
	};
}

async function runMigration() {
	const [mongooseModule, instrumentModule, watchlistModule, alertModule, eventModule] =
		await Promise.all([
			import("@/database/mongoose"),
			import("@/database/models/instrument.model"),
			import("@/database/models/watchlist.model"),
			import("@/database/models/alert.model"),
			import("@/database/models/alert-event.model"),
		]);
	const mongoose = await mongooseModule.connectToDatabase();
	const Instrument = instrumentModule.default;
	const Watchlist = watchlistModule.default;
	const Alert = alertModule.default;
	const AlertEvent = eventModule.default;

	try {
		const legacy = await Instrument.find({
			assetClass: "forex",
			instrumentType: "spot_pair",
			baseCurrency: { $in: PRECIOUS_METAL_CODES },
		})
			.select({
				canonicalKey: 1,
				status: 1,
				displaySymbol: 1,
				name: 1,
				baseCurrency: 1,
				quoteCurrency: 1,
				providerBindings: 1,
			})
			.sort({ canonicalKey: 1 })
			.lean<LegacyMetalInstrument[]>();
		const plans = legacy.map((instrument) => ({
			instrument,
			definition: targetDefinition(instrument),
		}));
		const targetKeys = plans.map(({ definition }) => definition.canonicalKey);
		const collisions = await Instrument.find({
			canonicalKey: { $in: targetKeys },
			_id: { $nin: legacy.map(({ _id }) => _id) },
		})
			.select({ canonicalKey: 1 })
			.lean<Array<{ canonicalKey: string }>>();
		if (collisions.length > 0) {
			throw new Error(
				`Commodity canonical key already exists: ${collisions
					.map(({ canonicalKey }) => canonicalKey)
					.join(", ")}`,
			);
		}

		for (const { definition } of plans) {
			await new Instrument(definition).validate();
		}

		const instrumentIds = legacy.map(({ _id }) => _id);
		const [watchlistReferences, alertReferences, alertEventReferences] =
			instrumentIds.length === 0
				? [0, 0, 0]
				: await Promise.all([
						Watchlist.countDocuments({ instrumentId: { $in: instrumentIds } }),
						Alert.countDocuments({ instrumentId: { $in: instrumentIds } }),
						AlertEvent.countDocuments({ instrumentId: { $in: instrumentIds } }),
					]);
		const summary = {
			mode: applyChanges ? "apply" : "dry-run",
			legacyForexMetals: legacy.length,
			plannedCommoditySpots: plans.length,
			canonicalKeyCollisions: collisions.length,
			preservedReferences: {
				watchlist: watchlistReferences,
				alerts: alertReferences,
				alertEvents: alertEventReferences,
			},
			mappings: plans.map(({ instrument, definition }) => ({
				instrumentId: instrument._id.toString(),
				from: instrument.canonicalKey,
				to: definition.canonicalKey,
			})),
		};

		if (!applyChanges) {
			console.log(JSON.stringify(summary, null, 2));
			console.log(
				"Dry run only. Re-run with --apply after reviewing the ID-preserving mappings.",
			);
			return;
		}

		const now = new Date();
		await mongoose.connection.transaction(async (session) => {
			for (const { instrument, definition } of plans) {
				const result = await Instrument.collection.updateOne(
					{
						_id: instrument._id,
						canonicalKey: instrument.canonicalKey,
						assetClass: "forex",
					},
					{ $set: { ...definition, updatedAt: now } },
					{ session },
				);
				if (result.modifiedCount !== 1) {
					throw new Error(`Unable to migrate ${instrument.canonicalKey}`);
				}
			}
		});

		console.log(JSON.stringify(summary, null, 2));
	} finally {
		await mongoose.disconnect();
	}
}

runMigration().catch((error) => {
	console.error(
		"Precious-metal migration failed:",
		error instanceof Error ? error.message : String(error),
	);
	process.exitCode = 1;
});
