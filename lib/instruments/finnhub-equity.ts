import { buildCanonicalKey } from "@/lib/instruments/canonical-key";
import { normalizeFinnhubEquitySecurityType } from "@/lib/instruments/equity-security-type";
import type { InstrumentDefinition } from "@/types/instruments";

const FINNHUB_EQUITY_SYMBOL_PATTERN = /^[A-Z0-9._:/-]{1,40}$/;

type FinnhubEquitySnapshot = {
	symbol: string;
	company: string;
	exchange?: string | null;
	currency?: string | null;
	type?: string | null;
};

type VenueMetadata = {
	code: string;
	mic?: string;
	timezone: string;
	calendarId?: string;
};

const US_EQUITY_VENUES: Array<{
	pattern: RegExp;
	code: string;
	mic: string;
}> = [
	{ pattern: /NYSE\s+ARCA/, code: "arcx", mic: "ARCX" },
	{ pattern: /NYSE\s+AMERICAN|NYSE\s+MKT|AMEX/, code: "xase", mic: "XASE" },
	{ pattern: /NASDAQ/, code: "xnas", mic: "XNAS" },
	{ pattern: /NEW\s+YORK\s+STOCK\s+EXCHANGE|^NYSE$/, code: "xnys", mic: "XNYS" },
];

function fallbackVenueCode(value: string) {
	const normalized = value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9._-]+/g, "-")
		.replace(/^-+|-+$/g, "");

	return normalized || "finnhub";
}

export function resolveFinnhubEquityVenue(
	exchange?: string | null,
): VenueMetadata {
	const normalizedExchange = exchange?.trim().toUpperCase() ?? "";
	const knownVenue = US_EQUITY_VENUES.find(({ pattern }) =>
		pattern.test(normalizedExchange),
	);

	if (knownVenue) {
		return {
			code: knownVenue.code,
			mic: knownVenue.mic,
			timezone: "America/New_York",
			calendarId: "us-equities",
		};
	}

	return {
		code: fallbackVenueCode(normalizedExchange),
		timezone: "Etc/UTC",
	};
}

export function buildFinnhubEquityInstrumentDefinition(
	stock: FinnhubEquitySnapshot,
	providerSymbol: string,
): InstrumentDefinition {
	const normalizedProviderSymbol = providerSymbol.trim().toUpperCase();
	const displaySymbol = stock.symbol.trim().toUpperCase();
	const name = stock.company.trim();

	if (
		!FINNHUB_EQUITY_SYMBOL_PATTERN.test(normalizedProviderSymbol) ||
		!FINNHUB_EQUITY_SYMBOL_PATTERN.test(displaySymbol) ||
		!name
	) {
		throw new Error("Finnhub returned invalid equity identity data");
	}

	const venue = resolveFinnhubEquityVenue(stock.exchange);
	const quoteCurrency = stock.currency?.trim().toUpperCase() || "USD";

	return {
		canonicalKey: buildCanonicalKey({
			assetClass: "equity",
			venue: venue.code,
			symbol: displaySymbol,
		}),
		assetClass: "equity",
		instrumentType: "listing",
		securityType: normalizeFinnhubEquitySecurityType(stock.type),
		status: "active",
		displaySymbol,
		name,
		venue: stock.exchange?.trim() || venue.code.toUpperCase(),
		venueMic: venue.mic,
		quoteCurrency,
		pricePrecision: 4,
		quantityPrecision: 0,
		timezone: venue.timezone,
		calendarId: venue.calendarId,
		providerBindings: [
			{
				provider: "finnhub",
				symbol: normalizedProviderSymbol,
				capabilities: ["catalog", "quote", "alert_quote", "news"],
				enabled: true,
				priority: 100,
				venue: venue.code,
				orientation: "direct",
			},
		],
	};
}
