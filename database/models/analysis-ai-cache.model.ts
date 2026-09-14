import { Model, Schema, model, models } from "mongoose";
import type { TransparentAnalysisAiSynthesis } from "@/lib/analysis/transparent-analysis-ai-production";

export interface AnalysisAiCacheDocument {
	cacheKey: string;
	synthesis: TransparentAnalysisAiSynthesis;
	expiresAt: Date;
}

const analysisAiCacheSchema = new Schema<AnalysisAiCacheDocument>(
	{
		cacheKey: { type: String, required: true, unique: true, index: true },
		synthesis: { type: Schema.Types.Mixed, required: true },
		expiresAt: { type: Date, required: true },
	},
	{ versionKey: false },
);

analysisAiCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const AnalysisAiCache =
	(models?.AnalysisAiCache as Model<AnalysisAiCacheDocument> | undefined) ||
	model<AnalysisAiCacheDocument>("AnalysisAiCache", analysisAiCacheSchema);

export default AnalysisAiCache;
