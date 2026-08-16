import {
	evaluatePriceAlert,
	type AlertEvaluationReason,
} from "@/lib/alerts/evaluator";
import { invertQuote } from "@/lib/market-data/normalization";
import type {
	MarketQuote,
	QuoteProvider,
	QuoteRequest,
} from "@/lib/market-data/types";
import type { AlertOperator, AlertStatus, AssetClass } from "@/types/alerts";
import type { ProviderBinding } from "@/types/instruments";

export type MonitorableAlert = {
	id: string;
	userId: string;
	instrumentId: string;
	status: AlertStatus;
	operator: AlertOperator;
	threshold: string;
	previousValue?: string;
	emailEnabled: boolean;
	instrument: {
		assetClass: AssetClass;
		displaySymbol: string;
		name: string;
		quoteCurrency: string;
		pricePrecision: number;
		calendarId?: string;
		providerBindings: ProviderBinding[];
	};
};

export type TriggerWriteResult = "created" | "duplicate" | "conflict";

export interface AlertMonitoringStore {
	recordObservation(
		alert: MonitorableAlert,
		quote: MarketQuote,
		evaluatedAt: Date,
	): Promise<boolean>;
	recordTrigger(
		alert: MonitorableAlert,
		quote: MarketQuote,
		triggeredAt: Date,
	): Promise<TriggerWriteResult>;
	recordSkipped(
		alert: MonitorableAlert,
		reason: AlertEvaluationReason | "provider_unavailable",
		evaluatedAt: Date,
	): Promise<void>;
}

export type AlertProcessingSummary = {
	loaded: number;
	quotesRequested: number;
	triggered: number;
	deduplicated: number;
	observed: number;
	skipped: number;
	failures: number;
};

type ProcessAlertBatchOptions = {
	alerts: MonitorableAlert[];
	providers: Map<string, QuoteProvider>;
	store: AlertMonitoringStore;
	now?: Date;
};

type PreparedAlert = {
	alert: MonitorableAlert;
	request: QuoteRequest;
	orientation: ProviderBinding["orientation"];
};

export async function processAlertBatch({
	alerts,
	providers,
	store,
	now = new Date(),
}: ProcessAlertBatchOptions): Promise<AlertProcessingSummary> {
	const summary: AlertProcessingSummary = {
		loaded: alerts.length,
		quotesRequested: 0,
		triggered: 0,
		deduplicated: 0,
		observed: 0,
		skipped: 0,
		failures: 0,
	};
	const preparedByProvider = new Map<string, PreparedAlert[]>();

	for (const alert of alerts) {
		const binding = alert.instrument.providerBindings
			.filter(
				(candidate) =>
					candidate.enabled &&
					candidate.capabilities.includes("alert_quote") &&
					providers.has(candidate.provider.toLowerCase()),
			)
			.sort((left, right) => left.priority - right.priority)[0];

		if (!binding) {
			summary.skipped += 1;
			await store.recordSkipped(alert, "provider_unavailable", now);
			continue;
		}

		const providerName = binding.provider.toLowerCase();
		const prepared = preparedByProvider.get(providerName) ?? [];
		prepared.push({
			alert,
			orientation: binding.orientation,
			request: {
				instrumentId: alert.instrumentId,
				assetClass: alert.instrument.assetClass,
				provider: providerName,
				providerSymbol: binding.symbol,
				expectedCurrency: alert.instrument.quoteCurrency,
				pricePrecision: alert.instrument.pricePrecision,
				calendarId: alert.instrument.calendarId,
			},
		});
		preparedByProvider.set(providerName, prepared);
	}

	for (const [providerName, preparedAlerts] of preparedByProvider) {
		const provider = providers.get(providerName);
		if (!provider) continue;

		const uniqueRequests = Array.from(
			new Map(
				preparedAlerts.map(({ request }) => [request.instrumentId, request]),
			).values(),
		);
		summary.quotesRequested += uniqueRequests.length;

		let quotes: Map<string, MarketQuote>;
		try {
			quotes = await provider.getQuotes(uniqueRequests);
		} catch (error) {
			console.error(`Quote provider ${providerName} failed:`, error);
			summary.failures += preparedAlerts.length;
			for (const { alert } of preparedAlerts) {
				await store.recordSkipped(alert, "provider_unavailable", now);
			}
			continue;
		}

		for (const { alert, orientation, request } of preparedAlerts) {
			const providerQuote = quotes.get(request.instrumentId);
			if (!providerQuote) {
				summary.skipped += 1;
				await store.recordSkipped(alert, "provider_unavailable", now);
				continue;
			}
			const quote =
				orientation === "inverse"
					? invertQuote(providerQuote, request.pricePrecision)
					: providerQuote;

			const evaluation = evaluatePriceAlert({
				status: alert.status,
				operator: alert.operator,
				threshold: alert.threshold,
				previousValue: alert.previousValue,
				expectedCurrency: request.expectedCurrency,
				quote,
				now,
			});

			try {
				if (evaluation.shouldTrigger) {
					const result = await store.recordTrigger(alert, quote, now);
					if (result === "created") summary.triggered += 1;
					else if (result === "duplicate") summary.deduplicated += 1;
					else summary.skipped += 1;
				} else if (evaluation.nextObservedValue) {
					const updated = await store.recordObservation(alert, quote, now);
					if (updated) summary.observed += 1;
					else summary.skipped += 1;
				} else {
					summary.skipped += 1;
					await store.recordSkipped(alert, evaluation.reason, now);
				}
			} catch (error) {
				console.error(`Unable to persist alert evaluation ${alert.id}:`, error);
				summary.failures += 1;
			}
		}
	}

	return summary;
}
