"use server";

import { AuthenticationError } from "@/lib/auth/require-user";
import {
	createUserAlert,
	deleteUserAlert,
	AlertInputError,
	setUserAlertStatus,
	updateUserAlert,
} from "@/lib/data/user-alerts";
import type {
	AlertActionResult,
	CreateAlertInput,
	UpdateAlertInput,
	TestAlertEmailActionResult,
} from "@/types/alerts";
import { revalidatePath } from "next/cache";
import {
	createDevelopmentAlertEmailTestEvent,
	DevelopmentEmailTestError,
} from "@/lib/data/development-alert-email-test";
import { deliverSpecificAlertEmail } from "@/lib/alerts/email-delivery-worker";

function actionError(error: unknown): AlertActionResult {
	if (error instanceof AuthenticationError) {
		return { success: false, error: "Please sign in to manage alerts" };
	}

	console.error("Alert action failed:", error);
	if (error instanceof AlertInputError) {
		return { success: false, error: error.message };
	}

	return {
		success: false,
		error: "Unable to update alert. Please try again.",
	};
}

export async function createAlertAction(
	input: CreateAlertInput,
): Promise<AlertActionResult> {
	try {
		const alert = await createUserAlert(input);
		revalidatePath("/watchlist");
		return { success: true, alert };
	} catch (error) {
		return actionError(error);
	}
}

export async function updateAlertAction(
	alertId: string,
	input: UpdateAlertInput,
): Promise<AlertActionResult> {
	try {
		const alert = await updateUserAlert(alertId, input);
		if (!alert) return { success: false, error: "Alert not found" };

		revalidatePath("/watchlist");
		return { success: true, alert };
	} catch (error) {
		return actionError(error);
	}
}

export async function setAlertStatusAction(
	alertId: string,
	status: "active" | "paused",
): Promise<AlertActionResult> {
	try {
		const alert = await setUserAlertStatus(alertId, status);
		if (!alert) return { success: false, error: "Alert not found" };

		revalidatePath("/watchlist");
		return { success: true, alert };
	} catch (error) {
		return actionError(error);
	}
}

export async function deleteAlertAction(
	alertId: string,
): Promise<AlertActionResult> {
	try {
		const deleted = await deleteUserAlert(alertId);
		if (!deleted) return { success: false, error: "Alert not found" };

		revalidatePath("/watchlist");
		return { success: true };
	} catch (error) {
		return actionError(error);
	}
}

export async function sendTestAlertEmailAction(
	alertId: string,
): Promise<TestAlertEmailActionResult> {
	try {
		const testEvent = await createDevelopmentAlertEmailTestEvent(alertId);
		const summary = await deliverSpecificAlertEmail(
			testEvent.eventId,
			testEvent.userId,
		);

		if (summary.sent !== 1) {
			return {
				success: false,
				error:
					summary.failed === 1
						? "The email provider rejected the test. Check the server log and credentials."
						: "The test email could not be claimed for delivery.",
			};
		}

		return { success: true };
	} catch (error) {
		if (error instanceof AuthenticationError) {
			return { success: false, error: "Please sign in to test alerts" };
		}
		if (error instanceof DevelopmentEmailTestError) {
			return { success: false, error: error.message };
		}

		console.error("Test alert email failed:", error);
		return {
			success: false,
			error: "Unable to send the test alert email. Please try again.",
		};
	}
}
