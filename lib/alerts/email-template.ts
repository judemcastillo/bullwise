import type { AlertEmailJob } from "@/lib/alerts/email-delivery";

export function escapeHtml(value: string) {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

function formatPrice(value: string, currency: string) {
	const amount = Number(value);
	if (!Number.isFinite(amount)) return `${value} ${currency}`;

	try {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency,
			maximumFractionDigits: 8,
		}).format(amount);
	} catch {
		return `${value} ${currency}`;
	}
}

function dashboardUrl() {
	const configured =
		process.env.NEXT_PUBLIC_BASE_URL || process.env.BETTER_AUTH_URL;
	try {
		return configured ? new URL(configured).origin : "http://localhost:3000";
	} catch {
		return "http://localhost:3000";
	}
}

export function renderAlertEmail(job: AlertEmailJob) {
	const isAbove = job.operator === "crosses_above";
	const direction = isAbove ? "above" : "below";
	const symbol = escapeHtml(job.instrument.displaySymbol);
	const name = escapeHtml(job.instrument.name);
	const observed = escapeHtml(
		formatPrice(job.observedValue, job.instrument.quoteCurrency),
	);
	const threshold = escapeHtml(
		formatPrice(job.threshold, job.instrument.quoteCurrency),
	);
	const timestamp = escapeHtml(job.triggeredAt.toISOString());
	const url = escapeHtml(dashboardUrl());
	const accent = isAbove ? "#10b981" : "#ef4444";
	const testPrefix = job.source === "development_test" ? "[Test] " : "";
	const subject = `${testPrefix}Price alert: ${job.instrument.displaySymbol} crossed ${direction} ${formatPrice(job.threshold, job.instrument.quoteCurrency)}`;
	const text = `${job.instrument.displaySymbol} (${job.instrument.name}) crossed ${direction} your ${formatPrice(job.threshold, job.instrument.quoteCurrency)} target. Observed price: ${formatPrice(job.observedValue, job.instrument.quoteCurrency)} at ${job.triggeredAt.toISOString()}. View Bull Wise: ${dashboardUrl()}`;
	const testBanner =
		job.source === "development_test"
			? '<p style="margin:0 0 20px;padding:10px;background:#1f2937;border-radius:6px;color:#fdd458;font-weight:700">Development test email — no market alert was triggered.</p>'
			: "";
	const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;background:#050505;color:#fff;font-family:Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#141414;border:1px solid #30333a;border-radius:10px">
<tr><td style="padding:32px">${testBanner}<p style="margin:0 0 12px;color:${accent};font-weight:700">PRICE ALERT</p>
<h1 style="margin:0 0 8px;font-size:28px">${symbol}</h1><p style="margin:0 0 28px;color:#9ca3af">${name}</p>
<p style="font-size:18px;line-height:1.6">The price crossed <strong>${direction}</strong> your target of <strong>${threshold}</strong>.</p>
<div style="margin:24px 0;padding:20px;background:#212328;border-radius:8px"><p style="margin:0 0 6px;color:#9ca3af">Observed price</p><p style="margin:0;color:${accent};font-size:32px;font-weight:700">${observed}</p></div>
<p style="color:#9ca3af;font-size:14px">Triggered at ${timestamp}</p>
<a href="${url}" style="display:inline-block;margin-top:16px;padding:14px 22px;background:#fdd458;color:#000;text-decoration:none;border-radius:8px;font-weight:700">View Bull Wise</a>
<p style="margin:32px 0 0;color:#6b7280;font-size:12px;line-height:1.5">This is a notification for an alert you created. It is not financial advice.</p>
</td></tr></table></td></tr></table></body></html>`;

	return { subject, text, html };
}
