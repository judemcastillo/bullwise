import { getNews } from "@/lib/market-data/finnhub";
import WatchlistNews from "./WatchlistNews";

export function WatchlistNewsLoading() {
	return (
		<section
			className="watchlist-news-section"
			aria-label="Loading watchlist news"
		>
			<div className="watchlist-section-heading">
				<div>
					<p className="watchlist-eyebrow">Latest coverage</p>
					<h2 className="watchlist-title">News</h2>
				</div>
			</div>
			<div className="animate-pulse space-y-4 py-4">
				<div className="h-24 rounded-xl bg-gray-800" />
				<div className="h-24 rounded-xl bg-gray-800" />
			</div>
		</section>
	);
}

export default async function WatchlistNewsSection({
	symbols,
}: {
	symbols: string[];
}) {
	const news = await getNews(symbols).catch((error) => {
		const reason = error instanceof Error ? error.message : "unknown error";
		console.warn(`Unable to load watchlist news (${reason})`);
		return [] as MarketNewsArticle[];
	});

	return <WatchlistNews news={news} />;
}
