import type { MarketNewsDeliveryFrequency } from "@/lib/email/market-news-delivery-policy";
import type {
	EmailBranding,
	MarketingEmailBranding,
} from "@/lib/email/email-branding";
import {
	escapeHtml,
	requireSafeEmailUrl,
	sanitizeEmailHeader,
	sanitizeGeneratedMarketNewsHtml,
	sanitizeGeneratedWelcomeHtml,
} from "@/lib/email/content-safety";
import {
	NEWS_SUMMARY_EMAIL_TEMPLATE,
	VERIFICATION_EMAIL_TEMPLATE,
	WELCOME_EMAIL_TEMPLATE,
} from "@/lib/nodemailer/templates";

export function renderAccountVerificationEmail({
	name,
	verificationUrl,
}: {
	name: string;
	verificationUrl: string;
}) {
	const safeVerificationUrl = requireSafeEmailUrl(verificationUrl);
	return {
		subject: "Verify your Bull Wise email",
		text: `Verify your Bull Wise email by visiting this link: ${safeVerificationUrl}`,
		html: VERIFICATION_EMAIL_TEMPLATE.replace(
			"{{name}}",
			() => escapeHtml(name),
		).replace(
			"{{verificationUrl}}",
			() => escapeHtml(safeVerificationUrl),
		),
	};
}

export function renderWelcomeEmail({
	name,
	intro,
	branding,
}: {
	name: string;
	intro: string;
	branding: EmailBranding;
}) {
	return {
		subject: "Welcome to Bull Wise - your stock market toolkit is ready",
		text: "Thanks for joining Bull Wise",
		html: WELCOME_EMAIL_TEMPLATE.replace("{{name}}", () => escapeHtml(name))
			.replace("{{intro}}", () => sanitizeGeneratedWelcomeHtml(intro))
			.replace("{{logoUrl}}", () => escapeHtml(branding.logoUrl))
			.replace("{{dashboardPreviewUrl}}", () =>
				escapeHtml(branding.dashboardPreviewUrl),
			)
			.replaceAll("{{dashboardUrl}}", () => escapeHtml(branding.dashboardUrl))
			.replace("{{currentYear}}", () => escapeHtml(branding.currentYear)),
	};
}

export function renderNewsSummaryEmail({
	frequency,
	date,
	newsContent,
	unsubscribeUrl,
	oneClickUnsubscribeUrl,
	branding,
}: {
	frequency: MarketNewsDeliveryFrequency;
	date: string;
	newsContent: string;
	unsubscribeUrl: string;
	oneClickUnsubscribeUrl: string;
	branding: MarketingEmailBranding;
}) {
	const summaryTitle =
		frequency === "weekly"
			? "Weekly Market News Summary"
			: "Daily Market News Summary";
	const safeUnsubscribeUrl = requireSafeEmailUrl(unsubscribeUrl);
	const safeOneClickUnsubscribeUrl = requireSafeEmailUrl(oneClickUnsubscribeUrl);
	const safeDashboardUrl = requireSafeEmailUrl(branding.dashboardUrl);
	const subject = sanitizeEmailHeader(`📈 ${summaryTitle} - ${date}`);

	const sanitizedNewsContent = sanitizeGeneratedMarketNewsHtml(newsContent);

	return {
		subject,
		text: `${summaryTitle} from Bull Wise\n\n${date}\n\n${sanitizedNewsContent.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim()}\n\nUnsubscribe: ${safeUnsubscribeUrl}`,
		html: NEWS_SUMMARY_EMAIL_TEMPLATE.replaceAll(
			"{{summaryTitle}}",
			() => escapeHtml(summaryTitle),
		)
			.replace("{{date}}", () => escapeHtml(date))
			.replace("{{newsContent}}", () => sanitizedNewsContent)
			.replace("{{logoUrl}}", () => escapeHtml(branding.logoUrl))
			.replace("{{unsubscribeUrl}}", () => escapeHtml(safeUnsubscribeUrl))
			.replace("{{dashboardUrl}}", () => escapeHtml(safeDashboardUrl))
			.replace("{{postalAddress}}", () =>
				escapeHtml(branding.postalAddress),
			)
			.replace("{{currentYear}}", () => escapeHtml(branding.currentYear)),
		headers: {
			"List-Unsubscribe": `<${safeOneClickUnsubscribeUrl}>`,
			"List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
		},
	};
}
