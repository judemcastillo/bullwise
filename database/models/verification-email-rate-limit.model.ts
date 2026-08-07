import { Model, Schema, model, models } from "mongoose";

export interface VerificationEmailRateLimitDocument {
	identifier: string;
	attempts: Date[];
	revision: number;
	expiresAt: Date;
}

const verificationEmailRateLimitSchema =
	new Schema<VerificationEmailRateLimitDocument>(
		{
			identifier: { type: String, required: true, unique: true, index: true },
			attempts: { type: [Date], required: true, default: [] },
			revision: { type: Number, required: true, default: 0 },
			expiresAt: { type: Date, required: true },
		},
		{ versionKey: false },
	);

verificationEmailRateLimitSchema.index(
	{ expiresAt: 1 },
	{ expireAfterSeconds: 0 },
);

const VerificationEmailRateLimit =
	(models?.VerificationEmailRateLimit as
		| Model<VerificationEmailRateLimitDocument>
		| undefined) ||
	model<VerificationEmailRateLimitDocument>(
		"VerificationEmailRateLimit",
		verificationEmailRateLimitSchema,
	);

export default VerificationEmailRateLimit;
