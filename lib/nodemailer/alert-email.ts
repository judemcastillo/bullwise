import "server-only";

import type {
	AlertEmailJob,
	AlertEmailRecipient,
	AlertEmailSender,
} from "@/lib/alerts/email-delivery";
import { renderAlertEmail } from "@/lib/alerts/email-template";
import { sendMailWithSuppressionCapture } from "@/lib/nodemailer/transport";

export class NodemailerAlertEmailSender implements AlertEmailSender {
	async send(
		job: AlertEmailJob,
		recipient: AlertEmailRecipient,
	): Promise<void> {
		const from = process.env.NODEMAILER_EMAIL;
		if (!from || !process.env.NODEMAILER_PASSWORD) {
			throw new Error("Nodemailer credentials are not configured");
		}

		const content = renderAlertEmail(job);
		await sendMailWithSuppressionCapture({
			recipientEmail: recipient.email,
			message: {
				from: `"Bull Wise Alerts" <${from}>`,
				to: recipient.email,
				subject: content.subject,
				text: content.text,
				html: content.html,
				messageId: `<price-alert-${job.id}@bullwise.local>`,
			},
		});
	}
}
