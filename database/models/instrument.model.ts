import {
	type Document,
	type Model,
	Schema,
	Types,
	model,
	models,
} from "mongoose";
import {
	ASSET_CLASSES,
	EQUITY_SECURITY_TYPES,
	INSTRUMENT_STATUSES,
	INSTRUMENT_TYPES,
	PROVIDER_CAPABILITIES,
	type AssetClass,
	type EquitySecurityType,
	type InstrumentStatus,
	type InstrumentType,
	type ProviderBinding,
} from "@/types/instruments";
import {
	CANONICAL_KEY_MAX_LENGTH,
	CANONICAL_KEY_PATTERN,
} from "@/lib/instruments/canonical-key";

export type InstrumentContract = {
	productCode: string;
	contractCode?: string;
	contractMonth?: string;
	expirationAt?: Date;
	firstTradeAt?: Date;
	lastTradeAt?: Date;
	multiplier?: Types.Decimal128;
	unit?: string;
	settlementCurrency?: string;
	settlementType?: "cash" | "physical";
	rollPolicy?: "front" | "next" | "calendar" | "volume" | "open_interest";
};

export interface InstrumentItem extends Document {
	canonicalKey: string;
	assetClass: AssetClass;
	instrumentType: InstrumentType;
	securityType?: EquitySecurityType;
	status: InstrumentStatus;
	displaySymbol: string;
	name: string;
	venue?: string;
	venueMic?: string;
	baseCurrency?: string;
	quoteCurrency: string;
	pricePrecision: number;
	quantityPrecision: number;
	tickSize?: Types.Decimal128;
	lotSize?: Types.Decimal128;
	timezone: string;
	calendarId?: string;
	contract?: InstrumentContract;
	providerBindings: ProviderBinding[];
	createdAt: Date;
	updatedAt: Date;
}

const INSTRUMENT_TYPES_BY_ASSET_CLASS: Record<
	AssetClass,
	readonly InstrumentType[]
> = {
	equity: ["listing"],
	forex: ["spot_pair"],
	crypto: ["asset", "spot_pair"],
	index: ["index"],
	commodity: ["spot", "future", "continuous_future"],
};

function isPositiveDecimal(value: Types.Decimal128 | null | undefined) {
	if (value === undefined || value === null) return true;
	const amount = Number(value.toString());
	return Number.isFinite(amount) && amount > 0;
}

const providerBindingSchema = new Schema<ProviderBinding>(
	{
		provider: { type: String, required: true, lowercase: true, trim: true },
		symbol: { type: String, required: true, trim: true, maxlength: 120 },
		capabilities: {
			type: [{ type: String, enum: PROVIDER_CAPABILITIES }],
			default: [],
			validate: {
				validator: (capabilities: string[]) =>
					new Set(capabilities).size === capabilities.length,
				message: "Provider capabilities must be unique",
			},
		},
		enabled: { type: Boolean, required: true, default: true },
		priority: { type: Number, required: true, default: 100, min: 0, max: 1000 },
		venue: { type: String, trim: true, maxlength: 80 },
		orientation: {
			type: String,
			required: true,
			enum: ["direct", "inverse"],
			default: "direct",
		},
	},
	{ _id: false },
);

const instrumentContractSchema = new Schema<InstrumentContract>(
	{
		productCode: {
			type: String,
			required: true,
			uppercase: true,
			trim: true,
			maxlength: 40,
		},
		contractCode: { type: String, uppercase: true, trim: true, maxlength: 60 },
		contractMonth: {
			type: String,
			trim: true,
			match: /^\d{4}-(?:0[1-9]|1[0-2])$/,
		},
		expirationAt: { type: Date },
		firstTradeAt: { type: Date },
		lastTradeAt: { type: Date },
		multiplier: {
			type: Schema.Types.Decimal128,
			validate: {
				validator: isPositiveDecimal,
				message: "Contract multiplier must be positive",
			},
		},
		unit: { type: String, trim: true, maxlength: 40 },
		settlementCurrency: {
			type: String,
			uppercase: true,
			trim: true,
			maxlength: 12,
		},
		settlementType: { type: String, enum: ["cash", "physical"] },
		rollPolicy: {
			type: String,
			enum: ["front", "next", "calendar", "volume", "open_interest"],
		},
	},
	{ _id: false },
);

const instrumentSchema = new Schema<InstrumentItem>(
	{
		canonicalKey: {
			type: String,
			required: true,
			unique: true,
			immutable: true,
			lowercase: true,
			trim: true,
			maxlength: CANONICAL_KEY_MAX_LENGTH,
			match: CANONICAL_KEY_PATTERN,
		},
		assetClass: {
			type: String,
			required: true,
			enum: ASSET_CLASSES,
			index: true,
		},
		instrumentType: {
			type: String,
			required: true,
			enum: INSTRUMENT_TYPES,
			default: "listing",
		},
		securityType: {
			type: String,
			enum: EQUITY_SECURITY_TYPES,
		},
		status: {
			type: String,
			required: true,
			enum: INSTRUMENT_STATUSES,
			default: "active",
			index: true,
		},
		displaySymbol: {
			type: String,
			required: true,
			uppercase: true,
			trim: true,
		},
		name: { type: String, required: true, trim: true },
		venue: { type: String, trim: true, maxlength: 120 },
		venueMic: {
			type: String,
			uppercase: true,
			trim: true,
			match: /^[A-Z0-9]{4}$/,
		},
		baseCurrency: { type: String, uppercase: true, trim: true },
		quoteCurrency: {
			type: String,
			required: true,
			uppercase: true,
			trim: true,
		},
		pricePrecision: { type: Number, required: true, min: 0, max: 18 },
		quantityPrecision: {
			type: Number,
			required: true,
			default: 0,
			min: 0,
			max: 18,
		},
		tickSize: {
			type: Schema.Types.Decimal128,
			validate: {
				validator: isPositiveDecimal,
				message: "Tick size must be positive",
			},
		},
		lotSize: {
			type: Schema.Types.Decimal128,
			validate: {
				validator: isPositiveDecimal,
				message: "Lot size must be positive",
			},
		},
		timezone: {
			type: String,
			required: true,
			trim: true,
			default: "Etc/UTC",
			maxlength: 80,
		},
		calendarId: {
			type: String,
			lowercase: true,
			trim: true,
			maxlength: 80,
			match: /^[a-z0-9][a-z0-9._-]*$/,
		},
		contract: {
			type: instrumentContractSchema,
		},
		providerBindings: {
			type: [providerBindingSchema],
			required: true,
			validate: [
				{
					validator: (bindings: ProviderBinding[]) => bindings.length > 0,
					message: "At least one provider binding is required",
				},
				{
					validator: (bindings: ProviderBinding[]) => {
						const keys = bindings.map(
							(binding) =>
								`${binding.provider.trim().toLowerCase()}:${binding.symbol.trim()}`,
						);
						return new Set(keys).size === keys.length;
					},
					message: "Provider bindings must be unique within an instrument",
				},
			],
		},
	},
	{ timestamps: true },
);

instrumentSchema.pre("validate", function () {
	if (!INSTRUMENT_TYPES_BY_ASSET_CLASS[this.assetClass]?.includes(this.instrumentType)) {
		this.invalidate(
			"instrumentType",
			"Instrument type is not valid for this asset class",
		);
	}
	if (this.assetClass === "equity" && !this.securityType) {
		this.securityType = "other";
	} else if (this.assetClass !== "equity" && this.securityType) {
		this.invalidate(
			"securityType",
			"Security type is only valid for equity listings",
		);
	}

	if (this.instrumentType === "future") {
		if (
			!this.contract?.productCode ||
			!this.contract.contractCode ||
			!this.contract.contractMonth ||
			!this.contract.expirationAt
		) {
			this.invalidate(
				"contract",
				"Contract metadata is incomplete for this instrument type",
			);
		}
	}

	if (
		this.instrumentType === "continuous_future" &&
		(!this.contract?.productCode || !this.contract.rollPolicy)
	) {
		this.invalidate(
			"contract",
			"Contract metadata is incomplete for this instrument type",
		);
	}
});

instrumentSchema.index(
	{ "providerBindings.provider": 1, "providerBindings.symbol": 1 },
	{ unique: true },
);
instrumentSchema.index({ assetClass: 1, instrumentType: 1, status: 1 });
instrumentSchema.index({ assetClass: 1, securityType: 1, status: 1 });
instrumentSchema.index({ venueMic: 1, displaySymbol: 1 });

const Instrument =
	(models?.Instrument as Model<InstrumentItem> | undefined) ||
	model<InstrumentItem>("Instrument", instrumentSchema);

export default Instrument;
