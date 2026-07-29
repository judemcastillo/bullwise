import RelatedStocksCard from "@/components/stocks/RelatedStocksCard";
import StockAnalysisCard from "@/components/stocks/StockAnalysisCard";
import StockChartCard from "@/components/stocks/StockChartCard";
import StockCompanyInfoCard from "@/components/stocks/StockCompanyInfoCard";
import StockNewsCard from "@/components/stocks/StockNewsCard";
import StockOverviewCard from "@/components/stocks/StockOverviewCard";
import { getNews, searchStocks } from "@/lib/actions/finnhub.actions";
import { getWatchlistSymbolsByUserId } from "@/lib/actions/watchlist.actions";
import { auth } from "@/lib/better-auth/auth";
import { STOCK_DETAILS_RELATED_LIMIT } from "@/lib/constants";
import {
	getCompanyPeers,
	getStockDashboardData,
	getStocksDetails,
} from "@/lib/services/stock-data";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const StockDetails = async ({ params }: StockDetailsPageProps) => {
	const { symbol } = await params;
	const normalizedSymbol = symbol.trim().toUpperCase();
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user) redirect("/sign-in");

	const [watchlistSymbols, matchingStocks, stock, news, companyPeers] =
		await Promise.all([
			getWatchlistSymbolsByUserId(session.user.id).catch((error) => {
				console.error(
					`Unable to load watchlist for ${session.user.id}:`,
					error,
				);
				return [] as string[];
			}),
			searchStocks(normalizedSymbol).catch((error) => {
				console.error(`Unable to search stocks for ${normalizedSymbol}:`, error);
				return [];
			}),
			getStockDashboardData(normalizedSymbol).catch((error) => {
				console.error(
					`Unable to load dashboard data for ${normalizedSymbol}:`,
					error,
				);
				return null;
			}),
			getNews([normalizedSymbol]).catch((error) => {
				console.error(`Unable to load news for ${normalizedSymbol}:`, error);
				return [] as MarketNewsArticle[];
			}),
			getCompanyPeers(normalizedSymbol).catch((error) => {
				console.error(`Unable to load peers for ${normalizedSymbol}:`, error);
				return [] as string[];
			}),
		]);

	const company =
		stock?.company ??
		matchingStocks.find((item) => item.symbol === normalizedSymbol)?.name ??
		normalizedSymbol;
	const peerSymbols = companyPeers.slice(0, STOCK_DETAILS_RELATED_LIMIT);
	const relatedResults = await Promise.allSettled(
		peerSymbols.map((peerSymbol) => getStocksDetails(peerSymbol)),
	);
	const relatedStocks = relatedResults.flatMap((result) =>
		result.status === "fulfilled" ? [result.value] : [],
	);

	return (
		<div className="stock-dashboard">
			<div className="stock-primary-grid">
				<StockChartCard
					company={company}
					isInWatchlist={watchlistSymbols.includes(normalizedSymbol)}
					stock={stock}
					symbol={normalizedSymbol}
				/>
				<StockOverviewCard stock={stock} />
			</div>

			<div className="stock-secondary-grid">
				<div className="flex min-w-0 flex-col gap-5">
					<StockAnalysisCard symbol={normalizedSymbol} />
					<StockCompanyInfoCard stock={stock} />
				</div>
				<StockNewsCard news={news} />
				<RelatedStocksCard
					stocks={relatedStocks}
					peerSymbols={peerSymbols}
				/>
			</div>
		</div>
	);
};

export default StockDetails;
