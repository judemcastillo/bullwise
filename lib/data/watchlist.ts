import "server-only";

import Instrument from "@/database/models/instrument.model";
import UserProfile from "@/database/models/user-profile.model";
import Watchlist from "@/database/models/watchlist.model";
import { connectToDatabase } from "@/database/mongoose";
import { requireCompletedUser } from "@/lib/auth/require-user";
import { mapWithConcurrency } from "@/lib/concurrency";
import {
	getListedSecurityQuoteDetails,
	getStocksDetails,
} from "@/lib/services/stock-data";
import { supportsCompanyStockData } from "@/lib/instruments/equity-security-type";
import {
	paginateWatchlist,
	WATCHLIST_MAX_ITEMS,
} from "@/lib/watchlist-policy";
import {
	getFinnhubWatchlistNewsSymbol,
	getFinnhubWatchlistQuoteSymbol,
	toWatchlistClientItem,
} from "@/lib/watchlist-serialization";
import type {
	AssetClass,
	EquitySecurityType,
	InstrumentType,
	ProviderBinding,
} from "@/types/instruments";
import { Types, type ClientSession, type PipelineStage } from "mongoose";

interface WatchlistInstrumentRecord {
	_id: Types.ObjectId;
	canonicalKey: string;
	assetClass: AssetClass;
	instrumentType: InstrumentType;
	securityType?: EquitySecurityType;
	displaySymbol: string;
	name: string;
	venue?: string;
	baseCurrency?: string;
	quoteCurrency: string;
	calendarId?: string;
	providerBindings: ProviderBinding[];
}

interface WatchlistRecord {
	instrumentId: Types.ObjectId;
	addedAt: Date;
	instrument: WatchlistInstrumentRecord;
}

const WATCHLIST_STOCK_DATA_CONCURRENCY = 4;

const watchlistLimitResult = () => ({
	success: false as const,
	error: `Your watchlist can contain up to ${WATCHLIST_MAX_ITEMS} instruments`,
});

function isDuplicateKeyError(error: unknown) {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		(error as { code?: unknown }).code === 11000
	);
}

function normalizeInstrumentId(instrumentId: string) {
	const normalized = typeof instrumentId === "string" ? instrumentId.trim() : "";
	return /^[a-f\d]{24}$/i.test(normalized) && Types.ObjectId.isValid(normalized)
		? normalized
		: null;
}

async function getCurrentUserId(): Promise<string> {
	return (await requireCompletedUser()).id;
}

function watchlistAggregation(userId: string, limit?: number) {
	const pipeline: PipelineStage[] = [
		{ $match: { userId } },
		{ $sort: { addedAt: -1 } },
	];
	if (limit && limit > 0) pipeline.push({ $limit: limit });
	pipeline.push(
		{
			$lookup: {
				from: Instrument.collection.name,
				localField: "instrumentId",
				foreignField: "_id",
				as: "instrument",
			},
		},
		{ $unwind: "$instrument" },
	);
	return pipeline;
}

async function loadWatchlistRecords(userId: string, limit?: number) {
	return Watchlist.aggregate<WatchlistRecord>(
		watchlistAggregation(userId, limit),
	);
}

async function reconcileWatchlistCounter(
	userId: string,
	session: ClientSession,
) {
	const actualCount = await Watchlist.countDocuments({
		userId,
		instrumentId: { $type: "objectId" },
	}).session(session);
	const result = await UserProfile.updateOne(
		{ userId, watchlistItemCount: { $ne: actualCount } },
		{ $set: { watchlistItemCount: actualCount } },
		{ session },
	);

	if (result.matchedCount === 0) {
		const profileExists = await UserProfile.exists({ userId }).session(session);
		if (!profileExists) throw new Error("User profile is unavailable");
	}
}

export async function addToCurrentUserWatchlist(instrumentId: string) {
	const userId = await getCurrentUserId();
	const normalizedInstrumentId = normalizeInstrumentId(instrumentId);
	if (!normalizedInstrumentId) {
		return { success: false, error: "Choose a valid instrument" };
	}

	try {
		const mongoose = await connectToDatabase();
		const instrument = await Instrument.findOne({
			_id: normalizedInstrumentId,
			status: "active",
		}).select({ _id: 1 });
		if (!instrument) {
			return { success: false, error: "Instrument is unavailable" };
		}

		return await mongoose.connection.transaction(async (session) => {
			await reconcileWatchlistCounter(userId, session);
			const reservation = await UserProfile.findOneAndUpdate(
				{ userId, watchlistItemCount: { $lt: WATCHLIST_MAX_ITEMS } },
				{ $inc: { watchlistItemCount: 1 } },
				{ returnDocument: "after", session },
			);

			if (!reservation) {
				const existingItem = await Watchlist.exists({
					userId,
					instrumentId: instrument._id,
				}).session(session);
				return existingItem
					? { success: false, error: "Instrument already exists" }
					: watchlistLimitResult();
			}

			await Watchlist.create(
				[{ userId, instrumentId: instrument._id }],
				{ session },
			);

			return { success: true, message: "Instrument added to watchlist" };
		});
	} catch (error) {
		if (isDuplicateKeyError(error)) {
			return { success: false, error: "Instrument already exists" };
		}
		console.error("Error adding to watchlist", error);
		throw new Error("Failed to add instrument to watchlist");
	}
}

export async function removeFromCurrentUserWatchlist(instrumentId: string) {
	const userId = await getCurrentUserId();
	const normalizedInstrumentId = normalizeInstrumentId(instrumentId);
	if (!normalizedInstrumentId) {
		return { success: false, error: "Choose a valid instrument" };
	}

	try {
		const mongoose = await connectToDatabase();
		return await mongoose.connection.transaction(async (session) => {
			await reconcileWatchlistCounter(userId, session);
			const result = await Watchlist.deleteOne(
				{ userId, instrumentId: normalizedInstrumentId },
				{ session },
			);

			if (result.deletedCount === 0) {
				return { success: false, error: "Instrument is not in watchlist" };
			}

			const counterUpdate = await UserProfile.updateOne(
				{ userId, watchlistItemCount: { $gt: 0 } },
				{ $inc: { watchlistItemCount: -1 } },
				{ session },
			);
			if (counterUpdate.modifiedCount !== 1) {
				throw new Error("Watchlist counter is inconsistent");
			}

			return { success: true, message: "Instrument removed from watchlist" };
		});
	} catch (error) {
		console.error("Error removing from watchlist:", error);
		throw new Error("Failed to remove instrument from watchlist");
	}
}

export async function getWatchlistInstrumentIdsForUser(
	userId: string,
): Promise<string[]> {
	try {
		await connectToDatabase();
		const items = await Watchlist.find({
			userId,
			instrumentId: { $type: "objectId" },
		})
			.select({ instrumentId: 1, _id: 0 })
			.lean<Array<{ instrumentId: Types.ObjectId }>>();
		return items.map(({ instrumentId }) => instrumentId.toString());
	} catch (error: unknown) {
		console.error("Error fetching watchlist instrument IDs:", error);
		return [];
	}
}

export async function getWatchlistSymbolsForUser(
	userId: string,
): Promise<string[]> {
	try {
		await connectToDatabase();
		const items = await loadWatchlistRecords(userId);
		return Array.from(
			new Set(
				items.flatMap((item) => {
					const symbol = getFinnhubWatchlistNewsSymbol(
						toWatchlistClientItem(item),
					);
					return symbol ? [symbol] : [];
				}),
			),
		);
	} catch (error: unknown) {
		console.error("Error fetching watchlist symbols:", error);
		return [];
	}
}

async function enrichWatchlistItems(watchlist: readonly WatchlistRecord[]) {
	return mapWithConcurrency(
		watchlist,
		WATCHLIST_STOCK_DATA_CONCURRENCY,
		async (item): Promise<StockWithData> => {
			const clientItem = toWatchlistClientItem(item);
			const providerSymbol = getFinnhubWatchlistQuoteSymbol(clientItem);
			if (!providerSymbol) return clientItem;

			try {
				if (
					clientItem.assetClass === "equity" &&
					!supportsCompanyStockData(clientItem.securityType)
				) {
					return {
						...clientItem,
						...(await getListedSecurityQuoteDetails(providerSymbol)),
					};
				}
				const stockData = await getStocksDetails(providerSymbol);

				return {
					...clientItem,
					currentPrice: stockData.currentPrice,
					currency: stockData.currency,
					logo: stockData.logo,
					priceFormatted: stockData.priceFormatted,
					changeFormatted: stockData.changeFormatted,
					changePercent: stockData.changePercent,
					marketCap: stockData.marketCapFormatted,
					peRatio: stockData.peRatio,
				};
			} catch (error) {
				const reason = error instanceof Error ? error.message : "unknown error";
				console.warn(
					`Unable to load watchlist data for ${clientItem.canonicalKey} (${reason})`,
				);
				return clientItem;
			}
		},
	);
}

export const getWatchlistWithData = async (
	limit?: number,
): Promise<StockWithData[]> => {
	const userId = await getCurrentUserId();

	try {
		await connectToDatabase();
		const watchlist = await loadWatchlistRecords(userId, limit);
		return watchlist.length === 0 ? [] : enrichWatchlistItems(watchlist);
	} catch (error) {
		console.error("Error loading watchlist:", error);
		throw new Error("Failed to fetch watchlist");
	}
};

export async function getPaginatedWatchlistWithData(
	requestedPage?: string | string[],
) {
	const userId = await getCurrentUserId();

	try {
		await connectToDatabase();
		const watchlist = await loadWatchlistRecords(userId);
		const pagination = paginateWatchlist(watchlist, requestedPage);

		return {
			...pagination,
			items: await enrichWatchlistItems(pagination.items),
			allItems: watchlist.map(toWatchlistClientItem),
		};
	} catch (error) {
		console.error("Error loading paginated watchlist:", error);
		throw new Error("Failed to fetch watchlist");
	}
}
