import TradingViewWidget from "@/components/TradingViewWidget";
import WatchlistButton from "@/components/watchlist/WatchlistButton";
import {
	CANDLE_CHART_WIDGET_CONFIG,
	TRADING_VIEW_EMBED_URL,
} from "@/lib/constants";
import {
	cn,
	formatCurrencyValue,
	formatNumberValue,
} from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { StockDashboardData } from "./types";

type StockChartCardProps = {
	company: string;
	instrumentId?: string;
	isInWatchlist: boolean;
	stock: StockDashboardData | null;
	symbol: string;
};

export default function StockChartCard({
	company,
	instrumentId,
	isInWatchlist,
	stock,
	symbol,
}: StockChartCardProps) {
	const isPositive = (stock?.changePercent ?? 0) >= 0;

	return (
		<section className="stock-chart-card p-1" aria-labelledby="stock-heading">
			<header className="stock-identity">
				<div
					className="company-mark"
					role={stock?.logo ? "img" : undefined}
					aria-label={stock?.logo ? `${company} logo` : undefined}
					style={
						stock?.logo
							? { backgroundImage: `url("${stock.logo}")` }
							: undefined
					}
				>
					{stock?.logo ? null : symbol.slice(0, 1)}
				</div>
				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-center gap-x-2 gap-y-1">
						<h1 id="stock-heading" className="stock-company-name">
							{company}
						</h1>
						<span className="stock-symbol">{symbol}</span>
						{stock?.exchange ? (
							<>
								<span className="text-gray-600" aria-hidden="true">
									•
								</span>
								<span className="text-xs text-gray-500">
									{stock.exchange}
								</span>
							</>
						) : null}
						{stock?.industry ? (
							<>
								<span className="text-gray-600" aria-hidden="true">
									•
								</span>
								<span className="text-xs text-gray-500">
									{stock.industry}
								</span>
							</>
						) : null}
					</div>
					<div className="mt-2 flex flex-wrap items-baseline gap-2">
						<span className="text-2xl font-bold tracking-tight text-gray-100">
							{formatCurrencyValue(stock?.currentPrice, stock?.currency)}
						</span>
						<span
							className={cn(
								"inline-flex items-center gap-1 text-sm font-semibold",
								stock ? (isPositive ? "text-teal-400" : "text-red-500") : "text-gray-500",
							)}
						>
							{stock ? (
								isPositive ? (
									<ArrowUpRight aria-hidden="true" />
								) : (
									<ArrowDownRight aria-hidden="true" />
								)
							) : null}
							{stock
								? `${formatNumberValue(Math.abs(stock.change))} (${stock.changeFormatted})`
								: "Market data unavailable"}
						</span>
					</div>
				</div>
				{instrumentId ? (
					<WatchlistButton
						key={instrumentId}
						instrumentId={instrumentId}
						symbol={symbol}
						company={company}
						isInWatchlist={isInWatchlist}
						type="icon"
					/>
				) : null}
			</header>

			<TradingViewWidget
				scriptUrl={`${TRADING_VIEW_EMBED_URL}advanced-chart.js`}
				config={CANDLE_CHART_WIDGET_CONFIG(symbol)}
				height={510}
				className="stock-main-chart border-0"
			/>
		</section>
	);
}
