import {
	analyzeDailySwing,
	type DailySwingAnalysisInput,
} from "@/lib/analysis/technical-analysis";
import {
	DAILY_SWING_V2_STRATEGY_VERSION,
	type TechnicalAnalysisResult,
} from "@/lib/analysis/technical-analysis.types";

export const DAILY_SWING_V2_RULES = {
	direction: "long",
	setupType: "breakout",
	requiredStatus: "active",
	minimumRelativeStrength20PercentExclusive: 0,
	allowedParticipation: ["normal", "strong"],
} as const;

export function applyDailySwingV2Rules(
	result: TechnicalAnalysisResult,
): TechnicalAnalysisResult {
	if (result.status === "unavailable") {
		return { ...result, strategyVersion: DAILY_SWING_V2_STRATEGY_VERSION };
	}
	const plan = result.tradePlan;
	if (!plan) {
		return { ...result, strategyVersion: DAILY_SWING_V2_STRATEGY_VERSION };
	}
	const rejections: string[] = [];
	if (plan.direction !== DAILY_SWING_V2_RULES.direction) {
		rejections.push("The setup is not long.");
	}
	if (plan.entry.type !== DAILY_SWING_V2_RULES.setupType) {
		rejections.push("The setup is not a breakout.");
	}
	if (plan.status !== DAILY_SWING_V2_RULES.requiredStatus) {
		rejections.push("The breakout is not active on the completed signal bar.");
	}
	if (
		result.indicators.relativeStrength20Percent === null ||
		result.indicators.relativeStrength20Percent <=
			DAILY_SWING_V2_RULES.minimumRelativeStrength20PercentExclusive
	) {
		rejections.push("Twenty-day relative strength versus the benchmark is not positive.");
	}
	if (
		!DAILY_SWING_V2_RULES.allowedParticipation.includes(
			result.assessments.participation.state as "normal" | "strong",
		)
	) {
		rejections.push("Volume participation is not normal or strong.");
	}
	if (rejections.length === 0) {
		return { ...result, strategyVersion: DAILY_SWING_V2_STRATEGY_VERSION };
	}
	return {
		...result,
		strategyVersion: DAILY_SWING_V2_STRATEGY_VERSION,
		signal: {
			action: "no_trade",
			status: "none",
			evidenceStrength: result.signal.evidenceStrength,
			reasons: ["The setup did not pass the frozen daily-swing v2 filter."],
			counterEvidence: rejections,
		},
		tradePlan: null,
	};
}

/** Applies the frozen v2 confirmation filter to the unchanged v1 plan geometry. */
export function analyzeDailySwingV2(
	input: DailySwingAnalysisInput,
): TechnicalAnalysisResult {
	return applyDailySwingV2Rules(
		analyzeDailySwing({ ...input, allowShortSetups: false }),
	);
}
