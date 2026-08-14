import type { InstrumentType } from "@/types/instruments";

const CANONICAL_SEGMENT_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/;
export const CANONICAL_KEY_PATTERN =
	/^[a-z0-9][a-z0-9._-]*(?::[a-z0-9][a-z0-9._-]*)+$/;
export const CANONICAL_KEY_MAX_LENGTH = 160;

type EquityIdentity = {
	assetClass: "equity";
	venue: string;
	symbol: string;
};

type ForexIdentity = {
	assetClass: "forex";
	baseCurrency: string;
	quoteCurrency: string;
};

type CryptoIdentity =
	| {
			assetClass: "crypto";
			instrumentType: "asset";
			symbol: string;
	  }
	| {
			assetClass: "crypto";
			instrumentType: "spot_pair";
			venue: string;
			baseCurrency: string;
			quoteCurrency: string;
	  };

type IndexIdentity = {
	assetClass: "index";
	venue: string;
	symbol: string;
};

type CommodityIdentity =
	| {
			assetClass: "commodity";
			instrumentType: "spot";
			venue: string;
			baseCurrency: string;
			quoteCurrency: string;
	  }
	| {
			assetClass: "commodity";
			instrumentType: "future";
			venue: string;
			productCode: string;
			contractMonth: string;
	  }
	| {
			assetClass: "commodity";
			instrumentType: "continuous_future";
			venue: string;
			productCode: string;
			roll: "front" | "next";
	  };

export type CanonicalInstrumentIdentity =
	| EquityIdentity
	| ForexIdentity
	| CryptoIdentity
	| IndexIdentity
	| CommodityIdentity;

function segment(value: string, label: string) {
	const normalized = value.trim().toLowerCase();
	if (!CANONICAL_SEGMENT_PATTERN.test(normalized)) {
		throw new Error(`${label} is not a valid canonical identifier segment`);
	}
	return normalized;
}

function contractMonth(value: string) {
	const normalized = value.trim();
	if (!/^\d{4}-(?:0[1-9]|1[0-2])$/.test(normalized)) {
		throw new Error("Contract month must use YYYY-MM format");
	}
	return normalized;
}

function finish(parts: string[]) {
	const key = parts.join(":");
	if (key.length > CANONICAL_KEY_MAX_LENGTH) {
		throw new Error("Canonical instrument key is too long");
	}
	return key;
}

export function buildCanonicalKey(identity: CanonicalInstrumentIdentity) {
	switch (identity.assetClass) {
		case "equity":
			return finish([
				"equity",
				segment(identity.venue, "Venue"),
				segment(identity.symbol, "Symbol"),
			]);
		case "forex":
			return finish([
				"forex",
				"spot",
				segment(identity.baseCurrency, "Base currency"),
				segment(identity.quoteCurrency, "Quote currency"),
			]);
		case "crypto":
			return identity.instrumentType === "asset"
				? finish(["crypto", "asset", segment(identity.symbol, "Symbol")])
				: finish([
						"crypto",
						segment(identity.venue, "Venue"),
						"spot",
						segment(identity.baseCurrency, "Base currency"),
						segment(identity.quoteCurrency, "Quote currency"),
					]);
		case "index":
			return finish([
				"index",
				segment(identity.venue, "Venue or publisher"),
				segment(identity.symbol, "Symbol"),
			]);
		case "commodity":
			if (identity.instrumentType === "spot") {
				return finish([
					"commodity",
					segment(identity.venue, "Venue"),
					"spot",
					segment(identity.baseCurrency, "Base currency"),
					segment(identity.quoteCurrency, "Quote currency"),
				]);
			}
			if (identity.instrumentType === "future") {
				return finish([
					"commodity",
					segment(identity.venue, "Venue"),
					"future",
					segment(identity.productCode, "Product code"),
					contractMonth(identity.contractMonth),
				]);
			}
			return finish([
				"commodity",
				segment(identity.venue, "Venue"),
				"continuous",
				segment(identity.productCode, "Product code"),
				identity.roll,
			]);
	}
}

export function isCanonicalKey(value: unknown): value is string {
	return (
		typeof value === "string" &&
		value.length <= CANONICAL_KEY_MAX_LENGTH &&
		CANONICAL_KEY_PATTERN.test(value)
	);
}

export function parseCanonicalKeyRouteParam(value: unknown) {
	if (typeof value !== "string") return null;

	let decoded: string;
	try {
		decoded = decodeURIComponent(value);
	} catch {
		return null;
	}

	const canonicalKey = decoded.trim().toLowerCase();
	return isCanonicalKey(canonicalKey) ? canonicalKey : null;
}

export function inferInstrumentType(
	identity: CanonicalInstrumentIdentity,
): InstrumentType {
	switch (identity.assetClass) {
		case "equity":
			return "listing";
		case "forex":
			return "spot_pair";
		case "index":
			return "index";
		default:
			return identity.instrumentType;
	}
}
