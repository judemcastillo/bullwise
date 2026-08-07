import "server-only";

import nodemailer from "nodemailer";
import {
	NEWS_SUMMARY_EMAIL_TEMPLATE,
	VERIFICATION_EMAIL_TEMPLATE,
	WELCOME_EMAIL_TEMPLATE,
} from "./templates";

export const transporter = nodemailer.createTransport({
	service: "gmail",
	auth: {
		user: process.env.NODEMAILER_EMAIL!,
		pass: process.env.NODEMAILER_PASSWORD!,
	},
});

const escapeHtml = (value: string) =>
	value.replace(
		/[&<>'"]/g,
		(character) =>
			({
				"&": "&amp;",
				"<": "&lt;",
				">": "&gt;",
				"'": "&#39;",
				'"': "&quot;",
			})[character]!,
	);

export const sendAccountVerificationEmail = async ({
	email,
	name,
	verificationUrl,
}: {
	email: string;
	name: string;
	verificationUrl: string;
}) => {
	const html = VERIFICATION_EMAIL_TEMPLATE.replace(
		"{{name}}",
		() => escapeHtml(name),
	).replace("{{verificationUrl}}", () => escapeHtml(verificationUrl));

	await transporter.sendMail({
		from: `"Bull Wise" <${process.env.NODEMAILER_EMAIL}>`,
		to: email,
		subject: "Verify your Bull Wise email",
		text: `Verify your Bull Wise email by visiting this link: ${verificationUrl}`,
		html,
	});
};

export const sendWelcomeEmail = async ({
	email,
	name,
	intro,
}: WelcomeEmailData) => {
	const htmlTemplate = WELCOME_EMAIL_TEMPLATE.replace("{{name}}", () =>
		escapeHtml(name),
	).replace("{{intro}}", () => escapeHtml(intro));

	const mailOptions = {
		from: `"Bull Wise" <${process.env.NODEMAILER_EMAIL}>`,
		to: email,
		subject: `Welcome to Bull Wise - your stock market toolkit is ready`,
		text: "Thanks for joining Bull Wise",
		html: htmlTemplate,
	};

	await transporter.sendMail(mailOptions);
};

export const sendNewsSummaryEmail = async ({
	email,
	date,
	newsContent,
}: {
	email: string;
	date: string;
	newsContent: string;
}): Promise<void> => {
	const htmlTemplate = NEWS_SUMMARY_EMAIL_TEMPLATE.replace(
		"{{date}}",
		date,
	).replace("{{newsContent}}", newsContent);

	const mailOptions = {
		from: `"Bull Wise News" <${process.env.NODEMAILER_EMAIL}>`,
		to: email,
		subject: `📈 Market News Summary Today - ${date}`,
		text: `Today's market news summary from Bull Wise`,
		html: htmlTemplate,
	};

	await transporter.sendMail(mailOptions);
};
