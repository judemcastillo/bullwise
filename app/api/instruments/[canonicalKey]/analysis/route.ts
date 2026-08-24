import { handleTransparentAnalysisRequest } from "@/lib/analysis/transparent-analysis-route";
import { getTransparentAnalysisPanel } from "@/lib/analysis/transparent-analysis-service";
import { requireUser } from "@/lib/auth/require-user";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ canonicalKey: string }> },
) {
	const { canonicalKey } = await params;
	return handleTransparentAnalysisRequest(canonicalKey, {
		authenticate: requireUser,
		getAnalysis: getTransparentAnalysisPanel,
	});
}
