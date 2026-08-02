import "server-only";

import { loadDueAlerts, MongoAlertMonitoringStore } from "@/lib/data/alert-monitoring";
import { processAlertBatch } from "@/lib/alerts/processor";
import { createFinnhubQuoteProvider } from "@/lib/market-data/providers/finnhub";
import type { QuoteProvider } from "@/lib/market-data/types";

export async function monitorDuePriceAlerts({
	now = new Date(),
	limit = 500,
}: {
	now?: Date;
	limit?: number;
} = {}) {
	const alerts = await loadDueAlerts(now, limit);
	const finnhub = createFinnhubQuoteProvider();
	const providers = new Map<string, QuoteProvider>([
		[finnhub.provider, finnhub],
	]);

	return processAlertBatch({
		alerts,
		providers,
		store: new MongoAlertMonitoringStore(),
		now,
	});
}
