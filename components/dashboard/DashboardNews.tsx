import { formatTimeAgo } from "@/lib/utils";
import { ArrowUpRight, Newspaper } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";

export default function DashboardNews({ news }: { news: MarketNewsArticle[] }) {
	return (
		<section className="min-w-0">
			<div className="mb-3 flex items-center justify-between gap-4">
				<h2 className="text-xl font-semibold text-gray-100">
					Today&apos;s Financial News
				</h2>
				<span className="text-xs font-medium text-gray-500">Live feed</span>
			</div>

			<div className="h-[430px] rounded-xl border border-gray-700 bg-gray-800  ">
				<div className="sticky top-0 z-10 flex gap-2 border-b border-gray-700 bg-gray-800 py-3 h-[50px] w-full px-3 rounded-t-xl">
					<span className="rounded-full bg-gray-600 px-3 py-1 text-[11px] font-medium text-gray-200">
						Top stories
					</span>
					<span className="rounded-full bg-gray-700 px-3 py-1 text-[11px] text-gray-500">
						Markets
					</span>
					<span className="rounded-full bg-gray-700 px-3 py-1 text-[11px] text-gray-500">
						Companies
					</span>
				</div>

				{news.length > 0 ? (
					<ScrollArea className="h-93">
						<div className="divide-y divide-gray-700 px-5">
							{news.map((article) => {
								const tag =
									article.related?.split(",")[0]?.trim() ||
									article.category ||
									"Market";

								return (
									<a
										href={article.url}
										target="_blank"
										rel="noopener noreferrer"
										className="group flex min-h-28 gap-4 py-3"
										key={article.id}
									>
										<div className="min-w-0 flex-1">
											<p className="mb-2 flex flex-wrap items-center gap-1.5 text-[10px] text-gray-500">
												<span>{article.source}</span>
												<span aria-hidden="true">•</span>
												<time
													dateTime={new Date(
														article.datetime * 1000,
													).toISOString()}
												>
													{formatTimeAgo(article.datetime)}
												</time>
											</p>
											<h3 className="line-clamp-2 text-sm font-medium leading-relaxed text-gray-100 transition-colors group-hover:text-yellow-500">
												{article.headline}
											</h3>
											<span className="mt-2 inline-flex items-center gap-1 rounded bg-gray-700 px-2 py-1  text-[9px] text-gray-400">
												{tag.toUpperCase()}
												<ArrowUpRight className="size-2.5" aria-hidden="true" />
											</span>
										</div>

										{article.image ? (
											<div
												className="h-20 w-28 shrink-0 self-center rounded-lg bg-gray-700 bg-cover bg-center"
												role="img"
												aria-label=""
												style={{ backgroundImage: `url("${article.image}")` }}
											/>
										) : (
											<div className="flex h-20 w-28 shrink-0 items-center justify-center self-center rounded-lg bg-gray-700 text-gray-500">
												<Newspaper className="size-5" aria-hidden="true" />
											</div>
										)}
									</a>
								);
							})}
						</div>
					</ScrollArea>
				) : (
					<div className="flex min-h-80 flex-col items-center justify-center text-center">
						<Newspaper
							className="mb-3 size-7 text-gray-600"
							aria-hidden="true"
						/>
						<p className="text-sm font-medium text-gray-400">
							No market stories available
						</p>
						<p className="mt-1 text-xs text-gray-500">
							New financial coverage will appear here.
						</p>
					</div>
				)}
			</div>
		</section>
	);
}
