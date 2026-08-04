import { formatTimeAgo } from "@/lib/utils";
import { ArrowUpRight, Newspaper } from "lucide-react";

export default function WatchlistNews({
	news,
}: {
	news: MarketNewsArticle[];
}) {
	return (
		<section className="watchlist-news-section" aria-labelledby="news-heading">
			<div className="watchlist-section-heading">
				<div>
					<p className="watchlist-eyebrow">Latest coverage</p>
					<h2 id="news-heading" className="watchlist-title">
						News
					</h2>
				</div>
				{news.length > 0 ? (
					<span className="watchlist-section-count">
						{news.length} stor{news.length === 1 ? "y" : "ies"}
					</span>
				) : null}
			</div>

			{news.length > 0 ? (
				<div className="watchlist-news">
					{news.map((article) => {
						const tag =
							article.related?.split(",")[0]?.trim() ||
							article.category ||
							"Market";

						return (
							<article className="news-item" key={article.id}>
								<div className="news-item-topline">
									<span className="news-tag">{tag.toUpperCase()}</span>
									<ArrowUpRight aria-hidden="true" />
								</div>
								<h3 className="news-title">{article.headline}</h3>
								<p className="news-meta">
									<span>{article.source}</span>
									<span aria-hidden="true">•</span>
									<time dateTime={new Date(article.datetime * 1000).toISOString()}>
										{formatTimeAgo(article.datetime)}
									</time>
								</p>
								<p className="news-summary">{article.summary}</p>
								<a
									className="news-cta"
									href={article.url}
									target="_blank"
									rel="noopener noreferrer"
									aria-label={`Read ${article.headline}`}
								>
									Read story
									<ArrowUpRight aria-hidden="true" />
								</a>
							</article>
						);
					})}
				</div>
			) : (
				<div className="news-empty">
					<Newspaper aria-hidden="true" />
					<div>
						<h3>No recent stories</h3>
						<p>Fresh coverage for your watchlist will appear here.</p>
					</div>
				</div>
			)}
		</section>
	);
}
