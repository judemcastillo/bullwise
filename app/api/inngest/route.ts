import { inngest } from "@/lib/inngest/client";
import {
	deliverMarketNewsSummary,
	deliverAlertEmails,
	monitorPriceAlerts,
	sendDailyNewsSummary,
	sendSignUpEmail,
	sendWeeklyNewsSummary,
} from "@/lib/inngest/functions";
import { serve } from "inngest/next";

export const { GET, POST, PUT } = serve({
	client: inngest,
	functions: [
		sendSignUpEmail,
		sendDailyNewsSummary,
		sendWeeklyNewsSummary,
		deliverMarketNewsSummary,
		monitorPriceAlerts,
		deliverAlertEmails,
	],
});
