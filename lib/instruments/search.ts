import type {
	InstrumentSearchResult,
	InstrumentType,
	AssetClass,
	EquitySecurityType,
	ProviderBinding,
} from "@/types/instruments";

type StringableId = { toString(): string } | string;

export type SearchableInstrument = {
	_id: StringableId;
	canonicalKey: string;
	assetClass: AssetClass;
	instrumentType: InstrumentType;
	securityType?: EquitySecurityType;
	displaySymbol: string;
	name: string;
	venue?: string;
	providerBindings: ProviderBinding[];
};

export function instrumentSearchAliases(query: string) {
	const trimmed = query.trim();
	if (!trimmed) return [];

	const aliases = new Set([trimmed]);
	const compactPair = trimmed.toUpperCase().replace(/[^A-Z]/g, "");
	if (compactPair.length === 6 && /^[A-Z/._:\s-]+$/i.test(trimmed)) {
		const baseCurrency = compactPair.slice(0, 3);
		const quoteCurrency = compactPair.slice(3);
		aliases.add(`${baseCurrency}/${quoteCurrency}`);
		aliases.add(`${baseCurrency}:${quoteCurrency}`);
	}

	return [...aliases];
}

export function selectPrimaryProviderBinding(
	bindings: readonly ProviderBinding[],
) {
	return [...bindings]
		.filter((binding) => binding.enabled)
		.sort((first, second) => {
			const firstCatalog = first.capabilities.includes("catalog") ? 0 : 1;
			const secondCatalog = second.capabilities.includes("catalog") ? 0 : 1;
			return firstCatalog - secondCatalog || first.priority - second.priority;
		})[0];
}

export function toInstrumentSearchResult(
	instrument: SearchableInstrument,
	watchlistInstrumentIds: ReadonlySet<string>,
): InstrumentSearchResult {
	const instrumentId = instrument._id.toString();
	const binding = selectPrimaryProviderBinding(instrument.providerBindings);

	return {
		instrumentId,
		canonicalKey: instrument.canonicalKey,
		assetClass: instrument.assetClass,
		instrumentType: instrument.instrumentType,
		securityType: instrument.securityType,
		displaySymbol: instrument.displaySymbol,
		name: instrument.name,
		venue: instrument.venue,
		provider: binding?.provider,
		providerSymbol: binding?.symbol,
		isInWatchlist: watchlistInstrumentIds.has(instrumentId),
		href: `/instruments/${encodeURIComponent(instrument.canonicalKey)}`,
	};
}

export function mergeSearchableInstruments(
	groups: ReadonlyArray<readonly SearchableInstrument[]>,
	limit: number,
) {
	const results: SearchableInstrument[] = [];
	const seen = new Set<string>();

	for (const group of groups) {
		for (const instrument of group) {
			if (results.length >= limit) return results;
			const key = instrument.canonicalKey.toLowerCase();
			if (seen.has(key)) continue;
			seen.add(key);
			results.push(instrument);
		}
	}

	return results;
}
