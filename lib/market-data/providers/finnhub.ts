import "server-only";

import { getFinnhubApiKey } from "../finnhub-config";
import { FinnhubQuoteProvider } from "./finnhub-client";

export function createFinnhubQuoteProvider() {
	return new FinnhubQuoteProvider({ apiKey: getFinnhubApiKey() });
}
