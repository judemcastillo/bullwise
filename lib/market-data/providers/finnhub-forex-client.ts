const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";
const FINNHUB_REQUEST_TIMEOUT_MS = 8000;

export type FinnhubForexSymbol = {
	description: string;
	displaySymbol: string;
	symbol: string;
};

export type FinnhubEquitySymbol = FinnhubForexSymbol & {
	currency?: string;
	figi?: string;
	figiComposite?: string;
	mic?: string;
	type?: string;
};

export type FinnhubCryptoSymbol = FinnhubForexSymbol;

async function listFinnhubSymbols<T extends FinnhubForexSymbol>({
	path,
	params,
	apiKey,
	fetchImpl,
	catalogName,
}: {
	path: string;
	params: Record<string, string>;
	apiKey: string;
	fetchImpl: typeof fetch;
	catalogName: string;
}) {
	if (!apiKey.trim()) throw new Error("FINNHUB_API_KEY is not configured");
	const searchParams = new URLSearchParams({ ...params, token: apiKey });
	const response = await fetchImpl(
		`${FINNHUB_BASE_URL}/${path}?${searchParams.toString()}`,
		{
			cache: "no-store",
			signal: AbortSignal.timeout(FINNHUB_REQUEST_TIMEOUT_MS),
		},
	);
	const payload = (await response.json()) as unknown;
	if (!response.ok) {
		const error =
			typeof payload === "object" &&
			payload !== null &&
			"error" in payload &&
			typeof payload.error === "string"
				? payload.error
				: `Finnhub request failed with ${response.status}`;
		throw new Error(error);
	}
	if (!Array.isArray(payload)) {
		throw new Error(`Finnhub returned an invalid ${catalogName} catalog`);
	}

	return payload.filter((value): value is T => {
		if (typeof value !== "object" || value === null) return false;
		const item = value as Record<string, unknown>;
		return (
			typeof item.symbol === "string" &&
			typeof item.displaySymbol === "string" &&
			typeof item.description === "string"
		);
	});
}

export async function listFinnhubOandaSymbols({
	apiKey,
	fetchImpl = fetch,
}: {
	apiKey: string;
	fetchImpl?: typeof fetch;
}) {
	return listFinnhubSymbols<FinnhubForexSymbol>({
		path: "forex/symbol",
		params: { exchange: "OANDA" },
		apiKey,
		fetchImpl,
		catalogName: "forex",
	});
}

export async function listFinnhubUsEquitySymbols({
	apiKey,
	fetchImpl = fetch,
}: {
	apiKey: string;
	fetchImpl?: typeof fetch;
}) {
	return listFinnhubSymbols<FinnhubEquitySymbol>({
		path: "stock/symbol",
		params: { exchange: "US" },
		apiKey,
		fetchImpl,
		catalogName: "US equity",
	});
}

export async function listFinnhubCryptoSymbols({
	exchange,
	apiKey,
	fetchImpl = fetch,
}: {
	exchange: string;
	apiKey: string;
	fetchImpl?: typeof fetch;
}) {
	const normalizedExchange = exchange.trim().toUpperCase();
	if (!/^[A-Z0-9._-]{2,40}$/.test(normalizedExchange)) {
		throw new Error("Choose a valid Finnhub crypto exchange");
	}

	return listFinnhubSymbols<FinnhubCryptoSymbol>({
		path: "crypto/symbol",
		params: { exchange: normalizedExchange },
		apiKey,
		fetchImpl,
		catalogName: `${normalizedExchange} crypto`,
	});
}
