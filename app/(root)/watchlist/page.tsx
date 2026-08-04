import WatchlistAlerts from "@/components/watchlist/WatchlistAlerts";
import WatchlistNewsSection, {
	WatchlistNewsLoading,
} from "@/components/watchlist/WatchlistNewsSection";
import WatchlistPageLoading from "@/components/watchlist/WatchlistPageLoading";
import WatchlistSearch from "@/components/watchlist/WatchlistSearch";
import { WatchlistTable } from "@/components/watchlist/WatchlistTable";
import { getWatchlistWithData } from "@/lib/actions/watchlist.actions";
import { getUserAlerts } from "@/lib/data/user-alerts";
import { Star } from "lucide-react";
import { Suspense } from "react";

async function WatchlistContent() {
	const [watchlist, alerts] = await Promise.all([
		getWatchlistWithData(),
		getUserAlerts(),
	]);
	const stockMembershipKey = watchlist
		.map((stock) => stock.symbol)
		.sort()
		.join("|");

	return (
		<div className="watchlist-page gap-10">
			<div className="watchlist-container">
				<section className="watchlist" aria-labelledby="watchlist-heading">
					<div className="watchlist-section-heading">
						<div>
							<p className="watchlist-eyebrow">Your market</p>
							<h1 id="watchlist-heading" className="watchlist-title">
								Watchlist
							</h1>
						</div>
						<WatchlistSearch stockMembershipKey={stockMembershipKey} />
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

			<Suspense fallback={<WatchlistNewsLoading />}>
				<WatchlistNewsSection
					symbols={watchlist.map((item) => item.symbol)}
				/>
			</Suspense>
		</div>
	);
}

const WatchlistPage = () => (
	<Suspense fallback={<WatchlistPageLoading />}>
		<WatchlistContent />
	</Suspense>
);

export default WatchlistPage;
