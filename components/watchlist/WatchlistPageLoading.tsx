import { WatchlistNewsLoading } from "./WatchlistNewsSection";

export default function WatchlistPageLoading() {
	return (
		<div className="watchlist-page gap-10" aria-label="Loading watchlist">
			<div className="watchlist-container">
				<section className="watchlist">
					<div className="watchlist-section-heading">
						<div>
							<p className="watchlist-eyebrow">Your market</p>
							<h1 className="watchlist-title">Watchlist</h1>
						</div>
					</div>
					<div className="h-72 animate-pulse rounded-xl bg-gray-800" />
				</section>
				<div className="watchlist-alerts">
					<div className="watchlist-section-heading">
						<div>
							<p className="watchlist-eyebrow">Price monitoring</p>
							<h2 className="watchlist-title">Alerts</h2>
						</div>
					</div>
					<div className="h-72 animate-pulse rounded-xl bg-gray-800" />
				</div>
			</div>
			<WatchlistNewsLoading />
		</div>
	);
}
