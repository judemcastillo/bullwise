import { invertBars, invertQuote } from "@/lib/market-data/normalization";
import { TimedCache } from "@/lib/market-data/timed-cache";
import type {
	BarsProvider,
	MarketBars,
	MarketDataInstrument,
	MarketDataInterval,
	MarketQuote,
	QuoteProvider,
} from "@/lib/market-data/types";
import type {
	ProviderBinding,
	ProviderCapability,
} from "@/types/instruments";

type HistoricalQuery = {
	interval: MarketDataInterval;
	from: Date;
	to: Date;
	limit?: number;
};

type InstrumentMarketDataServiceOptions = {
	quoteProviders?: Iterable<QuoteProvider>;
	barsProviders?: Iterable<BarsProvider>;
	quoteCacheTtlMs?: number;
	barsCacheTtlMs?: number;
	cacheMaxEntries?: number;
};

function providerMap<T extends { provider: string }>(providers: Iterable<T>) {
	return new Map(
		[...providers].map((provider) => [provider.provider.toLowerCase(), provider]),
	);
}

export function selectProviderBinding<T extends { provider: string }>(
	bindings: ProviderBinding[],
	capability: ProviderCapability,
	providers: Map<string, T>,
) {
	return bindings
		.filter(
			(binding) =>
				binding.enabled &&
				binding.capabilities.includes(capability) &&
				providers.has(binding.provider.toLowerCase()),
		)
		.sort((left, right) => left.priority - right.priority)[0];
}

export class InstrumentMarketDataService {
	private readonly quoteProviders: Map<string, QuoteProvider>;
	private readonly barsProviders: Map<string, BarsProvider>;
	private readonly quoteCache: TimedCache<MarketQuote>;
	private readonly barsCache: TimedCache<MarketBars>;

	constructor(options: InstrumentMarketDataServiceOptions = {}) {
		this.quoteProviders = providerMap(options.quoteProviders ?? []);
		this.barsProviders = providerMap(options.barsProviders ?? []);
		const cacheMaxEntries = options.cacheMaxEntries ?? 500;
		this.quoteCache = new TimedCache(
			options.quoteCacheTtlMs ?? 15_000,
			cacheMaxEntries,
		);
		this.barsCache = new TimedCache(
			options.barsCacheTtlMs ?? 300_000,
			cacheMaxEntries,
		);
	}

	async getQuote(instrument: MarketDataInstrument) {
		const binding = selectProviderBinding(
			instrument.providerBindings,
			"quote",
			this.quoteProviders,
		);
		if (!binding) {
			throw new Error(
				`No quote provider is available for ${instrument.canonicalKey}`,
			);
		}

		const providerName = binding.provider.toLowerCase();
		const provider = this.quoteProviders.get(providerName);
		if (!provider) throw new Error(`Quote provider ${providerName} is unavailable`);
		const cacheKey = [
			providerName,
			binding.symbol,
			binding.orientation,
			instrument.instrumentId,
		].join(":");

		return this.quoteCache.getOrCreate(cacheKey, async () => {
			const quotes = await provider.getQuotes([
				{
					instrumentId: instrument.instrumentId,
					assetClass: instrument.assetClass,
					provider: providerName,
					providerSymbol: binding.symbol,
					expectedCurrency: instrument.quoteCurrency,
					pricePrecision: instrument.pricePrecision,
					calendarId: instrument.calendarId,
				},
			]);
			const quote = quotes.get(instrument.instrumentId);
			if (!quote) {
				throw new Error(
					`${providerName} did not return a quote for ${instrument.canonicalKey}`,
				);
			}
			return binding.orientation === "inverse"
				? invertQuote(quote, instrument.pricePrecision)
				: quote;
		});
	}

	async getBars(instrument: MarketDataInstrument, query: HistoricalQuery) {
		const binding = selectProviderBinding(
			instrument.providerBindings,
			"bars",
			this.barsProviders,
		);
		if (!binding) {
			throw new Error(
				`No historical bars provider is available for ${instrument.canonicalKey}`,
			);
		}

		const providerName = binding.provider.toLowerCase();
		const provider = this.barsProviders.get(providerName);
		if (!provider) {
			throw new Error(`Bars provider ${providerName} is unavailable`);
		}
		const cacheKey = [
			providerName,
			binding.symbol,
			binding.orientation,
			instrument.instrumentId,
			query.interval,
			query.from.getTime(),
			query.to.getTime(),
			query.limit ?? "default",
		].join(":");

		return this.barsCache.getOrCreate(cacheKey, async () => {
			const result = await provider.getBars({
				instrumentId: instrument.instrumentId,
				assetClass: instrument.assetClass,
				provider: providerName,
				providerSymbol: binding.symbol,
				expectedCurrency: instrument.quoteCurrency,
				pricePrecision: instrument.pricePrecision,
				calendarId: instrument.calendarId,
				...query,
			});
			return binding.orientation === "inverse"
				? invertBars(result, instrument.pricePrecision)
				: result;
		});
	}
}
