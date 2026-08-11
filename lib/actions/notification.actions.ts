"use server";

import { AccessControlError } from "@/lib/auth/access-policy";
import { requireCompletedUser } from "@/lib/auth/require-user";
import { validateMarketNewsPreferenceInput } from "@/lib/email/communication-policy";
import { saveMarketNewsPreference } from "@/lib/email/market-news-preference";
import { revalidatePath } from "next/cache";

export const updateMarketNewsPreference = async (input: unknown) => {
	const validated = validateMarketNewsPreferenceInput(input);
	if (!validated.success) return validated;

	try {
		const user = await requireCompletedUser();
		await saveMarketNewsPreference({
			userId: user.id,
			...validated.data,
			consentSource: "notification_settings",
		});

		revalidatePath("/settings/notifications");
		return { success: true } as const;
	} catch (error) {
		if (error instanceof AccessControlError) {
			return { success: false, error: error.message } as const;
		}
		console.error("Failed to update market news email preference", error);
		return {
			success: false,
			error: "Unable to save your email preference. Please try again.",
		} as const;
	}
};
