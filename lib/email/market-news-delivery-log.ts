import "server-only";

import MarketNewsDeliveryLog from "@/database/models/market-news-delivery-log.model";
import { connectToDatabase } from "@/database/mongoose";

const isDuplicateKeyError = (error: unknown) =>
	Boolean(
		error &&
			typeof error === "object" &&
			"code" in error &&
			error.code === 11000,
	);

export async function claimMarketNewsDelivery(deliveryKey: string) {
	await connectToDatabase();
	await MarketNewsDeliveryLog.init();

	try {
		await MarketNewsDeliveryLog.create({ deliveryKey });
		return true;
	} catch (error) {
		if (isDuplicateKeyError(error)) return false;
		throw error;
	}
}
