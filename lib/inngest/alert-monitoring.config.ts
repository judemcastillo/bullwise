export const ALERT_MONITORING_CRON = "* * * * *";
export const ALERT_MONITORING_EVENT = "app/alerts.monitor.requested";

export const ALERT_MONITORING_FUNCTION_CONFIG = {
	id: "monitor-price-alerts",
	name: "Monitor price alerts",
	description: "Evaluate due price alerts against current market quotes",
	triggers: [
		{ cron: ALERT_MONITORING_CRON },
		{ event: ALERT_MONITORING_EVENT },
	],
	concurrency: 1,
	singleton: { mode: "skip" as const },
	retries: 3 as const,
};
