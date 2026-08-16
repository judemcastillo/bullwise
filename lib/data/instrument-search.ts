import "server-only";

import Instrument from "@/database/models/instrument.model";
import { connectToDatabase } from "@/database/mongoose";
import { getWatchlistInstrumentIdsForUser } from "@/lib/data/watchlist";
import {
	instrumentSearchAliases,
	toInstrumentSearchResult,
	type SearchableInstrument,
} from "@/lib/instruments/search";
import {
	orderPopularInstruments,
	popularInstrumentCanonicalKeys,
} from "@/lib/instruments/popular";
import type {
	AssetClass,
	EquitySecurityType,
	InstrumentSearchResponse,
} from "@/types/instruments";

const SEARCH_RESULT_LIMIT = 12;

function escapeRegExp(value: string) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function searchStoredInstruments(
	query: string,
	assetClass?: AssetClass,
	securityType?: EquitySecurityType,
) {
	const filter: Record<string, unknown> = { status: "active" };
	if (assetClass) filter.assetClass = assetClass;
	if (assetClass === "equity" && securityType) {
		filter.securityType = securityType;
	}
	const projection = {
		canonicalKey: 1,
		assetClass: 1,
		instrumentType: 1,
		securityType: 1,
		displaySymbol: 1,
		name: 1,
		venue: 1,
		providerBindings: 1,
	};

	if (!query && !securityType) {
		const canonicalKeys = popularInstrumentCanonicalKeys(assetClass);
		if (canonicalKeys.length > 0) {
			const instruments = await Instrument.find({
				...filter,
				canonicalKey: { $in: canonicalKeys },
			})
				.select(projection)
				.lean<SearchableInstrument[]>();
			return orderPopularInstruments(instruments, canonicalKeys);
		}
	}
	if (!query) {
		return Instrument.find(filter)
			.select(projection)
			.sort({ displaySymbol: 1, name: 1 })
			.limit(SEARCH_RESULT_LIMIT)
			.lean<SearchableInstrument[]>();
	}

	const patterns = instrumentSearchAliases(query).map(
		(alias) => new RegExp(escapeRegExp(alias), "i"),
	);
	filter.$or = [
		...patterns.map((pattern) => ({ displaySymbol: pattern })),
		...patterns.map((pattern) => ({ name: pattern })),
		...patterns.map((pattern) => ({ canonicalKey: pattern })),
	];

	return Instrument.find(filter)
		.select(projection)
		.sort({ displaySymbol: 1, name: 1 })
		.limit(SEARCH_RESULT_LIMIT)
		.lean<SearchableInstrument[]>();
}

export async function searchCanonicalInstruments({
	userId,
	query,
	assetClass,
	securityType,
}: {
	userId: string;
	query: string;
	assetClass?: AssetClass;
	securityType?: EquitySecurityType;
}): Promise<InstrumentSearchResponse> {
	await connectToDatabase();

	const [stored, watchlistIds] = await Promise.all([
		searchStoredInstruments(query, assetClass, securityType),
		getWatchlistInstrumentIdsForUser(userId),
	]);
	const membership = new Set(watchlistIds);

	return {
		results: stored.map((instrument) =>
			toInstrumentSearchResult(instrument, membership),
		),
	};
}
