const STOCK_SYMBOL_PATTERN = /^[A-Z0-9._:/-]{1,40}$/;
const DEFAULT_RESULT_LIMIT = 15;

function normalizeText(value: unknown): string {
	return typeof value === "string" ? value.trim() : "";
}

function normalizeLimit(limit: number): number {
	return Number.isFinite(limit) && limit >= 0
		? Math.floor(limit)
		: DEFAULT_RESULT_LIMIT;
}

export function normalizeFinnhubSearchResults(
	value: unknown,
	userWatchlistSymbols: readonly string[],
	limit = DEFAULT_RESULT_LIMIT,
): StockWithWatchlistStatus[] {
	if (!Array.isArray(value)) return [];

	const resultLimit = normalizeLimit(limit);
	const watchlistSymbols = new Set(
		userWatchlistSymbols.map((symbol) => symbol.trim().toUpperCase()),
	);
	const seenSymbols = new Set<string>();
	const results: StockWithWatchlistStatus[] = [];

	for (const candidate of value) {
		if (results.length >= resultLimit) break;
		if (typeof candidate !== "object" || candidate === null) continue;

		const record = candidate as Record<string, unknown>;
		const symbol = normalizeText(record.symbol).toUpperCase();
		if (!STOCK_SYMBOL_PATTERN.test(symbol) || seenSymbols.has(symbol)) {
			continue;
		}

		seenSymbols.add(symbol);
		results.push({
			symbol,
			name: normalizeText(record.description) || symbol,
			type: normalizeText(record.type) || "Stock",
			isInWatchlist: watchlistSymbols.has(symbol),
		});
	}

	return results;
}
