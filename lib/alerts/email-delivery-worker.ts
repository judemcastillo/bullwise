import "server-only";

import { deliverPendingAlertEmails } from "@/lib/alerts/email-delivery";
import {
	BetterAuthAlertEmailRecipientDirectory,
	MongoAlertEmailDeliveryStore,
} from "@/lib/data/alert-email-delivery";
import { NodemailerAlertEmailSender } from "@/lib/nodemailer/alert-email";

export function deliverAlertEmailOutbox() {
	return deliverPendingAlertEmails(
		new MongoAlertEmailDeliveryStore(),
		new BetterAuthAlertEmailRecipientDirectory(),
		new NodemailerAlertEmailSender(),
	);
}

export function deliverSpecificAlertEmail(eventId: string, userId: string) {
	return deliverPendingAlertEmails(
		new MongoAlertEmailDeliveryStore({ eventId, userId }),
		new BetterAuthAlertEmailRecipientDirectory(),
		new NodemailerAlertEmailSender(),
		{ limit: 1 },
	);
}
