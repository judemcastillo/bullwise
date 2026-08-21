import {
	BROAD_DEVELOPMENT_DATA_POLICY,
	BROAD_DEVELOPMENT_LIQUIDITY_POLICY,
	BROAD_DEVELOPMENT_SYMBOLS,
	PREVIOUSLY_CONSUMED_RESEARCH_SYMBOLS,
	type BroadDevelopmentCoverageSnapshot,
} from "@/lib/analysis/broad-development-universe";
import type { MarketBars } from "@/lib/market-data/types";

export const BROAD_DEVELOPMENT_V2_EXPANSION_VERSION = "2.0.0";
export const BROAD_DEVELOPMENT_V2_EXPANSION_NAME =
	"daily-swing-broad-development-v2-expansion";
export const BROAD_DEVELOPMENT_V2_EXPANSION_SOURCE_SHA256 =
	"7262c1a32e3cac8651c57daee97812c72edd6d39036e310e4259b25b37559505";
export const BROAD_DEVELOPMENT_V2_EXPANSION_INCEPTION_CUTOFF = "2015-12-31";

type FrozenExpansionCandidate = {
	symbol: string;
	issuer: string;
	inceptionDate: string;
};

export const BROAD_DEVELOPMENT_V2_EXPANSION_CATEGORIES = [
	{
		name: "us_sector_and_industry",
		candidates: [
			{ symbol: "VGT", issuer: "Vanguard", inceptionDate: "2004-01-26" },
			{ symbol: "VHT", issuer: "Vanguard", inceptionDate: "2004-01-26" },
			{ symbol: "VFH", issuer: "Vanguard", inceptionDate: "2004-01-26" },
			{ symbol: "VIS", issuer: "Vanguard", inceptionDate: "2004-09-23" },
			{ symbol: "VDC", issuer: "Vanguard", inceptionDate: "2004-01-26" },
			{ symbol: "VCR", issuer: "Vanguard", inceptionDate: "2004-01-26" },
			{ symbol: "VAW", issuer: "Vanguard", inceptionDate: "2004-01-26" },
			{ symbol: "VOX", issuer: "Vanguard", inceptionDate: "2004-09-23" },
			{ symbol: "IYZ", issuer: "iShares", inceptionDate: "2000-05-22" },
			{ symbol: "IGM", issuer: "iShares", inceptionDate: "2001-03-13" },
		],
	},
	{
		name: "international_and_country",
		candidates: [
			{ symbol: "VEU", issuer: "Vanguard", inceptionDate: "2007-03-02" },
			{ symbol: "VPL", issuer: "Vanguard", inceptionDate: "2005-03-04" },
			{ symbol: "EWI", issuer: "iShares", inceptionDate: "1996-03-12" },
			{ symbol: "EWP", issuer: "iShares", inceptionDate: "1996-03-12" },
			{ symbol: "EWL", issuer: "iShares", inceptionDate: "1996-03-12" },
			{ symbol: "EWN", issuer: "iShares", inceptionDate: "1996-03-12" },
			{ symbol: "EWD", issuer: "iShares", inceptionDate: "1996-03-12" },
			{ symbol: "EWM", issuer: "iShares", inceptionDate: "1996-03-12" },
		],
	},
	{
		name: "fixed_income",
		candidates: [
			{ symbol: "VGSH", issuer: "Vanguard", inceptionDate: "2009-11-19" },
			{ symbol: "VGIT", issuer: "Vanguard", inceptionDate: "2009-11-19" },
			{ symbol: "VGLT", issuer: "Vanguard", inceptionDate: "2009-11-19" },
			{ symbol: "SCHO", issuer: "Schwab", inceptionDate: "2010-08-05" },
			{ symbol: "SCHR", issuer: "Schwab", inceptionDate: "2010-08-05" },
			{ symbol: "BNDX", issuer: "Vanguard", inceptionDate: "2013-05-31" },
			{ symbol: "BWX", issuer: "State Street", inceptionDate: "2007-10-02" },
			{ symbol: "VWOB", issuer: "Vanguard", inceptionDate: "2013-05-31" },
		],
	},
	{
		name: "real_asset_and_resource_equity",
		candidates: [
			{ symbol: "COPX", issuer: "Global X", inceptionDate: "2010-04-19" },
			{ symbol: "GDXJ", issuer: "VanEck", inceptionDate: "2009-11-10" },
			{ symbol: "OIH", issuer: "VanEck", inceptionDate: "2011-12-20" },
			{ symbol: "REM", issuer: "iShares", inceptionDate: "2007-05-01" },
		],
	},
] as const satisfies readonly {
	name: string;
	candidates: readonly FrozenExpansionCandidate[];
}[];

export const BROAD_DEVELOPMENT_V2_EXPANSION_CANDIDATES =
	BROAD_DEVELOPMENT_V2_EXPANSION_CATEGORIES.flatMap((category) => [
		...category.candidates,
	]);

export const BROAD_DEVELOPMENT_V2_EXPANSION_SYMBOLS =
	BROAD_DEVELOPMENT_V2_EXPANSION_CANDIDATES.map(
		(candidate) => candidate.symbol,
	);

export const BROAD_DEVELOPMENT_V2_PRIOR_RESEARCH_SYMBOLS = [
	...PREVIOUSLY_CONSUMED_RESEARCH_SYMBOLS,
	...BROAD_DEVELOPMENT_SYMBOLS,
] as const;

export const BROAD_DEVELOPMENT_V2_EXPANSION_SELECTION_POLICY = {
	availabilityKnownBeforeSelection: true,
	strategyOutcomesUsedForSelection: false,
	returnsUsedForSelection: false,
	coarsePresentDayLiquidityScreenUsed: true,
	historicalLiquidityUsedForSelection: false,
	standardUnleveragedEtfsOnly: true,
	inceptionOnOrBefore: BROAD_DEVELOPMENT_V2_EXPANSION_INCEPTION_CUTOFF,
	minimumCategoryCount: 4,
	minimumCandidatesPerCategory: 4,
	priorTrainingEpisodes: 4_620,
	targetCombinedTrainingEpisodes:
		BROAD_DEVELOPMENT_DATA_POLICY.targetTrainingEpisodes,
	additionalTrainingEpisodesRequired: 380,
} as const;

export const BROAD_DEVELOPMENT_V2_EXPANSION_DATA_POLICY = {
	provider: BROAD_DEVELOPMENT_DATA_POLICY.provider,
	feed: BROAD_DEVELOPMENT_DATA_POLICY.feed,
	adjustment: BROAD_DEVELOPMENT_DATA_POLICY.adjustment,
	interval: BROAD_DEVELOPMENT_DATA_POLICY.interval,
	benchmarkSymbol: BROAD_DEVELOPMENT_DATA_POLICY.benchmarkSymbol,
	requestedFrom: BROAD_DEVELOPMENT_DATA_POLICY.requestedFrom,
	requestedThrough: BROAD_DEVELOPMENT_DATA_POLICY.requestedThrough,
	maximumFirstBarDelayDays:
		BROAD_DEVELOPMENT_DATA_POLICY.maximumFirstBarDelayDays,
	minimumBarsPerInstrument:
		BROAD_DEVELOPMENT_DATA_POLICY.minimumBarsPerInstrument,
	minimumCoverageEligibleInstruments: 24,
} as const;

export const BROAD_DEVELOPMENT_V2_EXPANSION_LIQUIDITY_POLICY =
	BROAD_DEVELOPMENT_LIQUIDITY_POLICY;

export type BroadDevelopmentV2ExpansionCoverageEvaluation = {
	eligible: boolean;
	reasons: Array<
		| "symbol_not_in_frozen_expansion"
		| "insufficient_bars"
		| "first_bar_after_maximum_delay"
	>;
};

/** Applies only the outcome-blind coverage rules frozen in the v2 expansion. */
export function evaluateBroadDevelopmentV2ExpansionCoverage(input: {
	symbol: string;
	marketData: Pick<MarketBars, "bars">;
	coverageSnapshot?: BroadDevelopmentCoverageSnapshot;
}): BroadDevelopmentV2ExpansionCoverageEvaluation {
	const reasons: BroadDevelopmentV2ExpansionCoverageEvaluation["reasons"] = [];
	const symbol = input.symbol.trim().toUpperCase();
	if (!(BROAD_DEVELOPMENT_V2_EXPANSION_SYMBOLS as readonly string[]).includes(symbol)) {
		reasons.push("symbol_not_in_frozen_expansion");
	}
	const barsAvailable =
		input.coverageSnapshot?.barsAvailable ?? input.marketData.bars.length;
	if (
		barsAvailable <
		BROAD_DEVELOPMENT_V2_EXPANSION_DATA_POLICY.minimumBarsPerInstrument
	) {
		reasons.push("insufficient_bars");
	}
	const firstAt =
		input.coverageSnapshot?.firstBarAt.getTime() ??
		input.marketData.bars[0]?.startedAt.getTime();
	const latestAllowedFirstAt =
		Date.parse(
			`${BROAD_DEVELOPMENT_V2_EXPANSION_DATA_POLICY.requestedFrom}T00:00:00.000Z`,
		) +
		BROAD_DEVELOPMENT_V2_EXPANSION_DATA_POLICY.maximumFirstBarDelayDays *
			86_400_000;
	if (firstAt === undefined || firstAt > latestAllowedFirstAt) {
		reasons.push("first_bar_after_maximum_delay");
	}
	return { eligible: reasons.length === 0, reasons };
}
