import { GoogleTransparentAnalysisAiProvider } from "@/lib/analysis/google-transparent-analysis-ai-provider";
import { generateTransparentAnalysisAiProductionOverview } from "@/lib/analysis/transparent-analysis-ai-production";
import { handleTransparentAnalysisAiProductionRequest } from "@/lib/analysis/transparent-analysis-ai-production-route";
import { getTransparentAnalysisPanel } from "@/lib/analysis/transparent-analysis-service";
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
			generate: async (panel, signal) => {
				const apiKey = process.env.GEMINI_API_KEY?.trim();
				if (!apiKey) return { kind: "fallback" };
				return generateTransparentAnalysisAiProductionOverview({
					panel,
					provider: new GoogleTransparentAnalysisAiProvider({ apiKey }),
					signal,
				});
			},
		},
	);
}
