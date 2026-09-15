import { inngest } from "@/lib/inngest/client";
import {
	continueMarketNewsSummaryQueue,
	deliverMarketNewsSummary,
	deliverAlertEmails,
	monitorPriceAlerts,
	sendDailyNewsSummary,
	sendSignUpEmail,
	sendWeeklyNewsSummary,
} from "@/lib/inngest/functions";
import {
	dailyInboxNews,
	weeklyInboxNews,
	queueInboxNews,
	deliverInboxNewsDigest,
	deliverInboxPriceAlerts,
} from "@/lib/inngest/notifications";
import { serve } from "inngest/next";

export const { GET, POST, PUT } = serve({
	client: inngest,
	functions: [
		dailyInboxNews,
		weeklyInboxNews,
		queueInboxNews,
		deliverInboxNewsDigest,
		deliverInboxPriceAlerts,
		sendSignUpEmail,
		sendDailyNewsSummary,
		sendWeeklyNewsSummary,
		continueMarketNewsSummaryQueue,
		deliverMarketNewsSummary,
		monitorPriceAlerts,
		deliverAlertEmails,
	],
});
