import TradingViewWidget from "@/components/TradingViewWidget";
import WatchlistButton from "@/components/WatchlistButton";
import { auth } from "@/lib/better-auth/auth";
import {
	addToWatchlist,
	getWatchlistSymbolsByUserId,
	removeFromWatchlist,
} from "@/lib/actions/watchlist.actions";
import {
	BASELINE_WIDGET_CONFIG,
	CANDLE_CHART_WIDGET_CONFIG,
	COMPANY_FINANCIALS_WIDGET_CONFIG,
	COMPANY_PROFILE_WIDGET_CONFIG,
	SYMBOL_INFO_WIDGET_CONFIG,
	TECHNICAL_ANALYSIS_WIDGET_CONFIG,
} from "@/lib/constants";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const TRADING_VIEW_EMBED_URL =
	"https://s3.tradingview.com/external-embedding/embed-widget-";

const StockDetails = async ({ params }: StockDetailsPageProps) => {
	const { symbol } = await params;
	const normalizedSymbol = symbol.trim().toUpperCase();
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	if (!session?.user) redirect("/sign-in");

	const watchlistSymbols = await getWatchlistSymbolsByUserId(session.user.id);
	const isInWatchlist = watchlistSymbols.includes(normalizedSymbol);

	const handleWatchlistChange = async (
		changedSymbol: string,
		isAdded: boolean,
	) => {
		"use server";

		if (isAdded) {
			await addToWatchlist(changedSymbol, changedSymbol);
		} else {
			await removeFromWatchlist(changedSymbol);
		}
	};

	return (
		<div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-2">
			<section className="flex min-w-0 flex-col gap-6">
				<TradingViewWidget
					scriptUrl={`${TRADING_VIEW_EMBED_URL}symbol-info.js`}
					config={SYMBOL_INFO_WIDGET_CONFIG(symbol)}
					height={170}
				/>
				<TradingViewWidget
					scriptUrl={`${TRADING_VIEW_EMBED_URL}advanced-chart.js`}
					config={CANDLE_CHART_WIDGET_CONFIG(symbol)}
					height={600}
					className="custom-chart"
				/>
				<TradingViewWidget
					scriptUrl={`${TRADING_VIEW_EMBED_URL}advanced-chart.js`}
					config={BASELINE_WIDGET_CONFIG(symbol)}
					height={600}
					className="custom-chart"
				/>
			</section>

			<section className="flex min-w-0 flex-col gap-6">
				<WatchlistButton
					key={normalizedSymbol}
					symbol={normalizedSymbol}
					company={normalizedSymbol}
					isInWatchlist={isInWatchlist}
					onWatchlistChange={handleWatchlistChange}
				/>
				<TradingViewWidget
					scriptUrl={`${TRADING_VIEW_EMBED_URL}technical-analysis.js`}
					config={TECHNICAL_ANALYSIS_WIDGET_CONFIG(symbol)}
					height={400}
				/>
				<TradingViewWidget
					scriptUrl={`${TRADING_VIEW_EMBED_URL}symbol-profile.js`}
					config={COMPANY_PROFILE_WIDGET_CONFIG(symbol)}
					height={440}
				/>
				<TradingViewWidget
					scriptUrl={`${TRADING_VIEW_EMBED_URL}financials.js`}
					config={COMPANY_FINANCIALS_WIDGET_CONFIG(symbol)}
					height={464}
				/>
			</section>
		</div>
	);
};

export default StockDetails;
