import StockDataRow from "@/components/stocks/StockDataRow";
import TradingViewWidget from "@/components/TradingViewWidget";
import WatchlistButton from "@/components/watchlist/WatchlistButton";
import {
	CANDLE_CHART_WIDGET_CONFIG,
	SYMBOL_INFO_WIDGET_CONFIG,
	TRADING_VIEW_EMBED_URL,
} from "@/lib/constants";

type ForexProviderSummary = {
	analysis: string;
	catalog: string;
	marketDisplay: string;
};

type ForexInstrumentDashboardProps = {
	assetClass?: "forex" | "crypto" | "commodity";
	baseCurrency?: string;
	calendarId?: string;
	displaySymbol: string;
	instrumentId: string;
	isInWatchlist: boolean;
	name: string;
	pricePrecision: number;
	providers: ForexProviderSummary;
	quoteCurrency: string;
	timezone: string;
	tradingViewSymbol: string;
	venue?: string;
};

export default function ForexInstrumentDashboard({
	assetClass = "forex",
	baseCurrency,
	calendarId,
	displaySymbol,
	instrumentId,
	isInWatchlist,
	name,
	pricePrecision,
	providers,
	quoteCurrency,
	timezone,
	tradingViewSymbol,
	venue,
}: ForexInstrumentDashboardProps) {
	const isCrypto = assetClass === "crypto";
	const isCommodity = assetClass === "commodity";
	const assetLabel = isCrypto ? "Crypto" : isCommodity ? "Commodity" : "Forex";
	const identityMark = isCrypto
		? "₿"
		: isCommodity
			? baseCurrency === "XAG"
				? "Ag"
				: "Au"
			: "FX";
	return (
		<div className="stock-dashboard">
			<div className="stock-primary-grid">
				<section className="stock-chart-card p-1" aria-labelledby="instrument-heading">
					<header className="stock-identity">
						<div className="company-mark" aria-hidden="true">
							{identityMark}
						</div>
						<div className="min-w-0 flex-1">
							<p className="text-xs font-semibold uppercase tracking-wider text-yellow-500">
								{assetLabel} · {isCommodity ? "Spot" : "Spot pair"}
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
					</div>

					<div className="stock-card-section">
						<TradingViewWidget
							scriptUrl={`${TRADING_VIEW_EMBED_URL}symbol-info.js`}
							config={SYMBOL_INFO_WIDGET_CONFIG(tradingViewSymbol)}
							height={170}
							className="border-0"
						/>
					</div>

					<div className="stock-card-section">
						<h3>Pair details</h3>
						<div className="space-y-3">
							<StockDataRow label="Base currency" value={baseCurrency ?? "—"} />
							<StockDataRow label="Quote currency" value={quoteCurrency} />
							<StockDataRow label="Venue" value={venue ?? "—"} />
							<StockDataRow
								label="Price precision"
								value={`${pricePrecision} decimals`}
							/>
							<StockDataRow label="Timezone" value={timezone} />
							<StockDataRow
								label="Market session"
								value={
									calendarId === "forex-24x5"
										? "24 hours · Mon–Fri"
										: calendarId === "crypto-24x7"
											? "24 hours · 7 days"
											: calendarId === "commodity-spot-24x5"
												? "24 hours · Mon–Fri"
										: (calendarId ?? "—")
								}
							/>
						</div>
					</div>

					<div className="stock-card-section border-b-0! pb-0!">
						<h3>Data providers</h3>
						<div className="space-y-3">
							<StockDataRow label="Quote & chart" value={providers.marketDisplay} />
							<StockDataRow label="Catalog" value={providers.catalog} />
							<StockDataRow label="AI analysis" value={providers.analysis} />
						</div>
					</div>
				</aside>
			</div>

			<p className="px-1 text-xs leading-5 text-gray-500">
				Quote and chart data are displayed by TradingView. They are not used for
				alerts or AI analysis.
			</p>
		</div>
	);
}
