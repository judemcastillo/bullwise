import "server-only";

import { createHash } from "node:crypto";
import { connectToDatabase } from "@/database/mongoose";
import AnalysisAiCache from "@/database/models/analysis-ai-cache.model";
import AnalysisAiRateLimit from "@/database/models/analysis-ai-rate-limit.model";
import {
	buildTransparentAnalysisAiSynthesisInput,
	TRANSPARENT_ANALYSIS_AI_SYNTHESIS_PROMPT_SHA256,
	validateTransparentAnalysisAiSynthesis,
	type TransparentAnalysisAiSynthesis,
} from "@/lib/analysis/transparent-analysis-ai-production";
import {
	ANALYSIS_AI_RATE_LIMIT_WINDOW_MS,
	evaluateTransparentAnalysisAiQuota,
} from "@/lib/analysis/transparent-analysis-ai-rate-limit";
import type { AnalysisPanelAvailableResponse } from "@/lib/analysis/transparent-analysis-panel.types";

export const ANALYSIS_AI_CACHE_TTL_MS = 48 * 60 * 60 * 1000;
const MAX_WRITE_ATTEMPTS = 5;

function cacheKey(panel: AnalysisPanelAvailableResponse) {
	const input = buildTransparentAnalysisAiSynthesisInput(panel);
	if (!input) throw new Error("Available analysis is required for AI caching");
	return createHash("sha256")
		.update(`${TRANSPARENT_ANALYSIS_AI_SYNTHESIS_PROMPT_SHA256}|${JSON.stringify(input)}`)
		.digest("hex");
}

function isDuplicateKeyError(error: unknown) {
	return Boolean(
		error && typeof error === "object" && "code" in error && error.code === 11000,
	);
}

export async function getCachedTransparentAnalysisAiSynthesis(
	panel: AnalysisPanelAvailableResponse,
	now = new Date(),
) {
	await connectToDatabase();
	const cached = await AnalysisAiCache.findOne({
		cacheKey: cacheKey(panel),
		expiresAt: { $gt: now },
	}).lean();
	if (!cached) return null;
	const input = buildTransparentAnalysisAiSynthesisInput(panel);
	return input && validateTransparentAnalysisAiSynthesis(input, cached.synthesis)
		? cached.synthesis
		: null;
}

export async function cacheTransparentAnalysisAiSynthesis(
	panel: AnalysisPanelAvailableResponse,
	synthesis: TransparentAnalysisAiSynthesis,
	now = new Date(),
) {
	await connectToDatabase();
	await AnalysisAiCache.updateOne(
		{ cacheKey: cacheKey(panel) },
		{
			$set: {
				synthesis,
				expiresAt: new Date(now.getTime() + ANALYSIS_AI_CACHE_TTL_MS),
			},
		},
		{ upsert: true },
	);
}

export async function consumeTransparentAnalysisAiQuota(
	userId: string,
	now = new Date(),
) {
	await connectToDatabase();
	const expiresAt = new Date(now.getTime() + ANALYSIS_AI_RATE_LIMIT_WINDOW_MS);

	for (let writeAttempt = 0; writeAttempt < MAX_WRITE_ATTEMPTS; writeAttempt++) {
		let state = await AnalysisAiRateLimit.findOne({ userId }).lean();
		if (!state) {
			try {
				state = await AnalysisAiRateLimit.create({
					userId,
					attempts: [],
					revision: 0,
					expiresAt,
				});
			} catch (error) {
				if (isDuplicateKeyError(error)) continue;
				throw error;
			}
		}

		const decision = evaluateTransparentAnalysisAiQuota(state.attempts, now);
		if (!decision.allowed) return false;
		const update = await AnalysisAiRateLimit.updateOne(
			{ userId, revision: state.revision },
			{
				$set: { attempts: decision.attempts, expiresAt },
				$inc: { revision: 1 },
			},
		);
		if (update.modifiedCount === 1) return true;
	}

	return false;
}
