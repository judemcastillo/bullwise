import { Model, Schema, model, models } from "mongoose";

export interface MarketNewsDeliveryLogDocument {
	deliveryKey: string;
	createdAt: Date;
}

const marketNewsDeliveryLogSchema =
	new Schema<MarketNewsDeliveryLogDocument>(
		{
			deliveryKey: {
				type: String,
				required: true,
				unique: true,
				trim: true,
				immutable: true,
			},
		},
		{
			timestamps: { createdAt: true, updatedAt: false },
			versionKey: false,
		},
	);

const MarketNewsDeliveryLog =
	(models?.MarketNewsDeliveryLog as
		| Model<MarketNewsDeliveryLogDocument>
		| undefined) ||
	model<MarketNewsDeliveryLogDocument>(
		"MarketNewsDeliveryLog",
		marketNewsDeliveryLogSchema,
	);

export default MarketNewsDeliveryLog;
