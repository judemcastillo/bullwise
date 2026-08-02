import "server-only";

import Alert from "@/database/models/alert.model";
import AlertEvent from "@/database/models/alert-event.model";
import type {
	AlertMonitoringStore,
	MonitorableAlert,
	TriggerWriteResult,
} from "@/lib/alerts/processor";
import { buildOneTimeAlertDedupeKey } from "@/lib/alerts/evaluator";
import { connectToDatabase } from "@/database/mongoose";
import type { MarketQuote } from "@/lib/market-data/types";
import type { AlertEvaluationReason } from "@/lib/alerts/evaluator";
import type { InstrumentItem } from "@/database/models/instrument.model";
import { Types } from "mongoose";

const EVALUATION_INTERVAL_MS = 60_000;

type PopulatedMonitorableAlert = {
	_id: Types.ObjectId;
	userId: string;
	status: MonitorableAlert["status"];
	operator: MonitorableAlert["operator"];
	threshold: Types.Decimal128;
	lastObservedValue?: Types.Decimal128;
	channels: { email: boolean };
	instrumentId: InstrumentItem;
};

function nextEvaluationAt(now: Date) {
	return new Date(now.getTime() + EVALUATION_INTERVAL_MS);
}

function previousValueFilter(alert: MonitorableAlert) {
	return alert.previousValue
		? Types.Decimal128.fromString(alert.previousValue)
		: { $exists: false };
}

function isDuplicateKeyError(error: unknown) {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		(error as { code?: unknown }).code === 11000
	);
}

export async function loadDueAlerts(
	now = new Date(),
	limit = 500,
): Promise<MonitorableAlert[]> {
	await connectToDatabase();
	const alerts = await Alert.find({
		status: "active",
		nextEvaluationAt: { $lte: now },
	})
		.sort({ nextEvaluationAt: 1, _id: 1 })
		.limit(Math.max(1, Math.min(limit, 1000)))
		.populate("instrumentId")
		.lean();

	return alerts.flatMap((rawAlert) => {
		if (!rawAlert.instrumentId) return [];
		const alert = rawAlert as unknown as PopulatedMonitorableAlert;
		const instrument = alert.instrumentId;

		return [
			{
				id: alert._id.toString(),
				userId: alert.userId,
				instrumentId: instrument._id.toString(),
				status: alert.status,
				operator: alert.operator,
				threshold: alert.threshold.toString(),
				previousValue: alert.lastObservedValue?.toString(),
				emailEnabled: alert.channels.email,
				instrument: {
					assetClass: instrument.assetClass,
					displaySymbol: instrument.displaySymbol,
					name: instrument.name,
					quoteCurrency: instrument.quoteCurrency,
					providerBindings: instrument.providerBindings.map((binding) => ({
						provider: binding.provider,
						symbol: binding.symbol,
					})),
				},
			},
		];
	});
}

export class MongoAlertMonitoringStore implements AlertMonitoringStore {
	async recordObservation(
		alert: MonitorableAlert,
		quote: MarketQuote,
		evaluatedAt: Date,
	): Promise<boolean> {
		const result = await Alert.updateOne(
			{
				_id: new Types.ObjectId(alert.id),
				userId: alert.userId,
				status: "active",
				lastObservedValue: previousValueFilter(alert),
			},
			{
				$set: {
					lastObservedValue: Types.Decimal128.fromString(quote.price),
					lastEvaluatedAt: evaluatedAt,
					nextEvaluationAt: nextEvaluationAt(evaluatedAt),
				},
			},
		);

		return result.modifiedCount === 1;
	}

	async recordTrigger(
		alert: MonitorableAlert,
		quote: MarketQuote,
		triggeredAt: Date,
	): Promise<TriggerWriteResult> {
		const mongoose = await connectToDatabase();
		const session = await mongoose.startSession();
		const dedupeKey = buildOneTimeAlertDedupeKey(alert.id);
		let result: TriggerWriteResult = "conflict";

		try {
			await session.withTransaction(async () => {
				const claimed = await Alert.findOneAndUpdate(
					{
						_id: new Types.ObjectId(alert.id),
						userId: alert.userId,
						status: "active",
						lastObservedValue: previousValueFilter(alert),
					},
					{
						$set: {
							status: "triggered",
							lastObservedValue: Types.Decimal128.fromString(quote.price),
							lastEvaluatedAt: triggeredAt,
							lastTriggeredAt: triggeredAt,
							nextEvaluationAt: nextEvaluationAt(triggeredAt),
						},
					},
					{ new: true, session },
				);

				if (!claimed) {
					const existingEvent = await AlertEvent.exists({ dedupeKey }).session(
						session,
					);
					result = existingEvent ? "duplicate" : "conflict";
					return;
				}

				await AlertEvent.create(
					[
						{
							dedupeKey,
							alertId: claimed._id,
							userId: alert.userId,
							instrumentId: new Types.ObjectId(alert.instrumentId),
							eventType: "price_triggered",
							source: "market",
							operator: alert.operator,
							threshold: Types.Decimal128.fromString(alert.threshold),
							observedValue: Types.Decimal128.fromString(quote.price),
							quoteObservedAt: quote.observedAt,
							triggeredAt,
							instrumentSnapshot: {
								displaySymbol: alert.instrument.displaySymbol,
								name: alert.instrument.name,
								quoteCurrency: alert.instrument.quoteCurrency,
							},
							delivery: {
								email: {
									status: alert.emailEnabled ? "pending" : "not_requested",
									attempts: 0,
								},
							},
						},
					],
					{ session },
				);
				result = "created";
			});
		} catch (error) {
			if (isDuplicateKeyError(error)) return "duplicate";
			throw error;
		} finally {
			await session.endSession();
		}

		return result;
	}

	async recordSkipped(
		alert: MonitorableAlert,
		_reason: AlertEvaluationReason | "provider_unavailable",
		evaluatedAt: Date,
	): Promise<void> {
		await Alert.updateOne(
			{
				_id: new Types.ObjectId(alert.id),
				userId: alert.userId,
				status: "active",
			},
			{
				$set: {
					lastEvaluatedAt: evaluatedAt,
					nextEvaluationAt: nextEvaluationAt(evaluatedAt),
				},
			},
		);
	}
}
