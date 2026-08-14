import ForexInstrumentDashboard from "@/components/instruments/ForexInstrumentDashboard";
import ListedInstrumentDashboard from "@/components/instruments/ListedInstrumentDashboard";
import { requireUser } from "@/lib/auth/require-user";
import { getInstrumentByCanonicalKey } from "@/lib/data/instruments";
import { getWatchlistInstrumentIdsForUser } from "@/lib/data/watchlist";
import { notFound, redirect } from "next/navigation";
import { usesCompanyStockDashboard } from "@/lib/instruments/equity-security-type";

export default async function InstrumentPage({
	params,
}: {
	params: Promise<{ canonicalKey: string }>;
}) {
	const { canonicalKey } = await params;
	const instrument = await getInstrumentByCanonicalKey(canonicalKey);
	if (!instrument) notFound();

	const finnhubBinding = instrument.providerBindings.find(
		(binding) => binding.provider === "finnhub" && binding.enabled !== false,
	);
	if (
		instrument.assetClass === "equity" &&
		usesCompanyStockDashboard(instrument.securityType) &&
		finnhubBinding
	) {
		redirect(`/stocks/${encodeURIComponent(finnhubBinding.symbol)}`);
	}

	const tradingViewBinding = instrument.providerBindings.find(
		(binding) =>
			binding.provider === "tradingview" &&
			binding.enabled !== false &&
			binding.capabilities.includes("chart"),
	);
	if (instrument.assetClass === "equity" && tradingViewBinding) {
		const user = await requireUser();
		const instrumentId = instrument._id.toString();
		const watchlistInstrumentIds = await getWatchlistInstrumentIdsForUser(
			user.id,
		).catch((error) => {
			console.error(`Unable to load watchlist for ${user.id}:`, error);
			return [] as string[];
		});

		return (
			<ListedInstrumentDashboard
				displaySymbol={instrument.displaySymbol}
				finnhubSymbol={finnhubBinding?.symbol}
				instrumentId={instrumentId}
				isInWatchlist={watchlistInstrumentIds.includes(instrumentId)}
				name={instrument.name}
				quoteCurrency={instrument.quoteCurrency}
				securityType={instrument.securityType}
				timezone={instrument.timezone}
				tradingViewSymbol={tradingViewBinding.symbol}
				venue={instrument.venue}
			/>
		);
	}
	if (
		(instrument.assetClass === "forex" ||
			instrument.assetClass === "crypto" ||
			instrument.assetClass === "commodity") &&
		tradingViewBinding
	) {
		const user = await requireUser();
		const instrumentId = instrument._id.toString();
		const watchlistInstrumentIds = await getWatchlistInstrumentIdsForUser(
			user.id,
		).catch((error) => {
			console.error(`Unable to load watchlist for ${user.id}:`, error);
			return [] as string[];
		});
		const providerNames = new Set(
			instrument.providerBindings
				.filter((binding) => binding.enabled !== false)
				.map((binding) => binding.provider),
		);

		return (
			<ForexInstrumentDashboard
				assetClass={instrument.assetClass}
				baseCurrency={instrument.baseCurrency}
				calendarId={instrument.calendarId}
				displaySymbol={instrument.displaySymbol}
				instrumentId={instrumentId}
				isInWatchlist={watchlistInstrumentIds.includes(instrumentId)}
				name={instrument.name}
				pricePrecision={instrument.pricePrecision}
				providers={{
					analysis: providerNames.has("massive") ? "Massive · planned" : "—",
					catalog: providerNames.has("finnhub") ? "Finnhub" : "—",
					marketDisplay: "TradingView",
				}}
				quoteCurrency={instrument.quoteCurrency}
				timezone={instrument.timezone}
				tradingViewSymbol={tradingViewBinding.symbol}
				venue={instrument.venue}
			/>
		);
	}

	return (
		<div className="stock-dashboard">
			<section className="stock-card p-6" aria-labelledby="instrument-heading">
				<p className="text-xs font-semibold uppercase tracking-wider text-yellow-500">
					{instrument.assetClass} · {instrument.instrumentType.replaceAll("_", " ")}
				</p>
				<h1 id="instrument-heading" className="mt-2 text-2xl font-bold text-gray-100">
					{instrument.name}
				</h1>
				<div className="mt-2 flex flex-wrap gap-2 text-sm text-gray-400">
					<span>{instrument.displaySymbol}</span>
					{instrument.venue ? <span>· {instrument.venue}</span> : null}
					<span>· {instrument.quoteCurrency}</span>
				</div>
				<p className="mt-6 max-w-2xl text-sm leading-6 text-gray-400">
					This instrument is available in your catalog. Market quotes and analysis
					will appear here when its data provider is enabled.
				</p>
			</section>
		</div>
	);
}
