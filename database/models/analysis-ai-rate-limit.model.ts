import { Model, Schema, model, models } from "mongoose";

export interface AnalysisAiRateLimitDocument {
	userId: string;
	attempts: Date[];
	revision: number;
	expiresAt: Date;
}

const analysisAiRateLimitSchema = new Schema<AnalysisAiRateLimitDocument>(
	{
		userId: { type: String, required: true, unique: true, index: true },
		attempts: { type: [Date], required: true, default: [] },
		revision: { type: Number, required: true, default: 0 },
		expiresAt: { type: Date, required: true },
	},
	{ versionKey: false },
);

analysisAiRateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const AnalysisAiRateLimit =
	(models?.AnalysisAiRateLimit as Model<AnalysisAiRateLimitDocument> | undefined) ||
	model<AnalysisAiRateLimitDocument>(
		"AnalysisAiRateLimit",
		analysisAiRateLimitSchema,
	);

export default AnalysisAiRateLimit;
