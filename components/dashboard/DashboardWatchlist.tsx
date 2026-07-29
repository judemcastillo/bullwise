import StockLogo from "@/components/stocks/StockLogo";
import { cn, formatCurrencyValue } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, Star } from "lucide-react";
import Link from "next/link";

type DashboardWatchlistItem = Pick<
	StockWithData,
	| "changeFormatted"
	| "changePercent"
	| "company"
	| "currency"
	| "currentPrice"
	| "logo"
	| "symbol"
>;

export default function DashboardWatchlist({
	watchlist,
}: {
	watchlist: DashboardWatchlistItem[];
}) {
	return (
		<section className="min-w-0">
			<div className="mb-3 flex items-center justify-between gap-4">
				<h2 className="text-xl font-semibold text-gray-100">
					Your Watchlist
				</h2>
				<Link
					href="/watchlist"
					className="text-xs font-medium text-gray-400 transition-colors hover:text-yellow-500"
				>
					View all
				</Link>
			</div>

			<div className="min-h-[450px] rounded-xl border border-gray-700 bg-gray-800 p-5 flex">
				{watchlist.length > 0 ? (
					<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 h-full w-full">
						{watchlist.map((stock) => {
							const hasChange = stock.changePercent !== undefined;
							const isPositive = hasChange && stock.changePercent >= 0;

							return (
								<Link
									href={`/stocks/${encodeURIComponent(stock.symbol)}`}
									key={stock.symbol}
									className="group p-4 min-w-0 rounded-md border h-full border-gray-600 bg-gray-700  transition-colors hover:border-yellow-500/50 hover:bg-gray-600/80"
								>
									<div className="mb-2 flex items-start justify-between gap-2">
										<StockLogo
											company={stock.company}
											logo={stock.logo}
											symbol={stock.symbol}
											className="size-11 rounded-md border-gray-600 bg-gray-800 text-base"
										/>
										<span className="flex size-7 items-center justify-center rounded-full bg-gray-600 text-yellow-500">
											<Star
												className="size-4"
												fill="currentColor"
												aria-hidden="true"
											/>
										</span>
									</div>

									<p
										className="truncate text-base font-medium text-gray-300"
										title={stock.company}
									>
										{stock.company}
									</p>
									<p className="mt-0.5 font-mono text-[10px] text-gray-500">
										{stock.symbol}
									</p>
									<p className="mt-2 truncate text-sm font-semibold text-gray-100">
										{formatCurrencyValue(
											stock.currentPrice,
											stock.currency,
										)}
									</p>
									<p
										className={cn(
											"mt-1 flex items-center gap-0.5 text-[10px] font-medium",
											hasChange
												? isPositive
													? "text-teal-400"
													: "text-red-500"
												: "text-gray-500",
										)}
									>
										{!hasChange ? null : isPositive ? (
											<ArrowUpRight className="size-3" aria-hidden="true" />
										) : (
											<ArrowDownRight className="size-3" aria-hidden="true" />
										)}
										{stock.changeFormatted || "—"}
									</p>
								</Link>
							);
						})}
					</div>
				) : (
					<div className="flex min-h-[292px] flex-col items-center justify-center px-6 text-center">
						<span className="mb-3 flex size-10 items-center justify-center rounded-full bg-gray-700 text-gray-500">
							<Star className="size-4" aria-hidden="true" />
						</span>
						<p className="text-sm font-medium text-gray-300">
							Your watchlist is empty
						</p>
						<p className="mt-1 max-w-56 text-xs leading-relaxed text-gray-500">
							Add stocks from search to see their latest Finnhub quotes here.
						</p>
					</div>
				)}
			</div>
		</section>
	);
}
