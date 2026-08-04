import type {
	getRelatedStockDetails,
	getStockDashboardData,
} from "@/lib/services/stock-data";

export type StockDashboardData = Awaited<
	ReturnType<typeof getStockDashboardData>
>;

export type RelatedStockData = Awaited<ReturnType<typeof getRelatedStockDetails>>;
