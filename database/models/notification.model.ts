import { Schema, model, models, type Model } from "mongoose";
import type {
	NotificationArticle,
	NotificationType,
} from "@/types/notifications";
export interface NotificationRecord {
	userId: string;
	type: NotificationType;
	sourceKey: string;
	title: string;
	body: string;
	articles: NotificationArticle[];
	destination: string | null;
	createdAt: Date;
	readAt: Date | null;
}
const schema = new Schema<NotificationRecord>(
	{
		userId: { type: String, required: true, immutable: true },
		type: {
			type: String,
			enum: ["price_alert", "market_news", "announcement"],
			required: true,
			immutable: true,
		},
		sourceKey: { type: String, required: true, immutable: true },
		title: { type: String, required: true, maxlength: 500 },
		body: { type: String, default: "", maxlength: 10000 },
		articles: {
			type: [{ _id: false, headline: String, url: String, source: String }],
			default: [],
		},
		destination: { type: String, default: null },
		createdAt: {
			type: Date,
			required: true,
			default: Date.now,
			immutable: true,
		},
		readAt: { type: Date, default: null },
	},
	{ autoIndex: false },
);
schema.index({ userId: 1, sourceKey: 1 }, { unique: true });
schema.index({ userId: 1, createdAt: -1, _id: -1 });
schema.index({ userId: 1, readAt: 1, createdAt: -1 });
export default (models.Notification as Model<NotificationRecord> | undefined) ||
	model<NotificationRecord>("Notification", schema);
