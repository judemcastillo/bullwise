import { requireSafeEmailUrl } from "@/lib/email/content-safety";

const MAX_POSTAL_ADDRESS_LENGTH = 300;

export type EmailBranding = {
	dashboardUrl: string;
	logoUrl: string;
	dashboardPreviewUrl: string;
	currentYear: string;
};

export type MarketingEmailBranding = EmailBranding & {
	postalAddress: string;
};

const getApplicationBaseUrl = () => {
	const configured =
		process.env.NEXT_PUBLIC_BASE_URL ?? process.env.BETTER_AUTH_URL;
	if (!configured) throw new Error("The Bull Wise application URL is not configured");

	const normalized = requireSafeEmailUrl(configured);
	return normalized.endsWith("/") ? normalized : `${normalized}/`;
};

export function getEmailBranding({ now = new Date() }: { now?: Date } = {}): EmailBranding {
	const timestamp = now.getTime();
	if (!Number.isFinite(timestamp)) throw new Error("Email rendering time is invalid");

	const dashboardUrl = getApplicationBaseUrl();
	return {
		dashboardUrl,
		logoUrl: new URL("assets/icons/logo-email.png", dashboardUrl).toString(),
		dashboardPreviewUrl: new URL(
			"assets/images/dashboard-preview.png",
			dashboardUrl,
		).toString(),
		currentYear: String(now.getUTCFullYear()),
	};
}

export function getMarketingEmailBranding(
	options: { now?: Date } = {},
): MarketingEmailBranding {
	const postalAddress = process.env.EMAIL_MARKETING_POSTAL_ADDRESS?.trim().replace(
		/\s+/g,
		" ",
	);
	if (
		!postalAddress ||
		postalAddress.length > MAX_POSTAL_ADDRESS_LENGTH ||
		/^replace-with/i.test(postalAddress)
	) {
		throw new Error(
			"EMAIL_MARKETING_POSTAL_ADDRESS must contain the legitimate postal address used in optional email footers",
		);
	}

	return { ...getEmailBranding(options), postalAddress };
}
