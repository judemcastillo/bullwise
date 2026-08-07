import {
	type Document,
	type Model,
	Schema,
	model,
	models,
} from "mongoose";

export interface WatchlistItem extends Document {
	userId: string;
	symbol: string;
	company: string;
	addedAt: Date;
}

const watchlistSchema = new Schema<WatchlistItem>({
	userId: { type: String, required: true, index: true },
	symbol: {
		type: String,
		required: true,
		uppercase: true,
		trim: true,
		maxlength: 40,
		match: /^[A-Z0-9._:/-]+$/,
	},
	company: { type: String, required: true, trim: true, maxlength: 160 },
	addedAt: { type: Date, default: Date.now },
});

watchlistSchema.index({ userId: 1, symbol: 1 }, { unique: true });

const Watchlist =
	(models?.Watchlist as Model<WatchlistItem> | undefined) ||
	model<WatchlistItem>("Watchlist", watchlistSchema);

export default Watchlist;
