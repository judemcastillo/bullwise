import RelatedStocksCard from "@/components/stocks/RelatedStocksCard";
import StockAnalysisCard from "@/components/stocks/StockAnalysisCard";
import StockChartCard from "@/components/stocks/StockChartCard";
import StockCompanyInfoCard from "@/components/stocks/StockCompanyInfoCard";
import StockNewsCard from "@/components/stocks/StockNewsCard";
import StockOverviewCard from "@/components/stocks/StockOverviewCard";
import { getNews } from "@/lib/actions/finnhub.actions";
import { getWatchlistSymbolsByUserId } from "@/lib/actions/watchlist.actions";
import { auth } from "@/lib/better-auth/auth";
import { STOCK_DETAILS_RELATED_LIMIT } from "@/lib/constants";
import {
	getCompanyPeers,
	getRelatedStockDetails,
	getStockDashboardData,
} from "@/lib/services/stock-data";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

async function StockNewsSection({ symbol }: { symbol: string }) {
	const news = await getNews([symbol]).catch((error) => {
		const reason = error instanceof Error ? error.message : "unknown error";
		console.warn(`Unable to load news for ${symbol} (${reason})`);
		return [] as MarketNewsArticle[];
	});

	return <StockNewsCard news={news} />;
}

async function RelatedStocksSection({ symbol }: { symbol: string }) {
	const companyPeers = await getCompanyPeers(symbol);
	const peerSymbols = companyPeers.slice(0, STOCK_DETAILS_RELATED_LIMIT);
	const relatedResults = await Promise.allSettled(
		peerSymbols.map((peerSymbol) => getRelatedStockDetails(peerSymbol)),
	);
	const relatedStocks = relatedResults.flatMap((result) =>
		result.status === "fulfilled" ? [result.value] : [],
	);

	return (
		<RelatedStocksCard stocks={relatedStocks} peerSymbols={peerSymbols} />
	);
}

function StockCardLoading({ title }: { title: string }) {
	return (
		<section className="stock-card h-full" aria-label={`Loading ${title}`}>
			<div className="stock-card-heading">
				<h2>{title}</h2>
			</div>
			<div className="min-h-56 animate-pulse space-y-4 p-5">
				<div className="h-4 w-3/4 rounded bg-gray-700" />
				<div className="h-4 w-1/2 rounded bg-gray-700" />
				<div className="h-4 w-2/3 rounded bg-gray-700" />
			</div>
		</section>
	);
}

const StockDetails = async ({ params }: StockDetailsPageProps) => {
	const { symbol } = await params;
	const normalizedSymbol = symbol.trim().toUpperCase();
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user) redirect("/sign-in");

	const [watchlistSymbols, stock] = await Promise.all([
		getWatchlistSymbolsByUserId(session.user.id).catch((error) => {
			console.error(
				`Unable to load watchlist for ${session.user.id}:`,
				error,
			);
			return [] as string[];
		}),
		getStockDashboardData(normalizedSymbol).catch((error) => {
			const reason =
				error instanceof Error ? error.message : "unknown error";
			console.warn(
				`Unable to load dashboard data for ${normalizedSymbol} (${reason})`,
			);
			return null;
		}),
	]);

	const company = stock?.company ?? normalizedSymbol;

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
				<Suspense fallback={<StockCardLoading title="Latest news" />}>
					<StockNewsSection symbol={normalizedSymbol} />
				</Suspense>
				<Suspense fallback={<StockCardLoading title="Related stocks" />}>
					<RelatedStocksSection symbol={normalizedSymbol} />
				</Suspense>
			</div>
		</div>
	);
};

export default StockDetails;
