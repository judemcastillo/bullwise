import type {
	TransparentAnalysisDurationBucket,
	TransparentAnalysisRequestOutcome,
} from "@/lib/analysis/transparent-analysis-telemetry";

export const TRANSPARENT_ANALYSIS_OBSERVATION_MINIMUM_REQUESTS = 50;
export const TRANSPARENT_ANALYSIS_OBSERVATION_MINIMUM_DAYS = 7;

export type TransparentAnalysisObservationCandidate = {
	symbol: string;
	sector: string;
};

const DAILY_CANDIDATES: readonly (readonly TransparentAnalysisObservationCandidate[])[] = [
	[
		{ symbol: "AAPL", sector: "Technology" },
		{ symbol: "MSFT", sector: "Technology" },
		{ symbol: "NVDA", sector: "Technology" },
		{ symbol: "GOOGL", sector: "Communication" },
		{ symbol: "META", sector: "Communication" },
		{ symbol: "ORCL", sector: "Technology" },
		{ symbol: "CSCO", sector: "Technology" },
		{ symbol: "IBM", sector: "Technology" },
	],
	[
		{ symbol: "JPM", sector: "Financials" },
		{ symbol: "BAC", sector: "Financials" },
		{ symbol: "WFC", sector: "Financials" },
		{ symbol: "GS", sector: "Financials" },
		{ symbol: "MS", sector: "Financials" },
		{ symbol: "C", sector: "Financials" },
		{ symbol: "V", sector: "Financials" },
		{ symbol: "AXP", sector: "Financials" },
	],
	[
		{ symbol: "JNJ", sector: "Healthcare" },
		{ symbol: "UNH", sector: "Healthcare" },
		{ symbol: "MRK", sector: "Healthcare" },
		{ symbol: "PFE", sector: "Healthcare" },
		{ symbol: "ABBV", sector: "Healthcare" },
		{ symbol: "TMO", sector: "Healthcare" },
		{ symbol: "ABT", sector: "Healthcare" },
		{ symbol: "MDT", sector: "Healthcare" },
	],
	[
		{ symbol: "AMZN", sector: "Consumer" },
		{ symbol: "WMT", sector: "Consumer" },
		{ symbol: "COST", sector: "Consumer" },
		{ symbol: "HD", sector: "Consumer" },
		{ symbol: "MCD", sector: "Consumer" },
		{ symbol: "NKE", sector: "Consumer" },
		{ symbol: "PG", sector: "Consumer" },
		{ symbol: "KO", sector: "Consumer" },
	],
	[
		{ symbol: "CAT", sector: "Industrials" },
		{ symbol: "GE", sector: "Industrials" },
		{ symbol: "HON", sector: "Industrials" },
		{ symbol: "UPS", sector: "Industrials" },
		{ symbol: "DE", sector: "Industrials" },
		{ symbol: "LMT", sector: "Industrials" },
		{ symbol: "RTX", sector: "Industrials" },
		{ symbol: "UNP", sector: "Industrials" },
	],
	[
		{ symbol: "XOM", sector: "Energy" },
		{ symbol: "CVX", sector: "Energy" },
		{ symbol: "COP", sector: "Energy" },
		{ symbol: "SLB", sector: "Energy" },
		{ symbol: "EOG", sector: "Energy" },
		{ symbol: "NEE", sector: "Utilities" },
		{ symbol: "DUK", sector: "Utilities" },
		{ symbol: "SO", sector: "Utilities" },
	],
	[
		{ symbol: "TSLA", sector: "Consumer" },
		{ symbol: "DIS", sector: "Communication" },
		{ symbol: "T", sector: "Communication" },
		{ symbol: "VZ", sector: "Communication" },
		{ symbol: "LOW", sector: "Consumer" },
		{ symbol: "SBUX", sector: "Consumer" },
		{ symbol: "BKNG", sector: "Consumer" },
		{ symbol: "ADP", sector: "Industrials" },
	],
];

type StoredTelemetryLine = {
	recordedDate?: unknown;
	event?: unknown;
	outcome?: unknown;
	duration?: unknown;
	unavailableReason?: unknown;
	category?: unknown;
};

export type TransparentAnalysisObservationProgress = {
	totalLines: number;
	invalidLines: number;
	undatedRequestEvents: number;
	validRequests: number;
	distinctDays: number;
	todayRequests: number;
	remainingRequests: number;
	remainingDays: number;
	requestMinimumMet: boolean;
	dayMinimumMet: boolean;
	outcomes: Partial<Record<TransparentAnalysisRequestOutcome, number>>;
	durations: Partial<Record<TransparentAnalysisDurationBucket, number>>;
	failureCategories: Record<string, number>;
};

function increment(counts: Record<string, number>, key: string) {
	counts[key] = (counts[key] ?? 0) + 1;
}

function isRecordedDate(value: unknown): value is string {
	return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidInstrumentRequest(line: StoredTelemetryLine) {
	return (
		(line.outcome === "ready" ||
			line.outcome === "partial" ||
			line.outcome === "unavailable") &&
		line.unavailableReason !== "unsupported_instrument"
	);
}

export function transparentAnalysisObservationDate(date: Date) {
	return date.toISOString().slice(0, 10);
}

export function transparentAnalysisDailyCandidates(date: Date) {
	const utcDayNumber = Math.floor(date.getTime() / (24 * 60 * 60 * 1000));
	return DAILY_CANDIDATES[utcDayNumber % DAILY_CANDIDATES.length];
}

export function summarizeTransparentAnalysisObservation(
	contents: string,
	today = new Date(),
): TransparentAnalysisObservationProgress {
	const rawLines = contents.split(/\r?\n/).filter(Boolean);
	const parsed: StoredTelemetryLine[] = [];
	let invalidLines = 0;
	for (const rawLine of rawLines) {
		try {
			const value: unknown = JSON.parse(rawLine);
			if (!value || typeof value !== "object" || Array.isArray(value)) {
				invalidLines += 1;
				continue;
			}
			parsed.push(value as StoredTelemetryLine);
		} catch {
			invalidLines += 1;
		}
	}

	const requestLines = parsed.filter(
		(line) => line.event === "transparent_analysis_request",
	);
	const validRequests = requestLines.filter(
		(line) => isRecordedDate(line.recordedDate) && isValidInstrumentRequest(line),
	);
	const dates = new Set(validRequests.map((line) => line.recordedDate as string));
	const todayDate = transparentAnalysisObservationDate(today);
	const outcomes: Record<string, number> = {};
	const durations: Record<string, number> = {};
	for (const line of validRequests) {
		if (typeof line.outcome === "string") increment(outcomes, line.outcome);
		if (typeof line.duration === "string") increment(durations, line.duration);
	}
	const failureCategories: Record<string, number> = {};
	for (const line of parsed) {
		if (
			line.event === "transparent_analysis_operational_failure" &&
			typeof line.category === "string"
		) {
			increment(failureCategories, line.category);
		}
	}

	return {
		totalLines: rawLines.length,
		invalidLines,
		undatedRequestEvents: requestLines.filter(
			(line) => !isRecordedDate(line.recordedDate),
		).length,
		validRequests: validRequests.length,
		distinctDays: dates.size,
		todayRequests: validRequests.filter(
			(line) => line.recordedDate === todayDate,
		).length,
		remainingRequests: Math.max(
			0,
			TRANSPARENT_ANALYSIS_OBSERVATION_MINIMUM_REQUESTS - validRequests.length,
		),
		remainingDays: Math.max(
			0,
			TRANSPARENT_ANALYSIS_OBSERVATION_MINIMUM_DAYS - dates.size,
		),
		requestMinimumMet:
			validRequests.length >= TRANSPARENT_ANALYSIS_OBSERVATION_MINIMUM_REQUESTS,
		dayMinimumMet: dates.size >= TRANSPARENT_ANALYSIS_OBSERVATION_MINIMUM_DAYS,
		outcomes,
		durations,
		failureCategories,
	};
}

export function validateTransparentAnalysisObservationArguments(
	args: readonly string[],
) {
	const unsupported = args.filter((argument) => argument !== "--help" && argument !== "-h");
	if (unsupported.length > 0) {
		throw new Error(`Unsupported argument: ${unsupported[0]}`);
	}
	return { help: args.includes("--help") || args.includes("-h") };
}
