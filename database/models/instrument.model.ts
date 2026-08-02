import {
	type Document,
	type Model,
	Schema,
	model,
	models,
} from "mongoose";
import type { AssetClass } from "@/types/alerts";

type ProviderBinding = {
	provider: string;
	symbol: string;
};

export interface InstrumentItem extends Document {
	canonicalKey: string;
	assetClass: AssetClass;
	displaySymbol: string;
	name: string;
	venue?: string;
	baseCurrency?: string;
	quoteCurrency: string;
	pricePrecision: number;
	providerBindings: ProviderBinding[];
	createdAt: Date;
	updatedAt: Date;
}

const providerBindingSchema = new Schema<ProviderBinding>(
	{
		provider: { type: String, required: true, lowercase: true, trim: true },
		symbol: { type: String, required: true, uppercase: true, trim: true },
	},
	{ _id: false },
);

const instrumentSchema = new Schema<InstrumentItem>(
	{
		canonicalKey: {
			type: String,
			required: true,
			unique: true,
			lowercase: true,
			trim: true,
		},
		assetClass: {
			type: String,
			required: true,
			enum: ["equity", "forex", "crypto", "index", "commodity"],
			index: true,
		},
		displaySymbol: {
			type: String,
			required: true,
			uppercase: true,
			trim: true,
		},
		name: { type: String, required: true, trim: true },
		venue: { type: String, trim: true },
		baseCurrency: { type: String, uppercase: true, trim: true },
		quoteCurrency: {
			type: String,
			required: true,
			uppercase: true,
			trim: true,
		},
		pricePrecision: { type: Number, required: true, min: 0, max: 18 },
		providerBindings: {
			type: [providerBindingSchema],
			required: true,
			validate: {
				validator: (bindings: ProviderBinding[]) => bindings.length > 0,
				message: "At least one provider binding is required",
			},
		},
	},
	{ timestamps: true },
);

instrumentSchema.index(
	{ "providerBindings.provider": 1, "providerBindings.symbol": 1 },
	{ unique: true },
);

const Instrument =
	(models?.Instrument as Model<InstrumentItem> | undefined) ||
	model<InstrumentItem>("Instrument", instrumentSchema);

export default Instrument;
