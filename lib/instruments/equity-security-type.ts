import type { EquitySecurityType } from "@/types/instruments";

const FINNHUB_EQUITY_SECURITY_TYPES: Record<string, EquitySecurityType> = {
	"common stock": "common_stock",
	public: "common_stock",
	private: "common_stock",
	"foreign sh.": "common_stock",
	"tracking stk": "common_stock",
	"savings share": "common_stock",
	etp: "exchange_traded_product",
	adr: "adr",
	gdr: "adr",
	nvdr: "adr",
	cdi: "adr",
	sdr: "adr",
	"canadian dr": "adr",
	"dutch cert": "adr",
	"ny reg shrs": "adr",
	receipt: "adr",
	preference: "preferred_stock",
	reit: "reit",
	"closed-end fund": "closed_end_fund",
	"open-end fund": "fund",
	"mutual fund": "fund",
	unit: "unit",
	"stapled security": "unit",
	"equity wrt": "warrant",
	right: "right",
	mlp: "partnership",
	"ltd part": "partnership",
	"royalty trst": "trust",
};

const MASSIVE_EQUITY_SECURITY_TYPES: Record<string, EquitySecurityType> = {
	CS: "common_stock",
	OS: "common_stock",
	ETF: "etf",
	ETS: "etf",
	ETN: "etn",
	ETV: "exchange_traded_product",
	ADRC: "adr",
	ADRP: "adr",
	GDR: "adr",
	NYRS: "adr",
	PFD: "preferred_stock",
	FUND: "fund",
	UNIT: "unit",
	WARRANT: "warrant",
	ADRW: "warrant",
	RIGHT: "right",
	ADRR: "right",
	LT: "trust",
	BOND: "structured_product",
	AGEN: "structured_product",
	EQLK: "structured_product",
	SP: "structured_product",
	BASKET: "structured_product",
	OTHER: "other",
};

export function normalizeFinnhubEquitySecurityType(
	providerType?: string | null,
): EquitySecurityType {
	const normalized = providerType?.trim().toLowerCase();
	return normalized
		? (FINNHUB_EQUITY_SECURITY_TYPES[normalized] ?? "other")
		: "other";
}

export function normalizeMassiveEquitySecurityType(
	providerType?: string | null,
): EquitySecurityType {
	const normalized = providerType?.trim().toUpperCase();
	return normalized
		? (MASSIVE_EQUITY_SECURITY_TYPES[normalized] ?? "other")
		: "other";
}

export function reconcileEquitySecurityType(
	finnhubType: EquitySecurityType,
	massiveType: EquitySecurityType,
): EquitySecurityType {
	if (finnhubType === "exchange_traded_product") {
		return massiveType === "etf" || massiveType === "etn"
			? massiveType
			: finnhubType;
	}
	return finnhubType === "other" ? massiveType : finnhubType;
}

const EQUITY_SECURITY_TYPE_LABELS: Record<EquitySecurityType, string> = {
	common_stock: "Common stock",
	etf: "ETF",
	etn: "ETN",
	exchange_traded_product: "Exchange-traded product",
	adr: "Depositary receipt",
	preferred_stock: "Preferred stock",
	reit: "REIT",
	closed_end_fund: "Closed-end fund",
	fund: "Fund",
	unit: "Unit",
	warrant: "Warrant",
	right: "Right",
	partnership: "Partnership",
	trust: "Trust",
	structured_product: "Structured product",
	other: "Other listed security",
};

export function equitySecurityTypeLabel(
	securityType?: EquitySecurityType,
) {
	return EQUITY_SECURITY_TYPE_LABELS[securityType ?? "other"];
}

export function usesCompanyStockDashboard(
	securityType?: EquitySecurityType,
) {
	return securityType === "common_stock";
}
