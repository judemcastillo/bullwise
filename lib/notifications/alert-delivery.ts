import AlertEvent from "@/database/models/alert-event.model";
import Instrument from "@/database/models/instrument.model";
import { createNotification, notificationsEnabledAt } from "./store";
export async function deliverAlertNotifications() {
	const enabledAt = await notificationsEnabledAt();
	if (!enabledAt) return { status: "disabled", delivered: 0 };
	const events = await AlertEvent.find({
		source: "market",
		createdAt: { $gte: enabledAt },
		"delivery.inApp.status": "pending",
	})
		.sort({ createdAt: 1, _id: 1 })
		.limit(100)
		.lean();
	let delivered = 0;
	let failed = 0;
	for (const event of events) {
		try {
			const instrument = await Instrument.findById(event.instrumentId)
				.select({ canonicalKey: 1 })
				.lean();
			await createNotification({
				userId: event.userId,
				sourceKey: `price-alert:${event._id}`,
				type: "price_alert",
				title: `${event.instrumentSnapshot.displaySymbol} crossed ${event.operator === "crosses_above" ? "above" : "below"} ${event.threshold.toString()} ${event.instrumentSnapshot.quoteCurrency}`,
				body: `Observed price: ${event.observedValue.toString()} ${event.instrumentSnapshot.quoteCurrency}. Triggered ${event.triggeredAt.toISOString()}.`,
				articles: [],
				destination: instrument
					? `/instruments/${encodeURIComponent(instrument.canonicalKey)}`
					: null,
			});
			await AlertEvent.updateOne(
				{ _id: event._id },
				{
					$set: {
						"delivery.inApp.status": "delivered",
						"delivery.inApp.deliveredAt": new Date(),
					},
				},
			);
			delivered++;
		} catch {
			failed++;
			console.error("Alert inbox delivery failed", {
				eventId: event._id.toString(),
			});
		}
	}
	if (failed)
		throw new Error(
			`${failed} alert inbox deliveries require retry (${delivered} delivered)`,
		);
	return { status: "complete", delivered };
}
