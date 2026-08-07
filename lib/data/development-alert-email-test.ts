import "server-only";

import { randomUUID } from "node:crypto";
import { Types } from "mongoose";
import Alert from "@/database/models/alert.model";
import AlertEvent from "@/database/models/alert-event.model";
import type { InstrumentItem } from "@/database/models/instrument.model";
import { requireCompletedUser } from "@/lib/auth/require-user";
import { connectToDatabase } from "@/database/mongoose";

type TestableAlert = {
	_id: Types.ObjectId;
	userId: string;
	instrumentId: InstrumentItem;
	operator: "crosses_above" | "crosses_below";
	threshold: Types.Decimal128;
};

export class DevelopmentEmailTestError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "DevelopmentEmailTestError";
	}
}

export async function createDevelopmentAlertEmailTestEvent(alertId: string) {
	const user = await requireCompletedUser();
	if (process.env.NODE_ENV !== "development") {
		throw new DevelopmentEmailTestError(
			"Test alert emails are only available in development",
		);
	}
	if (!Types.ObjectId.isValid(alertId)) {
		throw new DevelopmentEmailTestError("Alert not found");
	}

	await connectToDatabase();
	const alert = await Alert.findOne({
		_id: new Types.ObjectId(alertId),
		userId: user.id,
	})
		.populate("instrumentId")
		.lean();
	if (!alert?.instrumentId) {
		throw new DevelopmentEmailTestError("Alert not found");
	}

	const testAlert = alert as unknown as TestableAlert;
	const instrument = testAlert.instrumentId;
	const event = await AlertEvent.create({
		dedupeKey: `development-test:${testAlert._id}:${randomUUID()}`,
		alertId: testAlert._id,
		userId: user.id,
		instrumentId: instrument._id,
		eventType: "price_triggered",
		source: "development_test",
		operator: testAlert.operator,
		threshold: testAlert.threshold,
		observedValue: testAlert.threshold,
		quoteObservedAt: new Date(),
		triggeredAt: new Date(),
		instrumentSnapshot: {
			displaySymbol: instrument.displaySymbol,
			name: instrument.name,
			quoteCurrency: instrument.quoteCurrency,
		},
		delivery: {
			email: { status: "pending", attempts: 0 },
		},
	});

	return { eventId: event._id.toString(), userId: user.id };
}
