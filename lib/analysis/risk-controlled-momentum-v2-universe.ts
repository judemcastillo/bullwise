import { createHash } from "node:crypto";
import { FROZEN_CONFIRMATION_SYMBOLS } from "@/lib/analysis/analysis-dataset";
import {
	BROAD_DEVELOPMENT_SYMBOLS,
	ORIGINAL_DEVELOPMENT_SYMBOLS,
} from "@/lib/analysis/broad-development-universe";
import { BROAD_DEVELOPMENT_V2_EXPANSION_SYMBOLS } from "@/lib/analysis/broad-development-v2-universe";

export const RISK_CONTROLLED_MOMENTUM_V2_UNIVERSE_VERSION = "1.0.0";
export const RISK_CONTROLLED_MOMENTUM_V2_UNIVERSE_NAME =
	"etf-risk-controlled-momentum-v2-metadata-v1";
export const RISK_CONTROLLED_MOMENTUM_V2_METADATA_VERIFIED_AT =
	"2026-08-21";
export const RISK_CONTROLLED_MOMENTUM_V2_INCEPTION_CUTOFF = "2007-12-31";

export const RISK_CONTROLLED_MOMENTUM_V2_EXCLUDED_SYMBOLS = [
	...new Set([
		...ORIGINAL_DEVELOPMENT_SYMBOLS,
		...FROZEN_CONFIRMATION_SYMBOLS,
		...BROAD_DEVELOPMENT_SYMBOLS,
		...BROAD_DEVELOPMENT_V2_EXPANSION_SYMBOLS,
	]),
].sort((left, right) => left.localeCompare(right));

type SleeveId =
	| "us_broad_style_factor"
	| "us_sector_real_asset_equity"
	| "international_equity"
	| "fixed_income_and_preferred";
type Exchange = "ARCA" | "NASDAQ" | "NYSE" | "BATS";
type Candidate = {
	symbol: string;
	issuer: string;
	inceptionDate: string;
	objective: string;
	objectiveSource: string;
	alpaca: {
		assetClass: "us_equity";
		status: "active";
		tradable: true;
		exchange: Exchange;
		verifiedAt: typeof RISK_CONTROLLED_MOMENTUM_V2_METADATA_VERIFIED_AT;
	};
};

const ISHARES_SOURCE = "https://www.ishares.com/us/products/etf-investments";
const alpaca = (exchange: Exchange): Candidate["alpaca"] => ({
	assetClass: "us_equity" as const,
	status: "active" as const,
	tradable: true as const,
	exchange,
	verifiedAt: RISK_CONTROLLED_MOMENTUM_V2_METADATA_VERIFIED_AT,
});

export const RISK_CONTROLLED_MOMENTUM_V2_SLEEVES = [
	{
		sleeveId: "us_broad_style_factor",
		candidates: [
			{ symbol: "IJK", issuer: "iShares", inceptionDate: "2000-07-24", objective: "U.S. mid-cap growth equities", objectiveSource: ISHARES_SOURCE, alpaca: alpaca("ARCA") },
			{ symbol: "IJJ", issuer: "iShares", inceptionDate: "2000-07-24", objective: "U.S. mid-cap value equities", objectiveSource: ISHARES_SOURCE, alpaca: alpaca("ARCA") },
			{ symbol: "IJT", issuer: "iShares", inceptionDate: "2000-07-24", objective: "U.S. small-cap growth equities", objectiveSource: ISHARES_SOURCE, alpaca: alpaca("NASDAQ") },
			{ symbol: "IJS", issuer: "iShares", inceptionDate: "2000-07-24", objective: "U.S. small-cap value equities", objectiveSource: ISHARES_SOURCE, alpaca: alpaca("ARCA") },
			{ symbol: "OEF", issuer: "iShares", inceptionDate: "2000-10-23", objective: "S&P 100 large-cap U.S. equities", objectiveSource: ISHARES_SOURCE, alpaca: alpaca("ARCA") },
			{ symbol: "ISCG", issuer: "iShares", inceptionDate: "2004-06-28", objective: "U.S. small-cap growth equities", objectiveSource: ISHARES_SOURCE, alpaca: alpaca("ARCA") },
			{ symbol: "ISCV", issuer: "iShares", inceptionDate: "2004-06-28", objective: "U.S. small-cap value equities", objectiveSource: ISHARES_SOURCE, alpaca: alpaca("ARCA") },
			{ symbol: "FVD", issuer: "First Trust", inceptionDate: "2003-08-19", objective: "U.S. dividend equities selected by Value Line", objectiveSource: "https://www.ftportfolios.com/retail/etf/ETFsummary.aspx?Ticker=FVD", alpaca: alpaca("ARCA") },
			{ symbol: "DTD", issuer: "WisdomTree", inceptionDate: "2006-06-16", objective: "Broad U.S. dividend-paying equities", objectiveSource: "https://www.wisdomtree.com/us/products/equity/dtd", alpaca: alpaca("ARCA") },
			{ symbol: "DLN", issuer: "WisdomTree", inceptionDate: "2006-06-16", objective: "U.S. large-cap dividend-paying equities", objectiveSource: "https://www.wisdomtree.com/us/products/equity/dln", alpaca: alpaca("ARCA") },
			{ symbol: "DON", issuer: "WisdomTree", inceptionDate: "2006-06-16", objective: "U.S. mid-cap dividend-paying equities", objectiveSource: "https://www.wisdomtree.com/us/products/equity/don", alpaca: alpaca("ARCA") },
			{ symbol: "DES", issuer: "WisdomTree", inceptionDate: "2006-06-16", objective: "U.S. small-cap dividend-paying equities", objectiveSource: "https://www.wisdomtree.com/us/products/equity/des", alpaca: alpaca("ARCA") },
		] satisfies Candidate[],
	},
	{
		sleeveId: "us_sector_real_asset_equity",
		candidates: [
			{ symbol: "IYC", issuer: "iShares", inceptionDate: "2000-06-12", objective: "U.S. consumer discretionary equities", objectiveSource: ISHARES_SOURCE, alpaca: alpaca("ARCA") },
			{ symbol: "IYK", issuer: "iShares", inceptionDate: "2000-06-12", objective: "U.S. consumer staples equities", objectiveSource: ISHARES_SOURCE, alpaca: alpaca("ARCA") },
			{ symbol: "IYE", issuer: "iShares", inceptionDate: "2000-06-12", objective: "U.S. energy equities", objectiveSource: ISHARES_SOURCE, alpaca: alpaca("ARCA") },
			{ symbol: "IYF", issuer: "iShares", inceptionDate: "2000-05-22", objective: "U.S. financial equities", objectiveSource: ISHARES_SOURCE, alpaca: alpaca("ARCA") },
			{ symbol: "IYH", issuer: "iShares", inceptionDate: "2000-06-12", objective: "U.S. health-care equities", objectiveSource: ISHARES_SOURCE, alpaca: alpaca("ARCA") },
			{ symbol: "IYJ", issuer: "iShares", inceptionDate: "2000-06-12", objective: "U.S. industrial equities", objectiveSource: ISHARES_SOURCE, alpaca: alpaca("BATS") },
			{ symbol: "IYM", issuer: "iShares", inceptionDate: "2000-06-12", objective: "U.S. basic-materials equities", objectiveSource: ISHARES_SOURCE, alpaca: alpaca("ARCA") },
			{ symbol: "IYW", issuer: "iShares", inceptionDate: "2000-05-15", objective: "U.S. technology equities", objectiveSource: ISHARES_SOURCE, alpaca: alpaca("ARCA") },
			{ symbol: "IDU", issuer: "iShares", inceptionDate: "2000-06-12", objective: "U.S. utilities equities", objectiveSource: ISHARES_SOURCE, alpaca: alpaca("ARCA") },
			{ symbol: "IAT", issuer: "iShares", inceptionDate: "2006-05-01", objective: "U.S. regional-bank equities", objectiveSource: ISHARES_SOURCE, alpaca: alpaca("ARCA") },
			{ symbol: "IGE", issuer: "iShares", inceptionDate: "2001-10-22", objective: "North American natural-resource equities", objectiveSource: ISHARES_SOURCE, alpaca: alpaca("BATS") },
			{ symbol: "ICF", issuer: "iShares", inceptionDate: "2001-01-29", objective: "Large U.S. real-estate investment trusts", objectiveSource: ISHARES_SOURCE, alpaca: alpaca("BATS") },
		] satisfies Candidate[],
	},
	{
		sleeveId: "international_equity",
		candidates: [
			{ symbol: "EWK", issuer: "iShares", inceptionDate: "1996-03-12", objective: "Belgian equities", objectiveSource: ISHARES_SOURCE, alpaca: alpaca("ARCA") },
			{ symbol: "EWO", issuer: "iShares", inceptionDate: "1996-03-12", objective: "Austrian equities", objectiveSource: ISHARES_SOURCE, alpaca: alpaca("ARCA") },
			{ symbol: "EWQ", issuer: "iShares", inceptionDate: "1996-03-12", objective: "French equities", objectiveSource: ISHARES_SOURCE, alpaca: alpaca("ARCA") },
			{ symbol: "EPP", issuer: "iShares", inceptionDate: "2001-10-25", objective: "Developed Pacific equities excluding Japan", objectiveSource: ISHARES_SOURCE, alpaca: alpaca("ARCA") },
			{ symbol: "ILF", issuer: "iShares", inceptionDate: "2001-10-25", objective: "Large Latin American equities", objectiveSource: ISHARES_SOURCE, alpaca: alpaca("ARCA") },
			{ symbol: "EZU", issuer: "iShares", inceptionDate: "2000-07-25", objective: "Eurozone equities", objectiveSource: ISHARES_SOURCE, alpaca: alpaca("BATS") },
			{ symbol: "IEV", issuer: "iShares", inceptionDate: "2000-07-25", objective: "Developed European equities", objectiveSource: ISHARES_SOURCE, alpaca: alpaca("ARCA") },
			{ symbol: "BKF", issuer: "iShares", inceptionDate: "2007-11-12", objective: "Large Chinese equities in the BIC index family", objectiveSource: ISHARES_SOURCE, alpaca: alpaca("ARCA") },
			{ symbol: "AIA", issuer: "iShares", inceptionDate: "2007-11-13", objective: "Fifty large Asian equities", objectiveSource: ISHARES_SOURCE, alpaca: alpaca("NASDAQ") },
			{ symbol: "DLS", issuer: "WisdomTree", inceptionDate: "2006-06-16", objective: "Developed ex-U.S./Canada small-cap dividend equities", objectiveSource: "https://www.wisdomtree.com/us/products/equity/dls", alpaca: alpaca("ARCA") },
			{ symbol: "DTH", issuer: "WisdomTree", inceptionDate: "2006-06-16", objective: "Developed ex-U.S./Canada high-dividend equities", objectiveSource: "https://www.wisdomtree.com/us/products/equity/dth", alpaca: alpaca("ARCA") },
			{ symbol: "DOL", issuer: "WisdomTree", inceptionDate: "2006-06-16", objective: "Developed ex-U.S./Canada large-cap dividend equities", objectiveSource: "https://www.wisdomtree.com/us/products/equity/dol", alpaca: alpaca("ARCA") },
		] satisfies Candidate[],
	},
	{
		sleeveId: "fixed_income_and_preferred",
		candidates: [
			{ symbol: "SHV", issuer: "iShares", inceptionDate: "2007-01-05", objective: "Zero-to-one-year U.S. Treasury bonds", objectiveSource: ISHARES_SOURCE, alpaca: alpaca("NYSE") },
			{ symbol: "IEI", issuer: "iShares", inceptionDate: "2007-01-05", objective: "Three-to-seven-year U.S. Treasury bonds", objectiveSource: ISHARES_SOURCE, alpaca: alpaca("NASDAQ") },
			{ symbol: "TLH", issuer: "iShares", inceptionDate: "2007-01-05", objective: "Ten-to-twenty-year U.S. Treasury bonds", objectiveSource: ISHARES_SOURCE, alpaca: alpaca("ARCA") },
			{ symbol: "IGSB", issuer: "iShares", inceptionDate: "2007-01-05", objective: "One-to-five-year investment-grade corporate bonds", objectiveSource: ISHARES_SOURCE, alpaca: alpaca("NASDAQ") },
			{ symbol: "IGIB", issuer: "iShares", inceptionDate: "2007-01-05", objective: "Five-to-ten-year investment-grade corporate bonds", objectiveSource: ISHARES_SOURCE, alpaca: alpaca("NASDAQ") },
			{ symbol: "USIG", issuer: "iShares", inceptionDate: "2007-01-05", objective: "Broad U.S.-dollar investment-grade corporate bonds", objectiveSource: ISHARES_SOURCE, alpaca: alpaca("NASDAQ") },
			{ symbol: "GBF", issuer: "iShares", inceptionDate: "2007-01-05", objective: "U.S.-dollar government and investment-grade credit bonds", objectiveSource: ISHARES_SOURCE, alpaca: alpaca("ARCA") },
			{ symbol: "GVI", issuer: "iShares", inceptionDate: "2007-01-05", objective: "Intermediate U.S. government and credit bonds", objectiveSource: ISHARES_SOURCE, alpaca: alpaca("BATS") },
			{ symbol: "NYF", issuer: "iShares", inceptionDate: "2007-10-04", objective: "New York investment-grade municipal bonds", objectiveSource: ISHARES_SOURCE, alpaca: alpaca("ARCA") },
			{ symbol: "BIL", issuer: "State Street", inceptionDate: "2007-05-25", objective: "One-to-three-month U.S. Treasury bills", objectiveSource: "https://www.ssga.com/us/en/intermediary/etfs/state-street-spdr-bloomberg-1-3-month-t-bill-etf-bil", alpaca: alpaca("ARCA") },
			{ symbol: "SPIP", issuer: "State Street", inceptionDate: "2007-05-25", objective: "U.S. inflation-linked Treasury bonds", objectiveSource: "https://www.ssga.com/us/en/intermediary/etfs/state-street-spdr-portfolio-tips-etf-spip", alpaca: alpaca("ARCA") },
			{ symbol: "PCY", issuer: "Invesco", inceptionDate: "2007-10-11", objective: "U.S.-dollar emerging-market sovereign bonds", objectiveSource: "https://www.invesco.com/us/en/financial-products/etfs/invesco-emerging-markets-sovereign-debt-etf.html", alpaca: alpaca("ARCA") },
		] satisfies Candidate[],
	},
] as const satisfies readonly {
	sleeveId: SleeveId;
	candidates: readonly Candidate[];
}[];

export const RISK_CONTROLLED_MOMENTUM_V2_SYMBOLS =
	RISK_CONTROLLED_MOMENTUM_V2_SLEEVES.flatMap((sleeve) =>
		sleeve.candidates.map((candidate) => candidate.symbol),
	);

function sha256(value: unknown) {
	return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export const RISK_CONTROLLED_MOMENTUM_V2_EXCLUSION_SHA256 = sha256({
	version: RISK_CONTROLLED_MOMENTUM_V2_UNIVERSE_VERSION,
	symbols: RISK_CONTROLLED_MOMENTUM_V2_EXCLUDED_SYMBOLS,
});
export const RISK_CONTROLLED_MOMENTUM_V2_COMPUTED_MANIFEST_SHA256 = sha256({
	version: RISK_CONTROLLED_MOMENTUM_V2_UNIVERSE_VERSION,
	name: RISK_CONTROLLED_MOMENTUM_V2_UNIVERSE_NAME,
	inceptionCutoff: RISK_CONTROLLED_MOMENTUM_V2_INCEPTION_CUTOFF,
	exclusionSha256: RISK_CONTROLLED_MOMENTUM_V2_EXCLUSION_SHA256,
	sleeves: RISK_CONTROLLED_MOMENTUM_V2_SLEEVES,
});

export const RISK_CONTROLLED_MOMENTUM_V2_MANIFEST_SHA256 =
	"2a8fd2e03aab94002edf3e0b4db0ea034f4b328312db46cfb6393cd2cc315464";
