import "server-only";

export function getFinnhubApiKey(): string {
	const apiKey = process.env.FINNHUB_API_KEY?.trim();

	if (!apiKey) {
		throw new Error("FINNHUB_API_KEY is not configured");
	}

	return apiKey;
}
