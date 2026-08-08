import WatchlistAlerts from "@/components/watchlist/WatchlistAlerts";
import WatchlistNewsSection, {
	WatchlistNewsLoading,
} from "@/components/watchlist/WatchlistNewsSection";
import WatchlistPageLoading from "@/components/watchlist/WatchlistPageLoading";
import WatchlistPagination from "@/components/watchlist/WatchlistPagination";
import WatchlistSearch from "@/components/watchlist/WatchlistSearch";
import { WatchlistTable } from "@/components/watchlist/WatchlistTable";
import { getPaginatedWatchlistWithData } from "@/lib/data/watchlist";
import { getUserAlerts } from "@/lib/data/user-alerts";
import { Star } from "lucide-react";
import { Suspense } from "react";

type WatchlistSearchParams = Promise<{
	page?: string | string[];
}>;

async function WatchlistContent({
	searchParams,
}: {
	searchParams: WatchlistSearchParams;
}) {
	const { page } = await searchParams;
	const [watchlistPage, alerts] = await Promise.all([
		getPaginatedWatchlistWithData(page),
		getUserAlerts(),
	]);
	const stockMembershipKey = watchlistPage.allItems
		.map((item) => item.symbol)
		.sort()
		.join("|");
	const currentPageStocks = new Map(
		watchlistPage.items.map((item) => [item.symbol, item]),
	);
	const allSymbols = watchlistPage.allItems.map((item) => item.symbol);
	const alertInstruments = watchlistPage.allItems.map((item) => {
		const stock = currentPageStocks.get(item.symbol);

		return {
			assetClass: "equity" as const,
			provider: "finnhub",
			providerSymbol: item.symbol,
			displaySymbol: item.symbol,
			name: stock?.company ?? item.company,
			currency: stock?.currency,
			currentPrice: stock?.currentPrice,
		};
	});

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

					{watchlistPage.items.length > 0 ? (
						<>
							<WatchlistTable
								key={watchlistPage.items
									.map((item) => item.symbol)
									.join("|")}
								watchlist={watchlistPage.items}
							/>
							<WatchlistPagination
								currentPage={watchlistPage.currentPage}
								pageSize={watchlistPage.pageSize}
								totalItems={watchlistPage.totalItems}
								totalPages={watchlistPage.totalPages}
							/>
						</>
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
					instruments={alertInstruments}
				/>
			</div>

			<Suspense fallback={<WatchlistNewsLoading />}>
				<WatchlistNewsSection symbols={allSymbols} />
			</Suspense>
		</div>
	);
}

const WatchlistPage = ({
	searchParams,
}: {
	searchParams: WatchlistSearchParams;
}) => (
	<Suspense fallback={<WatchlistPageLoading />}>
		<WatchlistContent searchParams={searchParams} />
	</Suspense>
);

export default WatchlistPage;
