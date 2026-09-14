import { GoogleTransparentAnalysisAiProvider } from "@/lib/analysis/google-transparent-analysis-ai-provider";
import {
	cacheTransparentAnalysisAiSynthesis,
	consumeTransparentAnalysisAiQuota,
	getCachedTransparentAnalysisAiSynthesis,
} from "@/lib/analysis/transparent-analysis-ai-access";
import { generateTransparentAnalysisAiProductionOverview } from "@/lib/analysis/transparent-analysis-ai-production";
import { handleTransparentAnalysisAiProductionRequest } from "@/lib/analysis/transparent-analysis-ai-production-route";
import { getTransparentAnalysisPanel } from "@/lib/analysis/transparent-analysis-service";
import { recordTransparentAnalysisTelemetry } from "@/lib/analysis/transparent-analysis-telemetry-logger";
import { requireUser } from "@/lib/auth/require-user";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
	request: Request,
	{ params }: { params: Promise<{ canonicalKey: string }> },
) {
	const { canonicalKey } = await params;
	return handleTransparentAnalysisAiProductionRequest(
		canonicalKey,
		request.signal,
		{
			authenticate: requireUser,
			getAnalysis: getTransparentAnalysisPanel,
			getCached: async (panel) =>
				panel.status === "unavailable"
					? null
					: getCachedTransparentAnalysisAiSynthesis(panel),
			consumeQuota: consumeTransparentAnalysisAiQuota,
			cache: async (panel, synthesis) => {
				if (panel.status !== "unavailable") {
					await cacheTransparentAnalysisAiSynthesis(panel, synthesis);
				}
			},
			monotonicNow: () => performance.now(),
			recordTelemetry: recordTransparentAnalysisTelemetry,
			generate: async (panel, signal) => {
				const apiKey = process.env.GEMINI_API_KEY?.trim();
				if (!apiKey) return { kind: "fallback", reason: "provider_failure" };
				const google = new GoogleTransparentAnalysisAiProvider({ apiKey });
				return generateTransparentAnalysisAiProductionOverview({
					panel,
					provider: {
						generate: async (request) =>
							(await google.generateForEvaluation(request)).output,
					},
					signal,
				});
			},
		},
	);
}
