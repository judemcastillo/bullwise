import type {
	getStockDashboardData,
	getStocksDetails,
} from "@/lib/services/stock-data";

export type StockDashboardData = Awaited<
	ReturnType<typeof getStockDashboardData>
>;

export type RelatedStockData = Awaited<ReturnType<typeof getStocksDetails>>;
