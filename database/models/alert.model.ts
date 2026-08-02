import {
	type Document,
	type Model,
	Schema,
	Types,
	model,
	models,
} from "mongoose";
import type { AlertOperator, AlertStatus } from "@/types/alerts";

export interface AlertItem extends Document {
	userId: string;
	instrumentId: Types.ObjectId;
	name: string;
	metric: "price";
	operator: AlertOperator;
	threshold: Types.Decimal128;
	status: AlertStatus;
	triggerPolicy: "once";
	channels: {
		email: boolean;
	};
	lastObservedValue?: Types.Decimal128;
	lastEvaluatedAt?: Date;
	lastTriggeredAt?: Date;
	nextEvaluationAt: Date;
	createdAt: Date;
	updatedAt: Date;
}

const alertSchema = new Schema<AlertItem>(
	{
		userId: { type: String, required: true, index: true },
		instrumentId: {
			type: Schema.Types.ObjectId,
			ref: "Instrument",
			required: true,
			index: true,
		},
		name: { type: String, required: true, trim: true, maxlength: 80 },
		metric: { type: String, required: true, enum: ["price"], default: "price" },
		operator: {
			type: String,
			required: true,
			enum: ["crosses_above", "crosses_below"],
		},
		threshold: { type: Schema.Types.Decimal128, required: true },
		status: {
			type: String,
			required: true,
			enum: ["active", "paused", "triggered"],
			default: "active",
		},
		triggerPolicy: {
			type: String,
			required: true,
			enum: ["once"],
			default: "once",
		},
		channels: {
			email: { type: Boolean, required: true, default: true },
		},
		lastObservedValue: { type: Schema.Types.Decimal128 },
		lastEvaluatedAt: { type: Date },
		lastTriggeredAt: { type: Date },
		nextEvaluationAt: { type: Date, required: true, default: Date.now },
	},
	{ timestamps: true },
);

alertSchema.index({ userId: 1, createdAt: -1 });
alertSchema.index({ status: 1, nextEvaluationAt: 1 });
alertSchema.index({ instrumentId: 1, status: 1 });

const Alert =
	(models?.Alert as Model<AlertItem> | undefined) ||
	model<AlertItem>("Alert", alertSchema);

export default Alert;
