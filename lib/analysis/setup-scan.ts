import {
	buildBacktestSignalFeatures,
	MINIMUM_ANALYSIS_BARS,
	resolveBacktestConfiguration,
	simulateTradePlan,
	type DailySwingBacktestDependencies,
} from "@/lib/analysis/backtest";
import {
	DAILY_SWING_BACKTEST_VERSION,
	type DailySwingBacktestInput,
} from "@/lib/analysis/backtest.types";
import {
	BROAD_DEVELOPMENT_DATA_POLICY,
	BROAD_DEVELOPMENT_SYMBOLS,
	BROAD_DEVELOPMENT_UNIVERSE_NAME,
	evaluateBroadDevelopmentCoverage,
} from "@/lib/analysis/broad-development-universe";
import {
	BROAD_DEVELOPMENT_V2_EXPANSION_DATA_POLICY,
	BROAD_DEVELOPMENT_V2_EXPANSION_NAME,
	BROAD_DEVELOPMENT_V2_EXPANSION_SOURCE_SHA256,
	BROAD_DEVELOPMENT_V2_EXPANSION_SYMBOLS,
	evaluateBroadDevelopmentV2ExpansionCoverage,
} from "@/lib/analysis/broad-development-v2-universe";
import { buildDailySwingObjectiveFeatures } from "@/lib/analysis/objective-features";
import {
	DAILY_SWING_SETUP_SCAN_VERSION,
	type DailySwingInstrumentSetupScan,
	type DailySwingSetupResearchPolicy,
	type DailySwingSetupScanReport,
} from "@/lib/analysis/setup-scan.types";
import { analyzeDailySwing } from "@/lib/analysis/technical-analysis";
import {
	DAILY_SWING_STRATEGY_VERSION,
	TECHNICAL_ANALYSIS_ENGINE_VERSION,
} from "@/lib/analysis/technical-analysis.types";
import type { MarketBars } from "@/lib/market-data/types";

function marketBarsThrough(source: MarketBars, bars: MarketBars["bars"]): MarketBars {
	return {
		...source,
		from: bars[0]?.startedAt ?? source.from,
		to: bars.at(-1)?.startedAt ?? source.to,
		bars,
	};
}

function assertValidInput(input: DailySwingBacktestInput) {
	if (input.marketData.instrumentId !== input.instrument.instrumentId) {
		throw new Error("marketData.instrumentId must match the scan instrument");
	}
	if (input.startAt && Number.isNaN(input.startAt.getTime())) {
		throw new Error("startAt must be a valid date");
	}
	if (input.endAt && Number.isNaN(input.endAt.getTime())) {
		throw new Error("endAt must be a valid date");
	}
	if (input.startAt && input.endAt && input.startAt > input.endAt) {
		throw new Error("startAt cannot be after endAt");
	}
	let previous = Number.NEGATIVE_INFINITY;
	for (const bar of input.marketData.bars) {
		const current = bar.startedAt.getTime();
		if (!Number.isFinite(current) || current <= previous) {
			throw new Error("marketData bars must have valid, unique, chronological timestamps");
		}
		previous = current;
	}
}

/** Labels every setup independently, including signals emitted during other open trades. */
export function scanDailySwingSetups(
	input: DailySwingBacktestInput,
	dependencies: DailySwingBacktestDependencies = {},
	researchPolicy: DailySwingSetupResearchPolicy = "none",
): DailySwingInstrumentSetupScan {
	assertValidInput(input);
	const configuration = resolveBacktestConfiguration(input.configuration);
	const sourceBars = input.endAt
		? input.marketData.bars.filter((bar) => bar.startedAt <= input.endAt!)
		: input.marketData.bars;
	const analyze = dependencies.analyze ?? analyzeDailySwing;
	const trades: DailySwingInstrumentSetupScan["trades"] = [];
	const untriggeredSetups: DailySwingInstrumentSetupScan["untriggeredSetups"] = [];
	const objectiveFeatures: DailySwingInstrumentSetupScan["objectiveFeatures"] = [];
	let setupsEvaluated = 0;
	let liquidityRejected = 0;
	const signalCounts: DailySwingInstrumentSetupScan["signalCounts"] = {
		analyses: 0,
		unavailable: 0,
		noTrade: 0,
		longSetups: 0,
		shortSetups: 0,
		triggered: 0,
		expiredUntriggered: 0,
		endOfDataUntriggered: 0,
	};
	let engineVersion: string = TECHNICAL_ANALYSIS_ENGINE_VERSION;
	let strategyVersion: string = DAILY_SWING_STRATEGY_VERSION;
	let firstEvaluatedAt: string | null = null;
	let lastEvaluatedAt: string | null = null;

	for (let index = MINIMUM_ANALYSIS_BARS - 1; index < sourceBars.length; index += 1) {
		const currentBar = sourceBars[index];
		if (input.startAt && currentBar.startedAt < input.startAt) continue;
		const signalAt = currentBar.startedAt.toISOString();
		firstEvaluatedAt ??= signalAt;
		lastEvaluatedAt = signalAt;
		const visibleBars = sourceBars.slice(0, index + 1);
		const benchmarkBars = input.benchmarkData?.bars.filter(
			(bar) => bar.startedAt <= currentBar.startedAt,
		);
		const result = analyze({
			instrument: input.instrument,
			marketData: marketBarsThrough(input.marketData, visibleBars),
			...(input.benchmarkData && benchmarkBars
				? {
						benchmarkData: marketBarsThrough(
							input.benchmarkData,
							benchmarkBars,
						),
					}
				: {}),
			completedThrough: currentBar.startedAt,
			analyzedAt: new Date(currentBar.startedAt.getTime() + 1),
			allowShortSetups: configuration.allowShortSetups,
		});
		engineVersion = result.engineVersion;
		strategyVersion = result.strategyVersion;
		signalCounts.analyses += 1;
		if (result.status === "unavailable") {
			signalCounts.unavailable += 1;
			continue;
		}
		if (!result.tradePlan) {
			signalCounts.noTrade += 1;
			continue;
		}
		const plan = result.tradePlan;
		setupsEvaluated += 1;
		const snapshot = buildDailySwingObjectiveFeatures({
			bars: visibleBars,
			result,
			equity: configuration.initialEquity,
			riskPerTradePercent: configuration.riskPerTradePercent,
		});
		objectiveFeatures.push({
			instrumentId: input.instrument.instrumentId,
			signalAt,
			snapshot,
		});
		if (researchPolicy !== "none" && !snapshot.liquidity.eligible) {
			liquidityRejected += 1;
			continue;
		}
		signalCounts[plan.direction === "long" ? "longSetups" : "shortSetups"] += 1;
		const simulation = simulateTradePlan({
			instrumentId: input.instrument.instrumentId,
			plan,
			signalAt: currentBar.startedAt,
			trendRegime: result.assessments.trend.state,
			volatilityRegime: result.assessments.volatility.state,
			signalQuality: {
				evidenceStrength: result.signal.evidenceStrength,
				relativeStrength20Percent:
					result.indicators.relativeStrength20Percent,
				volumeZScore20: result.indicators.volumeZScore20,
				planRiskReward: plan.riskReward,
			},
			signalFeatures: buildBacktestSignalFeatures(result),
			futureBars: sourceBars.slice(index + 1),
			equity: configuration.initialEquity,
			configuration,
		});
		if (simulation.status === "completed") {
			trades.push(simulation.trade);
			signalCounts.triggered += 1;
		} else {
			untriggeredSetups.push(simulation.setup);
			signalCounts[
				simulation.setup.reason === "expired"
					? "expiredUntriggered"
					: "endOfDataUntriggered"
			] += 1;
		}
	}
	return {
		instrument: input.instrument,
		backtestVersion: DAILY_SWING_BACKTEST_VERSION,
		engineVersion,
		strategyVersion,
		configuration,
		window: {
			requestedStartAt: input.startAt?.toISOString() ?? null,
			requestedEndAt: input.endAt?.toISOString() ?? null,
			firstEvaluatedAt,
			lastEvaluatedAt,
			barsAvailable: sourceBars.length,
		},
		signalCounts,
		eligibility: {
			researchPolicy,
			setupsEvaluated,
			liquidityRejected,
		},
		objectiveFeatures,
		trades,
		untriggeredSetups,
	};
}

export function scanDailySwingSetupBatch(input: {
	universeName: string;
	instruments: DailySwingBacktestInput[];
	dependencies?: DailySwingBacktestDependencies;
	generatedAt?: Date;
	researchPolicy?: DailySwingSetupResearchPolicy;
	sourceSha256?: string;
	onInstrumentComplete?: (
		report: DailySwingInstrumentSetupScan,
		index: number,
		total: number,
	) => void;
}): DailySwingSetupScanReport {
	if (!input.universeName.trim()) throw new Error("universeName is required");
	if (input.instruments.length === 0) {
		throw new Error("At least one instrument is required for a setup scan");
	}
	const ids = input.instruments.map((item) => item.instrument.instrumentId);
	if (new Set(ids).size !== ids.length) {
		throw new Error("Setup scan instruments must have unique instrument IDs");
	}
	const generatedAt = input.generatedAt ?? new Date();
	if (Number.isNaN(generatedAt.getTime())) throw new Error("generatedAt must be valid");
	const researchPolicy = input.researchPolicy ?? "none";
	let scanInstruments = input.instruments;
	if (researchPolicy === "broad_development_v1") {
		if (input.universeName.trim() !== BROAD_DEVELOPMENT_UNIVERSE_NAME) {
			throw new Error(
				`broad_development_v1 requires universe ${BROAD_DEVELOPMENT_UNIVERSE_NAME}`,
			);
		}
		const receivedSymbols = new Set(
			input.instruments.map((instrument) =>
				instrument.instrument.displaySymbol.trim().toUpperCase(),
			),
		);
		const missingSymbols = BROAD_DEVELOPMENT_SYMBOLS.filter(
			(symbol) => !receivedSymbols.has(symbol),
		);
		const unexpectedSymbols = [...receivedSymbols].filter(
			(symbol) => !(BROAD_DEVELOPMENT_SYMBOLS as readonly string[]).includes(symbol),
		);
		if (
			input.instruments.length !== BROAD_DEVELOPMENT_SYMBOLS.length ||
			missingSymbols.length > 0 ||
			unexpectedSymbols.length > 0
		) {
			throw new Error(
				`broad_development_v1 requires the exact frozen ${BROAD_DEVELOPMENT_SYMBOLS.length}-candidate manifest`,
			);
		}
		for (const instrument of input.instruments) {
			if (
				instrument.marketData.provider !== BROAD_DEVELOPMENT_DATA_POLICY.provider ||
				instrument.marketData.interval !== BROAD_DEVELOPMENT_DATA_POLICY.interval ||
				!instrument.marketData.adjusted ||
				instrument.benchmarkData?.providerSymbol !==
					BROAD_DEVELOPMENT_DATA_POLICY.benchmarkSymbol
			) {
				throw new Error(
					"broad_development_v1 requires the frozen Alpaca adjusted-daily source and SPY benchmark",
				);
			}
		}
		scanInstruments = input.instruments.filter((instrument) =>
			evaluateBroadDevelopmentCoverage({
				symbol: instrument.instrument.displaySymbol,
				marketData: instrument.marketData,
			}).eligible,
		);
		if (
			scanInstruments.length <
			BROAD_DEVELOPMENT_DATA_POLICY.minimumCoverageEligibleInstruments
		) {
			throw new Error(
				`broad_development_v1 requires at least ${BROAD_DEVELOPMENT_DATA_POLICY.minimumCoverageEligibleInstruments} coverage-eligible instruments`,
			);
		}
	}
	if (researchPolicy === "broad_development_v2_expansion") {
		if (input.universeName.trim() !== BROAD_DEVELOPMENT_V2_EXPANSION_NAME) {
			throw new Error(
				`broad_development_v2_expansion requires universe ${BROAD_DEVELOPMENT_V2_EXPANSION_NAME}`,
			);
		}
		if (input.sourceSha256 !== BROAD_DEVELOPMENT_V2_EXPANSION_SOURCE_SHA256) {
			throw new Error(
				"broad_development_v2_expansion requires the exact frozen source SHA-256",
			);
		}
		const receivedSymbols = new Set(
			input.instruments.map((instrument) =>
				instrument.instrument.displaySymbol.trim().toUpperCase(),
			),
		);
		const missingSymbols = BROAD_DEVELOPMENT_V2_EXPANSION_SYMBOLS.filter(
			(symbol) => !receivedSymbols.has(symbol),
		);
		const unexpectedSymbols = [...receivedSymbols].filter(
			(symbol) =>
				!(BROAD_DEVELOPMENT_V2_EXPANSION_SYMBOLS as readonly string[]).includes(
					symbol,
				),
		);
		if (
			input.instruments.length !==
				BROAD_DEVELOPMENT_V2_EXPANSION_SYMBOLS.length ||
			missingSymbols.length > 0 ||
			unexpectedSymbols.length > 0
		) {
			throw new Error(
				`broad_development_v2_expansion requires the exact frozen ${BROAD_DEVELOPMENT_V2_EXPANSION_SYMBOLS.length}-candidate manifest`,
			);
		}
		for (const instrument of input.instruments) {
			if (
				instrument.marketData.provider !==
					BROAD_DEVELOPMENT_V2_EXPANSION_DATA_POLICY.provider ||
				instrument.marketData.interval !==
					BROAD_DEVELOPMENT_V2_EXPANSION_DATA_POLICY.interval ||
				!instrument.marketData.adjusted ||
				instrument.benchmarkData?.providerSymbol !==
					BROAD_DEVELOPMENT_V2_EXPANSION_DATA_POLICY.benchmarkSymbol
			) {
				throw new Error(
					"broad_development_v2_expansion requires the frozen Alpaca adjusted-daily source and SPY benchmark",
				);
			}
		}
		scanInstruments = input.instruments.filter((instrument) =>
			evaluateBroadDevelopmentV2ExpansionCoverage({
				symbol: instrument.instrument.displaySymbol,
				marketData: instrument.marketData,
			}).eligible,
		);
		if (
			scanInstruments.length <
			BROAD_DEVELOPMENT_V2_EXPANSION_DATA_POLICY.minimumCoverageEligibleInstruments
		) {
			throw new Error(
				`broad_development_v2_expansion requires at least ${BROAD_DEVELOPMENT_V2_EXPANSION_DATA_POLICY.minimumCoverageEligibleInstruments} coverage-eligible instruments`,
			);
		}
	}
	const reports = scanInstruments.map((instrument, index) => {
		const report = scanDailySwingSetups(
			instrument,
			input.dependencies,
			researchPolicy,
		);
		input.onInstrumentComplete?.(report, index, scanInstruments.length);
		return report;
	});
	const analyses = reports.reduce(
		(total, report) => total + report.signalCounts.analyses,
		0,
	);
	const setups = reports.reduce(
		(total, report) =>
			total + report.signalCounts.longSetups + report.signalCounts.shortSetups,
		0,
	);
	const triggered = reports.reduce(
		(total, report) => total + report.signalCounts.triggered,
		0,
	);
	const liquidityRejected = reports.reduce(
		(total, report) => total + report.eligibility.liquidityRejected,
		0,
	);
	return {
		scanVersion: DAILY_SWING_SETUP_SCAN_VERSION,
		generatedAt: generatedAt.toISOString(),
		universeName: input.universeName.trim(),
		...(input.sourceSha256 ? { sourceSha256: input.sourceSha256 } : {}),
		methodology: {
			evaluationPolicy: "every_eligible_completed_bar",
			labelPolicy: "independent_fixed_equity_simulation",
			researchPolicy,
			description:
				"Every eligible completed bar is analyzed. Each setup receives a completed-bar-only objective feature snapshot and is simulated independently at fixed reference equity. The broad-development policy excludes setups that fail its frozen signal-time liquidity gate.",
		},
		aggregate: {
			candidatesReceived: input.instruments.length,
			instrumentsScanned: reports.length,
			coverageExcluded: input.instruments.length - reports.length,
			analyses,
			setups,
			liquidityRejected,
			triggered,
			untriggered: setups - triggered,
		},
		reports,
		warnings: [
			...(input.instruments.length > reports.length
				? [
						`${input.instruments.length - reports.length} instrument(s) failed the frozen outcome-blind coverage gate and were excluded before analysis.`,
					]
				: []),
			"Setup outcomes overlap and must not be summed as portfolio returns.",
			"Consecutive signals can describe closely related setups and are not statistically independent.",
			"Labels use the configured execution assumptions and fixed reference equity for every setup.",
		],
	};
}
