import {
	type Document,
	type Model,
	Schema,
	Types,
	model,
	models,
} from "mongoose";
import type { AlertOperator } from "@/types/alerts";

export type EmailDeliveryStatus =
	| "not_requested"
	| "pending"
	| "processing"
	| "sent"
	| "failed";

export interface AlertEventItem extends Document {
	dedupeKey: string;
	alertId: Types.ObjectId;
	userId: string;
	instrumentId: Types.ObjectId;
	eventType: "price_triggered";
	source: "market" | "development_test";
	operator: AlertOperator;
	threshold: Types.Decimal128;
	observedValue: Types.Decimal128;
	quoteObservedAt: Date;
	triggeredAt: Date;
	instrumentSnapshot: {
		displaySymbol: string;
		name: string;
		quoteCurrency: string;
	};
	delivery: {
		email: {
			status: EmailDeliveryStatus;
			attempts: number;
			lastAttemptAt?: Date;
			nextAttemptAt?: Date;
			deliveredAt?: Date;
			error?: string;
			leaseId?: string;
			leaseExpiresAt?: Date;
		};
	};
	createdAt: Date;
	updatedAt: Date;
}

const alertEventSchema = new Schema<AlertEventItem>(
	{
		dedupeKey: {
			type: String,
			required: true,
			unique: true,
			trim: true,
			immutable: true,
		},
		alertId: {
			type: Schema.Types.ObjectId,
			ref: "Alert",
			required: true,
			index: true,
			immutable: true,
		},
		userId: { type: String, required: true, index: true, immutable: true },
		instrumentId: {
			type: Schema.Types.ObjectId,
			ref: "Instrument",
			required: true,
			index: true,
			immutable: true,
		},
		eventType: {
			type: String,
			required: true,
			enum: ["price_triggered"],
			default: "price_triggered",
			immutable: true,
		},
		source: {
			type: String,
			required: true,
			enum: ["market", "development_test"],
			default: "market",
			immutable: true,
		},
		operator: {
			type: String,
			required: true,
			enum: ["crosses_above", "crosses_below"],
			immutable: true,
		},
		threshold: {
			type: Schema.Types.Decimal128,
			required: true,
			immutable: true,
		},
		observedValue: {
			type: Schema.Types.Decimal128,
			required: true,
			immutable: true,
		},
		quoteObservedAt: { type: Date, required: true, immutable: true },
		triggeredAt: {
			type: Date,
			required: true,
			default: Date.now,
			immutable: true,
		},
		instrumentSnapshot: {
			displaySymbol: {
				type: String,
				required: true,
				trim: true,
				immutable: true,
			},
			name: { type: String, required: true, trim: true, immutable: true },
			quoteCurrency: {
				type: String,
				required: true,
				uppercase: true,
				trim: true,
				immutable: true,
			},
		},
		delivery: {
			email: {
				status: {
					type: String,
					required: true,
					enum: [
						"not_requested",
						"pending",
						"processing",
						"sent",
						"failed",
					],
					default: "not_requested",
				},
				attempts: { type: Number, required: true, default: 0, min: 0 },
				lastAttemptAt: { type: Date },
				nextAttemptAt: { type: Date },
				deliveredAt: { type: Date },
				error: { type: String },
				leaseId: { type: String },
				leaseExpiresAt: { type: Date },
			},
		},
	},
	{ timestamps: true },
);

alertEventSchema.index({ alertId: 1, triggeredAt: -1 });
alertEventSchema.index({ userId: 1, triggeredAt: -1 });
alertEventSchema.index({
	"delivery.email.status": 1,
	"delivery.email.nextAttemptAt": 1,
	"delivery.email.leaseExpiresAt": 1,
	triggeredAt: 1,
});

const AlertEvent =
	(models?.AlertEvent as Model<AlertEventItem> | undefined) ||
	model<AlertEventItem>("AlertEvent", alertEventSchema);

export default AlertEvent;
