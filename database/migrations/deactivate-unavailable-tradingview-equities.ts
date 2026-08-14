import { loadEnvConfig } from "@next/env";
import { listResolvableTradingViewEquities } from "@/lib/market-data/providers/tradingview-client";
import type { ProviderBinding } from "@/types/instruments";
import type { Types } from "mongoose";

loadEnvConfig(process.cwd());

const applyChanges = process.argv.includes("--apply");

type EquityInstrument = {
	_id: Types.ObjectId;
	canonicalKey: string;
	providerBindings: ProviderBinding[];
};

async function run() {
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
		const instruments = await Instrument.find({
			assetClass: "equity",
			status: "active",
		})
			.select({ canonicalKey: 1, providerBindings: 1 })
			.lean<EquityInstrument[]>();
		const mapped = instruments.map((instrument) => {
			const binding = instrument.providerBindings.find(
				(candidate) =>
					candidate.provider === "tradingview" &&
					candidate.enabled !== false &&
					candidate.capabilities.includes("chart"),
			);
			return { instrument, symbol: binding?.symbol };
		});
		const symbols = mapped.flatMap(({ symbol }) => (symbol ? [symbol] : []));
		const resolved = await listResolvableTradingViewEquities({ symbols });
		const unavailable = mapped.filter(
			({ symbol }) => !symbol || !resolved.has(symbol.trim().toUpperCase()),
		);
		const instrumentIds = unavailable.map(({ instrument }) => instrument._id);
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
			auditedEquities: instruments.length,
			resolvedTradingViewEquities: resolved.size,
			plannedDeactivations: unavailable.length,
			preservedReferences: {
				watchlist: watchlistReferences,
				alerts: alertReferences,
				alertEvents: alertEventReferences,
			},
		};

		if (!applyChanges) {
			console.log(JSON.stringify(summary, null, 2));
			console.log(
				"Dry run only. Re-run with --apply after reviewing the deactivation count.",
			);
			return;
		}

		if (instrumentIds.length > 0) {
			const result = await Instrument.updateMany(
				{ _id: { $in: instrumentIds }, status: "active" },
				{ $set: { status: "inactive", updatedAt: new Date() } },
			);
			if (result.modifiedCount !== instrumentIds.length) {
				throw new Error(
					`Expected to deactivate ${instrumentIds.length} equities but updated ${result.modifiedCount}`,
				);
			}
		}

		console.log(JSON.stringify(summary, null, 2));
	} finally {
		await mongoose.disconnect();
	}
}

run().catch((error) => {
	console.error(
		"TradingView equity cleanup failed:",
		error instanceof Error ? error.message : String(error),
	);
	process.exitCode = 1;
});
