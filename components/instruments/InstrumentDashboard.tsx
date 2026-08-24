import StockAlertButton from "@/components/alerts/StockAlertButton";
import DailyMarketAnalysisCard from "@/components/instruments/DailyMarketAnalysisCard";
import TradingViewWidget from "@/components/TradingViewWidget";
import WatchlistButton from "@/components/watchlist/WatchlistButton";
import {
	CANDLE_CHART_WIDGET_CONFIG,
	COMPANY_PROFILE_WIDGET_CONFIG,
	SYMBOL_INFO_WIDGET_CONFIG,
	TRADING_VIEW_EMBED_URL,
} from "@/lib/constants";
import type { AlertInstrumentOption } from "@/types/alerts";

type InstrumentDashboardProps = {
	alertInstrument: AlertInstrumentOption | null;
	analysisEligible: boolean;
	canonicalKey: string;
	displaySymbol: string;
	instrumentId: string;
	isInWatchlist: boolean;
	name: string;
	tradingViewSymbol: string;
};

export default function InstrumentDashboard({
	alertInstrument,
	analysisEligible,
	canonicalKey,
	displaySymbol,
	instrumentId,
	isInWatchlist,
	name,
	tradingViewSymbol,
}: InstrumentDashboardProps) {
	return (
		<div className="stock-dashboard">
			<div className="stock-primary-grid">
				<section
					className="stock-chart-card p-1"
					aria-labelledby="instrument-heading"
				>
					<header className="stock-identity p-0!">
						<h1 id="instrument-heading" className="sr-only">
							{name} ({displaySymbol})
						</h1>
						<TradingViewWidget
							scriptUrl={`${TRADING_VIEW_EMBED_URL}symbol-info.js`}
							config={SYMBOL_INFO_WIDGET_CONFIG(tradingViewSymbol)}
							height={170}
							className="stock-identity-widget border-0"
						/>
					</header>

					<TradingViewWidget
						scriptUrl={`${TRADING_VIEW_EMBED_URL}advanced-chart.js`}
						config={CANDLE_CHART_WIDGET_CONFIG(tradingViewSymbol)}
						height={510}
						className="stock-main-chart border-0 shadow-none!"
					/>
				</section>

				<aside className="stock-card h-full" aria-labelledby="overview-heading">
					<div className="stock-card-heading">
						<h2 id="overview-heading">Overview</h2>
						<div className="flex items-center gap-2">
							<WatchlistButton
								instrumentId={instrumentId}
								symbol={displaySymbol}
								company={name}
								isInWatchlist={isInWatchlist}
								type="icon"
							/>
							<StockAlertButton
								instrument={alertInstrument}
								label="Add alert"
								disabledReason="Price alerts are not available for this instrument yet."
							/>
						</div>
					</div>

					<div className="pt-4">
						<TradingViewWidget
							scriptUrl={`${TRADING_VIEW_EMBED_URL}symbol-profile.js`}
							config={COMPANY_PROFILE_WIDGET_CONFIG(tradingViewSymbol)}
							height={440}
							className="stock-overview-widget border-0"
						/>
					</div>
				</aside>
			</div>

			<DailyMarketAnalysisCard
				key={canonicalKey}
				canonicalKey={canonicalKey}
				eligible={analysisEligible}
			/>

			<p className="px-1 text-xs leading-5 text-gray-500">
				Quote, chart, and company profile data are displayed by TradingView.
				{alertInstrument
					? ` Price alerts are monitored with ${alertInstrument.provider}.`
					: " They are not used for alerts."}{" "}
				TradingView display data are not used for daily market analysis.
			</p>
		</div>
	);
}
