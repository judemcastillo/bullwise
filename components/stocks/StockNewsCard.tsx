import { STOCK_DETAILS_NEWS_LIMIT } from "@/lib/constants";
import { formatTimeAgo } from "@/lib/utils";
import { ExternalLink, Newspaper } from "lucide-react";

export default function StockNewsCard({
	news,
}: {
	news: MarketNewsArticle[];
}) {
	return (
		<section className="stock-card h-full" aria-labelledby="latest-news-heading">
			<div className="stock-card-heading">
				<h2 id="latest-news-heading">Latest news</h2>
				<Newspaper aria-hidden="true" />
			</div>

			{news.length > 0 ? (
				<div className="divide-y divide-gray-600">
					{news.slice(0, STOCK_DETAILS_NEWS_LIMIT).map((article) => (
						<article className="stock-news-row" key={article.id}>
							<div className="min-w-0 flex-1">
								<p className="mb-2 text-xs text-gray-500">
									{article.source}
									<span className="mx-1.5" aria-hidden="true">
										•
									</span>
									<time
										dateTime={new Date(
											article.datetime * 1000,
										).toISOString()}
									>
										{formatTimeAgo(article.datetime)}
									</time>
								</p>
								<h3 className="line-clamp-2 text-sm font-medium leading-relaxed text-gray-100">
									{article.headline}
								</h3>
								<a
									className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-yellow-500 hover:text-yellow-400"
									href={article.url}
									target="_blank"
									rel="noopener noreferrer"
								>
									Read story
									<ExternalLink className="size-3" aria-hidden="true" />
								</a>
							</div>
							{article.image ? (
								<div
									className="stock-news-image"
									role="img"
									aria-label={article.headline}
									style={{ backgroundImage: `url("${article.image}")` }}
								/>
							) : (
								<div className="stock-news-placeholder" aria-hidden="true">
									<Newspaper />
								</div>
							)}
						</article>
					))}
				</div>
			) : (
				<div className="flex min-h-56 flex-col items-center justify-center text-center">
					<Newspaper className="mb-3 size-8 text-gray-600" aria-hidden="true" />
					<p className="font-medium text-gray-400">No recent stories</p>
					<p className="mt-1 text-sm text-gray-500">
						Fresh company coverage will appear here.
					</p>
				</div>
			)}
		</section>
	);
}
