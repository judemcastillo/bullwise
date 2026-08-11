import "server-only";

import { randomUUID } from "node:crypto";
import MarketNewsDeliveryLog from "@/database/models/market-news-delivery-log.model";
import { connectToDatabase } from "@/database/mongoose";

export const MARKET_NEWS_DELIVERY_LEASE_MS = 5 * 60_000;

export interface MarketNewsDeliveryClaim {
	deliveryKey: string;
	leaseId: string;
}

const isDuplicateKeyError = (error: unknown) =>
	Boolean(
		error &&
			typeof error === "object" &&
			"code" in error &&
			error.code === 11000,
	);

export async function claimMarketNewsDelivery(
	deliveryKey: string,
	now = new Date(),
): Promise<MarketNewsDeliveryClaim | null> {
	await connectToDatabase();
	await MarketNewsDeliveryLog.init();
	const leaseId = randomUUID();
	const leaseExpiresAt = new Date(now.getTime() + MARKET_NEWS_DELIVERY_LEASE_MS);

	try {
		await MarketNewsDeliveryLog.create({
			deliveryKey,
			status: "in_progress",
			leaseId,
			leaseExpiresAt,
		});
		return { deliveryKey, leaseId };
	} catch (error) {
		if (!isDuplicateKeyError(error)) throw error;
	}

	const reclaimed = await MarketNewsDeliveryLog.findOneAndUpdate(
		{
			deliveryKey,
			$or: [
				{ status: "failed" },
				{ status: { $exists: false } },
				{ status: "in_progress", leaseExpiresAt: { $lte: now } },
			],
		},
		{
			$set: { status: "in_progress", leaseId, leaseExpiresAt },
			$unset: { completedAt: 1, failedAt: 1 },
		},
		{ returnDocument: "after" },
	);

	return reclaimed ? { deliveryKey, leaseId } : null;
}

export async function completeMarketNewsDelivery(
	claim: MarketNewsDeliveryClaim,
	completedAt = new Date(),
) {
	await connectToDatabase();
	const result = await MarketNewsDeliveryLog.updateOne(
		{
			deliveryKey: claim.deliveryKey,
			status: "in_progress",
			leaseId: claim.leaseId,
		},
		{
			$set: { status: "completed", completedAt },
			$unset: { leaseId: 1, leaseExpiresAt: 1, failedAt: 1 },
		},
	);

	return result.modifiedCount === 1;
}

export async function failMarketNewsDelivery(
	claim: MarketNewsDeliveryClaim,
	failedAt = new Date(),
) {
	await connectToDatabase();
	const result = await MarketNewsDeliveryLog.updateOne(
		{
			deliveryKey: claim.deliveryKey,
			status: "in_progress",
			leaseId: claim.leaseId,
		},
		{
			$set: { status: "failed", failedAt },
			$unset: { leaseId: 1, leaseExpiresAt: 1, completedAt: 1 },
		},
	);

	return result.modifiedCount === 1;
}
