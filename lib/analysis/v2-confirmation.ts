import type { DailySwingBatchDiagnosticReport } from "@/lib/analysis/batch-diagnostics.types";
import { DAILY_SWING_V2_STRATEGY_VERSION } from "@/lib/analysis/technical-analysis.types";

export const DAILY_SWING_V2_CONFIRMATION_ID =
	"daily-swing-v2-cross-asset-etf-2026-08-19";

export const DAILY_SWING_V2_CONFIRMATION_THRESHOLDS = {
	minimumTrades: 150,
	minimumAverageRMultiple: 0.08,
	minimumProfitFactor: 1.15,
	minimumProfitableInstrumentPercent: 60,
	maximumAverageDrawdownPercent: 10,
	minimumStressedProfitFactor: 0.9,
} as const;

export type V2ConfirmationCriterion = {
	metric: keyof typeof DAILY_SWING_V2_CONFIRMATION_THRESHOLDS;
	actual: number | null;
	threshold: number;
	operator: ">=" | "<=";
	passed: boolean;
};

export type DailySwingV2Confirmation = {
	confirmationId: typeof DAILY_SWING_V2_CONFIRMATION_ID;
	strategyVersion: typeof DAILY_SWING_V2_STRATEGY_VERSION;
	passed: boolean;
	criteria: V2ConfirmationCriterion[];
	warnings: string[];
};

function minimum(
	metric: V2ConfirmationCriterion["metric"],
	actual: number | null,
	threshold: number,
): V2ConfirmationCriterion {
	return {
		metric,
		actual,
		threshold,
		operator: ">=",
		passed: actual !== null && actual >= threshold,
	};
}

function maximum(
	metric: V2ConfirmationCriterion["metric"],
	actual: number | null,
	threshold: number,
): V2ConfirmationCriterion {
	return {
		metric,
		actual,
		threshold,
		operator: "<=",
		passed: actual !== null && actual <= threshold,
	};
}

export function evaluateDailySwingV2Confirmation(
	report: DailySwingBatchDiagnosticReport,
): DailySwingV2Confirmation {
	if (
		report.reports.some(
			(item) => item.strategyVersion !== DAILY_SWING_V2_STRATEGY_VERSION,
		)
	) {
		throw new Error("The v2 confirmation requires only daily-swing v2 reports");
	}
	const aggregate = report.aggregate;
	const stressed = report.diagnostics.frictionSensitivity.find(
		(item) => item.scenario === "stressed",
	);
	const profitableInstrumentPercent =
		aggregate.instrumentsTested === 0
			? null
			: (aggregate.profitableInstrumentCount / aggregate.instrumentsTested) * 100;
	const criteria = [
		minimum(
			"minimumTrades",
			aggregate.totalTrades,
			DAILY_SWING_V2_CONFIRMATION_THRESHOLDS.minimumTrades,
		),
		minimum(
			"minimumAverageRMultiple",
			aggregate.pooledAverageRMultiple,
			DAILY_SWING_V2_CONFIRMATION_THRESHOLDS.minimumAverageRMultiple,
		),
		minimum(
			"minimumProfitFactor",
			aggregate.pooledProfitFactor,
			DAILY_SWING_V2_CONFIRMATION_THRESHOLDS.minimumProfitFactor,
		),
		minimum(
			"minimumProfitableInstrumentPercent",
			profitableInstrumentPercent,
			DAILY_SWING_V2_CONFIRMATION_THRESHOLDS.minimumProfitableInstrumentPercent,
		),
		maximum(
			"maximumAverageDrawdownPercent",
			aggregate.averageMaximumDrawdownPercent,
			DAILY_SWING_V2_CONFIRMATION_THRESHOLDS.maximumAverageDrawdownPercent,
		),
		minimum(
			"minimumStressedProfitFactor",
			stressed?.pooledProfitFactor ?? null,
			DAILY_SWING_V2_CONFIRMATION_THRESHOLDS.minimumStressedProfitFactor,
		),
	];
	return {
		confirmationId: DAILY_SWING_V2_CONFIRMATION_ID,
		strategyVersion: DAILY_SWING_V2_STRATEGY_VERSION,
		passed: report.coverage.researchReady && criteria.every((item) => item.passed),
		criteria,
		warnings: [
			"This is a one-shot confirmation on a new instrument universe, not a portfolio simulation.",
			"Passing these thresholds would justify further validation, not customer-facing signals or live trading.",
			...(report.coverage.researchReady
				? []
				: ["The holdout failed the minimum historical coverage gate."]),
		],
	};
}
