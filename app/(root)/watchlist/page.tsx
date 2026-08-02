import WatchlistAlerts from "@/components/WatchlistAlerts";
import WatchlistNews from "@/components/WatchlistNews";
import WatchlistSearch from "@/components/WatchlistSearch";
import { WatchlistTable } from "@/components/WatchlistTable";
import { getNews, searchStocks } from "@/lib/actions/finnhub.actions";
import { getWatchlistWithData } from "@/lib/actions/watchlist.actions";
import { getUserAlerts } from "@/lib/data/user-alerts";
import { Star } from "lucide-react";

const Watchlist = async () => {
	const [watchlist, initialStocks, alerts] = await Promise.all([
		getWatchlistWithData(),
		searchStocks(),
		getUserAlerts(),
	]);
	const stockMembershipKey = initialStocks
		.map((stock) => `${stock.symbol}:${stock.isInWatchlist}`)
		.join("|");

	let news: MarketNewsArticle[] = [];

	try {
		news = await getNews(watchlist.map((item) => item.symbol));
	} catch (error) {
		console.error("Unable to load watchlist news:", error);
	}

	return (
		<div className="watchlist-page  gap-10">
			<div className="watchlist-container">
				<section className="watchlist" aria-labelledby="watchlist-heading">
					<div className="watchlist-section-heading">
						<div>
							<p className="watchlist-eyebrow">Your market</p>
							<h1 id="watchlist-heading" className="watchlist-title">
								Watchlist
							</h1>
						</div>
						<WatchlistSearch
							initialStocks={initialStocks}
							stockMembershipKey={stockMembershipKey}
						/>
					</div>

					{watchlist.length > 0 ? (
						<WatchlistTable
							key={watchlist.map((item) => item.symbol).join("|")}
							watchlist={watchlist}
						/>
					) : (
						<div className="watchlist-empty-container">
							<div className="watchlist-empty">
								<Star className="watchlist-star" />
								<h2 className="empty-title">Your watchlist is empty</h2>
								<p className="empty-description">
									Search for stocks and select the star to build your first
									watchlist.
								</p>
							</div>
						</div>
					)}
				</section>

				<WatchlistAlerts
					alerts={alerts}
					instruments={watchlist.map((item) => ({
						assetClass: "equity",
						provider: "finnhub",
						providerSymbol: item.symbol,
						displaySymbol: item.symbol,
						name: item.company,
						currency: item.currency,
						currentPrice: item.currentPrice,
					}))}
				/>
			</div>

			<WatchlistNews news={news} />
		</div>
	);
};

export default Watchlist;
