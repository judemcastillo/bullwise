import type { DailySwingBatchDiagnosticReport } from "@/lib/analysis/batch-diagnostics.types";
import type { DailySwingPortfolioBacktestReport } from "@/lib/analysis/portfolio-backtest.types";

export const DAILY_SWING_V3_CONFIRMATION_ID =
	"daily-swing-v3-ranked-portfolio-2026-08-19";

export const DAILY_SWING_V3_CONFIRMATION_THRESHOLDS = {
	minimumAcceptedTrades: 300,
	minimumAverageRMultiple: 0.1,
	minimumProfitFactor: 1.2,
	minimumAnnualizedReturnPercent: 5,
	maximumDrawdownPercent: 15,
	minimumAnnualizedReturnImprovementPercent: 0.5,
	minimumAverageRImprovement: 0.02,
} as const;

export type V3ConfirmationCriterion = {
	metric: keyof typeof DAILY_SWING_V3_CONFIRMATION_THRESHOLDS;
	actual: number | null;
	threshold: number;
	operator: ">=" | "<=";
	passed: boolean;
};

export type DailySwingV3Confirmation = {
	confirmationId: typeof DAILY_SWING_V3_CONFIRMATION_ID;
	passed: boolean;
	criteria: V3ConfirmationCriterion[];
	warnings: string[];
};

function minimum(
	metric: V3ConfirmationCriterion["metric"],
	actual: number | null,
	threshold: number,
): V3ConfirmationCriterion {
	return {
		metric,
		actual,
		threshold,
		operator: ">=",
		passed: actual !== null && actual >= threshold,
	};
}

function maximum(
	metric: V3ConfirmationCriterion["metric"],
	actual: number | null,
	threshold: number,
): V3ConfirmationCriterion {
	return {
		metric,
		actual,
		threshold,
		operator: "<=",
		passed: actual !== null && actual <= threshold,
	};
}

export function evaluateDailySwingV3Confirmation(input: {
	source: DailySwingBatchDiagnosticReport;
	baseline: DailySwingPortfolioBacktestReport;
	ranked: DailySwingPortfolioBacktestReport;
}): DailySwingV3Confirmation {
	if (input.baseline.configuration.candidateSelectionPolicy !== "symbol") {
		throw new Error("The v3 baseline must use symbol selection");
	}
	if (
		input.ranked.configuration.candidateSelectionPolicy !==
		"v3_signal_quality"
	) {
		throw new Error("The v3 candidate must use v3 signal-quality selection");
	}
	if (input.baseline.candidateTrades !== input.ranked.candidateTrades) {
		throw new Error("Baseline and ranked portfolios require identical candidates");
	}
	const annualizedImprovement =
		input.ranked.performance.annualizedReturnPercent === null ||
		input.baseline.performance.annualizedReturnPercent === null
			? null
			: input.ranked.performance.annualizedReturnPercent -
				input.baseline.performance.annualizedReturnPercent;
	const averageRImprovement =
		input.ranked.performance.averageRMultiple === null ||
		input.baseline.performance.averageRMultiple === null
			? null
			: input.ranked.performance.averageRMultiple -
				input.baseline.performance.averageRMultiple;
	const criteria = [
		minimum(
			"minimumAcceptedTrades",
			input.ranked.performance.tradeCount,
			DAILY_SWING_V3_CONFIRMATION_THRESHOLDS.minimumAcceptedTrades,
		),
		minimum(
			"minimumAverageRMultiple",
			input.ranked.performance.averageRMultiple,
			DAILY_SWING_V3_CONFIRMATION_THRESHOLDS.minimumAverageRMultiple,
		),
		minimum(
			"minimumProfitFactor",
			input.ranked.performance.profitFactor,
			DAILY_SWING_V3_CONFIRMATION_THRESHOLDS.minimumProfitFactor,
		),
		minimum(
			"minimumAnnualizedReturnPercent",
			input.ranked.performance.annualizedReturnPercent,
			DAILY_SWING_V3_CONFIRMATION_THRESHOLDS.minimumAnnualizedReturnPercent,
		),
		maximum(
			"maximumDrawdownPercent",
			input.ranked.performance.maximumDrawdownPercent,
			DAILY_SWING_V3_CONFIRMATION_THRESHOLDS.maximumDrawdownPercent,
		),
		minimum(
			"minimumAnnualizedReturnImprovementPercent",
			annualizedImprovement,
			DAILY_SWING_V3_CONFIRMATION_THRESHOLDS.minimumAnnualizedReturnImprovementPercent,
		),
		minimum(
			"minimumAverageRImprovement",
			averageRImprovement,
			DAILY_SWING_V3_CONFIRMATION_THRESHOLDS.minimumAverageRImprovement,
		),
	];
	return {
		confirmationId: DAILY_SWING_V3_CONFIRMATION_ID,
		passed:
			input.source.coverage.researchReady &&
			criteria.every((criterion) => criterion.passed),
		criteria,
		warnings: [
			"This sequential v3 experiment follows earlier development and v2 testing, so passing would justify forward paper validation rather than product exposure.",
			"Both portfolios reuse the same candidate trades and differ only in same-session capital-allocation priority.",
			...(input.source.coverage.researchReady
				? []
				: ["The v3 source universe failed the minimum historical coverage gate."]),
		],
	};
}
