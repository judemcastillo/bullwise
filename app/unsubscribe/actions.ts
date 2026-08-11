"use server";

import { unsubscribeFromMarketNews } from "@/lib/email/market-news-preference";
import { verifyDailyNewsUnsubscribeToken } from "@/lib/email/unsubscribe-token";
import { redirect } from "next/navigation";

export const unsubscribeFromDailyNews = async (formData: FormData) => {
	const token = formData.get("token");
	const userId =
		typeof token === "string"
			? verifyDailyNewsUnsubscribeToken(token)
			: null;

	if (!userId) redirect("/unsubscribe?status=invalid");

	await unsubscribeFromMarketNews({ userId });
	redirect("/unsubscribe?status=success");
};
