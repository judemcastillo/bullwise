import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Types } from "mongoose";
import Instrument from "@/database/models/instrument.model";

function validEquity() {
	return new Instrument({
		canonicalKey: "equity:xnas:aapl",
		assetClass: "equity",
		instrumentType: "listing",
		securityType: "common_stock",
		status: "active",
		displaySymbol: "AAPL",
		name: "Apple Inc.",
		venue: "NASDAQ NMS - GLOBAL MARKET",
		venueMic: "XNAS",
		quoteCurrency: "USD",
		pricePrecision: 4,
		quantityPrecision: 0,
		tickSize: Types.Decimal128.fromString("0.0001"),
		lotSize: Types.Decimal128.fromString("1"),
		timezone: "America/New_York",
		calendarId: "us-equities",
		providerBindings: [
			{
				provider: "finnhub",
				symbol: "AAPL",
				capabilities: ["catalog", "quote", "alert_quote", "news"],
				enabled: true,
				priority: 100,
				venue: "xnas",
				orientation: "direct",
			},
		],
	});
}

async function validationErrors(instrument: InstanceType<typeof Instrument>) {
	try {
		await instrument.validate();
		assert.fail("Expected instrument validation to fail");
	} catch (error) {
		const errors = (error as { errors?: Record<string, unknown> }).errors;
		assert.ok(errors);
		return errors;
	}
}

describe("Instrument model", () => {
	it("accepts a canonical capability-aware equity", async () => {
		await assert.doesNotReject(validEquity().validate());
	});

	it("applies safe defaults to legacy equity-shaped documents", async () => {
		const instrument = new Instrument({
			canonicalKey: "equity:xnas:msft",
			assetClass: "equity",
			displaySymbol: "MSFT",
			name: "Microsoft Corporation",
			quoteCurrency: "USD",
			pricePrecision: 4,
			providerBindings: [{ provider: "finnhub", symbol: "MSFT" }],
		});

		await assert.doesNotReject(instrument.validate());
		assert.equal(instrument.instrumentType, "listing");
		assert.equal(instrument.securityType, "other");
		assert.equal(instrument.status, "active");
		assert.equal(instrument.quantityPrecision, 0);
		assert.equal(instrument.timezone, "Etc/UTC");
		assert.equal(instrument.providerBindings[0].enabled, true);
		assert.deepEqual(instrument.providerBindings[0].capabilities, []);
	});

	it("rejects an instrument type that does not match its asset class", async () => {
		const instrument = validEquity();
		instrument.instrumentType = "spot_pair";

		const errors = await validationErrors(instrument);
		assert.ok(errors.instrumentType);
	});

	it("rejects equity-only security types on other asset classes", async () => {
		const instrument = validEquity();
		instrument.assetClass = "forex";
		instrument.instrumentType = "spot_pair";

		const errors = await validationErrors(instrument);
		assert.ok(errors.securityType);
	});

	it("requires complete metadata for an expiring futures contract", async () => {
		const instrument = new Instrument({
			canonicalKey: "commodity:xnym:future:cl:2026-10",
			assetClass: "commodity",
			instrumentType: "future",
			status: "active",
			displaySymbol: "CLV26",
			name: "WTI Crude Oil October 2026",
			venue: "NYMEX",
			venueMic: "XNYM",
			quoteCurrency: "USD",
			pricePrecision: 2,
			quantityPrecision: 0,
			timezone: "America/Chicago",
			contract: { productCode: "CL", contractMonth: "2026-10" },
			providerBindings: [
				{
					provider: "massive",
					symbol: "CLV26",
					capabilities: ["catalog", "bars"],
					enabled: true,
					priority: 100,
					orientation: "direct",
				},
			],
		});

		const errors = await validationErrors(instrument);
		assert.ok(errors.contract);
	});

	it("accepts a capability-aware commodity spot instrument", async () => {
		const instrument = new Instrument({
			canonicalKey: "commodity:oanda:spot:xau:usd",
			assetClass: "commodity",
			instrumentType: "spot",
			status: "active",
			displaySymbol: "XAU/USD",
			name: "Gold Spot / United States dollar",
			venue: "OANDA Spot",
			baseCurrency: "XAU",
			quoteCurrency: "USD",
			pricePrecision: 3,
			quantityPrecision: 3,
			timezone: "Etc/UTC",
			calendarId: "commodity-spot-24x5",
			providerBindings: [
				{
					provider: "finnhub",
					symbol: "OANDA:XAU_USD",
					capabilities: ["catalog"],
					enabled: true,
					priority: 100,
					venue: "oanda",
					orientation: "direct",
				},
			],
		});

		await assert.doesNotReject(instrument.validate());
	});

	it("rejects duplicate provider bindings and capabilities", async () => {
		const duplicateBindings = validEquity();
		duplicateBindings.providerBindings.push({
			...duplicateBindings.providerBindings[0],
			capabilities: ["chart"],
		});
		let errors = await validationErrors(duplicateBindings);
		assert.ok(errors.providerBindings);

		const duplicateCapabilities = validEquity();
		duplicateCapabilities.providerBindings[0].capabilities = ["quote", "quote"];
		errors = await validationErrors(duplicateCapabilities);
		assert.ok(errors["providerBindings.0.capabilities"]);
	});

	it("defines unique canonical and provider-binding indexes", () => {
		const indexes = Instrument.schema.indexes() as Array<
			[Record<string, number>, { unique?: boolean }]
		>;
		const canonicalIndex = indexes.find(([fields]) => fields.canonicalKey === 1);
		const providerIndex = indexes.find(
			([fields]) =>
				fields["providerBindings.provider"] === 1 &&
				fields["providerBindings.symbol"] === 1,
		);

		assert.equal(canonicalIndex?.[1].unique, true);
		assert.equal(providerIndex?.[1].unique, true);
		assert.equal(Instrument.schema.path("canonicalKey").options.immutable, true);
	});
});
