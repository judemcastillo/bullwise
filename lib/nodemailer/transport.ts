import "server-only";

import { capturePermanentSmtpFailure } from "@/lib/email/email-suppression";
import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
	service: "gmail",
	auth: {
		user: process.env.NODEMAILER_EMAIL!,
		pass: process.env.NODEMAILER_PASSWORD!,
	},
});

type SendMailOptions = Parameters<typeof transporter.sendMail>[0];

export async function sendMailWithSuppressionCapture({
	recipientEmail,
	message,
}: {
	recipientEmail: string;
	message: SendMailOptions;
}) {
	try {
		return await transporter.sendMail(message);
	} catch (error) {
		try {
			await capturePermanentSmtpFailure({ error, recipientEmail });
		} catch (suppressionError) {
			console.error(
				"Failed to record permanent SMTP recipient failure",
				suppressionError,
			);
		}
		throw error;
	}
}
