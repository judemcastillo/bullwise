const NEW_YORK_TIME_ZONE = "America/New_York";
const DAY_MS = 24 * 60 * 60 * 1000;
const SUPPORTED_FIRST_YEAR = 2026;
const SUPPORTED_LAST_YEAR = 2028;

export const US_EQUITY_SESSION_CALENDAR_VERSION = "nyse-2026-2028-v1";

// Published by NYSE for 2026-2028:
// https://www.nyse.com/markets/hours-calendars
const CLOSED_SESSION_DATES = new Set([
	"2026-01-01",
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
]);

const EARLY_CLOSE_SESSION_DATES = new Set([
	"2026-11-27",
	"2026-12-24",
	"2027-11-26",
	"2028-07-03",
	"2028-11-24",
]);

type LocalDate = {
	year: number;
	month: number;
	day: number;
};

type LocalDateTime = LocalDate & {
	hour: number;
	minute: number;
	second: number;
};

export type UsEquityCompletedSession = {
	status: "resolved";
	calendarId: "us-equities";
	calendarVersion: typeof US_EQUITY_SESSION_CALENDAR_VERSION;
	sessionDate: string;
	openedAt: Date;
	closedAt: Date;
	completedThrough: Date;
	closeType: "regular" | "early";
};

export type UsEquityCompletedSessionUnavailable = {
	status: "unavailable";
	reason: "invalid_timestamp" | "unsupported_calendar_range";
	message: string;
};

export type UsEquityCompletedSessionResult =
	| UsEquityCompletedSession
	| UsEquityCompletedSessionUnavailable;

const NEW_YORK_PARTS = new Intl.DateTimeFormat("en-US", {
	timeZone: NEW_YORK_TIME_ZONE,
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
	hour: "2-digit",
	minute: "2-digit",
	second: "2-digit",
	hourCycle: "h23",
});

function partsInNewYork(date: Date): LocalDateTime {
	const values = new Map(
		NEW_YORK_PARTS.formatToParts(date)
			.filter((part) => part.type !== "literal")
			.map((part) => [part.type, Number(part.value)]),
	);
	return {
		year: values.get("year")!,
		month: values.get("month")!,
		day: values.get("day")!,
		hour: values.get("hour")!,
		minute: values.get("minute")!,
		second: values.get("second")!,
	};
}

function dateKey(date: LocalDate) {
	return `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}

function previousDate(date: LocalDate): LocalDate {
	const previous = new Date(Date.UTC(date.year, date.month - 1, date.day) - DAY_MS);
	return {
		year: previous.getUTCFullYear(),
		month: previous.getUTCMonth() + 1,
		day: previous.getUTCDate(),
	};
}

function isWeekend(date: LocalDate) {
	const weekday = new Date(
		Date.UTC(date.year, date.month - 1, date.day),
	).getUTCDay();
	return weekday === 0 || weekday === 6;
}

function isSupported(date: LocalDate) {
	return date.year >= SUPPORTED_FIRST_YEAR && date.year <= SUPPORTED_LAST_YEAR;
}

function zonedDateTimeToUtc(local: LocalDateTime) {
	const target = Date.UTC(
		local.year,
		local.month - 1,
		local.day,
		local.hour,
		local.minute,
		local.second,
	);
	let candidate = target;
	for (let attempt = 0; attempt < 3; attempt += 1) {
		const actual = partsInNewYork(new Date(candidate));
		const actualAsUtc = Date.UTC(
			actual.year,
			actual.month - 1,
			actual.day,
			actual.hour,
			actual.minute,
			actual.second,
		);
		const correction = target - actualAsUtc;
		candidate += correction;
		if (correction === 0) break;
	}
	return new Date(candidate);
}

function sessionTimes(date: LocalDate, earlyClose: boolean) {
	return {
		openedAt: zonedDateTimeToUtc({
			...date,
			hour: 9,
			minute: 30,
			second: 0,
		}),
		closedAt: zonedDateTimeToUtc({
			...date,
			hour: earlyClose ? 13 : 16,
			minute: 0,
			second: 0,
		}),
	};
}

export function resolveLatestCompletedUsEquitySession(
	at: Date,
): UsEquityCompletedSessionResult {
	if (Number.isNaN(at.getTime())) {
		return {
			status: "unavailable",
			reason: "invalid_timestamp",
			message: "A valid observation timestamp is required.",
		};
	}

	const local = partsInNewYork(at);
	let candidate: LocalDate = {
		year: local.year,
		month: local.month,
		day: local.day,
	};
	if (!isSupported(candidate)) {
		return {
			status: "unavailable",
			reason: "unsupported_calendar_range",
			message: `The U.S. equity calendar supports ${SUPPORTED_FIRST_YEAR} through ${SUPPORTED_LAST_YEAR}.`,
		};
	}

	for (let attempts = 0; attempts < 10; attempts += 1) {
		if (!isSupported(candidate)) break;
		const sessionDate = dateKey(candidate);
		if (!isWeekend(candidate) && !CLOSED_SESSION_DATES.has(sessionDate)) {
			const earlyClose = EARLY_CLOSE_SESSION_DATES.has(sessionDate);
			const { openedAt, closedAt } = sessionTimes(candidate, earlyClose);
			if (at.getTime() >= closedAt.getTime()) {
				return {
					status: "resolved",
					calendarId: "us-equities",
					calendarVersion: US_EQUITY_SESSION_CALENDAR_VERSION,
					sessionDate,
					openedAt,
					closedAt,
					completedThrough: new Date(closedAt),
					closeType: earlyClose ? "early" : "regular",
				};
			}
		}
		candidate = previousDate(candidate);
	}

	return {
		status: "unavailable",
		reason: "unsupported_calendar_range",
		message: `A completed U.S. equity session could not be resolved within the ${SUPPORTED_FIRST_YEAR}-${SUPPORTED_LAST_YEAR} calendar.`,
	};
}
