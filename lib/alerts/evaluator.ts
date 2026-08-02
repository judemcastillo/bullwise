import type { MarketQuote } from "@/lib/market-data/types";
import type { AlertOperator, AlertStatus } from "@/types/alerts";

export const DEFAULT_MAX_QUOTE_AGE_MS = 5 * 60 * 1000;

export type AlertEvaluationInput = {
	status: AlertStatus;
	operator: AlertOperator;
	threshold: string;
	previousValue?: string | null;
	expectedCurrency: string;
	quote: MarketQuote;
	now?: Date;
	maxQuoteAgeMs?: number;
};

export type AlertEvaluationReason =
	| "triggered"
	| "inactive"
	| "invalid_quote"
	| "stale_quote"
	| "currency_mismatch"
	| "primed"
	| "no_crossing";

export type AlertEvaluationResult = {
	shouldTrigger: boolean;
	reason: AlertEvaluationReason;
	nextObservedValue?: string;
};

type ParsedDecimal = {
	coefficient: bigint;
	scale: number;
};

const DECIMAL_PATTERN = /^(?:\+)?(\d+)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/;
const MAX_DECIMAL_LENGTH = 80;
const MAX_ABSOLUTE_EXPONENT = 40;

function parsePositiveDecimal(value: string): ParsedDecimal | null {
	const normalized = value.trim();
	if (!normalized || normalized.length > MAX_DECIMAL_LENGTH) return null;

	const match = DECIMAL_PATTERN.exec(normalized);
	if (!match) return null;

	const exponent = Number(match[3] ?? "0");
	if (
		!Number.isSafeInteger(exponent) ||
		Math.abs(exponent) > MAX_ABSOLUTE_EXPONENT
	) {
		return null;
	}

	const fraction = match[2] ?? "";
	let coefficient = BigInt(`${match[1]}${fraction}`);
	if (coefficient <= BigInt(0)) return null;

	let scale = fraction.length - exponent;
	if (scale < 0) {
		coefficient *= BigInt(10) ** BigInt(-scale);
		scale = 0;
	}

	if (scale > MAX_ABSOLUTE_EXPONENT) return null;

	while (
		scale > 0 &&
		coefficient % BigInt(10) === BigInt(0)
	) {
		coefficient /= BigInt(10);
		scale -= 1;
	}

	return { coefficient, scale };
}

export function comparePriceValues(
	leftValue: string,
	rightValue: string,
): -1 | 0 | 1 | null {
	const left = parsePositiveDecimal(leftValue);
	const right = parsePositiveDecimal(rightValue);
	if (!left || !right) return null;

	const commonScale = Math.max(left.scale, right.scale);
	const leftCoefficient =
		left.coefficient * BigInt(10) ** BigInt(commonScale - left.scale);
	const rightCoefficient =
		right.coefficient * BigInt(10) ** BigInt(commonScale - right.scale);

	if (leftCoefficient < rightCoefficient) return -1;
	if (leftCoefficient > rightCoefficient) return 1;
	return 0;
}

export function evaluatePriceAlert({
	status,
	operator,
	threshold,
	previousValue,
	expectedCurrency,
	quote,
	now = new Date(),
	maxQuoteAgeMs = DEFAULT_MAX_QUOTE_AGE_MS,
}: AlertEvaluationInput): AlertEvaluationResult {
	if (status !== "active") {
		return { shouldTrigger: false, reason: "inactive" };
	}

	const currentToThreshold = comparePriceValues(quote.price, threshold);
	const quoteTime = quote.observedAt.getTime();
	const nowTime = now.getTime();
	const quoteAgeMs = nowTime - quoteTime;

	if (
		currentToThreshold === null ||
		!Number.isFinite(quoteTime) ||
		!Number.isFinite(nowTime) ||
		!Number.isFinite(maxQuoteAgeMs) ||
		maxQuoteAgeMs < 0 ||
		quoteAgeMs < -60_000
	) {
		return { shouldTrigger: false, reason: "invalid_quote" };
	}

	if (quoteAgeMs > maxQuoteAgeMs) {
		return { shouldTrigger: false, reason: "stale_quote" };
	}

	if (
		quote.currency.trim().toUpperCase() !==
		expectedCurrency.trim().toUpperCase()
	) {
		return { shouldTrigger: false, reason: "currency_mismatch" };
	}

	if (!previousValue) {
		return {
			shouldTrigger: false,
			reason: "primed",
			nextObservedValue: quote.price,
		};
	}

	const previousToThreshold = comparePriceValues(previousValue, threshold);
	if (previousToThreshold === null) {
		return { shouldTrigger: false, reason: "invalid_quote" };
	}

	const crossed =
		operator === "crosses_above"
			? previousToThreshold < 0 && currentToThreshold >= 0
			: previousToThreshold > 0 && currentToThreshold <= 0;

	return {
		shouldTrigger: crossed,
		reason: crossed ? "triggered" : "no_crossing",
		nextObservedValue: quote.price,
	};
}

export function buildOneTimeAlertDedupeKey(alertId: string) {
	const normalizedAlertId = alertId.trim();
	if (!normalizedAlertId) throw new Error("Alert ID is required");
	return `price-alert:${normalizedAlertId}:once`;
}
