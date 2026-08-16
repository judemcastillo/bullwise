import "server-only";

import Instrument from "@/database/models/instrument.model";
import { connectToDatabase } from "@/database/mongoose";
import { buildFinnhubEquityInstrumentDefinition } from "@/lib/instruments/finnhub-equity";
import {
	isCanonicalKey,
	parseCanonicalKeyRouteParam,
} from "@/lib/instruments/canonical-key";
import { getStockProfile, getStockQuote } from "@/lib/services/stock-data";

export class InstrumentResolutionError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "InstrumentResolutionError";
	}
}

function isDuplicateKeyError(error: unknown) {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		error.code === 11000
	);
}

function normalizeFinnhubSymbol(providerSymbol: string) {
	const normalizedProviderSymbol = providerSymbol.trim().toUpperCase();
	if (!/^[A-Z0-9._:/-]{1,40}$/.test(normalizedProviderSymbol)) {
		throw new InstrumentResolutionError("Choose a valid instrument");
	}
	return normalizedProviderSymbol;
}

export async function resolveFinnhubEquityCatalogInstrument(
	providerSymbol: string,
) {
	const normalizedProviderSymbol = normalizeFinnhubSymbol(providerSymbol);
	const mongoose = await connectToDatabase();

	const existing = await Instrument.findOne({
		providerBindings: {
			$elemMatch: {
				provider: "finnhub",
				symbol: normalizedProviderSymbol,
			},
		},
	});
	const existingBinding = existing?.providerBindings.find(
		(binding) => binding.provider === "finnhub" && binding.symbol === normalizedProviderSymbol,
	);
	if (
		existing &&
		isCanonicalKey(existing.canonicalKey) &&
		existingBinding?.capabilities.includes("catalog") &&
		existingBinding.capabilities.includes("quote")
	) {
		return existing;
	}

	const profile = await getStockProfile(normalizedProviderSymbol);
	const company = profile.name?.trim() || profile.ticker?.trim();

	if (!company) {
		throw new InstrumentResolutionError(
			"Instrument catalog data is unavailable",
		);
	}

	let definition;
	try {
		definition = buildFinnhubEquityInstrumentDefinition(
			{
				symbol: profile.ticker || normalizedProviderSymbol,
				company,
				exchange: profile.exchange,
				currency: profile.currency,
			},
			normalizedProviderSymbol,
		);
	} catch {
		throw new InstrumentResolutionError("Choose a valid instrument");
	}

	if (existing) {
		try {
			return await mongoose.connection.transaction(async (session) => {
				if (existing.canonicalKey !== definition.canonicalKey) {
					const conflictingInstrument = await Instrument.exists({
						_id: { $ne: existing._id },
						canonicalKey: definition.canonicalKey,
					}).session(session);
					if (conflictingInstrument) {
						throw new InstrumentResolutionError(
							"Instrument catalog data conflicts with an existing instrument",
						);
					}

					await Instrument.collection.updateOne(
						{ _id: existing._id },
						{ $set: { canonicalKey: definition.canonicalKey } },
						{ session },
					);
				}
				const upgraded = await Instrument.findByIdAndUpdate(
					existing._id,
					{
						$set: {
							instrumentType: definition.instrumentType,
							securityType: definition.securityType,
							status: definition.status,
							displaySymbol: definition.displaySymbol,
							name: definition.name,
							venue: definition.venue,
							venueMic: definition.venueMic,
							quoteCurrency: definition.quoteCurrency,
							pricePrecision: definition.pricePrecision,
							quantityPrecision: definition.quantityPrecision,
							timezone: definition.timezone,
							calendarId: definition.calendarId,
							"providerBindings.$[binding].capabilities":
								definition.providerBindings[0].capabilities,
							"providerBindings.$[binding].enabled": true,
							"providerBindings.$[binding].priority": 100,
							"providerBindings.$[binding].venue":
								definition.providerBindings[0].venue,
							"providerBindings.$[binding].orientation": "direct",
						},
					},
					{
						arrayFilters: [
							{
								"binding.provider": "finnhub",
								"binding.symbol": normalizedProviderSymbol,
							},
						],
						returnDocument: "after",
						runValidators: true,
						session,
					},
				);
				if (!upgraded) throw new Error("Unable to upgrade this instrument");
				return upgraded;
			});
		} catch (error) {
			if (isDuplicateKeyError(error)) {
				throw new InstrumentResolutionError(
					"Instrument catalog data conflicts with an existing instrument",
				);
			}
			throw error;
		}
	}

	const instrument = await Instrument.findOneAndUpdate(
		{
			$or: [
				{ canonicalKey: definition.canonicalKey },
				{
					providerBindings: {
						$elemMatch: {
							provider: "finnhub",
							symbol: normalizedProviderSymbol,
						},
					},
				},
			],
		},
		{ $setOnInsert: definition },
		{ upsert: true, returnDocument: "after", runValidators: true },
	);

	if (!instrument) throw new Error("Unable to resolve this instrument");
	return instrument;
}

export async function resolveFinnhubEquityInstrument(providerSymbol: string) {
	const normalizedProviderSymbol = normalizeFinnhubSymbol(providerSymbol);
	const [instrument, quote] = await Promise.all([
		resolveFinnhubEquityCatalogInstrument(normalizedProviderSymbol),
		getStockQuote(normalizedProviderSymbol),
	]);

	if (!quote.currentPrice || quote.currentPrice <= 0) {
		throw new InstrumentResolutionError(
			"Current market data is unavailable for this instrument",
		);
	}

	return { instrument, currentPrice: quote.currentPrice };
}

export async function getInstrumentByCanonicalKey(canonicalKey: string) {
	const normalizedCanonicalKey = parseCanonicalKeyRouteParam(canonicalKey);
	if (!normalizedCanonicalKey) return null;

	await connectToDatabase();
	return Instrument.findOne({
		canonicalKey: normalizedCanonicalKey,
		status: "active",
	}).lean();
}
