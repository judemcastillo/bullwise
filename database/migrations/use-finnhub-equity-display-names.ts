import { loadEnvConfig } from "@next/env";
import { listFinnhubUsEquitySymbols } from "@/lib/market-data/providers/finnhub-forex-client";
import type { ProviderBinding } from "@/types/instruments";
import type { Types } from "mongoose";

loadEnvConfig(process.cwd());

const applyChanges = process.argv.includes("--apply");
const BULK_WRITE_SIZE = 500;

type EquityInstrument = {
	_id: Types.ObjectId;
	displaySymbol: string;
	name: string;
	venueMic?: string;
	providerBindings: ProviderBinding[];
};

function listingKey(mic: string, symbol: string) {
	return `${mic.trim().toUpperCase()}:${symbol.trim().toUpperCase()}`;
}

async function run() {
	const finnhubApiKey = process.env.FINNHUB_API_KEY?.trim();
	if (!finnhubApiKey) throw new Error("FINNHUB_API_KEY is not configured");

	const finnhubSymbols = await listFinnhubUsEquitySymbols({
		apiKey: finnhubApiKey,
	});
	const finnhubNames = new Map<string, string>();
	for (const item of finnhubSymbols) {
		const mic = item.mic?.trim();
		const symbol = item.symbol.trim();
		const name = item.description.trim();
		if (mic && symbol && name) {
			finnhubNames.set(listingKey(mic, symbol), name);
		}
	}
	if (finnhubNames.size === 0) {
		throw new Error("Finnhub returned no named US equity listings");
	}

	const [{ connectToDatabase }, { default: Instrument }] = await Promise.all([
		import("@/database/mongoose"),
		import("@/database/models/instrument.model"),
	]);
	const mongoose = await connectToDatabase();

	try {
		const instruments = await Instrument.find({
			assetClass: "equity",
			status: "active",
		})
			.select({
				displaySymbol: 1,
				name: 1,
				venueMic: 1,
				providerBindings: 1,
			})
			.lean<EquityInstrument[]>();
		const missing: EquityInstrument[] = [];
		const updates: Array<{ _id: Types.ObjectId; name: string }> = [];

		for (const instrument of instruments) {
			const finnhubBinding = instrument.providerBindings.find(
				(binding) => binding.provider === "finnhub" && binding.enabled !== false,
			);
			const name =
				instrument.venueMic && finnhubBinding
					? finnhubNames.get(
							listingKey(instrument.venueMic, finnhubBinding.symbol),
						)
					: undefined;
			if (!name) {
				missing.push(instrument);
				continue;
			}
			if (name !== instrument.name) updates.push({ _id: instrument._id, name });
		}

		const summary = {
			mode: applyChanges ? "apply" : "dry-run",
			auditedEquities: instruments.length,
			finnhubNamedListings: finnhubNames.size,
			plannedNameUpdates: updates.length,
			unchangedNames: instruments.length - updates.length - missing.length,
			missingFinnhubNames: missing.length,
		};

		if (!applyChanges) {
			console.log(JSON.stringify(summary, null, 2));
			console.log(
				"Dry run only. Re-run with --apply after reviewing the name update count.",
			);
			return;
		}

		const now = new Date();
		let modifiedNames = 0;
		for (let offset = 0; offset < updates.length; offset += BULK_WRITE_SIZE) {
			const result = await Instrument.collection.bulkWrite(
				updates.slice(offset, offset + BULK_WRITE_SIZE).map((update) => ({
					updateOne: {
						filter: { _id: update._id, assetClass: "equity", status: "active" },
						update: { $set: { name: update.name, updatedAt: now } },
					},
				})),
				{ ordered: true },
			);
			modifiedNames += result.modifiedCount;
		}

		console.log(JSON.stringify({ ...summary, modifiedNames }, null, 2));
	} finally {
		await mongoose.disconnect();
	}
}

run().catch((error) => {
	console.error(
		"Finnhub equity display-name migration failed:",
		error instanceof Error ? error.message : String(error),
	);
	process.exitCode = 1;
});
