import {
	type Document,
	type Model,
	Schema,
	Types,
	model,
	models,
} from "mongoose";

export interface WatchlistItem extends Document {
	userId: string;
	instrumentId: Types.ObjectId;
	addedAt: Date;
}

const watchlistSchema = new Schema<WatchlistItem>({
	userId: { type: String, required: true, index: true },
	instrumentId: {
		type: Schema.Types.ObjectId,
		ref: "Instrument",
		required: true,
		index: true,
	},
	addedAt: { type: Date, default: Date.now },
});

watchlistSchema.index(
	{ userId: 1, instrumentId: 1 },
	{
		unique: true,
		partialFilterExpression: { instrumentId: { $type: "objectId" } },
	},
);

const Watchlist =
	(models?.Watchlist as Model<WatchlistItem> | undefined) ||
	model<WatchlistItem>("Watchlist", watchlistSchema);

export default Watchlist;
