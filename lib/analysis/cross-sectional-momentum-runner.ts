import { createHash } from "node:crypto";
import { ETF_CROSS_SECTIONAL_MOMENTUM_DEVELOPMENT_PROTOCOL } from "@/lib/analysis/cross-sectional-momentum-development";

const PROTOCOL = ETF_CROSS_SECTIONAL_MOMENTUM_DEVELOPMENT_PROTOCOL;
const DAY_MS = 86_400_000;

export type MomentumSleeveId =
	(typeof PROTOCOL.universe.sleeves)[number]["sleeveId"];
export type MomentumSourceScan = "base" | "expansion";
export type MomentumBar = {
	startedAt: string;
	open: number;
	close: number;
	volume: number | null;
};
export type MomentumInstrumentHistory = {
	instrumentId: string;
	displaySymbol: string;
	sourceScan: MomentumSourceScan;
	sourceCategory: string;
	sleeveId: MomentumSleeveId;
	bars: MomentumBar[];
};
export type MomentumBenchmarkHistory = {
	displaySymbol: "SPY";
	bars: MomentumBar[];
};

type PreparedBar = MomentumBar & { at: number };
type PreparedInstrument = Omit<MomentumInstrumentHistory, "bars"> & {
	bars: PreparedBar[];
	byTimestamp: Map<number, number>;
};
type Costs = { transactionCostBpsPerSide: number; slippageBpsPerFill: number };
type SelectionDecision = {
	signalAt: number;
	executionAt: number;
	selectedIds: Map<MomentumSleeveId, string>;
	availableCandidates: Map<MomentumSleeveId, number>;
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

function prepareBars(bars: readonly MomentumBar[], label: string) {
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

function prepareInstrument(value: MomentumInstrumentHistory): PreparedInstrument {
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

export function momentumCandidateAt(input: {
	instrument: MomentumInstrumentHistory;
	signalAt: string;
	targetNotional: number;
}) {
	const instrument = prepareInstrument(input.instrument);
	const signalAt = timestamp(input.signalAt, "signalAt");
	return momentumCandidateAtPrepared({
		instrument,
		signalAt,
		targetNotional: input.targetNotional,
	});
}

function momentumCandidateAtPrepared(input: {
	instrument: PreparedInstrument;
	signalAt: number;
	targetNotional: number;
}) {
	const { instrument, signalAt } = input;
	const index = instrument.byTimestamp.get(signalAt);
	if (index === undefined) return { available: false, eligible: false } as const;
	const formation = PROTOCOL.signal.formation;
	if (index < formation.lookbackSessions) {
		return { available: false, eligible: false } as const;
	}
	const formationReturn =
		instrument.bars[index - formation.skipRecentSessions].close /
			instrument.bars[index - formation.lookbackSessions].close -
		1;
	const liquidity = PROTOCOL.signal.liquidityEligibility;
	const dollarVolumes = instrument.bars
		.slice(index - liquidity.windowSessions + 1, index + 1)
		.flatMap((bar) =>
			bar.volume !== null && bar.volume > 0
				? [bar.close * bar.volume]
				: [],
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
		formationReturn: round(formationReturn),
		medianDollarVolume: round(medianDollarVolume),
	} as const;
}

function monthKey(at: number) {
	return new Date(at).toISOString().slice(0, 7);
}

function signalBars(benchmark: readonly PreparedBar[]) {
	const lastByMonth = new Map<string, PreparedBar>();
	for (const bar of benchmark) lastByMonth.set(monthKey(bar.at), bar);
	const first = PROTOCOL.evaluation.firstFormationMonth;
	const last = PROTOCOL.evaluation.lastFormationMonth;
	return [...lastByMonth.entries()]
		.filter(([month]) => month >= first && month <= last)
		.sort(([left], [right]) => left.localeCompare(right))
		.map(([, bar]) => bar);
}

export function momentumFormationSchedule(benchmark: MomentumBenchmarkHistory) {
	return signalBars(prepareBars(benchmark.bars, "SPY")).map((bar) =>
		new Date(bar.at).toISOString(),
	);
}

function selectAt(input: {
	instruments: readonly PreparedInstrument[];
	signalAt: number;
	executionAt: number;
	equity: number;
}) {
	const selectedIds = new Map<MomentumSleeveId, string>();
	const availableCandidates = new Map<MomentumSleeveId, number>();
	for (const sleeve of PROTOCOL.universe.sleeves) {
		const candidates = input.instruments
			.filter((instrument) => instrument.sleeveId === sleeve.sleeveId)
			.flatMap((instrument) => {
				const result = momentumCandidateAtPrepared({
					instrument,
					signalAt: input.signalAt,
					targetNotional: input.equity * sleeve.targetWeight,
				});
				return result.available ? [{ instrument, result }] : [];
			});
		availableCandidates.set(sleeve.sleeveId, candidates.length);
		const eligible = candidates
			.filter((candidate) => candidate.result.eligible)
			.sort(
				(left, right) =>
					right.result.formationReturn! - left.result.formationReturn! ||
					left.instrument.displaySymbol.localeCompare(
						right.instrument.displaySymbol,
					),
			);
		if (eligible[0]) selectedIds.set(sleeve.sleeveId, eligible[0].instrument.instrumentId);
	}
	return { signalAt: input.signalAt, executionAt: input.executionAt, selectedIds, availableCandidates };
}

export function selectMomentumSleevesAt(input: {
	instruments: readonly MomentumInstrumentHistory[];
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
	let turnoverWeightChange = Math.abs(
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
		turnoverWeightChange += Math.abs(targetWeight - currentWeight);
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
	return { cash: Math.max(0, cash), turnover: turnoverWeightChange / 2 };
}

function metricSummary(curve: readonly EquityPoint[], initialEquity: number) {
	if (curve.length === 0) throw new Error("Equity curve is empty");
	let peak = initialEquity;
	let maximumDrawdown = 0;
	for (const point of curve) {
		peak = Math.max(peak, point.equity);
		maximumDrawdown = Math.max(maximumDrawdown, ((peak - point.equity) / peak) * 100);
	}
	const endingEquity = curve.at(-1)!.equity;
	const elapsedYears =
		(curve.at(-1)!.at - timestamp(PROTOCOL.dataAccess.portfolioStartsAt, "start")) /
		(DAY_MS * 365.25);
	const lastByMonth = new Map<string, EquityPoint>();
	for (const point of curve) lastByMonth.set(monthKey(point.at), point);
	let previous = initialEquity;
	const monthlyReturns = [...lastByMonth.values()].map((point) => {
		const value = point.equity / previous - 1;
		previous = point.equity;
		return value;
	});
	const mean = monthlyReturns.reduce((sum, value) => sum + value, 0) / monthlyReturns.length;
	const variance =
		monthlyReturns.length < 2
			? 0
			: monthlyReturns.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
				(monthlyReturns.length - 1);
	const monthlySharpe = variance === 0 ? null : (Math.sqrt(12) * mean) / Math.sqrt(variance);
	const calendarYears = PROTOCOL.dataAccess.calendarEvaluationYears.map((year) => {
		const points = curve.filter(
			(point) => new Date(point.at).getUTCFullYear() === year,
		);
		const startEquity = year === 2020
			? initialEquity
			: curve.filter((point) => new Date(point.at).getUTCFullYear() < year).at(-1)!.equity;
		return {
			year,
			returnPercent: round(((points.at(-1)!.equity / startEquity) - 1) * 100),
		};
	});
	return {
		initialEquity,
		endingEquity: round(endingEquity),
		totalReturnPercent: round(((endingEquity / initialEquity) - 1) * 100),
		annualizedReturnPercent: round(
			((endingEquity / initialEquity) ** (1 / elapsedYears) - 1) * 100,
		),
		monthlySharpe: monthlySharpe === null ? null : round(monthlySharpe),
		maximumDrawdownPercent: round(maximumDrawdown),
		monthlyHoldingPeriods: monthlyReturns.length,
		calendarYears,
	};
}

function simulateMomentum(input: {
	instruments: readonly PreparedInstrument[];
	benchmark: readonly PreparedBar[];
	costs: Costs;
	frozenSelections?: readonly SelectionDecision[];
}) {
	const byId = new Map(input.instruments.map((instrument) => [instrument.instrumentId, instrument]));
	if (byId.size !== input.instruments.length) throw new Error("Instrument IDs must be unique");
	const signals = signalBars(input.benchmark);
	if (signals.length !== PROTOCOL.evaluation.expectedMonthlyHoldingPeriods) {
		throw new Error("Benchmark does not provide the frozen 36 formation months");
	}
	const signalSet = new Set(signals.map((bar) => bar.at));
	const benchmarkIndex = new Map(input.benchmark.map((bar, index) => [bar.at, index]));
	let cash: number = PROTOCOL.portfolio.initialEquity;
	const positions = new Map<string, number>();
	const curve: EquityPoint[] = [];
	const decisions: SelectionDecision[] = [];
	const turnovers: number[] = [];
	let monthsWithAnyInvestment = 0;
	let pending: SelectionDecision | null = null;
	const start = timestamp(PROTOCOL.dataAccess.portfolioStartsAt, "portfolioStartsAt");
	const end = timestamp(PROTOCOL.dataAccess.portfolioEndsBefore, "portfolioEndsBefore");
	for (const bar of input.benchmark) {
		if (bar.at >= end) break;
		if (pending && pending.executionAt === bar.at) {
			const targetWeights = new Map<string, number>();
			for (const [sleeveId, instrumentId] of pending.selectedIds) {
				const sleeve = PROTOCOL.universe.sleeves.find((value) => value.sleeveId === sleeveId)!;
				targetWeights.set(instrumentId, sleeve.targetWeight);
			}
			const execution = executeTargets({
				targetWeights,
				at: bar.at,
				positions,
				cash,
				byId,
				costs: input.costs,
			});
			cash = execution.cash;
			turnovers.push(execution.turnover);
			if (pending.selectedIds.size > 0) monthsWithAnyInvestment += 1;
			pending = null;
		}
		const equity = valueAt(positions, cash, bar.at, "close", byId);
		if (bar.at >= start) curve.push({ at: bar.at, equity });
		if (signalSet.has(bar.at)) {
			const index = benchmarkIndex.get(bar.at)!;
			const next = input.benchmark[index + 1];
			if (!next || next.at >= end) throw new Error("Formation signal has no train-only execution session");
			const frozen = input.frozenSelections?.find((decision) => decision.signalAt === bar.at);
			pending = frozen ?? selectAt({ instruments: input.instruments, signalAt: bar.at, executionAt: next.at, equity });
			decisions.push(pending);
		}
	}
	if (pending) throw new Error("A frozen decision remained unexecuted");
	const finalPoint = curve.at(-1);
	if (!finalPoint) throw new Error("No train-only portfolio curve was produced");
	const finalTargets = new Map<string, number>();
	const liquidation = executeTargets({
		targetWeights: finalTargets,
		at: finalPoint.at,
		positions,
		cash,
		byId,
		costs: input.costs,
		priceField: "close",
	});
	cash = liquidation.cash;
	curve[curve.length - 1] = { at: finalPoint.at, equity: cash };
	const summary = metricSummary(curve, PROTOCOL.portfolio.initialEquity);
	const candidateCounts = decisions.flatMap((decision) => [
		...decision.availableCandidates.values(),
	]);
	const selectionBySleeve = PROTOCOL.universe.sleeves.map((sleeve) => ({
		sleeveId: sleeve.sleeveId,
		selectedMonths: decisions.filter((decision) => decision.selectedIds.has(sleeve.sleeveId)).length,
		cashMonths: decisions.filter((decision) => !decision.selectedIds.has(sleeve.sleeveId)).length,
	}));
	const selectionBySource = (["base", "expansion"] as const).map((sourceScan) => ({
		sourceScan,
		selectedSleeveMonths: decisions.reduce(
			(total, decision) =>
				total +
				[...decision.selectedIds.values()].filter(
					(id) => byId.get(id)!.sourceScan === sourceScan,
				).length,
			0,
		),
	}));
	return {
		summary: {
			...summary,
			monthsWithAnyInvestment,
			minimumCandidatesInAnySleeveDecision: Math.min(...candidateCounts),
			annualizedOneWayTurnoverPercent: round(
				(turnovers.reduce((sum, value) => sum + value, 0) / turnovers.length) * 12 * 100,
			),
		},
		selectionBySleeve,
		selectionBySource,
		decisions,
	};
}

function simulateStaticBenchmark(input: {
	instruments: readonly PreparedInstrument[];
	benchmark: readonly PreparedBar[];
	costs: Costs;
}) {
	const byId = new Map(input.instruments.map((instrument) => [instrument.instrumentId, instrument]));
	const firstSignal = signalBars(input.benchmark)[0];
	const signalIndex = input.benchmark.findIndex((bar) => bar.at === firstSignal.at);
	const executionAt = input.benchmark[signalIndex + 1].at;
	const targetWeights = new Map<string, number>();
	for (const sleeve of PROTOCOL.universe.sleeves) {
		const members = input.instruments.filter((instrument) => instrument.sleeveId === sleeve.sleeveId);
		if (members.length === 0) throw new Error(`${sleeve.sleeveId} has no benchmark members`);
		for (const member of members) targetWeights.set(member.instrumentId, sleeve.targetWeight / members.length);
	}
	let cash: number = PROTOCOL.portfolio.initialEquity;
	const positions = new Map<string, number>();
	const curve: EquityPoint[] = [];
	const start = timestamp(PROTOCOL.dataAccess.portfolioStartsAt, "portfolioStartsAt");
	const end = timestamp(PROTOCOL.dataAccess.portfolioEndsBefore, "portfolioEndsBefore");
	for (const bar of input.benchmark) {
		if (bar.at >= end) break;
		if (bar.at === executionAt) {
			cash = executeTargets({ targetWeights, at: bar.at, positions, cash, byId, costs: input.costs }).cash;
		}
		if (bar.at >= start) curve.push({ at: bar.at, equity: valueAt(positions, cash, bar.at, "close", byId) });
	}
	const final = curve.at(-1)!;
	cash = executeTargets({
		targetWeights: new Map(),
		at: final.at,
		positions,
		cash,
		byId,
		costs: input.costs,
		priceField: "close",
	}).cash;
	curve[curve.length - 1] = { at: final.at, equity: cash };
	return metricSummary(curve, PROTOCOL.portfolio.initialEquity);
}

function simulateSpy(input: { benchmark: readonly PreparedBar[]; costs: Costs }) {
	const instrument: PreparedInstrument = {
		instrumentId: "benchmark:spy",
		displaySymbol: "SPY",
		sourceScan: "base",
		sourceCategory: "benchmark",
		sleeveId: "us_broad_style_factor",
		bars: [...input.benchmark],
		byTimestamp: new Map(input.benchmark.map((bar, index) => [bar.at, index])),
	};
	const firstSignal = signalBars(input.benchmark)[0];
	const executionAt = input.benchmark[input.benchmark.findIndex((bar) => bar.at === firstSignal.at) + 1].at;
	let cash: number = PROTOCOL.portfolio.initialEquity;
	const positions = new Map<string, number>();
	const byId = new Map([[instrument.instrumentId, instrument]]);
	const curve: EquityPoint[] = [];
	const start = timestamp(PROTOCOL.dataAccess.portfolioStartsAt, "start");
	const end = timestamp(PROTOCOL.dataAccess.portfolioEndsBefore, "end");
	for (const bar of input.benchmark) {
		if (bar.at >= end) break;
		if (bar.at === executionAt) {
			cash = executeTargets({
				targetWeights: new Map([[instrument.instrumentId, PROTOCOL.portfolio.maximumGrossExposure]]),
				at: bar.at,
				positions,
				cash,
				byId,
				costs: input.costs,
			}).cash;
		}
		if (bar.at >= start) curve.push({ at: bar.at, equity: valueAt(positions, cash, bar.at, "close", byId) });
	}
	const final = curve.at(-1)!;
	cash = executeTargets({
		targetWeights: new Map(),
		at: final.at,
		positions,
		cash,
		byId,
		costs: input.costs,
		priceField: "close",
	}).cash;
	curve[curve.length - 1] = { at: final.at, equity: cash };
	return metricSummary(curve, PROTOCOL.portfolio.initialEquity);
}

export function evaluateMomentumDevelopmentGates(input: {
	base: ReturnType<typeof simulateMomentum>["summary"];
	stress: ReturnType<typeof simulateMomentum>["summary"];
	staticSleeves: ReturnType<typeof metricSummary>;
}) {
	const calendarReturns = input.base.calendarYears.map((year) => year.returnPercent);
	const actuals = {
		monthly_holding_periods: input.base.monthlyHoldingPeriods,
		minimum_candidates_in_any_sleeve_decision:
			input.base.minimumCandidatesInAnySleeveDecision,
		months_with_any_investment: input.base.monthsWithAnyInvestment,
		base_net_annualized_return_percent: input.base.annualizedReturnPercent,
		base_monthly_sharpe: input.base.monthlySharpe,
		base_maximum_drawdown_percent: input.base.maximumDrawdownPercent,
		positive_calendar_years: calendarReturns.filter((value) => value > 0).length,
		minimum_calendar_year_return_percent: Math.min(...calendarReturns),
		annualized_return_improvement_over_static_sleeves_percent: round(
			input.base.annualizedReturnPercent - input.staticSleeves.annualizedReturnPercent,
		),
		monthly_sharpe_improvement_over_static_sleeves:
			input.base.monthlySharpe === null || input.staticSleeves.monthlySharpe === null
				? null
				: round(input.base.monthlySharpe - input.staticSleeves.monthlySharpe),
		stress_net_annualized_return_percent: input.stress.annualizedReturnPercent,
		stress_maximum_drawdown_percent: input.stress.maximumDrawdownPercent,
		base_annualized_one_way_turnover_percent:
			input.base.annualizedOneWayTurnoverPercent,
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

export function runEtfCrossSectionalMomentumDevelopment(input: {
	instruments: readonly MomentumInstrumentHistory[];
	benchmark: MomentumBenchmarkHistory;
	baseHistorySha256: string;
	expansionHistorySha256: string;
	rejectedSymmetricReport: { decision?: { status?: unknown } };
	rejectedSymmetricReportSha256: string;
	generatedAt?: Date;
}) {
	const checks = [
		[input.baseHistorySha256, PROTOCOL.sources.baseHistory.sha256, "Base history"],
		[input.expansionHistorySha256, PROTOCOL.sources.expansionHistory.sha256, "Expansion history"],
		[input.rejectedSymmetricReportSha256, PROTOCOL.sources.rejectedSymmetricStrategy.sha256, "Rejected symmetric report"],
	] as const;
	for (const [actual, expected, label] of checks) {
		if (actual.trim().toLowerCase() !== expected) throw new Error(`${label} checksum does not match`);
	}
	if (input.rejectedSymmetricReport.decision?.status !== PROTOCOL.sources.rejectedSymmetricStrategy.decision) {
		throw new Error("Symmetric report does not contain the frozen rejection");
	}
	if (input.instruments.length !== PROTOCOL.universe.expectedEligibleInstruments) {
		throw new Error("Momentum universe does not contain the frozen 127 eligible instruments");
	}
	const generatedAt = input.generatedAt ?? new Date();
	if (Number.isNaN(generatedAt.getTime())) throw new Error("generatedAt must be valid");
	const instruments = input.instruments.map(prepareInstrument);
	const benchmark = prepareBars(input.benchmark.bars, "SPY");
	const base = simulateMomentum({ instruments, benchmark, costs: PROTOCOL.costs.base });
	const stress = simulateMomentum({
		instruments,
		benchmark,
		costs: PROTOCOL.costs.stress,
		frozenSelections: base.decisions,
	});
	const staticSleeves = simulateStaticBenchmark({ instruments, benchmark, costs: PROTOCOL.costs.base });
	const spy = simulateSpy({ benchmark, costs: PROTOCOL.costs.base });
	const evaluation = evaluateMomentumDevelopmentGates({
		base: base.summary,
		stress: stress.summary,
		staticSleeves,
	});
	return {
		reportVersion: "1.0.0",
		generatedAt: generatedAt.toISOString(),
		developmentId: PROTOCOL.developmentId,
		protocolVersion: PROTOCOL.protocolVersion,
		protocolSha256: createHash("sha256").update(JSON.stringify(PROTOCOL)).digest("hex"),
		inputs: {
			baseHistorySha256: input.baseHistorySha256.toLowerCase(),
			expansionHistorySha256: input.expansionHistorySha256.toLowerCase(),
			rejectedSymmetricReportSha256: input.rejectedSymmetricReportSha256.toLowerCase(),
			eligibleInstruments: input.instruments.length,
		},
		dataAccess: {
			portfolioEndsBefore: PROTOCOL.dataAccess.portfolioEndsBefore,
			validationFeaturesRead: false,
			validationLabelsRead: false,
			testFeaturesRead: false,
			testLabelsRead: false,
		},
		candidateId: PROTOCOL.developmentId,
		base: base.summary,
		stress: stress.summary,
		benchmarks: { staticSleeves, spyBuyAndHold: spy },
		cohorts: [...base.selectionBySleeve, ...base.selectionBySource],
		actuals: evaluation.actuals,
		gates: evaluation.gates,
		decision: {
			status: evaluation.passed
				? "advance_to_separate_validation_preregistration"
				: "reject_cross_sectional_momentum_strategy",
			passed: evaluation.passed,
			authorizesValidationAccess: false,
			authorizesProductSignals: false,
			authorizesLiveTrading: false,
		},
		warnings: [
			"This is train-only development evidence, not validation evidence.",
			"No selected symbols or instrument-level outcomes are included.",
			"The surviving ETF universe has survivorship and category-overlap limitations.",
		],
	};
}
