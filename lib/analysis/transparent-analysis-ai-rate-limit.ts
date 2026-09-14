export const ANALYSIS_AI_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
export const ANALYSIS_AI_MAX_GENERATIONS_PER_WINDOW = 20;

export function evaluateTransparentAnalysisAiQuota(
	attempts: readonly Date[],
	now: Date,
) {
	const windowStart = now.getTime() - ANALYSIS_AI_RATE_LIMIT_WINDOW_MS;
	const activeAttempts = attempts
		.filter((attempt) => attempt.getTime() > windowStart)
		.sort((left, right) => left.getTime() - right.getTime());
	return activeAttempts.length >= ANALYSIS_AI_MAX_GENERATIONS_PER_WINDOW
		? { allowed: false as const, attempts: activeAttempts }
		: { allowed: true as const, attempts: [...activeAttempts, now] };
}
