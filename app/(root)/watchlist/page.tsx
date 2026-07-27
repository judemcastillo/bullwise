import WatchlistSearch from "@/components/WatchlistSearch";
import { WatchlistTable } from "@/components/WatchlistTable";
import { searchStocks } from "@/lib/actions/finnhub.actions";
import { getWatchlistWithData } from "@/lib/actions/watchlist.actions";
import { Star } from "lucide-react";

const Watchlist = async () => {
	const watchlist = await getWatchlistWithData();
	const initialStocks = await searchStocks();
	const stockMembershipKey = initialStocks
		.map((stock) => `${stock.symbol}:${stock.isInWatchlist}`)
		.join("|");

	//Empty State
	if (watchlist.length === 0) {
		return (
			<section className="flex watch-list-empty-container">
				<div className="watchlist-empty">
					<Star className="watchlist-star" />
					<h2 className="empty-title">Your watchlist is empty</h2>
					<p className="empty-description">
						Start building your watchlist by searching for
						stocks,commodities,futures and clicking the star icon to add them.
					</p>
					<WatchlistSearch
						initialStocks={initialStocks}
						stockMembershipKey={stockMembershipKey}
					/>
				</div>
			</section>
		);
	}

	return (
		<section className="watchlist">
			<div className="flex flex-col gap-6">
				<div className="flex items-center justify-between">
					<h2 className="watchlist-title">Watchlist</h2>
					<WatchlistSearch
						initialStocks={initialStocks}
						stockMembershipKey={stockMembershipKey}
					/>
				</div>
				<WatchlistTable
					key={watchlist.map((item) => item.symbol).join("|")}
					watchlist={watchlist}
				/>
			</div>
		</section>
	);
};

export default Watchlist;
