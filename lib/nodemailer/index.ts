import "server-only";

import {
	renderAccountVerificationEmail,
	renderNewsSummaryEmail,
	renderWelcomeEmail,
} from "@/lib/email/email-rendering";
import {
	getEmailBranding,
	getMarketingEmailBranding,
} from "@/lib/email/email-branding";
import { getEmailEligibilityByEmail } from "@/lib/email/communication-eligibility";
import type { MarketNewsDeliveryFrequency } from "@/lib/email/market-news-delivery-policy";
import { sendMailWithSuppressionCapture } from "@/lib/nodemailer/transport";

export { transporter } from "@/lib/nodemailer/transport";

export const sendAccountVerificationEmail = async ({
	email,
	name,
	verificationUrl,
}: {
	email: string;
	name: string;
	verificationUrl: string;
}) => {
	const eligibility = await getEmailEligibilityByEmail({
		email,
		request: { messageType: "email_verification" },
	});
	if (!eligibility.eligible) {
		return;
	}

	const content = renderAccountVerificationEmail({ name, verificationUrl });

	await sendMailWithSuppressionCapture({
		recipientEmail: email,
		message: {
			from: `"Bull Wise" <${process.env.NODEMAILER_EMAIL}>`,
			to: email,
			...content,
		},
	});
};

export const sendWelcomeEmail = async ({
	email,
	name,
	intro,
}: WelcomeEmailData) => {
	const eligibility = await getEmailEligibilityByEmail({
		email,
		request: { messageType: "account_welcome" },
	});
	if (!eligibility.eligible) {
		return;
	}

	const content = renderWelcomeEmail({ name, intro, branding: getEmailBranding() });

	const mailOptions = {
		from: `"Bull Wise" <${process.env.NODEMAILER_EMAIL}>`,
		to: email,
		...content,
	};

	await sendMailWithSuppressionCapture({ recipientEmail: email, message: mailOptions });
};

export const sendNewsSummaryEmail = async ({
	email,
	frequency,
	date,
	newsContent,
	unsubscribeUrl,
	oneClickUnsubscribeUrl,
}: {
	email: string;
	frequency: MarketNewsDeliveryFrequency;
	date: string;
	newsContent: string;
	unsubscribeUrl: string;
	oneClickUnsubscribeUrl: string;
}): Promise<boolean> => {
	const eligibility = await getEmailEligibilityByEmail({
		email,
		request: { messageType: "market_news" },
	});
	if (!eligibility.eligible) return false;

	const content = renderNewsSummaryEmail({
		frequency,
		date,
		newsContent,
		unsubscribeUrl,
		oneClickUnsubscribeUrl,
		branding: getMarketingEmailBranding(),
	});

	const mailOptions = {
		from: `"Bull Wise News" <${process.env.NODEMAILER_EMAIL}>`,
		to: email,
		...content,
	};

	await sendMailWithSuppressionCapture({ recipientEmail: email, message: mailOptions });
	return true;
};
