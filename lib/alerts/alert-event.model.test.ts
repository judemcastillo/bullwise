import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Types } from "mongoose";
import AlertEvent from "@/database/models/alert-event.model";

function validEvent() {
	return new AlertEvent({
		dedupeKey: "price-alert:alert-123:once",
		alertId: new Types.ObjectId(),
		userId: "user-123",
		instrumentId: new Types.ObjectId(),
		eventType: "price_triggered",
		source: "market",
		operator: "crosses_above",
		threshold: Types.Decimal128.fromString("100"),
		observedValue: Types.Decimal128.fromString("101"),
		quoteObservedAt: new Date("2026-08-01T12:00:00.000Z"),
		triggeredAt: new Date("2026-08-01T12:00:01.000Z"),
		instrumentSnapshot: {
			displaySymbol: "TEST",
			name: "Test Instrument",
			quoteCurrency: "USD",
		},
		delivery: {
			email: {
				status: "pending",
				attempts: 0,
			},
		},
	});
}

async function getValidationErrors(event: ReturnType<typeof validEvent>) {
	try {
		await event.validate();
		assert.fail("Expected event validation to fail");
	} catch (error) {
		const errors = (error as { errors?: Record<string, unknown> }).errors;
		assert.ok(errors);
		return errors;
	}
}

describe("AlertEvent model", () => {
	it("accepts a complete immutable trigger snapshot", async () => {
		await assert.doesNotReject(validEvent().validate());
	});

	it("requires a deduplication key and owner", async () => {
		const event = validEvent();
		event.dedupeKey = "";
		event.userId = "";

		const errors = await getValidationErrors(event);
		assert.ok(errors.dedupeKey);
		assert.ok(errors.userId);
	});

	it("rejects unknown delivery states", async () => {
		const event = validEvent();
		event.set("delivery.email.status", "unknown");

		const errors = await getValidationErrors(event);
		assert.ok(errors["delivery.email.status"]);
	});

	it("accepts a processing delivery with a lease", async () => {
		const event = validEvent();
		event.set("delivery.email", {
			status: "processing",
			attempts: 1,
			leaseId: "lease-1",
			leaseExpiresAt: new Date("2026-08-01T12:05:00.000Z"),
		});

		await assert.doesNotReject(event.validate());
	});

	it("defines a unique database index for the deduplication key", () => {
		const indexes = AlertEvent.schema.indexes() as Array<
			[Record<string, number>, { unique?: boolean }]
		>;
		const dedupeIndex = indexes.find(([fields]) => fields.dedupeKey === 1);

		assert.ok(dedupeIndex);
		assert.equal(dedupeIndex[1].unique, true);
	});

	it("keeps trigger facts immutable while allowing delivery updates", () => {
		assert.equal(AlertEvent.schema.path("source").options.immutable, true);
		assert.equal(AlertEvent.schema.path("observedValue").options.immutable, true);
		assert.equal(AlertEvent.schema.path("triggeredAt").options.immutable, true);
		assert.equal(
			AlertEvent.schema.path("delivery.email.status").options.immutable,
			undefined,
		);
	});
});
