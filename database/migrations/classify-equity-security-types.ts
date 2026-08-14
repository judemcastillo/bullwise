import { loadEnvConfig } from "@next/env";
import {
	normalizeFinnhubEquitySecurityType,
	normalizeMassiveEquitySecurityType,
	reconcileEquitySecurityType,
} from "@/lib/instruments/equity-security-type";
import {
	listFinnhubUsEquitySymbols,
} from "@/lib/market-data/providers/finnhub-forex-client";
import { listMassiveStockTickers } from "@/lib/market-data/providers/massive-client";
import type {
	EquitySecurityType,
	ProviderBinding,
} from "@/types/instruments";
import type { Types } from "mongoose";

loadEnvConfig(process.cwd());

const applyChanges = process.argv.includes("--apply");
const BULK_WRITE_SIZE = 500;

type EquityInstrument = {
	_id: Types.ObjectId;
	securityType?: EquitySecurityType;
	venueMic?: string;
	providerBindings: ProviderBinding[];
};

function listingKey(mic: string, symbol: string) {
	return `${mic.trim().toUpperCase()}:${symbol.trim().toUpperCase()}`;
}

function typeCounts(types: readonly EquitySecurityType[]) {
	return Object.fromEntries(
		[...new Set(types)]
			.sort()
			.map((type) => [type, types.filter((candidate) => candidate === type).length]),
	);
}

async function run() {
	const finnhubApiKey = process.env.FINNHUB_API_KEY?.trim();
	const massiveApiKey = process.env.MASSIVE_API_KEY?.trim();
	if (!finnhubApiKey) throw new Error("FINNHUB_API_KEY is not configured");
	if (!massiveApiKey) throw new Error("MASSIVE_API_KEY is not configured");

	const [finnhubSymbols, massiveSymbols] = await Promise.all([
		listFinnhubUsEquitySymbols({ apiKey: finnhubApiKey }),
		listMassiveStockTickers({ apiKey: massiveApiKey }),
	]);
	const finnhubTypes = new Map(
		finnhubSymbols.flatMap((item) =>
			item.mic?.trim() && item.symbol.trim()
				? [
						[
							listingKey(item.mic, item.symbol),
							normalizeFinnhubEquitySecurityType(item.type),
						] as const,
					]
				: [],
		),
	);
	const massiveTypes = new Map(
		massiveSymbols.flatMap((item) =>
			item.primary_exchange?.trim() && item.ticker.trim()
				? [
						[
							listingKey(item.primary_exchange, item.ticker),
							normalizeMassiveEquitySecurityType(item.type),
						] as const,
					]
				: [],
		),
	);

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
			.select({ securityType: 1, venueMic: 1, providerBindings: 1 })
			.lean<EquityInstrument[]>();
		const updates: Array<{
			_id: Types.ObjectId;
			securityType: EquitySecurityType;
		}> = [];
		const resolvedTypes: EquitySecurityType[] = [];
		let missingFinnhubTypes = 0;
		let missingMassiveTypes = 0;

		for (const instrument of instruments) {
			const finnhubBinding = instrument.providerBindings.find(
				(binding) => binding.provider === "finnhub" && binding.enabled !== false,
			);
			const massiveBinding = instrument.providerBindings.find(
				(binding) => binding.provider === "massive" && binding.enabled !== false,
			);
			const finnhubType =
				instrument.venueMic && finnhubBinding
					? finnhubTypes.get(
							listingKey(instrument.venueMic, finnhubBinding.symbol),
						)
					: undefined;
			const massiveType =
				instrument.venueMic && massiveBinding
					? massiveTypes.get(
							listingKey(instrument.venueMic, massiveBinding.symbol),
						)
					: undefined;
			if (!finnhubType) missingFinnhubTypes += 1;
			if (!massiveType) missingMassiveTypes += 1;
			const securityType = reconcileEquitySecurityType(
				finnhubType ?? "other",
				massiveType ?? "other",
			);
			resolvedTypes.push(securityType);
			if (securityType !== instrument.securityType) {
				updates.push({ _id: instrument._id, securityType });
			}
		}

		if (instruments.length > 0 && missingFinnhubTypes > 0) {
			throw new Error(
				`Finnhub did not classify ${missingFinnhubTypes} active equities; refusing to write a partial migration`,
			);
		}

		const summary = {
			mode: applyChanges ? "apply" : "dry-run",
			auditedEquities: instruments.length,
			finnhubListings: finnhubTypes.size,
			massiveListings: massiveTypes.size,
			plannedUpdates: updates.length,
			unchanged: instruments.length - updates.length,
			missingFinnhubTypes,
			missingMassiveTypes,
			classificationCounts: typeCounts(resolvedTypes),
		};

		if (!applyChanges) {
			console.log(JSON.stringify(summary, null, 2));
			console.log(
				"Dry run only. Re-run with --apply after reviewing the classifications.",
			);
			return;
		}

		const now = new Date();
		let modified = 0;
		for (let offset = 0; offset < updates.length; offset += BULK_WRITE_SIZE) {
			const result = await Instrument.collection.bulkWrite(
				updates.slice(offset, offset + BULK_WRITE_SIZE).map((update) => ({
					updateOne: {
						filter: { _id: update._id, assetClass: "equity", status: "active" },
						update: {
							$set: { securityType: update.securityType, updatedAt: now },
						},
					},
				})),
				{ ordered: true },
			);
			modified += result.modifiedCount;
		}

		console.log(JSON.stringify({ ...summary, modified }, null, 2));
	} finally {
		await mongoose.disconnect();
	}
}

run().catch((error) => {
	console.error(
		"Equity security-type migration failed:",
		error instanceof Error ? error.message : String(error),
	);
	process.exitCode = 1;
});
