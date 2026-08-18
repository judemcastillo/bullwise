import InstrumentDashboard from "@/components/instruments/InstrumentDashboard";
import { requireUser } from "@/lib/auth/require-user";
import { getInstrumentByCanonicalKey } from "@/lib/data/instruments";
import { getWatchlistInstrumentIdsForUser } from "@/lib/data/watchlist";
import { notFound } from "next/navigation";

export default async function InstrumentPage({
	params,
}: {
	params: Promise<{ canonicalKey: string }>;
}) {
	const { canonicalKey } = await params;
	const instrument = await getInstrumentByCanonicalKey(canonicalKey);
	if (!instrument) notFound();

	const finnhubBinding = instrument.providerBindings.find(
		(binding) =>
			binding.provider === "finnhub" &&
			binding.enabled !== false &&
			binding.capabilities.includes("alert_quote"),
	);

	const tradingViewBinding = instrument.providerBindings.find(
		(binding) =>
			binding.provider === "tradingview" &&
			binding.enabled !== false &&
			binding.capabilities.includes("chart"),
	);
	if (
		(instrument.assetClass === "equity" ||
			instrument.assetClass === "forex" ||
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
		const hasMassiveAnalysis = instrument.providerBindings.some(
			(binding) =>
				binding.provider === "massive" && binding.enabled !== false,
		);

		return (
			<InstrumentDashboard
				alertInstrument={
					instrument.assetClass === "equity" && finnhubBinding
						? {
								assetClass: "equity",
								provider: "finnhub",
								providerSymbol: finnhubBinding.symbol,
								displaySymbol: instrument.displaySymbol,
								name: instrument.name,
								venue: instrument.venue,
								currency: instrument.quoteCurrency,
							}
						: null
				}
				analysisProvider={hasMassiveAnalysis ? "Massive · planned" : "—"}
				displaySymbol={instrument.displaySymbol}
				instrumentId={instrumentId}
				isInWatchlist={watchlistInstrumentIds.includes(instrumentId)}
				name={instrument.name}
				tradingViewSymbol={tradingViewBinding.symbol}
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
