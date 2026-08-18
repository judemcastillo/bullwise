import {
	parseMarketBar,
	percentageReturn,
	simpleMovingAverageSeries,
	type NumericBar,
} from "@/lib/analysis/indicators";
import {
	DAILY_SWING_BACKTEST_VERSION,
	type BacktestBaselines,
	type BacktestConfiguration,
	type BacktestExitFill,
	type BacktestPerformance,
	type BacktestSignalQuality,
	type BacktestTrade,
	type DailySwingBacktestInput,
	type DailySwingBacktestReport,
	type RegimePerformance,
	type TradeGroupMetrics,
	type TradeSimulationResult,
} from "@/lib/analysis/backtest.types";
import {
	analyzeDailySwing,
	type DailySwingAnalysisInput,
} from "@/lib/analysis/technical-analysis";
import {
	DAILY_SWING_STRATEGY_VERSION,
	TECHNICAL_ANALYSIS_ENGINE_VERSION,
	type AnalysisState,
	type TechnicalAnalysisResult,
	type TradePlan,
	type VolatilityState,
} from "@/lib/analysis/technical-analysis.types";
import type { MarketBar, MarketBars } from "@/lib/market-data/types";

const MINIMUM_ANALYSIS_BARS = 300;
const TARGET_ONE_POSITION_FRACTION = 0.5;

export const DEFAULT_BACKTEST_CONFIGURATION: BacktestConfiguration = {
	initialEquity: 100_000,
	riskPerTradePercent: 1,
	transactionCostBpsPerSide: 2,
	slippageBpsPerFill: 3,
	maximumHoldingBars: 20,
	sameBarPolicy: "stop_first",
	allowShortSetups: false,
};

export type TradeSimulationInput = {
	instrumentId: string;
	plan: TradePlan;
	signalAt: Date;
	trendRegime: AnalysisState;
	volatilityRegime: VolatilityState;
	signalQuality?: BacktestSignalQuality;
	futureBars: MarketBar[];
	equity: number;
	configuration?: Partial<BacktestConfiguration>;
};

export type DailySwingBacktestDependencies = {
	analyze?: (input: DailySwingAnalysisInput) => TechnicalAnalysisResult;
};

type PendingExit = {
	reason: BacktestExitFill["reason"];
	bar: NumericBar;
	basePrice: number;
	positionFraction: number;
};

function round(value: number, precision = 8) {
	const multiplier = 10 ** precision;
	return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
}

function requireFinite(value: number, label: string) {
	if (!Number.isFinite(value)) {
		throw new Error(`${label} must be a finite number`);
	}
	return value;
}

function resolveConfiguration(
	overrides: Partial<BacktestConfiguration> = {},
): BacktestConfiguration {
	const configuration: BacktestConfiguration = {
		initialEquity:
			overrides.initialEquity ?? DEFAULT_BACKTEST_CONFIGURATION.initialEquity,
		riskPerTradePercent:
			overrides.riskPerTradePercent ??
			DEFAULT_BACKTEST_CONFIGURATION.riskPerTradePercent,
		transactionCostBpsPerSide:
			overrides.transactionCostBpsPerSide ??
			DEFAULT_BACKTEST_CONFIGURATION.transactionCostBpsPerSide,
		slippageBpsPerFill:
			overrides.slippageBpsPerFill ??
			DEFAULT_BACKTEST_CONFIGURATION.slippageBpsPerFill,
		maximumHoldingBars:
			overrides.maximumHoldingBars ??
			DEFAULT_BACKTEST_CONFIGURATION.maximumHoldingBars,
		sameBarPolicy:
			overrides.sameBarPolicy ?? DEFAULT_BACKTEST_CONFIGURATION.sameBarPolicy,
		allowShortSetups:
			overrides.allowShortSetups ??
			DEFAULT_BACKTEST_CONFIGURATION.allowShortSetups,
	};
	requireFinite(configuration.initialEquity, "initialEquity");
	requireFinite(configuration.riskPerTradePercent, "riskPerTradePercent");
	requireFinite(
		configuration.transactionCostBpsPerSide,
		"transactionCostBpsPerSide",
	);
	requireFinite(configuration.slippageBpsPerFill, "slippageBpsPerFill");
	if (configuration.initialEquity <= 0) {
		throw new Error("initialEquity must be greater than zero");
	}
	if (
		configuration.riskPerTradePercent <= 0 ||
		configuration.riskPerTradePercent > 100
	) {
		throw new Error("riskPerTradePercent must be greater than zero and at most 100");
	}
	if (
		configuration.transactionCostBpsPerSide < 0 ||
		configuration.slippageBpsPerFill < 0
	) {
		throw new Error("Transaction costs and slippage cannot be negative");
	}
	if (
		!Number.isInteger(configuration.maximumHoldingBars) ||
		configuration.maximumHoldingBars <= 0
	) {
		throw new Error("maximumHoldingBars must be a positive integer");
	}
	if (
		configuration.sameBarPolicy !== "stop_first" &&
		configuration.sameBarPolicy !== "target_first"
	) {
		throw new Error("sameBarPolicy must be stop_first or target_first");
	}
	if (typeof configuration.allowShortSetups !== "boolean") {
		throw new Error("allowShortSetups must be a boolean");
	}
	return configuration;
}

function parseBars(bars: readonly MarketBar[], label: string) {
	const parsed: NumericBar[] = [];
	let previousTimestamp = Number.NEGATIVE_INFINITY;
	for (const bar of bars) {
		const numeric = parseMarketBar(bar);
		if (!numeric) throw new Error(`${label} contains an invalid market bar`);
		const timestamp = numeric.startedAt.getTime();
		if (timestamp <= previousTimestamp) {
			throw new Error(`${label} bars must be unique and sorted chronologically`);
		}
		previousTimestamp = timestamp;
		parsed.push(numeric);
	}
	return parsed;
}

function parsePlanPrice(value: string, label: string) {
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed <= 0) {
		throw new Error(`${label} must be a positive finite price`);
	}
	return parsed;
}

function applySlippage(
	price: number,
	direction: TradePlan["direction"],
	fillSide: "entry" | "exit",
	basisPoints: number,
) {
	const rate = basisPoints / 10_000;
	const worsensUp =
		(direction === "long" && fillSide === "entry") ||
		(direction === "short" && fillSide === "exit");
	return price * (worsensUp ? 1 + rate : 1 - rate);
}

function entryBasePrice(
	bar: NumericBar,
	direction: TradePlan["direction"],
	entryLow: number,
	entryHigh: number,
) {
	if (direction === "long") {
		if (bar.open > entryHigh || bar.high < entryLow) return null;
		if (bar.open >= entryLow) return bar.open;
		return entryLow;
	}
	if (bar.open < entryLow || bar.low > entryHigh) return null;
	if (bar.open <= entryHigh) return bar.open;
	return entryHigh;
}

function stopBasePrice(
	bar: NumericBar,
	direction: TradePlan["direction"],
	stopPrice: number,
	allowOpeningGap: boolean,
) {
	if (!allowOpeningGap) return stopPrice;
	if (direction === "long") return bar.open < stopPrice ? bar.open : stopPrice;
	return bar.open > stopPrice ? bar.open : stopPrice;
}

function targetBasePrice(
	bar: NumericBar,
	direction: TradePlan["direction"],
	targetPrice: number,
) {
	if (direction === "long") return Math.max(bar.open, targetPrice);
	return Math.min(bar.open, targetPrice);
}

function isStopTouched(
	bar: NumericBar,
	direction: TradePlan["direction"],
	stopPrice: number,
) {
	return direction === "long" ? bar.low <= stopPrice : bar.high >= stopPrice;
}

function isTargetTouched(
	bar: NumericBar,
	direction: TradePlan["direction"],
	targetPrice: number,
) {
	return direction === "long" ? bar.high >= targetPrice : bar.low <= targetPrice;
}

function validateTradePlan(plan: TradePlan) {
	const entryLow = parsePlanPrice(plan.entry.low, "entry.low");
	const entryHigh = parsePlanPrice(plan.entry.high, "entry.high");
	const stopPrice = parsePlanPrice(plan.stopLoss.price, "stopLoss.price");
	const targetPrices = plan.targets.map((target, index) =>
		parsePlanPrice(target.price, `targets[${index}].price`),
	);
	if (entryLow > entryHigh) throw new Error("entry.low cannot exceed entry.high");
	if (!Number.isInteger(plan.expiresAfterCompletedBars) || plan.expiresAfterCompletedBars <= 0) {
		throw new Error("expiresAfterCompletedBars must be a positive integer");
	}
	if (targetPrices.length < 2) {
		throw new Error("Backtesting requires two profit targets");
	}
	if (plan.direction === "long") {
		if (stopPrice >= entryLow) throw new Error("A long stop must be below the entry zone");
		if (targetPrices[0] <= entryHigh || targetPrices[1] <= targetPrices[0]) {
			throw new Error("Long targets must ascend above the entry zone");
		}
	} else {
		if (stopPrice <= entryHigh) throw new Error("A short stop must be above the entry zone");
		if (targetPrices[0] >= entryLow || targetPrices[1] >= targetPrices[0]) {
			throw new Error("Short targets must descend below the entry zone");
		}
	}
	return { entryLow, entryHigh, stopPrice, targetPrices };
}

/** Simulates one setup using bars strictly after its signal bar. */
export function simulateTradePlan(input: TradeSimulationInput): TradeSimulationResult {
	if (Number.isNaN(input.signalAt.getTime())) throw new Error("signalAt must be valid");
	if (!Number.isFinite(input.equity) || input.equity <= 0) {
		throw new Error("equity must be greater than zero");
	}
	const configuration = resolveConfiguration(input.configuration);
	const bars = parseBars(input.futureBars, "futureBars");
	const { entryLow, entryHigh, stopPrice, targetPrices } = validateTradePlan(input.plan);
	const observableBars = Math.min(input.plan.expiresAfterCompletedBars, bars.length);
	let entryIndex = -1;
	let entryBase = 0;
	for (let index = 0; index < observableBars; index += 1) {
		const basePrice = entryBasePrice(
			bars[index],
			input.plan.direction,
			entryLow,
			entryHigh,
		);
		if (basePrice !== null) {
			entryIndex = index;
			entryBase = basePrice;
			break;
		}
	}
	if (entryIndex === -1) {
		const resolvedBar = bars[Math.max(observableBars - 1, 0)];
		return {
			status: "untriggered",
			barsConsumed: observableBars,
			setup: {
				direction: input.plan.direction,
				signalAt: input.signalAt.toISOString(),
				resolvedAt: (resolvedBar?.startedAt ?? input.signalAt).toISOString(),
				reason:
					observableBars >= input.plan.expiresAfterCompletedBars
						? "expired"
						: "end_of_data",
				barsObserved: observableBars,
			},
		};
	}

	const entryPrice = applySlippage(
		entryBase,
		input.plan.direction,
		"entry",
		configuration.slippageBpsPerFill,
	);
	const riskPerUnit = Math.abs(entryPrice - stopPrice);
	if (riskPerUnit <= 0) throw new Error("Entry and stop must define positive risk");
	const riskCapital = input.equity * (configuration.riskPerTradePercent / 100);
	const positionUnits = riskCapital / riskPerUnit;
	const activeBars = bars.slice(
		entryIndex,
		entryIndex + configuration.maximumHoldingBars,
	);
	const exits: PendingExit[] = [];
	let remainingFraction = 1;
	let targetOneFilled = false;
	let barsHeld = 0;
	let favorableExcursion = 0;
	let adverseExcursion = 0;

	const recordExcursion = (bar: NumericBar) => {
		const favorable =
			input.plan.direction === "long"
				? ((bar.high / entryPrice) - 1) * 100
				: ((entryPrice / bar.low) - 1) * 100;
		const adverse =
			input.plan.direction === "long"
				? ((bar.low / entryPrice) - 1) * 100
				: ((entryPrice / bar.high) - 1) * 100;
		favorableExcursion = Math.max(favorableExcursion, favorable);
		adverseExcursion = Math.min(adverseExcursion, adverse);
	};

	const addStop = (bar: NumericBar, allowOpeningGap: boolean) => {
		exits.push({
			reason: "stop_loss",
			bar,
			basePrice: stopBasePrice(
				bar,
				input.plan.direction,
				stopPrice,
				allowOpeningGap,
			),
			positionFraction: remainingFraction,
		});
		remainingFraction = 0;
	};
	const addTargets = (bar: NumericBar, targetTwoTouched: boolean) => {
		if (!targetOneFilled) {
			const fraction = Math.min(
				TARGET_ONE_POSITION_FRACTION,
				remainingFraction,
			);
			exits.push({
				reason: "target_1",
				bar,
				basePrice: targetBasePrice(bar, input.plan.direction, targetPrices[0]),
				positionFraction: fraction,
			});
			remainingFraction -= fraction;
			targetOneFilled = true;
		}
		if (targetTwoTouched && remainingFraction > 0) {
			exits.push({
				reason: "target_2",
				bar,
				basePrice: targetBasePrice(bar, input.plan.direction, targetPrices[1]),
				positionFraction: remainingFraction,
			});
			remainingFraction = 0;
		}
	};

	for (let index = 0; index < activeBars.length; index += 1) {
		const bar = activeBars[index];
		barsHeld = index + 1;
		recordExcursion(bar);
		const stopTouched = isStopTouched(bar, input.plan.direction, stopPrice);
		const targetTwoTouched = isTargetTouched(
			bar,
			input.plan.direction,
			targetPrices[1],
		);
		const targetOneTouched =
			!targetOneFilled &&
			isTargetTouched(bar, input.plan.direction, targetPrices[0]);
		const anyTargetTouched = targetOneTouched || targetTwoTouched;

		if (stopTouched && anyTargetTouched) {
			if (configuration.sameBarPolicy === "stop_first") addStop(bar, index > 0);
			else {
				addTargets(bar, targetTwoTouched);
				if (remainingFraction > 0) addStop(bar, index > 0);
			}
		} else if (stopTouched) {
			addStop(bar, index > 0);
		} else if (anyTargetTouched) {
			addTargets(bar, targetTwoTouched);
		}
		if (remainingFraction <= 0) break;

		if (barsHeld >= configuration.maximumHoldingBars) {
			exits.push({
				reason: "maximum_holding_period",
				bar,
				basePrice: bar.close,
				positionFraction: remainingFraction,
			});
			remainingFraction = 0;
			break;
		}
	}

	if (remainingFraction > 0) {
		const finalBar = activeBars.at(-1);
		if (!finalBar) throw new Error("No bar was available after the entry fill");
		exits.push({
			reason: "end_of_data",
			bar: finalBar,
			basePrice: finalBar.close,
			positionFraction: remainingFraction,
		});
		remainingFraction = 0;
	}

	const exitFills: BacktestExitFill[] = exits.map((exit) => ({
		reason: exit.reason,
		filledAt: exit.bar.startedAt.toISOString(),
		price: round(
			applySlippage(
				exit.basePrice,
				input.plan.direction,
				"exit",
				configuration.slippageBpsPerFill,
			),
		),
		positionFraction: exit.positionFraction,
	}));
	const grossPnl = exitFills.reduce((total, fill) => {
		const priceChange =
			input.plan.direction === "long"
				? fill.price - entryPrice
				: entryPrice - fill.price;
		return total + priceChange * positionUnits * fill.positionFraction;
	}, 0);
	const costRate = configuration.transactionCostBpsPerSide / 10_000;
	const entryCost = entryPrice * positionUnits * costRate;
	const exitCosts = exitFills.reduce(
		(total, fill) =>
			total + fill.price * positionUnits * fill.positionFraction * costRate,
		0,
	);
	const transactionCosts = entryCost + exitCosts;
	const netPnl = grossPnl - transactionCosts;
	let realizedGrossPnl = 0;
	let markedRemainingFraction = 1;
	let incurredTransactionCosts = entryCost;
	const markToMarket = activeBars.slice(0, barsHeld).map((bar) => {
		const fills = exitFills.filter(
			(fill) => fill.filledAt === bar.startedAt.toISOString(),
		);
		for (const fill of fills) {
			const priceChange =
				input.plan.direction === "long"
					? fill.price - entryPrice
					: entryPrice - fill.price;
			realizedGrossPnl +=
				priceChange * positionUnits * fill.positionFraction;
			markedRemainingFraction -= fill.positionFraction;
			incurredTransactionCosts +=
				fill.price * positionUnits * fill.positionFraction * costRate;
		}
		markedRemainingFraction = Math.max(0, markedRemainingFraction);
		const markedPriceChange =
			input.plan.direction === "long"
				? bar.close - entryPrice
				: entryPrice - bar.close;
		const unrealizedGrossPnl =
			markedPriceChange * positionUnits * markedRemainingFraction;
		return {
			at: bar.startedAt.toISOString(),
			markPrice: round(bar.close),
			remainingPositionFraction: round(markedRemainingFraction),
			realizedGrossPnl: round(realizedGrossPnl),
			unrealizedGrossPnl: round(unrealizedGrossPnl),
			transactionCosts: round(incurredTransactionCosts),
			netPnl: round(
				realizedGrossPnl + unrealizedGrossPnl - incurredTransactionCosts,
			),
		};
	});
	const finalExit = exitFills.at(-1);
	if (!finalExit || finalExit.reason === "target_1") {
		throw new Error("Trade simulation did not produce a terminal exit");
	}
	return {
		status: "completed",
		barsConsumed: entryIndex + barsHeld,
		trade: {
			instrumentId: input.instrumentId,
			direction: input.plan.direction,
			setupType: input.plan.entry.type,
			signalAt: input.signalAt.toISOString(),
			entryAt: bars[entryIndex].startedAt.toISOString(),
			entryPrice: round(entryPrice),
			stopPrice: round(stopPrice),
			targetPrices: targetPrices.map((target) => round(target)),
			exitAt: finalExit.filledAt,
			exitReason: finalExit.reason,
			exitFills,
			barsHeld,
			trendRegime: input.trendRegime,
			volatilityRegime: input.volatilityRegime,
			signalQuality: input.signalQuality ?? {
				evidenceStrength: "unavailable",
				relativeStrength20Percent: null,
				volumeZScore20: null,
				planRiskReward: input.plan.riskReward,
			},
			positionUnits: round(positionUnits),
			riskCapital: round(riskCapital),
			grossPnl: round(grossPnl),
			transactionCosts: round(transactionCosts),
			netPnl: round(netPnl),
			netReturnOnEquityPercent: round((netPnl / input.equity) * 100),
			rMultiple: round(netPnl / riskCapital),
			maximumFavorableExcursionPercent: round(favorableExcursion),
			maximumAdverseExcursionPercent: round(adverseExcursion),
			markToMarket,
		},
	};
}

function groupMetrics(trades: readonly BacktestTrade[]): TradeGroupMetrics {
	const wins = trades.filter((trade) => trade.netPnl > 0).length;
	const losses = trades.filter((trade) => trade.netPnl < 0).length;
	const breakeven = trades.length - wins - losses;
	const netPnl = trades.reduce((total, trade) => total + trade.netPnl, 0);
	const grossProfits = trades.reduce(
		(total, trade) => total + Math.max(trade.netPnl, 0),
		0,
	);
	const grossLosses = Math.abs(
		trades.reduce((total, trade) => total + Math.min(trade.netPnl, 0), 0),
	);
	const average = (selector: (trade: BacktestTrade) => number) =>
		trades.length === 0
			? null
			: round(
					trades.reduce((total, trade) => total + selector(trade), 0) /
						trades.length,
				);
	return {
		tradeCount: trades.length,
		wins,
		losses,
		breakeven,
		winRatePercent: trades.length === 0 ? null : round((wins / trades.length) * 100),
		netPnl: round(netPnl),
		averageNetPnl: average((trade) => trade.netPnl),
		averageRMultiple: average((trade) => trade.rMultiple),
		profitFactor: grossLosses > 0 ? round(grossProfits / grossLosses) : null,
		averageFavorableExcursionPercent: average(
			(trade) => trade.maximumFavorableExcursionPercent,
		),
		averageAdverseExcursionPercent: average(
			(trade) => trade.maximumAdverseExcursionPercent,
		),
	};
}

function marketBarsThrough(source: MarketBars, timestamp: number): MarketBars {
	const bars = source.bars.filter((bar) => bar.startedAt.getTime() <= timestamp);
	return {
		...source,
		from: bars[0]?.startedAt ?? source.from,
		to: bars.at(-1)?.startedAt ?? source.to,
		bars,
	};
}

function buyAndHoldReturn(bars: readonly NumericBar[]) {
	if (bars.length < 2 || bars[0].close <= 0) return null;
	return round(((bars.at(-1)!.close / bars[0].close) - 1) * 100);
}

function momentumReturn(bars: readonly NumericBar[], evaluationStartIndex: number) {
	if (bars.length < 202 || evaluationStartIndex >= bars.length - 1) return null;
	const closes = bars.map((bar) => bar.close);
	const sma200 = simpleMovingAverageSeries(closes, 200);
	let value = 1;
	for (
		let index = Math.max(200, evaluationStartIndex);
		index < closes.length - 1;
		index += 1
	) {
		const return20 = percentageReturn(closes.slice(0, index + 1), 20);
		if (sma200[index] !== null && closes[index] > sma200[index]! && (return20 ?? 0) > 0) {
			value *= closes[index + 1] / closes[index];
		}
	}
	return round((value - 1) * 100);
}

function calculateBaselines(
	allMarketBars: readonly NumericBar[],
	evaluationStartIndex: number,
	benchmarkBars: readonly NumericBar[] | undefined,
): BacktestBaselines {
	const evaluatedMarketBars = allMarketBars.slice(evaluationStartIndex);
	return {
		instrumentBuyAndHoldReturnPercent: buyAndHoldReturn(evaluatedMarketBars),
		benchmarkBuyAndHoldReturnPercent: benchmarkBars
			? buyAndHoldReturn(benchmarkBars)
			: null,
		simpleMomentumReturnPercent: momentumReturn(
			allMarketBars,
			evaluationStartIndex,
		),
		definition:
			"Long when close is above SMA200 and 20-day return is positive; otherwise cash.",
	};
}

/** Runs a single-instrument, non-overlapping, chronological walk-forward backtest. */
export function runDailySwingBacktest(
	input: DailySwingBacktestInput,
	dependencies: DailySwingBacktestDependencies = {},
): DailySwingBacktestReport {
	const configuration = resolveConfiguration(input.configuration);
	if (input.marketData.instrumentId !== input.instrument.instrumentId) {
		throw new Error("marketData.instrumentId must match the analysis instrument");
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

	const sourceBars = input.endAt
		? input.marketData.bars.filter((bar) => bar.startedAt <= input.endAt!)
		: input.marketData.bars;
	const numericBars = parseBars(sourceBars, "marketData");
	const benchmarkNumeric = input.benchmarkData
		? parseBars(
				input.endAt
					? input.benchmarkData.bars.filter((bar) => bar.startedAt <= input.endAt!)
					: input.benchmarkData.bars,
				"benchmarkData",
			)
		: undefined;
	const analyze = dependencies.analyze ?? analyzeDailySwing;
	const trades: BacktestTrade[] = [];
	const untriggeredSetups: DailySwingBacktestReport["untriggeredSetups"] = [];
	const equityCurve: DailySwingBacktestReport["equityCurve"] = [];
	const signalCounts: DailySwingBacktestReport["signalCounts"] = {
		analyses: 0,
		unavailable: 0,
		noTrade: 0,
		longSetups: 0,
		shortSetups: 0,
		triggered: 0,
		expiredUntriggered: 0,
		endOfDataUntriggered: 0,
	};
	let equity = configuration.initialEquity;
	let peakEquity = equity;
	let maximumDrawdownPercent = 0;
	let firstEvaluatedIndex: number | null = null;
	let lastEvaluatedIndex: number | null = null;
	let engineVersion: string = TECHNICAL_ANALYSIS_ENGINE_VERSION;
	let strategyVersion: string = DAILY_SWING_STRATEGY_VERSION;
	let index = MINIMUM_ANALYSIS_BARS - 1;

	while (index < sourceBars.length) {
		const currentBar = sourceBars[index];
		if (input.startAt && currentBar.startedAt < input.startAt) {
			index += 1;
			continue;
		}
		firstEvaluatedIndex ??= index;
		lastEvaluatedIndex = index;
		if (equityCurve.length === 0) {
			equityCurve.push({
				at: currentBar.startedAt.toISOString(),
				equity: round(equity),
				drawdownPercent: 0,
			});
		}
		const marketData = marketBarsThrough(input.marketData, currentBar.startedAt.getTime());
		const benchmarkData = input.benchmarkData
			? marketBarsThrough(input.benchmarkData, currentBar.startedAt.getTime())
			: undefined;
		const result = analyze({
			instrument: input.instrument,
			marketData,
			...(benchmarkData ? { benchmarkData } : {}),
			completedThrough: currentBar.startedAt,
			analyzedAt: new Date(currentBar.startedAt.getTime() + 1),
			allowShortSetups: configuration.allowShortSetups,
		});
		engineVersion = result.engineVersion;
		strategyVersion = result.strategyVersion;
		signalCounts.analyses += 1;
		if (result.status === "unavailable") {
			signalCounts.unavailable += 1;
			index += 1;
			continue;
		}
		if (!result.tradePlan) {
			signalCounts.noTrade += 1;
			index += 1;
			continue;
		}

		const plan = result.tradePlan;
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
			futureBars: sourceBars.slice(index + 1),
			equity,
			configuration,
		});
		if (simulation.status === "completed") {
			signalCounts.triggered += 1;
			trades.push(simulation.trade);
			const startingEquity = equity;
			for (const mark of simulation.trade.markToMarket) {
				const markedEquity = startingEquity + mark.netPnl;
				peakEquity = Math.max(peakEquity, markedEquity);
				const drawdownPercent =
					peakEquity > 0
						? ((peakEquity - markedEquity) / peakEquity) * 100
						: 0;
				maximumDrawdownPercent = Math.max(
					maximumDrawdownPercent,
					drawdownPercent,
				);
				equityCurve.push({
					at: mark.at,
					equity: round(markedEquity),
					drawdownPercent: round(drawdownPercent),
				});
			}
			equity = startingEquity + simulation.trade.netPnl;
		} else {
			untriggeredSetups.push(simulation.setup);
			signalCounts[
				simulation.setup.reason === "expired"
					? "expiredUntriggered"
					: "endOfDataUntriggered"
			] += 1;
		}
		index += simulation.barsConsumed + 1;
	}

	const overallMetrics = groupMetrics(trades);
	const performance: BacktestPerformance = {
		...overallMetrics,
		initialEquity: configuration.initialEquity,
		endingEquity: round(equity),
		totalReturnPercent: round(
			((equity / configuration.initialEquity) - 1) * 100,
		),
		maximumDrawdownPercent: round(maximumDrawdownPercent),
	};
	const trendStates: AnalysisState[] = ["bullish", "mixed", "bearish"];
	const volatilityStates: VolatilityState[] = ["low", "normal", "high"];
	const byRegime: RegimePerformance[] = [];
	for (const trend of trendStates) {
		for (const volatility of volatilityStates) {
			const matching = trades.filter(
				(trade) =>
					trade.trendRegime === trend && trade.volatilityRegime === volatility,
			);
			if (matching.length > 0) {
				byRegime.push({ trend, volatility, metrics: groupMetrics(matching) });
			}
		}
	}
	const baselineStart = firstEvaluatedIndex ?? 0;
	const baselineMarketBars = numericBars.slice(baselineStart);
	const firstBaselineAt = baselineMarketBars[0]?.startedAt.getTime();
	const lastBaselineAt = baselineMarketBars.at(-1)?.startedAt.getTime();
	const alignedBenchmark =
		benchmarkNumeric && firstBaselineAt !== undefined && lastBaselineAt !== undefined
			? benchmarkNumeric.filter((bar) => {
					const timestamp = bar.startedAt.getTime();
					return timestamp >= firstBaselineAt && timestamp <= lastBaselineAt;
				})
			: undefined;

	return {
		backtestVersion: DAILY_SWING_BACKTEST_VERSION,
		engineVersion,
		strategyVersion,
		instrument: input.instrument,
		configuration,
		window: {
			requestedStartAt: input.startAt?.toISOString() ?? null,
			requestedEndAt: input.endAt?.toISOString() ?? null,
			firstEvaluatedAt:
				firstEvaluatedIndex === null
					? null
					: sourceBars[firstEvaluatedIndex].startedAt.toISOString(),
			lastEvaluatedAt:
				lastEvaluatedIndex === null
					? null
					: sourceBars[lastEvaluatedIndex].startedAt.toISOString(),
			barsAvailable: sourceBars.length,
		},
		signalCounts,
		performance,
		byDirection: {
			long: groupMetrics(trades.filter((trade) => trade.direction === "long")),
			short: groupMetrics(trades.filter((trade) => trade.direction === "short")),
		},
		byRegime,
		baselines: calculateBaselines(numericBars, baselineStart, alignedBenchmark),
		equityCurve,
		trades,
		untriggeredSetups,
		warnings: [
			"Signals use only completed bars through the signal timestamp; fills begin on the next bar.",
			"Only one pending setup or open trade is simulated at a time for this instrument.",
			`Bars touching stop and target prices use the ${configuration.sameBarPolicy} policy.`,
			"Maximum drawdown marks open positions to each completed bar's close; it does not measure intraday drawdown within a daily candle.",
			"Buy-and-hold and momentum baselines exclude trading costs and slippage.",
			...(input.marketData.provider.toLowerCase() === "massive"
				? [
						"Massive adjusted bars account for splits but not dividends; return baselines are price returns and exclude distributions.",
					]
				: []),
			...(input.marketData.provider.toLowerCase() === "alpaca"
				? [
						"Alpaca bars were requested with adjustment=all; returns incorporate Alpaca's split, cash-dividend, merger, and spin-off adjustments.",
					]
				: []),
			...(sourceBars.length < 750
				? [
						`Only ${sourceBars.length} bars were available, leaving limited data after the ${MINIMUM_ANALYSIS_BARS}-bar warm-up. Treat this run as a smoke test, not strategy validation.`,
					]
				: []),
		],
	};
}
