import "server-only";

import { FinnhubQuoteProvider } from "./finnhub-client";

export function createFinnhubQuoteProvider() {
	const apiKey =
		process.env.FINNHUB_API_KEY ??
		process.env.NEXT_PUBLIC_FINNHUB_API_KEY ??
		"";

	return new FinnhubQuoteProvider({ apiKey });
}
