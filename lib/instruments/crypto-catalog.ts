import { buildCanonicalKey } from "@/lib/instruments/canonical-key";
import { usesUsd } from "@/lib/instruments/pair-policy";
import { isTradingViewCoinbaseSpotSymbolAvailable } from "@/lib/instruments/tradingview-availability";
import type { FinnhubCryptoSymbol } from "@/lib/market-data/providers/finnhub-forex-client";
import type { MassiveReferenceTicker } from "@/lib/market-data/providers/massive-client";
import type { InstrumentDefinition, ProviderBinding } from "@/types/instruments";

const CRYPTO_CURRENCY_PATTERN = /^[A-Z0-9][A-Z0-9._-]{0,19}$/;
const MASSIVE_CRYPTO_TICKER_PATTERN = /^X:[A-Z0-9._-]+$/;

export type CryptoCatalogEntry = {
	baseCurrency: string;
	quoteCurrency: string;
	name: string;
	providerBinding: ProviderBinding;
};

function currency(value: string | undefined, label: string) {
	const normalized = value?.trim().toUpperCase() ?? "";
	if (!CRYPTO_CURRENCY_PATTERN.test(normalized)) {
		throw new Error(`${label} is not a valid crypto currency symbol`);
	}
	return normalized;
}

export function normalizeFinnhubCoinbaseCatalogEntry(
	entry: FinnhubCryptoSymbol,
): CryptoCatalogEntry {
	const providerSymbol = entry.symbol.trim().toUpperCase();
	if (!providerSymbol.startsWith("COINBASE:")) {
		throw new Error("Finnhub returned a non-Coinbase crypto symbol");
	}
	const displayPair = entry.displaySymbol.trim().toUpperCase().replace("/", "-");
	const parts = displayPair.split("-");
	if (parts.length !== 2) {
		throw new Error("Finnhub returned an invalid Coinbase spot pair");
	}
	const baseCurrency = currency(parts[0], "Base currency");
	const quoteCurrency = currency(parts[1], "Quote currency");
	if (providerSymbol !== `COINBASE:${baseCurrency}-${quoteCurrency}`) {
		throw new Error("Finnhub Coinbase symbol does not match its display pair");
	}

	return {
		baseCurrency,
		quoteCurrency,
		name: entry.description.trim() || `${baseCurrency}/${quoteCurrency}`,
		providerBinding: {
			provider: "finnhub",
			symbol: providerSymbol,
			capabilities: ["catalog"],
			enabled: true,
			priority: 100,
			venue: "coinbase",
			orientation: "direct",
		},
	};
}

export function normalizeMassiveCryptoCatalogEntry(
	entry: MassiveReferenceTicker,
): CryptoCatalogEntry {
	const providerSymbol = entry.ticker.trim().toUpperCase();
	if (!MASSIVE_CRYPTO_TICKER_PATTERN.test(providerSymbol)) {
		throw new Error("Massive returned an invalid crypto ticker");
	}
	const baseCurrency = currency(entry.base_currency_symbol, "Base currency");
	const quoteCurrency = currency(entry.currency_symbol, "Quote currency");
	if (providerSymbol !== `X:${baseCurrency}${quoteCurrency}`) {
		throw new Error("Massive crypto ticker does not match its currency pair");
	}
	const baseName = entry.base_currency_name?.trim() || baseCurrency;
	const quoteName = entry.currency_name?.trim() || quoteCurrency;

	return {
		baseCurrency,
		quoteCurrency,
		name: `${baseName} / ${quoteName}`,
		providerBinding: {
			provider: "massive",
			symbol: providerSymbol,
			capabilities: ["catalog", "bars", "indicators"],
			enabled: entry.active !== false,
			priority: 100,
			venue: "global",
			orientation: "direct",
		},
	};
}

function pairKey(entry: Pick<CryptoCatalogEntry, "baseCurrency" | "quoteCurrency">) {
	return `${entry.baseCurrency}:${entry.quoteCurrency}`;
}

export function reconcileCoinbaseCryptoCatalogs(
	finnhubEntries: readonly CryptoCatalogEntry[],
	massiveEntries: readonly CryptoCatalogEntry[],
): InstrumentDefinition[] {
	const finnhubByPair = new Map(
		finnhubEntries.map((entry) => [pairKey(entry), entry]),
	);
	const massiveByPair = new Map(
		massiveEntries.map((entry) => [pairKey(entry), entry]),
	);
	const definitions: InstrumentDefinition[] = [];

	for (const [key, finnhub] of finnhubByPair) {
		const massive = massiveByPair.get(key);
		const tradingViewSymbol = `${finnhub.baseCurrency}${finnhub.quoteCurrency}`;
		if (
			!usesUsd(finnhub) ||
			!isTradingViewCoinbaseSpotSymbolAvailable(tradingViewSymbol) ||
			!massive ||
			!finnhub.providerBinding.enabled ||
			!massive.providerBinding.enabled
		) {
			continue;
		}
		const { baseCurrency, quoteCurrency } = finnhub;
		definitions.push({
			canonicalKey: buildCanonicalKey({
				assetClass: "crypto",
				instrumentType: "spot_pair",
				venue: "coinbase",
				baseCurrency,
				quoteCurrency,
			}),
			assetClass: "crypto",
			instrumentType: "spot_pair",
			status: "active",
			displaySymbol: `${baseCurrency}/${quoteCurrency}`,
			name: massive.name || finnhub.name,
			venue: "Coinbase",
			baseCurrency,
			quoteCurrency,
			pricePrecision: 8,
			quantityPrecision: 8,
			timezone: "Etc/UTC",
			calendarId: "crypto-24x7",
			providerBindings: [
				finnhub.providerBinding,
				massive.providerBinding,
				{
					provider: "tradingview",
					symbol: `COINBASE:${tradingViewSymbol}`,
					capabilities: ["chart"],
					enabled: true,
					priority: 100,
					venue: "coinbase",
					orientation: "direct",
				},
			],
		});
	}

	return definitions.sort((first, second) =>
		first.canonicalKey.localeCompare(second.canonicalKey),
	);
}
