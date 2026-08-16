const TRADINGVIEW_SCANNER_BASE_URL = "https://scanner.tradingview.com";
const TRADINGVIEW_REQUEST_TIMEOUT_MS = 30000;
const TRADINGVIEW_BATCH_SIZE = 500;

type TradingViewScannerResponse = {
	totalCount?: number;
	data?: Array<{ s?: string }>;
	error?: string;
};

function normalizeTradingViewSymbol(symbol: string) {
	const normalized = symbol.trim().toUpperCase();
	if (!/^[A-Z0-9._-]{2,20}:[A-Z0-9._-]{1,60}$/.test(normalized)) {
		throw new Error("Choose a valid TradingView symbol");
	}
	return normalized;
}

export async function listResolvableTradingViewEquities({
	symbols,
	fetchImpl = fetch,
	batchSize = TRADINGVIEW_BATCH_SIZE,
}: {
	symbols: readonly string[];
	fetchImpl?: typeof fetch;
	batchSize?: number;
}) {
	if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 1000) {
		throw new Error("TradingView batch size must be between 1 and 1000");
	}
	const requested = Array.from(
		new Set(symbols.map(normalizeTradingViewSymbol)),
	);
	const resolved = new Set<string>();

	for (let offset = 0; offset < requested.length; offset += batchSize) {
		const batch = requested.slice(offset, offset + batchSize);
		const response = await fetchImpl(
			`${TRADINGVIEW_SCANNER_BASE_URL}/america/scan`,
			{
				method: "POST",
				headers: {
					"content-type": "application/json",
					origin: "https://www.tradingview.com",
					referer: "https://www.tradingview.com/",
				},
				body: JSON.stringify({
					symbols: { tickers: batch, query: { types: [] } },
					columns: ["name"],
				}),
				signal: AbortSignal.timeout(TRADINGVIEW_REQUEST_TIMEOUT_MS),
			},
		);
		const payload = (await response.json()) as TradingViewScannerResponse;
		if (!response.ok) {
			throw new Error(
				payload.error || `TradingView request failed with ${response.status}`,
			);
		}
		if (!Array.isArray(payload.data)) {
			throw new Error("TradingView returned an invalid equity scanner response");
		}
		for (const item of payload.data) {
			if (typeof item.s !== "string") continue;
			const symbol = item.s.trim().toUpperCase();
			if (batch.includes(symbol)) resolved.add(symbol);
		}
	}

	if (requested.length > 0 && resolved.size < requested.length / 2) {
		throw new Error(
			"TradingView resolved fewer than half of the requested equities; refusing to trust the catalog response",
		);
	}

	return resolved;
}
