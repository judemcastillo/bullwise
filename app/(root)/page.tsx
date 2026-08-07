import DashboardNews from "@/components/dashboard/DashboardNews";
import DashboardWatchlist from "@/components/dashboard/DashboardWatchlist";
import TradingViewWidget from "@/components/TradingViewWidget";
import { getWatchlistWithData } from "@/lib/data/watchlist";
import { getNews } from "@/lib/market-data/finnhub";
import {
	MARKET_OVERVIEW_WIDGET_CONFIG,
	TOP_STOCKS_WIDGET_CONFIG,
	TRADING_VIEW_EMBED_URL,
} from "@/lib/constants";
import { unstable_rethrow } from "next/navigation";

const DASHBOARD_WATCHLIST_LIMIT = 6;
const MARKET_SUMMARY_HEIGHT = 450;
const TOP_STOCKS_HEIGHT = 430;

const MARKET_SUMMARY_WIDGET_CONFIG = {
	...MARKET_OVERVIEW_WIDGET_CONFIG,
	width: "100%",
	height: MARKET_SUMMARY_HEIGHT,
};

export default async function Home() {
	const [watchlist, news] = await Promise.all([
		getWatchlistWithData(DASHBOARD_WATCHLIST_LIMIT).catch((error) => {
			unstable_rethrow(error);
			console.error("Unable to load dashboard watchlist:", error);
			return [] as StockWithData[];
		}),
		getNews().catch((error) => {
			unstable_rethrow(error);
			console.error("Unable to load dashboard news:", error);
			return [] as MarketNewsArticle[];
		}),
	]);

	return (
		<div className="grid w-full grid-cols-1 gap-8 md:grid-cols-2">
			<section className="min-w-0">
				<div className="mb-3 flex items-center justify-between gap-4">
					<h1 className="text-xl! font-semibold text-gray-100">
						Market Summary
					</h1>
					<span className="text-xs font-medium text-gray-500">
						Live market data
					</span>
				</div>
				<div className="overflow-hidden rounded-xl border border-gray-700 bg-gray-800">
					<TradingViewWidget
						scriptUrl={`${TRADING_VIEW_EMBED_URL}market-overview.js`}
						config={MARKET_SUMMARY_WIDGET_CONFIG}
						height={MARKET_SUMMARY_HEIGHT}
						className="!border-0"
					/>
				</div>
			</section>

			<DashboardWatchlist
				watchlist={watchlist.map(({
					changeFormatted,
					changePercent,
					company,
					currency,
					currentPrice,
					logo,
					symbol,
				}) => ({
					changeFormatted,
					changePercent,
					company,
					currency,
					currentPrice,
					logo,
					symbol,
				}))}
			/>

			<section className="min-w-0">
				<div className="mb-3 flex items-center justify-between gap-4">
					<h2 className="text-xl font-semibold text-gray-100">
						Today&apos;s Top Stocks
					</h2>
					<span className="text-xs font-medium text-gray-500">
						US market movers
					</span>
				</div>
				<div className="overflow-y-auto rounded-xl border border-gray-700 bg-gray-800">
					<TradingViewWidget
						scriptUrl={`${TRADING_VIEW_EMBED_URL}hotlists.js`}
						config={TOP_STOCKS_WIDGET_CONFIG}
						height={TOP_STOCKS_HEIGHT}
						className="!border-0"
					/>
				</div>
			</section>

			<DashboardNews news={news} />
		</div>
	);
}
