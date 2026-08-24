import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
	orchestrateTransparentAnalysis,
	type AnalysisCatalogInstrument,
	type TransparentAnalysisDependencies,
	type TransparentAnalysisOperationalFailure,
} from "@/lib/analysis/transparent-analysis-orchestrator";
import type { MarketBar, MarketBars } from "@/lib/market-data/types";
import type { ProviderBinding } from "@/types/instruments";

const NOW_BEFORE_MONDAY_CLOSE = new Date("2026-08-24T15:00:00.000Z");
const LAST_COMPLETED_SESSION = new Date("2026-08-21T00:00:00.000Z");
const LAST_COMPLETED_SESSION_CLOSE = "2026-08-21T20:00:00.000Z";
const DAY_MS = 24 * 60 * 60 * 1000;

function binding(symbol: string): ProviderBinding {
	return {
		provider: "massive",
		symbol,
		capabilities: ["catalog", "bars"],
		enabled: true,
		priority: 100,
		orientation: "direct" as const,
	};
}

function targetInstrument(
	overrides: Partial<AnalysisCatalogInstrument> = {},
): AnalysisCatalogInstrument {
	return {
		instrumentId: "instrument-aapl",
		canonicalKey: "equity:xnas:aapl",
		assetClass: "equity",
		displaySymbol: "AAPL",
		quoteCurrency: "USD",
		pricePrecision: 2,
		calendarId: "us-equities",
		providerBindings: [binding("AAPL")],
		name: "Apple Inc.",
		securityType: "common_stock",
		status: "active",
		...overrides,
	};
}

function benchmarkInstrument(): AnalysisCatalogInstrument {
	return {
		instrumentId: "instrument-spy",
		canonicalKey: "equity:arcx:spy",
		assetClass: "equity",
		displaySymbol: "SPY",
		quoteCurrency: "USD",
		pricePrecision: 2,
		calendarId: "us-equities",
		providerBindings: [binding("SPY")],
		name: "SPDR S&P 500 ETF Trust",
		securityType: "etf",
		status: "active",
	};
}

function syntheticBars(direction: "up" | "flat", includeIncomplete = false) {
	const count = 330;
	const first = LAST_COMPLETED_SESSION.getTime() - (count - 1) * DAY_MS;
	const bars: MarketBar[] = Array.from({ length: count }, (_, index) => {
		const center = direction === "up" ? 100 + index * 0.25 : 150;
		const wave = Math.sin(index / 5) * 0.4;
		const close = center + wave;
		return {
			startedAt: new Date(first + index * DAY_MS),
			open: (close - 0.2).toFixed(4),
			high: (close + 0.8).toFixed(4),
			low: (close - 0.8).toFixed(4),
			close: close.toFixed(4),
			volume: String(1_000_000 + (index % 10) * 10_000),
		};
	});
	if (includeIncomplete) {
		bars.push({
			...bars.at(-1)!,
			startedAt: new Date("2026-08-24T00:00:00.000Z"),
		});
	}
	return bars;
}

type DependencyOptions = {
	target?: AnalysisCatalogInstrument | null;
	benchmark?: AnalysisCatalogInstrument | null;
	now?: Date;
	includeIncomplete?: boolean;
	failTargetBars?: boolean;
	failBenchmarkBars?: boolean;
	failInstrumentResolution?: boolean;
	targetFailureMessage?: string;
	unadjustedTarget?: boolean;
};

function dependencies(options: DependencyOptions = {}) {
	const target = options.target === undefined ? targetInstrument() : options.target;
	const benchmark =
		options.benchmark === undefined ? benchmarkInstrument() : options.benchmark;
	const requests: Array<{
		instrument: AnalysisCatalogInstrument;
		query: Parameters<TransparentAnalysisDependencies["getBars"]>[1];
	}> = [];
	let benchmarkResolutions = 0;
	const value: TransparentAnalysisDependencies = {
		resolveInstrument: async () => {
			if (options.failInstrumentResolution) {
				throw new Error("SECRET catalog failure must not cross the boundary");
			}
			return target;
		},
		resolveBenchmark: async () => {
			benchmarkResolutions += 1;
			return benchmark;
		},
		getBars: async (instrument, query) => {
			requests.push({
				instrument: instrument as AnalysisCatalogInstrument,
				query,
			});
			const isBenchmark = instrument.instrumentId === "instrument-spy";
			if (
				(!isBenchmark && options.failTargetBars) ||
				(isBenchmark && options.failBenchmarkBars)
			) {
				throw new Error(
					!isBenchmark && options.targetFailureMessage
						? options.targetFailureMessage
						: "SECRET provider response must not cross the boundary",
				);
			}
			const bars = syntheticBars(
				isBenchmark ? "flat" : "up",
				!isBenchmark && options.includeIncomplete,
			);
			return {
				instrumentId: instrument.instrumentId,
				provider: "massive",
				providerSymbol: isBenchmark ? "SPY" : "AAPL",
				currency: "USD",
				interval: "1d",
				from: query.from,
				to: query.to,
				adjusted: isBenchmark || !options.unadjustedTarget,
				timeliness: "historical",
				bars,
			} satisfies MarketBars;
		},
		now: () => new Date(options.now ?? NOW_BEFORE_MONDAY_CLOSE),
	};
	return {
		value,
		requests,
		benchmarkResolutions: () => benchmarkResolutions,
	};
}

describe("transparent analysis orchestration", () => {
	it("fetches only fixed daily history through the latest completed session", async () => {
		const fixture = dependencies();
		const result = await orchestrateTransparentAnalysis(
			"equity:xnas:aapl",
			fixture.value,
		);
		assert.equal(result.kind, "response");
		if (result.kind !== "response") return;
		assert.equal(result.transportStatus, 200);
		if (result.response.status === "unavailable") {
			assert.fail(`Expected ready analysis, received ${result.response.reason}`);
		}
		assert.equal(result.response.status, "ready");
		assert.equal(result.response.instrument.canonicalKey, "equity:xnas:aapl");
		assert.equal(result.response.asOf, LAST_COMPLETED_SESSION_CLOSE);
		assert.equal(fixture.requests.length, 2);
		for (const request of fixture.requests) {
			assert.equal(request.query.interval, "1d");
			assert.equal(request.query.limit, 500);
			assert.equal(request.query.to.toISOString(), "2026-08-21T20:00:00.000Z");
			assert.equal(request.query.from.toISOString(), "2024-09-30T20:00:00.000Z");
			let weekdays = 0;
			for (
				const day = new Date(request.query.from);
				day <= request.query.to;
				day.setUTCDate(day.getUTCDate() + 1)
			) {
				if (day.getUTCDay() !== 0 && day.getUTCDay() !== 6) weekdays += 1;
			}
			assert.ok(weekdays <= 500);
		}
	});

	it("excludes an incomplete current-session bar returned by a provider", async () => {
		const fixture = dependencies({ includeIncomplete: true });
		const result = await orchestrateTransparentAnalysis(
			"equity:xnas:aapl",
			fixture.value,
		);
		assert.equal(result.kind, "response");
		if (result.kind !== "response" || result.response.status === "unavailable") {
			return;
		}
		assert.equal(result.response.status, "partial");
		assert.equal(result.response.asOf, LAST_COMPLETED_SESSION_CLOSE);
		assert.deepEqual(result.response.dataQuality.warnings, [
			"An incomplete or future-dated daily bar was excluded.",
		]);
	});

	it("rejects every ineligible catalog state before session or market-data work", async () => {
		const ineligible = [
			targetInstrument({ securityType: "etf" }),
			targetInstrument({ status: "inactive" }),
			targetInstrument({ calendarId: "crypto-24x7" }),
			targetInstrument({ assetClass: "forex" }),
			targetInstrument({
				providerBindings: [{ ...binding("AAPL"), enabled: false }],
			}),
			targetInstrument({
				providerBindings: [{ ...binding("AAPL"), capabilities: ["catalog"] }],
			}),
		];
		for (const target of ineligible) {
			const fixture = dependencies({
				target,
				now: new Date("invalid"),
			});
			const result = await orchestrateTransparentAnalysis(
				target.canonicalKey,
				fixture.value,
			);
			assert.equal(result.kind, "response");
			if (result.kind !== "response") continue;
			assert.equal(result.response.status, "unavailable");
			if (result.response.status !== "unavailable") continue;
			assert.equal(result.response.reason, "unsupported_instrument");
			assert.equal(fixture.requests.length, 0);
			assert.equal(fixture.benchmarkResolutions(), 0);
		}
	});

	it("keeps absolute analysis available when SPY is missing or fails", async () => {
		for (const options of [
			{ benchmark: null },
			{ failBenchmarkBars: true },
		] satisfies DependencyOptions[]) {
			const fixture = dependencies(options);
			const result = await orchestrateTransparentAnalysis(
				"equity:xnas:aapl",
				fixture.value,
			);
			assert.equal(result.kind, "response");
			if (result.kind !== "response") continue;
			assert.equal(result.transportStatus, 200);
			if (result.response.status === "unavailable") {
				assert.fail(`Expected partial analysis, received ${result.response.reason}`);
			}
			assert.equal(result.response.status, "partial");
			assert.equal(result.response.factors.momentum.evidence.includes(
				"The instrument has outperformed SPY over 20 days.",
			), false);
		}
	});

	it("returns controlled transport outcomes for lookup, calendar, and provider failures", async () => {
		const missing = dependencies({ target: null });
		assert.deepEqual(
			await orchestrateTransparentAnalysis("equity:xnas:missing", missing.value),
			{ kind: "not_found" },
		);
		assert.equal(missing.requests.length, 0);

		const lookupFailure = dependencies({ failInstrumentResolution: true });
		const lookupResult = await orchestrateTransparentAnalysis(
			"equity:xnas:aapl",
			lookupFailure.value,
		);
		assert.equal(lookupResult.kind, "response");
		if (lookupResult.kind === "response") {
			assert.equal(lookupResult.transportStatus, 503);
			assert.equal(lookupResult.response.status, "unavailable");
			assert.doesNotMatch(JSON.stringify(lookupResult), /SECRET catalog failure/);
		}

		const unsupportedCalendar = dependencies({
			now: new Date("2029-01-02T22:00:00.000Z"),
		});
		const calendarResult = await orchestrateTransparentAnalysis(
			"equity:xnas:aapl",
			unsupportedCalendar.value,
		);
		assert.equal(calendarResult.kind, "response");
		if (calendarResult.kind === "response") {
			assert.equal(calendarResult.transportStatus, 200);
			assert.equal(calendarResult.response.status, "unavailable");
			if (calendarResult.response.status === "unavailable") {
				assert.equal(
					calendarResult.response.reason,
					"completed_session_unavailable",
				);
			}
		}
		assert.equal(unsupportedCalendar.requests.length, 0);

		const providerFailure = dependencies({ failTargetBars: true });
		const providerResult = await orchestrateTransparentAnalysis(
			"equity:xnas:aapl",
			providerFailure.value,
		);
		assert.equal(providerResult.kind, "response");
		if (providerResult.kind === "response") {
			assert.equal(providerResult.transportStatus, 503);
			assert.equal(providerResult.response.status, "unavailable");
			assert.doesNotMatch(JSON.stringify(providerResult), /SECRET provider response/);
		}
	});

	it("reports only structured failure diagnostics without raw provider details", async () => {
		const failures: TransparentAnalysisOperationalFailure[] = [];
		const fixture = dependencies({
			failTargetBars: true,
			targetFailureMessage:
				"Massive historical range exceeded the requested limit SECRET_API_KEY",
		});
		fixture.value.reportOperationalFailure = (failure) => failures.push(failure);

		await orchestrateTransparentAnalysis("equity:xnas:aapl", fixture.value);

		assert.deepEqual(failures, [
			{
				stage: "target_bars",
				category: "result_limit",
			},
		]);
		assert.doesNotMatch(JSON.stringify(failures), /SECRET_API_KEY|requested limit/);
	});

	it("preserves engine validation without leaking internal market-data details", async () => {
		const fixture = dependencies({ unadjustedTarget: true });
		const result = await orchestrateTransparentAnalysis(
			"equity:xnas:aapl",
			fixture.value,
		);
		assert.equal(result.kind, "response");
		if (result.kind !== "response") return;
		assert.equal(result.transportStatus, 200);
		assert.equal(result.response.status, "unavailable");
		if (result.response.status !== "unavailable") return;
		assert.equal(result.response.reason, "invalid_market_data");
		assert.equal("providerSymbol" in result.response, false);
	});

	it("keeps the production composition server-only", () => {
		const source = readFileSync(
			new URL("./transparent-analysis-service.ts", import.meta.url),
			"utf8",
		);
		assert.match(source, /^import "server-only";/);
		assert.doesNotMatch(source, /artifacts\/|backtest|validation|holdout/);
	});
});
