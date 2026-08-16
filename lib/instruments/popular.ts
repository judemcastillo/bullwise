import type { AssetClass } from "@/types/instruments";

const POPULAR_EQUITIES = [
	"equity:xnas:aapl",
	"equity:xnas:msft",
	"equity:xnas:nvda",
	"equity:xnas:amzn",
	"equity:xnas:googl",
	"equity:xnas:meta",
	"equity:xnas:tsla",
	"equity:xnys:jpm",
	"equity:xnys:v",
	"equity:xnys:brk.b",
] as const;

const POPULAR_CRYPTO = [
	"crypto:coinbase:spot:btc:usd",
	"crypto:coinbase:spot:eth:usd",
	"crypto:coinbase:spot:sol:usd",
	"crypto:coinbase:spot:xrp:usd",
	"crypto:coinbase:spot:doge:usd",
] as const;

const POPULAR_FOREX = [
	"forex:spot:eur:usd",
	"forex:spot:usd:jpy",
	"forex:spot:gbp:usd",
	"forex:spot:aud:usd",
	"forex:spot:usd:cad",
] as const;

const POPULAR_COMMODITIES = [
	"commodity:oanda:spot:xau:usd",
	"commodity:oanda:spot:xag:usd",
] as const;

const POPULAR_BY_ASSET_CLASS: Record<AssetClass, readonly string[]> = {
	equity: POPULAR_EQUITIES,
	crypto: POPULAR_CRYPTO,
	forex: POPULAR_FOREX,
	commodity: POPULAR_COMMODITIES,
	index: [],
};

const POPULAR_ALL = [
	POPULAR_EQUITIES[0],
	POPULAR_EQUITIES[1],
	POPULAR_EQUITIES[2],
	POPULAR_EQUITIES[6],
	POPULAR_CRYPTO[0],
	POPULAR_CRYPTO[1],
	POPULAR_CRYPTO[2],
	POPULAR_FOREX[0],
	POPULAR_FOREX[1],
	POPULAR_COMMODITIES[0],
] as const;

export function popularInstrumentCanonicalKeys(assetClass?: AssetClass) {
	return assetClass ? POPULAR_BY_ASSET_CLASS[assetClass] : POPULAR_ALL;
}

export function orderPopularInstruments<T extends { canonicalKey: string }>(
	instruments: readonly T[],
	canonicalKeys: readonly string[],
) {
	const instrumentsByKey = new Map(
		instruments.map((instrument) => [instrument.canonicalKey, instrument]),
	);
	return canonicalKeys.flatMap((canonicalKey) => {
		const instrument = instrumentsByKey.get(canonicalKey);
		return instrument ? [instrument] : [];
	});
}
