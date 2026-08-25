import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	resolveLatestCompletedUsEquitySession,
	US_EQUITY_SESSION_CALENDAR_VERSION,
} from "@/lib/market-data/us-equity-session";

function resolved(at: string) {
	const result = resolveLatestCompletedUsEquitySession(new Date(at));
	if (result.status === "unavailable") assert.fail(result.message);
	assert.equal(result.status, "resolved");
	return result;
}

describe("U.S. equity completed-session resolver", () => {
	it("does not complete a regular session before the 4 p.m. ET close", () => {
		const beforeClose = resolved("2026-08-21T19:59:59.999Z");
		assert.equal(beforeClose.sessionDate, "2026-08-20");
		assert.equal(beforeClose.closedAt.toISOString(), "2026-08-20T20:00:00.000Z");

		const atClose = resolved("2026-08-21T20:00:00.000Z");
		assert.equal(atClose.sessionDate, "2026-08-21");
		assert.equal(atClose.openedAt.toISOString(), "2026-08-21T13:30:00.000Z");
		assert.equal(atClose.closedAt.toISOString(), "2026-08-21T20:00:00.000Z");
		assert.equal(atClose.completedThrough.toISOString(), atClose.closedAt.toISOString());
		assert.equal(atClose.closeType, "regular");
	});

	it("uses the New York winter offset and skips weekends", () => {
		const winter = resolved("2026-01-09T21:00:00.000Z");
		assert.equal(winter.sessionDate, "2026-01-09");
		assert.equal(winter.openedAt.toISOString(), "2026-01-09T14:30:00.000Z");
		assert.equal(winter.closedAt.toISOString(), "2026-01-09T21:00:00.000Z");

		const saturday = resolved("2026-08-22T16:00:00.000Z");
		assert.equal(saturday.sessionDate, "2026-08-21");
	});

	it("never treats a published 2026-2028 NYSE holiday as an open session", () => {
		const boundaryHoliday = resolveLatestCompletedUsEquitySession(
			new Date("2026-01-01T23:00:00.000Z"),
		);
		assert.equal(boundaryHoliday.status, "unavailable");
		if (boundaryHoliday.status === "unavailable") {
			assert.equal(boundaryHoliday.reason, "unsupported_calendar_range");
		}

		const holidays = [
			"2026-01-19",
			"2026-02-16",
			"2026-04-03",
			"2026-05-25",
			"2026-06-19",
			"2026-07-03",
			"2026-09-07",
			"2026-11-26",
			"2026-12-25",
			"2027-01-01",
			"2027-01-18",
			"2027-02-15",
			"2027-03-26",
			"2027-05-31",
			"2027-06-18",
			"2027-07-05",
			"2027-09-06",
			"2027-11-25",
			"2027-12-24",
			"2028-01-17",
			"2028-02-21",
			"2028-04-14",
			"2028-05-29",
			"2028-06-19",
			"2028-07-04",
			"2028-09-04",
			"2028-11-23",
			"2028-12-25",
		];
		for (const holiday of holidays) {
			const result = resolved(`${holiday}T23:00:00.000Z`);
			assert.notEqual(result.sessionDate, holiday, `${holiday} was treated as open`);
		}
	});

	it("uses only the five published 1 p.m. ET early closes", () => {
		const earlyCloses = [
			["2026-11-27", "2026-11-27T18:00:00.000Z"],
			["2026-12-24", "2026-12-24T18:00:00.000Z"],
			["2027-11-26", "2027-11-26T18:00:00.000Z"],
			["2028-07-03", "2028-07-03T17:00:00.000Z"],
			["2028-11-24", "2028-11-24T18:00:00.000Z"],
		] as const;
		for (const [sessionDate, closedAt] of earlyCloses) {
			const atClose = resolved(closedAt);
			assert.equal(atClose.sessionDate, sessionDate);
			assert.equal(atClose.closeType, "early");
			assert.equal(atClose.closedAt.toISOString(), closedAt);

			const justBeforeClose = new Date(new Date(closedAt).getTime() - 1).toISOString();
			assert.notEqual(resolved(justBeforeClose).sessionDate, sessionDate);
		}
	});

	it("fails closed for invalid timestamps and unregistered calendar years", () => {
		const invalid = resolveLatestCompletedUsEquitySession(new Date("invalid"));
		assert.deepEqual(invalid, {
			status: "unavailable",
			reason: "invalid_timestamp",
			message: "A valid observation timestamp is required.",
		});

		for (const timestamp of [
			"2025-12-31T22:00:00.000Z",
			"2029-01-02T22:00:00.000Z",
		]) {
			const result = resolveLatestCompletedUsEquitySession(new Date(timestamp));
			assert.equal(result.status, "unavailable");
			if (result.status !== "unavailable") continue;
			assert.equal(result.reason, "unsupported_calendar_range");
		}
	});

	it("returns immutable calendar identity with each completed session", () => {
		const result = resolved("2026-08-21T20:00:00.000Z");
		assert.equal(result.calendarId, "us-equities");
		assert.equal(result.calendarVersion, US_EQUITY_SESSION_CALENDAR_VERSION);
	});
});
