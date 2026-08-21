import { createHash } from "node:crypto";
import { RISK_CONTROLLED_MOMENTUM_V3_PROTOCOL } from "@/lib/analysis/risk-controlled-momentum-v3-development";
import {
	RISK_CONTROLLED_MOMENTUM_V2_SLEEVES,
	RISK_CONTROLLED_MOMENTUM_V2_SYMBOLS,
} from "@/lib/analysis/risk-controlled-momentum-v2-universe";

const PROTOCOL = RISK_CONTROLLED_MOMENTUM_V3_PROTOCOL;
const DAY_MS = 86_400_000;
const BASE_SLEEVE_WEIGHT = PROTOCOL.portfolio.baseSleeveWeight;

export type RiskControlledMomentumSleeveId =
	(typeof RISK_CONTROLLED_MOMENTUM_V2_SLEEVES)[number]["sleeveId"];
export type RiskControlledMomentumBar = {
	startedAt: string;
	open: number;
	close: number;
	volume: number | null;
};
export type RiskControlledMomentumInstrumentHistory = {
	instrumentId: string;
	displaySymbol: string;
	sleeveId: RiskControlledMomentumSleeveId;
	bars: RiskControlledMomentumBar[];
};
export type RiskControlledMomentumBenchmarkHistory = {
	displaySymbol: "SPY";
	bars: RiskControlledMomentumBar[];
};

type PreparedBar = RiskControlledMomentumBar & { at: number };
type PreparedInstrument = Omit<RiskControlledMomentumInstrumentHistory, "bars"> & {
	bars: PreparedBar[];
	byTimestamp: Map<number, number>;
};
type Costs = { transactionCostBpsPerSide: number; slippageBpsPerFill: number };
type SelectionDecision = {
	signalAt: number;
	executionAt: number;
	selectedIds: Map<RiskControlledMomentumSleeveId, string>;
	availableCandidates: Map<RiskControlledMomentumSleeveId, number>;
};
type EquityPoint = { at: number; equity: number };

function round(value: number, precision = 8) {
	const multiplier = 10 ** precision;
	return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
}

function timestamp(value: string, label: string) {
	const parsed = Date.parse(value);
	if (!Number.isFinite(parsed)) throw new Error(`${label} must be a timestamp`);
	return parsed;
}

function prepareBars(bars: readonly RiskControlledMomentumBar[], label: string) {
	let previous = Number.NEGATIVE_INFINITY;
	return bars.map((bar, index) => {
		const at = timestamp(bar.startedAt, `${label}.bars[${index}].startedAt`);
		if (at <= previous) throw new Error(`${label} bars must be unique and chronological`);
		previous = at;
		if (
			!Number.isFinite(bar.open) ||
			bar.open <= 0 ||
			!Number.isFinite(bar.close) ||
			bar.close <= 0 ||
			(bar.volume !== null && (!Number.isFinite(bar.volume) || bar.volume < 0))
		) {
			throw new Error(`${label}.bars[${index}] contains invalid OHLCV values`);
		}
		return { ...bar, at };
	});
}

function prepareInstrument(value: RiskControlledMomentumInstrumentHistory): PreparedInstrument {
	const bars = prepareBars(value.bars, value.displaySymbol);
	return {
		...value,
		bars,
		byTimestamp: new Map(bars.map((bar, index) => [bar.at, index])),
	};
}

function median(values: readonly number[]) {
	if (values.length === 0) throw new Error("Cannot take median of an empty collection");
	const sorted = [...values].sort((left, right) => left - right);
	const middle = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 0
		? (sorted[middle - 1] + sorted[middle]) / 2
		: sorted[middle];
}

function monthKey(at: number) {
	return new Date(at).toISOString().slice(0, 7);
}

function formationBars(benchmark: readonly PreparedBar[]) {
	const lastByMonth = new Map<string, PreparedBar>();
	for (const bar of benchmark) lastByMonth.set(monthKey(bar.at), bar);
	return [...lastByMonth.entries()]
		.filter(
			([month]) =>
				month >= PROTOCOL.dataAccess.firstFormationMonth &&
				month <= PROTOCOL.dataAccess.lastFormationMonth,
		)
		.sort(([left], [right]) => left.localeCompare(right))
		.map(([, bar]) => bar);
}

function candidateAt(input: {
	instrument: PreparedInstrument;
	signalAt: number;
	targetNotional: number;
}) {
	const index = input.instrument.byTimestamp.get(input.signalAt);
	if (index === undefined || index < PROTOCOL.signal.formation.lookbackSessions) {
		return { available: false, eligible: false } as const;
	}
	const formationReturn =
		input.instrument.bars[index - PROTOCOL.signal.formation.skipRecentSessions].close /
			input.instrument.bars[index - PROTOCOL.signal.formation.lookbackSessions].close -
		1;
	const liquidity = PROTOCOL.signal.liquidity;
	const dollarVolumes = input.instrument.bars
		.slice(index - liquidity.windowSessions + 1, index + 1)
		.flatMap((bar) =>
			bar.volume !== null && bar.volume > 0 ? [bar.close * bar.volume] : [],
		);
	if (dollarVolumes.length < liquidity.minimumObservedSessions) {
		return { available: false, eligible: false } as const;
	}
	const medianDollarVolume = median(dollarVolumes);
	const liquid =
		medianDollarVolume >= liquidity.minimumMedianDollarVolume &&
		input.targetNotional / medianDollarVolume <=
			liquidity.maximumTargetPositionFractionOfMedianDollarVolume;
	return {
		available: liquid,
		eligible: liquid && formationReturn > 0,
		formationReturn,
	} as const;
}

function selectAt(input: {
	instruments: readonly PreparedInstrument[];
	signalAt: number;
	executionAt: number;
	equity: number;
}) {
	const selectedIds = new Map<RiskControlledMomentumSleeveId, string>();
	const availableCandidates = new Map<RiskControlledMomentumSleeveId, number>();
	for (const sleeve of RISK_CONTROLLED_MOMENTUM_V2_SLEEVES) {
		const candidates = input.instruments
			.filter((instrument) => instrument.sleeveId === sleeve.sleeveId)
			.flatMap((instrument) => {
				const result = candidateAt({
					instrument,
					signalAt: input.signalAt,
					targetNotional: input.equity * BASE_SLEEVE_WEIGHT,
				});
				return result.available ? [{ instrument, result }] : [];
			});
		availableCandidates.set(sleeve.sleeveId, candidates.length);
		const selected = candidates
			.filter((candidate) => candidate.result.eligible)
			.sort(
				(left, right) =>
					right.result.formationReturn - left.result.formationReturn ||
					left.instrument.displaySymbol.localeCompare(right.instrument.displaySymbol),
			)[0];
		if (selected) selectedIds.set(sleeve.sleeveId, selected.instrument.instrumentId);
	}
	return {
		signalAt: input.signalAt,
		executionAt: input.executionAt,
		selectedIds,
		availableCandidates,
	};
}

export function riskControlledMomentumCandidateAt(input: {
	instrument: RiskControlledMomentumInstrumentHistory;
	signalAt: string;
	targetNotional: number;
}) {
	return candidateAt({
		instrument: prepareInstrument(input.instrument),
		signalAt: timestamp(input.signalAt, "signalAt"),
		targetNotional: input.targetNotional,
	});
}

export function riskControlledMomentumFormationSchedule(
	benchmark: RiskControlledMomentumBenchmarkHistory,
) {
	return formationBars(prepareBars(benchmark.bars, "SPY")).map((bar) =>
		new Date(bar.at).toISOString(),
	);
}

export function selectRiskControlledMomentumSleevesAt(input: {
	instruments: readonly RiskControlledMomentumInstrumentHistory[];
	signalAt: string;
	executionAt: string;
	equity: number;
}) {
	if (!Number.isFinite(input.equity) || input.equity <= 0) {
		throw new Error("equity must be positive");
	}
	const decision = selectAt({
		instruments: input.instruments.map(prepareInstrument),
		signalAt: timestamp(input.signalAt, "signalAt"),
		executionAt: timestamp(input.executionAt, "executionAt"),
		equity: input.equity,
	});
	return {
		signalAt: new Date(decision.signalAt).toISOString(),
		executionAt: new Date(decision.executionAt).toISOString(),
		selectedInstrumentIds: Object.fromEntries(decision.selectedIds),
		availableCandidates: Object.fromEntries(decision.availableCandidates),
	};
}

export function riskControlledMomentumMultiplier(
	returnsByInstrument: readonly (readonly number[])[],
) {
	if (returnsByInstrument.length === 0) return 0;
	const observations = returnsByInstrument[0]?.length ?? 0;
	if (
		observations < PROTOCOL.riskControl.minimumCommonReturns ||
		returnsByInstrument.some(
			(values) =>
				values.length !== observations ||
				values.some((value) => !Number.isFinite(value)),
		)
	) {
		return 0;
	}
	const means = returnsByInstrument.map(
		(values) => values.reduce((sum, value) => sum + value, 0) / observations,
	);
	let portfolioVariance = 0;
	for (let left = 0; left < returnsByInstrument.length; left += 1) {
		for (let right = 0; right < returnsByInstrument.length; right += 1) {
			let covariance = 0;
			for (let index = 0; index < observations; index += 1) {
				covariance +=
					(returnsByInstrument[left][index] - means[left]) *
					(returnsByInstrument[right][index] - means[right]);
			}
			covariance /= observations - 1;
			portfolioVariance += BASE_SLEEVE_WEIGHT ** 2 * covariance;
		}
	}
	const annualizedVolatility = Math.sqrt(
		PROTOCOL.riskControl.annualizationSessions * Math.max(0, portfolioVariance),
	);
	if (!Number.isFinite(annualizedVolatility) || annualizedVolatility <= 0) return 0;
	return Math.min(
		PROTOCOL.riskControl.maximumMultiplier,
		PROTOCOL.riskControl.targetAnnualizedVolatility / annualizedVolatility,
	);
}

function multiplierAt(input: {
	selectedIds: ReadonlyMap<RiskControlledMomentumSleeveId, string>;
	benchmark: readonly PreparedBar[];
	benchmarkIndex: number;
	byId: ReadonlyMap<string, PreparedInstrument>;
}) {
	const first = input.benchmarkIndex - PROTOCOL.riskControl.windowCommonSessions + 1;
	if (first < 0 || input.selectedIds.size === 0) return 0;
	const commonAts = input.benchmark
		.slice(first, input.benchmarkIndex + 1)
		.map((bar) => bar.at);
	const returnsByInstrument: number[][] = [];
	for (const id of input.selectedIds.values()) {
		const instrument = input.byId.get(id)!;
		const closes: number[] = [];
		for (const at of commonAts) {
			const index = instrument.byTimestamp.get(at);
			if (index === undefined) return 0;
			closes.push(instrument.bars[index].close);
		}
		returnsByInstrument.push(
			closes.slice(1).map((close, index) => close / closes[index] - 1),
		);
	}
	return riskControlledMomentumMultiplier(returnsByInstrument);
}

function valueAt(
	positions: ReadonlyMap<string, number>,
	cash: number,
	at: number,
	field: "open" | "close",
	byId: ReadonlyMap<string, PreparedInstrument>,
) {
	let equity = cash;
	for (const [instrumentId, units] of positions) {
		const instrument = byId.get(instrumentId)!;
		const index = instrument.byTimestamp.get(at);
		if (index === undefined) {
			throw new Error(`${instrument.displaySymbol} lacks a held-position valuation bar`);
		}
		equity += units * instrument.bars[index][field];
	}
	return equity;
}

function executeTargets(input: {
	targetWeights: ReadonlyMap<string, number>;
	at: number;
	positions: Map<string, number>;
	cash: number;
	byId: ReadonlyMap<string, PreparedInstrument>;
	costs: Costs;
	priceField?: "open" | "close";
}) {
	const priceField = input.priceField ?? "open";
	const preEquity = valueAt(input.positions, input.cash, input.at, priceField, input.byId);
	const ids = new Set([...input.positions.keys(), ...input.targetWeights.keys()]);
	const currentCashWeight = input.cash / preEquity;
	let weightChange = Math.abs(
		1 - [...input.targetWeights.values()].reduce((sum, weight) => sum + weight, 0) -
			currentCashWeight,
	);
	const desiredUnits = new Map<string, number>();
	for (const id of ids) {
		const instrument = input.byId.get(id);
		if (!instrument) throw new Error(`Unknown target instrument ${id}`);
		const index = instrument.byTimestamp.get(input.at);
		if (index === undefined) throw new Error(`${instrument.displaySymbol} lacks an execution bar`);
		const currentWeight =
			((input.positions.get(id) ?? 0) * instrument.bars[index][priceField]) /
			preEquity;
		const targetWeight = input.targetWeights.get(id) ?? 0;
		weightChange += Math.abs(targetWeight - currentWeight);
		desiredUnits.set(
			id,
			(preEquity * targetWeight) / instrument.bars[index][priceField],
		);
	}
	const costRate = input.costs.transactionCostBpsPerSide / 10_000;
	const slippageRate = input.costs.slippageBpsPerFill / 10_000;
	let cash = input.cash;
	const apply = (id: string, unitDelta: number) => {
		if (Math.abs(unitDelta) < 1e-12) return;
		const instrument = input.byId.get(id)!;
		const referencePrice =
			instrument.bars[instrument.byTimestamp.get(input.at)!][priceField];
		const fillPrice =
			referencePrice * (unitDelta > 0 ? 1 + slippageRate : 1 - slippageRate);
		const fillNotional = Math.abs(unitDelta) * fillPrice;
		cash += unitDelta > 0
			? -fillNotional * (1 + costRate)
			: fillNotional * (1 - costRate);
		const next = (input.positions.get(id) ?? 0) + unitDelta;
		if (Math.abs(next) < 1e-10) input.positions.delete(id);
		else input.positions.set(id, next);
	};
	for (const id of ids) {
		const delta = desiredUnits.get(id)! - (input.positions.get(id) ?? 0);
		if (delta < 0) apply(id, delta);
	}
	for (const id of ids) {
		const delta = desiredUnits.get(id)! - (input.positions.get(id) ?? 0);
		if (delta > 0) apply(id, delta);
	}
	if (cash < -1e-6) throw new Error("Execution costs exhausted the operational cash reserve");
	return { cash: Math.max(0, cash), turnover: weightChange / 2 };
}

function addTurnover(turnoverByDay: Map<number, number>, at: number, value: number) {
	turnoverByDay.set(at, (turnoverByDay.get(at) ?? 0) + value);
}

function metricSummary(input: {
	curve: readonly EquityPoint[];
	turnoverByDay?: ReadonlyMap<number, number>;
}) {
	const { curve } = input;
	if (curve.length === 0) throw new Error("Equity curve is empty");
	const initialEquity: number = PROTOCOL.portfolio.initialEquity;
	let peak: number = initialEquity;
	let maximumDrawdown = 0;
	for (const point of curve) {
		peak = Math.max(peak, point.equity);
		maximumDrawdown = Math.max(
			maximumDrawdown,
			((peak - point.equity) / peak) * 100,
		);
	}
	const endingEquity = curve.at(-1)!.equity;
	const elapsedYears =
		(curve.at(-1)!.at - timestamp(PROTOCOL.dataAccess.portfolioStartsAt, "start")) /
		(DAY_MS * 365.25);
	const lastByMonth = new Map<string, EquityPoint>();
	for (const point of curve) lastByMonth.set(monthKey(point.at), point);
	let previous: number = initialEquity;
	const monthlyReturns = [...lastByMonth.values()].map((point) => {
		const value = point.equity / previous - 1;
		previous = point.equity;
		return value;
	});
	const mean =
		monthlyReturns.reduce((sum, value) => sum + value, 0) / monthlyReturns.length;
	const variance =
		monthlyReturns.length < 2
			? 0
			: monthlyReturns.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
				(monthlyReturns.length - 1);
	const monthlySharpe =
		variance === 0 ? null : (Math.sqrt(12) * mean) / Math.sqrt(variance);
	const calendarYears = Array.from({ length: 7 }, (_, index) => 2009 + index).map(
		(year) => {
			const points = curve.filter(
				(point) => new Date(point.at).getUTCFullYear() === year,
			);
			if (points.length === 0) throw new Error(`Portfolio curve lacks calendar year ${year}`);
			const prior = curve
				.filter((point) => new Date(point.at).getUTCFullYear() < year)
				.at(-1)?.equity;
			const startEquity = prior ?? initialEquity;
			return {
				year,
				returnPercent: round((points.at(-1)!.equity / startEquity - 1) * 100),
			};
		},
	);
	const dailyTurnovers = curve.map((point) => input.turnoverByDay?.get(point.at) ?? 0);
	return {
		initialEquity,
		endingEquity: round(endingEquity),
		totalReturnPercent: round((endingEquity / initialEquity - 1) * 100),
		annualizedReturnPercent: round(
			((endingEquity / initialEquity) ** (1 / elapsedYears) - 1) * 100,
		),
		monthlySharpe: monthlySharpe === null ? null : round(monthlySharpe),
		maximumDrawdownPercent: round(maximumDrawdown),
		monthlyHoldingPeriods: monthlyReturns.length,
		calendarYears,
		annualizedOneWayTurnoverPercent: round(
			(dailyTurnovers.reduce((sum, value) => sum + value, 0) /
				dailyTurnovers.length) *
				252 *
				100,
		),
	};
}

function targetWeights(
	selectedIds: ReadonlyMap<RiskControlledMomentumSleeveId, string>,
	multiplier: number,
) {
	return new Map(
		[...selectedIds.values()].map((id) => [id, BASE_SLEEVE_WEIGHT * multiplier]),
	);
}

function simulateRiskControlled(input: {
	instruments: readonly PreparedInstrument[];
	benchmark: readonly PreparedBar[];
	costs: Costs;
	frozenSelections?: readonly SelectionDecision[];
}) {
	const byId = new Map(input.instruments.map((instrument) => [instrument.instrumentId, instrument]));
	const signals = formationBars(input.benchmark);
	if (signals.length !== PROTOCOL.dataAccess.expectedMonthlyHoldingPeriods) {
		throw new Error("Benchmark does not provide the frozen 84 formation months");
	}
	const signalSet = new Set(signals.map((bar) => bar.at));
	let cash: number = PROTOCOL.portfolio.initialEquity;
	const positions = new Map<string, number>();
	const curve: EquityPoint[] = [];
	const decisions: SelectionDecision[] = [];
	const turnoverByDay = new Map<number, number>();
	const multipliers: number[] = [];
	let selectedIds = new Map<RiskControlledMomentumSleeveId, string>();
	let hasSelectionDecision = false;
	let pending: { executionAt: number; weights: Map<string, number> } | null = null;
	const start = timestamp(PROTOCOL.dataAccess.portfolioStartsAt, "portfolioStartsAt");
	const end = timestamp(PROTOCOL.dataAccess.portfolioEndsBefore, "portfolioEndsBefore");
	for (const [index, bar] of input.benchmark.entries()) {
		if (bar.at >= end) break;
		if (pending && pending.executionAt === bar.at) {
			const execution = executeTargets({
				targetWeights: pending.weights,
				at: bar.at,
				positions,
				cash,
				byId,
				costs: input.costs,
			});
			cash = execution.cash;
			if (bar.at >= start) addTurnover(turnoverByDay, bar.at, execution.turnover);
			pending = null;
		}
		const equity = valueAt(positions, cash, bar.at, "close", byId);
		if (bar.at >= start) curve.push({ at: bar.at, equity });
		if (signalSet.has(bar.at)) {
			const next = input.benchmark[index + 1];
			if (!next || next.at >= end) {
				throw new Error("Formation signal has no development-only execution session");
			}
			const frozen = input.frozenSelections?.find(
				(decision) => decision.signalAt === bar.at,
			);
			const decision =
				frozen ??
				selectAt({
					instruments: input.instruments,
					signalAt: bar.at,
					executionAt: next.at,
					equity,
				});
			selectedIds = new Map(decision.selectedIds);
			hasSelectionDecision = true;
			decisions.push(decision);
		}
		const next = input.benchmark[index + 1];
		if (next && next.at < end && hasSelectionDecision) {
			const multiplier = multiplierAt({
				selectedIds,
				benchmark: input.benchmark,
				benchmarkIndex: index,
				byId,
			});
			if (bar.at >= start || signalSet.has(bar.at)) multipliers.push(multiplier);
			pending = { executionAt: next.at, weights: targetWeights(selectedIds, multiplier) };
		}
	}
	if (pending) throw new Error("A risk target remained unexecuted");
	const finalPoint = curve.at(-1);
	if (!finalPoint) throw new Error("No development portfolio curve was produced");
	const liquidation = executeTargets({
		targetWeights: new Map(),
		at: finalPoint.at,
		positions,
		cash,
		byId,
		costs: input.costs,
		priceField: "close",
	});
	cash = liquidation.cash;
	addTurnover(turnoverByDay, finalPoint.at, liquidation.turnover);
	curve[curve.length - 1] = { at: finalPoint.at, equity: cash };
	const candidateCounts = decisions.flatMap((decision) => [
		...decision.availableCandidates.values(),
	]);
	const selectionBySleeve = RISK_CONTROLLED_MOMENTUM_V2_SLEEVES.map((sleeve) => ({
		sleeveId: sleeve.sleeveId,
		selectedMonths: decisions.filter((decision) =>
			decision.selectedIds.has(sleeve.sleeveId),
		).length,
		cashMonths: decisions.filter(
			(decision) => !decision.selectedIds.has(sleeve.sleeveId),
		).length,
	}));
	return {
		summary: {
			...metricSummary({ curve, turnoverByDay }),
			monthsWithAnyInvestment: decisions.filter(
				(decision) => decision.selectedIds.size > 0,
			).length,
			minimumCandidatesInAnySleeveDecision: Math.min(...candidateCounts),
		},
		selectionBySleeve,
		riskMultiplierSummary: {
			observations: multipliers.length,
			minimum: round(Math.min(...multipliers)),
			maximum: round(Math.max(...multipliers)),
			mean: round(
				multipliers.reduce((sum, value) => sum + value, 0) / multipliers.length,
			),
			zeroObservations: multipliers.filter((value) => value === 0).length,
		},
		decisions,
	};
}

function simulateUnscaled(input: {
	instruments: readonly PreparedInstrument[];
	benchmark: readonly PreparedBar[];
	costs: Costs;
}) {
	const byId = new Map(input.instruments.map((instrument) => [instrument.instrumentId, instrument]));
	const signals = formationBars(input.benchmark);
	const signalSet = new Set(signals.map((bar) => bar.at));
	let cash: number = PROTOCOL.portfolio.initialEquity;
	const positions = new Map<string, number>();
	const curve: EquityPoint[] = [];
	const turnoverByDay = new Map<number, number>();
	let pending: SelectionDecision | null = null;
	const start = timestamp(PROTOCOL.dataAccess.portfolioStartsAt, "start");
	const end = timestamp(PROTOCOL.dataAccess.portfolioEndsBefore, "end");
	for (const [index, bar] of input.benchmark.entries()) {
		if (bar.at >= end) break;
		if (pending && pending.executionAt === bar.at) {
			const execution = executeTargets({
				targetWeights: targetWeights(pending.selectedIds, 1),
				at: bar.at,
				positions,
				cash,
				byId,
				costs: input.costs,
			});
			cash = execution.cash;
			addTurnover(turnoverByDay, bar.at, execution.turnover);
			pending = null;
		}
		const equity = valueAt(positions, cash, bar.at, "close", byId);
		if (bar.at >= start) curve.push({ at: bar.at, equity });
		if (signalSet.has(bar.at)) {
			const next = input.benchmark[index + 1];
			if (!next || next.at >= end) throw new Error("Unscaled signal lacks execution session");
			pending = selectAt({
				instruments: input.instruments,
				signalAt: bar.at,
				executionAt: next.at,
				equity,
			});
		}
	}
	if (pending) throw new Error("An unscaled decision remained unexecuted");
	const final = curve.at(-1)!;
	const liquidation = executeTargets({
		targetWeights: new Map(),
		at: final.at,
		positions,
		cash,
		byId,
		costs: input.costs,
		priceField: "close",
	});
	addTurnover(turnoverByDay, final.at, liquidation.turnover);
	curve[curve.length - 1] = { at: final.at, equity: liquidation.cash };
	return metricSummary({ curve, turnoverByDay });
}

function simulateBuyAndHold(input: {
	targetWeights: ReadonlyMap<string, number>;
	byId: ReadonlyMap<string, PreparedInstrument>;
	benchmark: readonly PreparedBar[];
	costs: Costs;
}) {
	const firstSignal = formationBars(input.benchmark)[0];
	const signalIndex = input.benchmark.findIndex((bar) => bar.at === firstSignal.at);
	const executionAt = input.benchmark[signalIndex + 1].at;
	let cash: number = PROTOCOL.portfolio.initialEquity;
	const positions = new Map<string, number>();
	const curve: EquityPoint[] = [];
	const turnoverByDay = new Map<number, number>();
	const start = timestamp(PROTOCOL.dataAccess.portfolioStartsAt, "start");
	const end = timestamp(PROTOCOL.dataAccess.portfolioEndsBefore, "end");
	for (const bar of input.benchmark) {
		if (bar.at >= end) break;
		if (bar.at === executionAt) {
			const execution = executeTargets({
				targetWeights: input.targetWeights,
				at: bar.at,
				positions,
				cash,
				byId: input.byId,
				costs: input.costs,
			});
			cash = execution.cash;
			addTurnover(turnoverByDay, bar.at, execution.turnover);
		}
		if (bar.at >= start) {
			curve.push({
				at: bar.at,
				equity: valueAt(positions, cash, bar.at, "close", input.byId),
			});
		}
	}
	const final = curve.at(-1)!;
	const liquidation = executeTargets({
		targetWeights: new Map(),
		at: final.at,
		positions,
		cash,
		byId: input.byId,
		costs: input.costs,
		priceField: "close",
	});
	addTurnover(turnoverByDay, final.at, liquidation.turnover);
	curve[curve.length - 1] = { at: final.at, equity: liquidation.cash };
	return metricSummary({ curve, turnoverByDay });
}

function simulateStatic(input: {
	instruments: readonly PreparedInstrument[];
	benchmark: readonly PreparedBar[];
	costs: Costs;
}) {
	const targets = new Map<string, number>();
	for (const sleeve of RISK_CONTROLLED_MOMENTUM_V2_SLEEVES) {
		const members = input.instruments.filter(
			(instrument) => instrument.sleeveId === sleeve.sleeveId,
		);
		for (const member of members) {
			targets.set(member.instrumentId, BASE_SLEEVE_WEIGHT / members.length);
		}
	}
	return simulateBuyAndHold({
		targetWeights: targets,
		byId: new Map(input.instruments.map((instrument) => [instrument.instrumentId, instrument])),
		benchmark: input.benchmark,
		costs: input.costs,
	});
}

function simulateSpy(input: { benchmark: readonly PreparedBar[]; costs: Costs }) {
	const instrument: PreparedInstrument = {
		instrumentId: "benchmark:spy",
		displaySymbol: "SPY",
		sleeveId: "us_broad_style_factor",
		bars: [...input.benchmark],
		byTimestamp: new Map(input.benchmark.map((bar, index) => [bar.at, index])),
	};
	return simulateBuyAndHold({
		targetWeights: new Map([
			[instrument.instrumentId, PROTOCOL.portfolio.maximumUnscaledGrossExposure],
		]),
		byId: new Map([[instrument.instrumentId, instrument]]),
		benchmark: input.benchmark,
		costs: input.costs,
	});
}

function evaluateGates(input: {
	base: ReturnType<typeof simulateRiskControlled>["summary"];
	stress: ReturnType<typeof simulateRiskControlled>["summary"];
	unscaled: ReturnType<typeof metricSummary>;
	staticSleeves: ReturnType<typeof metricSummary>;
	coverageEligibleInstruments: number;
	minimumCoverageEligiblePerSleeve: number;
	selectionBySleeve: ReturnType<typeof simulateRiskControlled>["selectionBySleeve"];
}) {
	const calendarReturns = input.base.calendarYears.map((year) => year.returnPercent);
	const actuals = {
		monthly_holding_periods: input.base.monthlyHoldingPeriods,
		coverage_eligible_instruments: input.coverageEligibleInstruments,
		minimum_coverage_eligible_per_sleeve: input.minimumCoverageEligiblePerSleeve,
		minimum_candidates_in_any_sleeve_decision:
			input.base.minimumCandidatesInAnySleeveDecision,
		months_with_any_investment: input.base.monthsWithAnyInvestment,
		base_net_annualized_return_percent: input.base.annualizedReturnPercent,
		stress_net_annualized_return_percent: input.stress.annualizedReturnPercent,
		base_monthly_sharpe: input.base.monthlySharpe,
		base_maximum_drawdown_percent: input.base.maximumDrawdownPercent,
		stress_maximum_drawdown_percent: input.stress.maximumDrawdownPercent,
		drawdown_improvement_over_unscaled_percent_points: round(
			input.unscaled.maximumDrawdownPercent - input.base.maximumDrawdownPercent,
		),
		monthly_sharpe_improvement_over_unscaled:
			input.base.monthlySharpe === null || input.unscaled.monthlySharpe === null
				? null
				: round(input.base.monthlySharpe - input.unscaled.monthlySharpe),
		annualized_return_difference_vs_unscaled_percent: round(
			input.base.annualizedReturnPercent - input.unscaled.annualizedReturnPercent,
		),
		annualized_return_improvement_over_static_percent: round(
			input.base.annualizedReturnPercent - input.staticSleeves.annualizedReturnPercent,
		),
		positive_calendar_years: calendarReturns.filter((value) => value > 0).length,
		minimum_calendar_year_return_percent: Math.min(...calendarReturns),
		minimum_selected_months_per_sleeve: Math.min(
			...input.selectionBySleeve.map((value) => value.selectedMonths),
		),
		annualized_one_way_turnover_percent:
			input.base.annualizedOneWayTurnoverPercent,
		stress_annualized_return_difference_vs_base_percent: round(
			input.stress.annualizedReturnPercent - input.base.annualizedReturnPercent,
		),
	};
	const gates = PROTOCOL.developmentGates.map((gate) => {
		const actual = actuals[gate.metric];
		const passed =
			actual !== null &&
			(gate.operator === "="
				? actual === gate.threshold
				: gate.operator === "<="
					? actual <= gate.threshold
					: actual >= gate.threshold);
		return { ...gate, actual, passed };
	});
	return { actuals, gates, passed: gates.every((gate) => gate.passed) };
}

export function runRiskControlledMomentumV3Development(input: {
	instruments: readonly RiskControlledMomentumInstrumentHistory[];
	benchmark: RiskControlledMomentumBenchmarkHistory;
	historySha256: string;
	generatedAt?: Date;
}) {
	if (input.historySha256.trim().toLowerCase() !== PROTOCOL.sources.history.sha256) {
		throw new Error("Tiingo history checksum does not match the registered source");
	}
	if (input.benchmark.displaySymbol !== "SPY") {
		throw new Error("Registered benchmark must be SPY");
	}
	const generatedAt = input.generatedAt ?? new Date();
	if (Number.isNaN(generatedAt.getTime())) throw new Error("generatedAt must be valid");
	const expectedMembership = new Map(
		RISK_CONTROLLED_MOMENTUM_V2_SLEEVES.flatMap((sleeve) =>
			sleeve.candidates.map((candidate) => [candidate.symbol, sleeve.sleeveId] as const),
		),
	);
	if (
		input.instruments.length !== RISK_CONTROLLED_MOMENTUM_V2_SYMBOLS.length ||
		new Set(input.instruments.map((instrument) => instrument.displaySymbol)).size !==
			RISK_CONTROLLED_MOMENTUM_V2_SYMBOLS.length
	) {
		throw new Error("Input does not contain the exact 48-symbol manifest");
	}
	for (const instrument of input.instruments) {
		if (expectedMembership.get(instrument.displaySymbol) !== instrument.sleeveId) {
			throw new Error(`${instrument.displaySymbol} does not match the frozen sleeve manifest`);
		}
	}
	const preparedAll = input.instruments.map(prepareInstrument);
	if (new Set(preparedAll.map((instrument) => instrument.instrumentId)).size !== preparedAll.length) {
		throw new Error("Input instrument IDs must be unique");
	}
	const latestFirstBar = timestamp(
		PROTOCOL.coverage.latestAllowedFirstBarAt,
		"latestAllowedFirstBarAt",
	);
	const eligible = preparedAll.filter(
		(instrument) =>
			instrument.bars.length >= PROTOCOL.coverage.minimumBarsPerInstrument &&
			instrument.bars[0]!.at <= latestFirstBar,
	);
	const coverageBySleeve = RISK_CONTROLLED_MOMENTUM_V2_SLEEVES.map((sleeve) => ({
		sleeveId: sleeve.sleeveId,
		manifestCandidates: sleeve.candidates.length,
		eligibleInstruments: eligible.filter(
			(instrument) => instrument.sleeveId === sleeve.sleeveId,
		).length,
	}));
	const benchmark = prepareBars(input.benchmark.bars, "SPY");
	const base = simulateRiskControlled({
		instruments: eligible,
		benchmark,
		costs: PROTOCOL.costs.base,
	});
	const stress = simulateRiskControlled({
		instruments: eligible,
		benchmark,
		costs: PROTOCOL.costs.stress,
		frozenSelections: base.decisions,
	});
	const unscaled = simulateUnscaled({
		instruments: eligible,
		benchmark,
		costs: PROTOCOL.costs.base,
	});
	const staticSleeves = simulateStatic({
		instruments: eligible,
		benchmark,
		costs: PROTOCOL.costs.base,
	});
	const spyBuyAndHold = simulateSpy({ benchmark, costs: PROTOCOL.costs.base });
	const evaluation = evaluateGates({
		base: base.summary,
		stress: stress.summary,
		unscaled,
		staticSleeves,
		coverageEligibleInstruments: eligible.length,
		minimumCoverageEligiblePerSleeve: Math.min(
			...coverageBySleeve.map((value) => value.eligibleInstruments),
		),
		selectionBySleeve: base.selectionBySleeve,
	});
	return {
		reportVersion: "1.0.0",
		generatedAt: generatedAt.toISOString(),
		developmentId: PROTOCOL.developmentId,
		protocolVersion: PROTOCOL.protocolVersion,
		protocolSha256: createHash("sha256")
			.update(JSON.stringify(PROTOCOL))
			.digest("hex"),
		inputs: {
			historySha256: input.historySha256.toLowerCase(),
			universeManifestSha256: PROTOCOL.sources.universeManifestSha256,
			manifestInstruments: input.instruments.length,
			coverageEligibleInstruments: eligible.length,
		},
		dataAccess: {
			portfolioEndsBefore: PROTOCOL.dataAccess.portfolioEndsBefore,
			protected2016PlusDataRead: false,
			existingValidationFeaturesRead: false,
			existingValidationLabelsRead: false,
			existingTestFeaturesRead: false,
			existingTestLabelsRead: false,
		},
		candidateId: PROTOCOL.developmentId,
		base: base.summary,
		stress: stress.summary,
		comparators: { unscaledMomentum: unscaled, staticSleeves, spyBuyAndHold },
		coverage: { bySleeve: coverageBySleeve },
		selectionBySleeve: base.selectionBySleeve,
		riskMultiplierSummary: base.riskMultiplierSummary,
		actuals: evaluation.actuals,
		gates: evaluation.gates,
		decision: {
			status: evaluation.passed
				? "advance_to_separate_validation_preregistration"
				: "reject_risk_controlled_momentum_v3",
			passed: evaluation.passed,
			authorizesValidationAccess: false,
			authorizesProductSignals: false,
			authorizesLiveTrading: false,
		},
		warnings: [
			"This is development evidence, not validation evidence.",
			"No selected symbols or instrument-level outcomes are included.",
			"The present-day surviving ETF manifest has survivorship bias.",
		],
	};
}
