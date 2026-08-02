import {
	formatCompactCurrencyValue,
	formatCurrencyValue,
} from "@/lib/utils";
import StockDataRow from "./StockDataRow";
import type { StockDashboardData } from "./types";
import StockAlertButton from "@/components/alerts/StockAlertButton";

export default function StockOverviewCard({
	stock,
}: {
	stock: StockDashboardData | null;
}) {
	return (
		<aside className="stock-card h-full" aria-labelledby="overview-heading">
			<div className="stock-card-heading">
				<h2 id="overview-heading">Overview</h2>
				<StockAlertButton
					instrument={
						stock
							? {
									assetClass: "equity",
									provider: "finnhub",
									providerSymbol: stock.symbol,
									displaySymbol: stock.symbol,
									name: stock.company,
									venue: stock.exchange,
									currency: stock.currency,
									currentPrice: stock.currentPrice,
								}
							: null
					}
				/>
			</div>

			<div className="stock-card-section">
				<h3>Today&apos;s range</h3>
				<div className="space-y-3">
					<StockDataRow
						label="Open"
						value={formatCurrencyValue(stock?.openPrice, stock?.currency)}
					/>
					<StockDataRow
						label="High"
						value={formatCurrencyValue(stock?.dayHigh, stock?.currency)}
						tone="positive"
					/>
					<StockDataRow
						label="Low"
						value={formatCurrencyValue(stock?.dayLow, stock?.currency)}
						tone="negative"
					/>
				</div>
			</div>

			<div className="stock-card-section border-b-0! pb-0!">
				<h3>More info</h3>
				<div className="space-y-3">
					<StockDataRow
						label="Market cap"
						value={formatCompactCurrencyValue(
							stock?.marketCapitalization,
							stock?.currency,
						)}
					/>
					<StockDataRow label="P/E ratio" value={stock?.peRatio ?? "—"} />
					<StockDataRow
						label="EPS"
						value={formatCurrencyValue(stock?.eps, stock?.currency)}
					/>
					<StockDataRow
						label="Previous close"
						value={formatCurrencyValue(
							stock?.previousClose,
							stock?.currency,
						)}
					/>
					<StockDataRow label="Currency" value={stock?.currency ?? "—"} />
				</div>
			</div>
		</aside>
	);
}
