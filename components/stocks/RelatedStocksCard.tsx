import { formatCurrencyValue } from "@/lib/utils";
import {
	ArrowDownRight,
	ArrowUpRight,
	Building2,
} from "lucide-react";
import Link from "next/link";
import StockLogo from "./StockLogo";
import type { RelatedStockData } from "./types";

export default function RelatedStocksCard({
	stocks,
	peerSymbols,
}: {
	stocks: RelatedStockData[];
	peerSymbols: string[];
}) {
	const stockBySymbol = new Map(stocks.map((stock) => [stock.symbol, stock]));

	return (
		<section className="stock-card h-full" aria-labelledby="related-heading">
			<div className="stock-card-heading">
				<h2 id="related-heading">Related stocks</h2>
			</div>
			{peerSymbols.length > 0 ? (
				<div className="divide-y divide-gray-600">
					{peerSymbols.map((symbol) => {
						const stock = stockBySymbol.get(symbol);
						const isPositive = (stock?.changePercent ?? 0) >= 0;

						return (
							<Link
								href={`/stocks/${symbol}`}
								className="related-stock-row group"
								key={symbol}
							>
								<StockLogo
									className="company-mark-small"
									company={stock?.company ?? symbol}
									logo={stock?.logo}
									symbol={symbol}
								/>

								<span className="min-w-0 flex-1">
									<span className="block truncate text-sm text-gray-400 group-hover:text-gray-100">
										{stock?.company ?? symbol}
									</span>
									<span className="mt-1 block font-semibold text-gray-100">
										{stock
											? formatCurrencyValue(
													stock.currentPrice,
													stock.currency,
												)
											: "View stock"}
									</span>
								</span>
								<span className="text-right">
									<span className="block text-xs font-medium text-gray-400">
										{symbol}
									</span>
									{stock ? (
										<span
											className={`mt-1 flex items-center justify-end gap-0.5 text-xs font-medium ${
												isPositive ? "text-teal-400" : "text-red-500"
											}`}
										>
											{isPositive ? (
												<ArrowUpRight aria-hidden="true" />
											) : (
												<ArrowDownRight aria-hidden="true" />
											)}
											{stock.changeFormatted}
										</span>
									) : null}
								</span>
							</Link>
						);
					})}
				</div>
			) : (
				<div className="flex min-h-56 flex-col items-center justify-center px-4 text-center">
					<Building2
						className="mb-3 size-8 text-gray-600"
						aria-hidden="true"
					/>
					<p className="font-medium text-gray-400">
						No related stocks available
					</p>
					<p className="mt-1 text-sm text-gray-500">
						Finnhub did not return company peers for this symbol.
					</p>
				</div>
			)}
		</section>
	);
}
