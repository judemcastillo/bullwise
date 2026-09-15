import { Schema, model, models, type Model } from "mongoose";
import { MARKET_NEWS_CATEGORIES } from "@/lib/email/communication-policy";
import type { InAppNewsPreference } from "@/types/notifications";
interface PreferenceRecord extends InAppNewsPreference {
	userId: string;
}
const schema = new Schema<PreferenceRecord>(
	{
		userId: { type: String, required: true, unique: true },
		frequency: {
			type: String,
			enum: ["off", "daily", "weekly"],
			required: true,
		},
		categories: [{ type: String, enum: MARKET_NEWS_CATEGORIES }],
	},
	{ timestamps: true, autoIndex: false },
);
export default (models.InAppPreference as
	Model<PreferenceRecord> | undefined) ||
	model<PreferenceRecord>("InAppPreference", schema);
