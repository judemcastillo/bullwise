"use server";

import { requireCompletedUser } from "@/lib/auth/require-user";
import { searchCanonicalInstruments } from "@/lib/data/instrument-search";
import {
	ASSET_CLASSES,
	EQUITY_SECURITY_TYPES,
	type AssetClass,
	type EquitySecurityType,
	type InstrumentSearchResponse,
} from "@/types/instruments";

const MAX_SEARCH_QUERY_LENGTH = 60;

export async function searchInstruments(
	query?: string,
	assetClass?: AssetClass,
	securityType?: EquitySecurityType,
): Promise<InstrumentSearchResponse> {
	const user = await requireCompletedUser();
	const normalizedQuery = typeof query === "string" ? query.trim() : "";

	if (normalizedQuery.length > MAX_SEARCH_QUERY_LENGTH) {
		return { results: [], error: "Search terms can contain up to 60 characters." };
	}
	const normalizedAssetClass = ASSET_CLASSES.includes(assetClass as AssetClass)
		? assetClass
		: undefined;
	const normalizedSecurityType =
		normalizedAssetClass === "equity" &&
		EQUITY_SECURITY_TYPES.includes(securityType as EquitySecurityType)
			? securityType
			: undefined;

	return searchCanonicalInstruments({
		userId: user.id,
		query: normalizedQuery,
		assetClass: normalizedAssetClass,
		securityType: normalizedSecurityType,
	});
}
