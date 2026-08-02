export const ALERT_EMAIL_DELIVERY_CRON = "* * * * *";
export const ALERT_EMAIL_DELIVERY_EVENT = "app/alerts.delivery.requested";

export const ALERT_EMAIL_DELIVERY_FUNCTION_CONFIG = {
	id: "deliver-alert-emails",
	name: "Deliver alert emails",
	description: "Deliver pending price-alert emails from the durable outbox",
	triggers: [
		{ cron: ALERT_EMAIL_DELIVERY_CRON },
		{ event: ALERT_EMAIL_DELIVERY_EVENT },
	],
	concurrency: 1,
	singleton: { mode: "skip" as const },
	retries: 3 as const,
};
