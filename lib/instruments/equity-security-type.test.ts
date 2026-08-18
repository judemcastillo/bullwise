import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	equitySecurityTypeLabel,
	normalizeFinnhubEquitySecurityType,
	normalizeMassiveEquitySecurityType,
	reconcileEquitySecurityType,
	supportsCompanyStockData,
} from "./equity-security-type";

describe("equity security-type classification", () => {
	it("normalizes Finnhub listing types", () => {
		assert.equal(normalizeFinnhubEquitySecurityType("Common Stock"), "common_stock");
		assert.equal(normalizeFinnhubEquitySecurityType("ETP"), "exchange_traded_product");
		assert.equal(normalizeFinnhubEquitySecurityType("ADR"), "adr");
		assert.equal(normalizeFinnhubEquitySecurityType("Closed-End Fund"), "closed_end_fund");
		assert.equal(normalizeFinnhubEquitySecurityType("Unit"), "unit");
		assert.equal(normalizeFinnhubEquitySecurityType(undefined), "other");
	});

	it("normalizes Massive listing types", () => {
		assert.equal(normalizeMassiveEquitySecurityType("CS"), "common_stock");
		assert.equal(normalizeMassiveEquitySecurityType("ETF"), "etf");
		assert.equal(normalizeMassiveEquitySecurityType("ETN"), "etn");
		assert.equal(normalizeMassiveEquitySecurityType("UNIT"), "unit");
		assert.equal(normalizeMassiveEquitySecurityType("WARRANT"), "warrant");
	});

	it("uses Massive to refine ETPs while preserving Finnhub-specific types", () => {
		assert.equal(reconcileEquitySecurityType("exchange_traded_product", "etf"), "etf");
		assert.equal(reconcileEquitySecurityType("exchange_traded_product", "etn"), "etn");
		assert.equal(reconcileEquitySecurityType("reit", "common_stock"), "reit");
		assert.equal(reconcileEquitySecurityType("other", "unit"), "unit");
	});

	it("uses company fundamentals only for common stocks", () => {
		assert.equal(supportsCompanyStockData("common_stock"), true);
		assert.equal(supportsCompanyStockData("etf"), false);
		assert.equal(supportsCompanyStockData("unit"), false);
		assert.equal(equitySecurityTypeLabel("preferred_stock"), "Preferred stock");
	});
});
