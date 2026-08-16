import StockAlertButton from "@/components/alerts/StockAlertButton";
import StockDataRow from "@/components/stocks/StockDataRow";
import TradingViewWidget from "@/components/TradingViewWidget";
import WatchlistButton from "@/components/watchlist/WatchlistButton";
import { equitySecurityTypeLabel } from "@/lib/instruments/equity-security-type";
import {
	CANDLE_CHART_WIDGET_CONFIG,
	SYMBOL_INFO_WIDGET_CONFIG,
	TRADING_VIEW_EMBED_URL,
} from "@/lib/constants";
import type { EquitySecurityType } from "@/types/instruments";

type ListedInstrumentDashboardProps = {
	displaySymbol: string;
	finnhubSymbol?: string;
	instrumentId: string;
	isInWatchlist: boolean;
	name: string;
	quoteCurrency: string;
	securityType?: EquitySecurityType;
	timezone: string;
	tradingViewSymbol: string;
	venue?: string;
};

export default function ListedInstrumentDashboard({
	displaySymbol,
	finnhubSymbol,
	instrumentId,
	isInWatchlist,
	name,
	quoteCurrency,
	securityType,
	timezone,
	tradingViewSymbol,
	venue,
}: ListedInstrumentDashboardProps) {
	const securityLabel = equitySecurityTypeLabel(securityType);

	return (
		<div className="stock-dashboard">
			<div className="stock-primary-grid">
				<section className="stock-chart-card p-1" aria-labelledby="instrument-heading">
					<header className="stock-identity">
						<div className="company-mark" aria-hidden="true">
							{displaySymbol.slice(0, 1)}
						</div>
						<div className="min-w-0 flex-1">
							<p className="text-xs font-semibold uppercase tracking-wider text-yellow-500">
								Equity · {securityLabel}
							</p>
							<div className="mt-1 flex flex-wrap items-center gap-2">
								<h1 id="instrument-heading" className="stock-company-name">
									{name}
								</h1>
								<span className="stock-symbol">{displaySymbol}</span>
							</div>
							<div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
								{venue ? <span>{venue}</span> : null}
								<span>Quoted in {quoteCurrency}</span>
							</div>
						</div>
						<WatchlistButton
							instrumentId={instrumentId}
							symbol={displaySymbol}
							company={name}
							isInWatchlist={isInWatchlist}
							type="icon"
						/>
					</header>

					<TradingViewWidget
						scriptUrl={`${TRADING_VIEW_EMBED_URL}advanced-chart.js`}
						config={CANDLE_CHART_WIDGET_CONFIG(tradingViewSymbol)}
						height={510}
						className="stock-main-chart border-0"
					/>
				</section>

				<aside className="stock-card h-full" aria-labelledby="overview-heading">
					<div className="stock-card-heading">
						<h2 id="overview-heading">Overview</h2>
						<StockAlertButton
							instrument={
								finnhubSymbol
									? {
											assetClass: "equity",
											provider: "finnhub",
											providerSymbol: finnhubSymbol,
											displaySymbol,
											name,
											venue,
											currency: quoteCurrency,
										}
									: null
							}
						/>
					</div>

					<div className="stock-card-section">
						<TradingViewWidget
							scriptUrl={`${TRADING_VIEW_EMBED_URL}symbol-info.js`}
							config={SYMBOL_INFO_WIDGET_CONFIG(tradingViewSymbol)}
							height={170}
							className="border-0"
						/>
					</div>

					<div className="stock-card-section border-b-0! pb-0!">
						<h3>Listing details</h3>
						<div className="space-y-3">
							<StockDataRow label="Security type" value={securityLabel} />
							<StockDataRow label="Venue" value={venue ?? "—"} />
							<StockDataRow label="Quote currency" value={quoteCurrency} />
							<StockDataRow label="Timezone" value={timezone} />
							<StockDataRow label="Market session" value="U.S. equities" />
							<StockDataRow label="Chart" value="TradingView" />
							<StockDataRow
								label="Alerts"
								value={finnhubSymbol ? "Finnhub" : "Not available"}
							/>
						</div>
					</div>
				</aside>
			</div>

			<p className="px-1 text-xs leading-5 text-gray-500">
				Chart and market display data are provided by TradingView. Alert quotes,
				when available, are provided by Finnhub.
			</p>
		</div>
	);
}
