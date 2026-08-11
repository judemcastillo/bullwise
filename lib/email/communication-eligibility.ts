import "server-only";

import CommunicationPreference from "@/database/models/communication-preference.model";
import { connectToDatabase } from "@/database/mongoose";
import {
	evaluateEmailEligibility,
	type CommunicationPreferenceSnapshot,
	type EmailEligibilityRequest,
	type EmailEligibilityResult,
} from "@/lib/email/communication-policy";
import { ObjectId } from "mongodb";

type BetterAuthUser = {
	_id?: ObjectId;
	id?: string;
	email?: string | null;
};

async function getPreference(userId: string) {
	return CommunicationPreference.findOne({ userId })
		.select({
			userId: 1,
			schemaVersion: 1,
			emailSuppression: 1,
			subscriptions: 1,
			_id: 0,
		})
		.lean<CommunicationPreferenceSnapshot | null>();
}

export const getEmailEligibility = async ({
	userId,
	request,
}: {
	userId: string;
	request: EmailEligibilityRequest;
}): Promise<EmailEligibilityResult> => {
	await connectToDatabase();

	const preference = await getPreference(userId);

	return evaluateEmailEligibility({ preference, request });
};

export const getEmailEligibilityByEmail = async ({
	email,
	request,
}: {
	email: string;
	request: EmailEligibilityRequest;
}): Promise<EmailEligibilityResult> => {
	const mongoose = await connectToDatabase();
	const db = mongoose.connection.db;
	if (!db) throw new Error("Mongoose connection is not connected");

	const normalizedEmail = email.trim().toLowerCase();
	const user = await db.collection<BetterAuthUser>("user").findOne(
		{ email: normalizedEmail },
		{
			projection: { _id: 1, id: 1 },
			collation: { locale: "en", strength: 2 },
		},
	);
	const userId =
		typeof user?.id === "string" && user.id
			? user.id
			: user?._id?.toString();
	const preference = userId ? await getPreference(userId) : null;

	return evaluateEmailEligibility({ preference, request });
};
