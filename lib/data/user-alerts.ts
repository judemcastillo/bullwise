import "server-only";

import Alert from "@/database/models/alert.model";
import Instrument, {
	type InstrumentItem,
} from "@/database/models/instrument.model";
import { requireCompletedUser } from "@/lib/auth/require-user";
import { getStockDashboardData } from "@/lib/services/stock-data";
import type {
	AlertDto,
	AlertInstrumentInput,
	AlertStatus,
	CreateAlertInput,
	UpdateAlertInput,
} from "@/types/alerts";
import { Types } from "mongoose";

type PopulatedAlert = {
	_id: Types.ObjectId;
	name: string;
	metric: "price";
	operator: AlertDto["operator"];
	threshold: Types.Decimal128;
	status: AlertStatus;
	channels: { email: boolean };
	instrumentId: InstrumentItem;
	createdAt: Date;
	updatedAt: Date;
};

const ALERT_NAME_MAX_LENGTH = 80;
const DECIMAL_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d{1,18})?$/;
const PROVIDER_PATTERN = /^[a-z0-9_-]{2,30}$/;
const SYMBOL_PATTERN = /^[A-Z0-9._:/-]{1,40}$/;

export class AlertInputError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "AlertInputError";
	}
}

function validateAlertFields(input: UpdateAlertInput): UpdateAlertInput {
	const name = input.name?.trim();
	const threshold = input.threshold?.trim();

	if (!name || name.length > ALERT_NAME_MAX_LENGTH) {
		throw new AlertInputError(
			`Alert name must be between 1 and ${ALERT_NAME_MAX_LENGTH} characters`,
		);
	}

	if (
		input.operator !== "crosses_above" &&
		input.operator !== "crosses_below"
	) {
		throw new AlertInputError("Choose a valid alert condition");
	}

	if (
		!threshold ||
		threshold.length > 40 ||
		!DECIMAL_PATTERN.test(threshold) ||
		Number(threshold) <= 0
	) {
		throw new AlertInputError("Target price must be a positive decimal number");
	}

	if (typeof input.emailEnabled !== "boolean") {
		throw new AlertInputError("Choose a valid notification preference");
	}

	return {
		name,
		operator: input.operator,
		threshold,
		emailEnabled: input.emailEnabled,
	};
}

function validateInstrumentInput(
	input: AlertInstrumentInput,
): AlertInstrumentInput {
	const provider = input.provider?.trim().toLowerCase();
	const providerSymbol = input.providerSymbol?.trim().toUpperCase();

	if (input.assetClass !== "equity" || provider !== "finnhub") {
		throw new AlertInputError("This instrument provider is not supported yet");
	}

	if (
		!PROVIDER_PATTERN.test(provider) ||
		!SYMBOL_PATTERN.test(providerSymbol)
	) {
		throw new AlertInputError("Choose a valid instrument");
	}

	return {
		assetClass: input.assetClass,
		provider,
		providerSymbol,
	};
}

async function resolveInstrument(input: AlertInstrumentInput) {
	const validated = validateInstrumentInput(input);
	const stock = await getStockDashboardData(validated.providerSymbol);

	if (!stock?.company || !stock.currentPrice) {
		throw new AlertInputError(
			"Current market data is unavailable for this instrument",
		);
	}

	const venue = stock.exchange && stock.exchange !== "—"
		? stock.exchange.trim().toUpperCase()
		: validated.provider;
	const quoteCurrency = stock.currency?.trim().toUpperCase() || "USD";
	const canonicalKey =
		`${validated.assetClass}:${venue}:${stock.symbol}`.toLowerCase();

	const instrument = await Instrument.findOneAndUpdate(
		{ canonicalKey },
		{
			$setOnInsert: {
				canonicalKey,
				assetClass: validated.assetClass,
				displaySymbol: stock.symbol,
				name: stock.company,
				venue,
				quoteCurrency,
				pricePrecision: 4,
				providerBindings: [
					{
						provider: validated.provider,
						symbol: validated.providerSymbol,
					},
				],
			},
		},
		{ upsert: true, returnDocument: "after", runValidators: true },
	);

	if (!instrument) throw new Error("Unable to resolve this instrument");
	return { instrument, currentPrice: stock.currentPrice };
}

function serializeAlert(alert: PopulatedAlert): AlertDto {
	const instrument = alert.instrumentId;

	return {
		id: alert._id.toString(),
		name: alert.name,
		metric: alert.metric,
		operator: alert.operator,
		threshold: alert.threshold.toString(),
		status: alert.status,
		emailEnabled: alert.channels.email,
		instrument: {
			id: instrument._id.toString(),
			canonicalKey: instrument.canonicalKey,
			assetClass: instrument.assetClass,
			displaySymbol: instrument.displaySymbol,
			name: instrument.name,
			venue: instrument.venue,
			baseCurrency: instrument.baseCurrency,
			quoteCurrency: instrument.quoteCurrency,
			pricePrecision: instrument.pricePrecision,
		},
		createdAt: alert.createdAt.toISOString(),
		updatedAt: alert.updatedAt.toISOString(),
	};
}

async function populateAlert(alertId: Types.ObjectId, userId: string) {
	const alert = await Alert.findOne({ _id: alertId, userId })
		.populate("instrumentId")
		.lean();

	if (!alert?.instrumentId) return null;
	return serializeAlert(alert as unknown as PopulatedAlert);
}

export async function getUserAlerts(): Promise<AlertDto[]> {
	const user = await requireCompletedUser();
	const alerts = await Alert.find({ userId: user.id })
		.sort({ createdAt: -1 })
		.populate("instrumentId")
		.lean();

	return alerts.flatMap((alert) =>
		alert.instrumentId
			? [serializeAlert(alert as unknown as PopulatedAlert)]
			: [],
	);
}

export async function createUserAlert(
	input: CreateAlertInput,
): Promise<AlertDto> {
	const user = await requireCompletedUser();
	const fields = validateAlertFields(input);
	const { instrument, currentPrice } = await resolveInstrument(input.instrument);
	const targetPrice = Number(fields.threshold);

	if (
		(fields.operator === "crosses_above" && targetPrice <= currentPrice) ||
		(fields.operator === "crosses_below" && targetPrice >= currentPrice)
	) {
		throw new AlertInputError(
			fields.operator === "crosses_above"
				? "An above target must be higher than the current price"
				: "A below target must be lower than the current price",
		);
	}

	const alert = await Alert.create({
		userId: user.id,
		instrumentId: instrument._id,
		name: fields.name,
		metric: "price",
		operator: fields.operator,
		threshold: Types.Decimal128.fromString(fields.threshold),
		status: "active",
		triggerPolicy: "once",
		channels: { email: fields.emailEnabled },
		lastObservedValue: Types.Decimal128.fromString(String(currentPrice)),
		nextEvaluationAt: new Date(),
	});

	const serialized = await populateAlert(alert._id, user.id);
	if (!serialized) throw new Error("Unable to load the created alert");
	return serialized;
}

export async function updateUserAlert(
	alertId: string,
	input: UpdateAlertInput,
): Promise<AlertDto | null> {
	const user = await requireCompletedUser();
	if (!Types.ObjectId.isValid(alertId)) return null;

	const fields = validateAlertFields(input);
	const objectId = new Types.ObjectId(alertId);
	const result = await Alert.updateOne(
		{ _id: objectId, userId: user.id },
		{
			$set: {
				name: fields.name,
				operator: fields.operator,
				threshold: Types.Decimal128.fromString(fields.threshold),
				"channels.email": fields.emailEnabled,
			},
		},
		{ runValidators: true },
	);

	if (result.matchedCount === 0) return null;
	return populateAlert(objectId, user.id);
}

export async function setUserAlertStatus(
	alertId: string,
	status: Exclude<AlertStatus, "triggered">,
): Promise<AlertDto | null> {
	const user = await requireCompletedUser();
	if (!Types.ObjectId.isValid(alertId)) return null;
	if (status !== "active" && status !== "paused") return null;

	const objectId = new Types.ObjectId(alertId);
	const result = await Alert.updateOne(
		{ _id: objectId, userId: user.id, status: { $ne: "triggered" } },
		{ $set: { status, nextEvaluationAt: new Date() } },
		{ runValidators: true },
	);

	if (result.matchedCount === 0) return null;
	return populateAlert(objectId, user.id);
}

export async function deleteUserAlert(alertId: string): Promise<boolean> {
	const user = await requireCompletedUser();
	if (!Types.ObjectId.isValid(alertId)) return false;

	const result = await Alert.deleteOne({
		_id: new Types.ObjectId(alertId),
		userId: user.id,
	});

	return result.deletedCount === 1;
}
