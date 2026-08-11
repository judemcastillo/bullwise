import { unsubscribeFromMarketNews } from "@/lib/email/market-news-preference";
import { verifyDailyNewsUnsubscribeToken } from "@/lib/email/unsubscribe-token";

export async function POST(request: Request) {
	const token = new URL(request.url).searchParams.get("token");
	const userId = token ? verifyDailyNewsUnsubscribeToken(token) : null;

	if (!userId) {
		return Response.json({ error: "Invalid unsubscribe token." }, { status: 400 });
	}

	await unsubscribeFromMarketNews({ userId });
	return Response.json({ success: true });
}
