import { Model, Schema, model, models } from "mongoose";

export type MarketNewsDeliveryStatus = "in_progress" | "completed" | "failed";

export interface MarketNewsDeliveryLogDocument {
	deliveryKey: string;
	status: MarketNewsDeliveryStatus;
	leaseId?: string;
	leaseExpiresAt?: Date;
	completedAt?: Date;
	failedAt?: Date;
	createdAt: Date;
	updatedAt: Date;
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
				status: {
					type: String,
					required: true,
					enum: ["in_progress", "completed", "failed"],
				},
				leaseId: { type: String },
				leaseExpiresAt: { type: Date },
				completedAt: { type: Date },
				failedAt: { type: Date },
			},
			{
				timestamps: true,
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
