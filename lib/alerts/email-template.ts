import type { AlertEmailJob } from "@/lib/alerts/email-delivery";
import {
	escapeHtml,
	requireSafeEmailUrl,
	sanitizeEmailHeader,
} from "@/lib/email/content-safety";

export { escapeHtml } from "@/lib/email/content-safety";

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

function formatTimestamp(value: Date) {
	const isoTimestamp = value.toISOString();
	return `${isoTimestamp.slice(0, 10)} ${isoTimestamp.slice(11, 19)} (UTC)`;
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
	const formattedTimestamp = formatTimestamp(job.triggeredAt);
	const timestamp = escapeHtml(formattedTimestamp);
	const safeDashboardUrl = requireSafeEmailUrl(dashboardUrl());
	const url = escapeHtml(safeDashboardUrl);
	const accent = isAbove ? "#10b981" : "#ef4444";
	const testPrefix = job.source === "development_test" ? "[Test] " : "";
	const subject = sanitizeEmailHeader(
		`${testPrefix}Price alert: ${job.instrument.displaySymbol} crossed ${direction} ${formatPrice(job.threshold, job.instrument.quoteCurrency)}`,
	);
	const text = `${job.instrument.displaySymbol} (${job.instrument.name}) crossed ${direction} your ${formatPrice(job.threshold, job.instrument.quoteCurrency)} target. Observed price: ${formatPrice(job.observedValue, job.instrument.quoteCurrency)} at ${formattedTimestamp}. View Bull Wise: ${safeDashboardUrl}`;
	const testBanner =
		job.source === "development_test"
			? '<p style="margin:0 0 20px;padding:10px;background-color:#1f2937;border-radius:6px;color:#fdd458;font-weight:700">Development test email — no market alert was triggered.</p>'
			: "";
	const html = `<!doctype html>
	<html
	lang="en"
	style="
		background-color: #050505;
	"
>
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<meta name="format-detection" content="telephone=no" />
		<meta name="x-apple-disable-message-reformatting" />
		<meta name="color-scheme" content="dark" />
		<meta name="supported-color-schemes" content="dark" />
		<!--[if mso]>
		<noscript>
			<xml>
				<o:OfficeDocumentSettings>
					<o:AllowPNG/>
					<o:PixelsPerInch>96</o:PixelsPerInch>
				</o:OfficeDocumentSettings>
			</xml>
		</noscript>
		<![endif]-->
		<style>
			:root {
				color-scheme: dark only;
				supported-color-schemes: dark only;
			}
			html,
			body,
			.email-body,
			.email-background {
				background-color: #050505 !important;
			}
			.email-container {
				background-color: #141414 !important;
			}
			@media only screen and (max-width: 600px) {
				.mobile-outer-padding {
					padding: 20px 10px !important;
				}
				.mobile-padding {
					padding: 24px !important;
				}
			}
		</style>
		<title>${escapeHtml(subject)}</title>
	</head>
	<body
		class="email-body"
		bgcolor="#050505"
		style="
			margin: 0;
			padding: 0;
			background-color: #050505;
			color: #fff;
			font-family: Arial, sans-serif;
		"
	>
		<div style="background-color: #000000">
		<div style="background-color: #050505">
		<table
			role="presentation"
			width="100%"
			cellpadding="0"
			cellspacing="0"
			border="0"
			class="email-background"
			bgcolor="#050505"
			style="
				background-color: #050505;
			"
		>
			<tr>
				<td
					align="center"
					class="mobile-outer-padding"
					bgcolor="#050505"
					style="
						padding: 32px 16px;
						background-color: #050505;
					"
				>
					<table
						role="presentation"
						width="100%"
						cellpadding="0"
						cellspacing="0"
						border="0"
						class="email-container"
						bgcolor="#141414"
						style="
							max-width: 600px;
							background-color: #141414;
							border: 1px solid #30333a;
							border-radius: 10px;
						"
					>
						<tr>
							<td
								class="mobile-padding"
								bgcolor="#141414"
								style="
									padding: 32px;
									background-color: #141414;
									color: #fff;
									border-radius: 10px;
								"
							>
								${testBanner}
								<p style="margin:0 0 12px;color:${accent};font-weight:700">
									PRICE ALERT
								</p>
								<h1 style="margin: 0 0 8px; color: #ffffff; font-size: 28px">${symbol}</h1>
								<p style="margin: 0 0 28px; color: #9ca3af">${name}</p>
								<p style="color: #ffffff; font-size: 18px; line-height: 1.6">
									The price crossed <strong style="color: #ffffff">${direction}</strong> your target of
									<strong style="color: #ffffff">${threshold}</strong>.
								</p>
								<div
									style="
										margin: 24px 0;
										padding: 20px;
										background-color: #212328;
										border-radius: 8px;
									"
								>
									<p style="margin: 0 0 6px; color: #9ca3af">Observed price</p>
									<p
										style="margin:0;color:${accent};font-size:32px;font-weight:700"
									>
										${observed}
									</p>
								</div>
								<p style="color: #9ca3af; font-size: 14px">
									Triggered at ${timestamp}
								</p>
								<table
									role="presentation"
									cellpadding="0"
									cellspacing="0"
									border="0"
									style="margin-top: 16px"
								>
									<tr>
										<td
											bgcolor="#FDD458"
											style="background-color:#fdd458;border-radius:8px;padding:14px 22px"
										>
											<a
												href="${url}"
												style="display:inline-block;color:#050505;text-decoration:none;font-weight:700"
												>View Bull Wise</a
											>
										</td>
									</tr>
								</table>
								<p
									style="
										margin: 32px 0 0;
										color: #6b7280;
										font-size: 12px;
										line-height: 1.5;
									"
								>
									This is a notification for an alert you created. It is not financial advice.
								</p>
							</td>
						</tr>
					</table>
				</td>
			</tr>
		</table>
		</div>
		</div>
	</body>
</html>
`;

	return { subject, text, html };
}
