import { createHash } from "node:crypto";
import { DEFAULT_BACKTEST_CONFIGURATION } from "@/lib/analysis/backtest";
import type { BacktestTrade } from "@/lib/analysis/backtest.types";
import { selectEpisodeFirstBroadRows } from "@/lib/analysis/broad-episode-dataset";
import {
	collectDailySwingBroadRows,
	type DailySwingBroadCandidateRow,
} from "@/lib/analysis/broad-dataset";
import { DAILY_SWING_BROAD_WALK_FORWARD_FOLDS } from "@/lib/analysis/broad-dataset.types";
import type { DailySwingCombinedBroadSourceScan } from "@/lib/analysis/combined-broad-dataset.types";
import type {
	DailySwingInstrumentSetupScan,
	DailySwingSetupResearchPolicy,
} from "@/lib/analysis/setup-scan.types";
import { DAILY_SWING_SYMMETRIC_REGIME_DEVELOPMENT_PROTOCOL } from "@/lib/analysis/symmetric-regime-strategy-development";

type FoldId = (typeof DAILY_SWING_BROAD_WALK_FORWARD_FOLDS)[number]["foldId"];
type Direction = DailySwingBroadCandidateRow["features"]["direction"];
type RejectedDevelopmentReport = { decision?: { status?: unknown } };

export type DailySwingSymmetricCandidateRow = DailySwingBroadCandidateRow & {
	sourceScan: DailySwingCombinedBroadSourceScan;
	utilityBeforeBorrowR: number;
	shortBorrowCost: number;
	shortBorrowCostR: number;
	utilityAfterBorrowR: number;
};

type UtilityMetrics = {
	rows: number;
	shortRows: number;
	triggeredRows: number;
	triggeredShortRows: number;
	averageTriggeredShortBorrowCostR: number | null;
	averageSetupUtilityR: number;
	grossPositiveUtilityR: number;
	grossNegativeUtilityR: number;
	profitFactor: number | null;
};

const DAY_MS = 86_400_000;
const PROTOCOL = DAILY_SWING_SYMMETRIC_REGIME_DEVELOPMENT_PROTOCOL;

function round(value: number, precision = 8) {
	const multiplier = 10 ** precision;
	return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
}

function timestamp(value: string, label: string) {
	const result = Date.parse(value);
	if (!Number.isFinite(result)) throw new Error(`${label} must be a valid timestamp`);
	return result;
}

function finite(value: number, label: string) {
	if (!Number.isFinite(value)) throw new Error(`${label} must be finite`);
	return value;
}

function normalizedSha256(value: string, label: string) {
	const normalized = value.trim().toLowerCase();
	if (!/^[a-f0-9]{64}$/.test(normalized)) {
		throw new Error(`${label} must be a SHA-256 checksum`);
	}
	return normalized;
}

export function calculateShortBorrowStress(input: {
	direction: Direction;
	entryAt: string;
	exitAt: string;
	entryPrice: number;
	positionUnits: number;
	riskCapital: number;
}) {
	if (input.direction === "long") {
		return { chargedDays: 0, cost: 0, costR: 0 };
	}
	const entryAt = timestamp(input.entryAt, "entryAt");
	const exitAt = timestamp(input.exitAt, "exitAt");
	if (exitAt < entryAt) throw new Error("Short exitAt cannot precede entryAt");
	const entryPrice = finite(input.entryPrice, "entryPrice");
	const positionUnits = finite(input.positionUnits, "positionUnits");
	const riskCapital = finite(input.riskCapital, "riskCapital");
	if (entryPrice <= 0 || positionUnits <= 0 || riskCapital <= 0) {
		throw new Error("Short borrow inputs must be positive");
	}
	const chargedDays = Math.max(
		PROTOCOL.candidate.shortBorrowStress.minimumChargedDays,
		(exitAt - entryAt) / DAY_MS,
	);
	const cost =
		entryPrice *
		positionUnits *
		PROTOCOL.candidate.shortBorrowStress.annualRate *
		(chargedDays / 365);
	return {
		chargedDays: round(chargedDays),
		cost: round(cost),
		costR: round(cost / riskCapital),
	};
}

function assertFrozenConfiguration(report: DailySwingInstrumentSetupScan) {
	const expected = {
		...DEFAULT_BACKTEST_CONFIGURATION,
		allowShortSetups: true,
	};
	for (const key of Object.keys(expected) as Array<keyof typeof expected>) {
		if (report.configuration[key] !== expected[key]) {
			throw new Error(
				`${report.instrument.displaySymbol} does not use the frozen symmetric configuration`,
			);
		}
	}
}

function triggeredTradeByRowId(reports: readonly DailySwingInstrumentSetupScan[]) {
	const trades = new Map<string, BacktestTrade>();
	for (const report of reports) {
		assertFrozenConfiguration(report);
		for (const trade of report.trades) {
			const rowId = `${trade.instrumentId}|${trade.signalAt}`;
			if (trades.has(rowId)) throw new Error(`${rowId} has duplicate completed trades`);
			trades.set(rowId, trade);
		}
	}
	return trades;
}

export function buildDailySwingSymmetricCandidateRows(input: {
	reports: readonly DailySwingInstrumentSetupScan[];
	researchPolicy: Exclude<DailySwingSetupResearchPolicy, "none">;
	sourceScan: DailySwingCombinedBroadSourceScan;
}) {
	const collected = collectDailySwingBroadRows(input.reports, input.researchPolicy);
	const trades = triggeredTradeByRowId(input.reports);
	const boundary = timestamp(PROTOCOL.dataAccess.periodEndsBefore, "periodEndsBefore");
	let boundaryTruncatedRows = 0;
	const rows = collected.rows.flatMap((row): DailySwingSymmetricCandidateRow[] => {
		const signalAt = timestamp(row.signalAt, `${row.rowId}.signalAt`);
		const resolvedAt = timestamp(row.resolvedAt, `${row.rowId}.resolvedAt`);
		if (signalAt >= boundary || resolvedAt >= boundary) {
			throw new Error(`${row.rowId} is outside the frozen train-only boundary`);
		}
		if (row.labels.exitReason === "end_of_data" || row.labels.exitReason === "end_of_data_untriggered") {
			boundaryTruncatedRows += 1;
			return [];
		}
		const utilityBeforeBorrowR = row.labels.triggered
			? finite(row.labels.netRMultiple!, `${row.rowId}.netRMultiple`)
			: 0;
		const trade = trades.get(row.rowId);
		if (row.labels.triggered !== Boolean(trade)) {
			throw new Error(`${row.rowId} triggered label does not reconcile with its trade`);
		}
		const borrow = trade
			? calculateShortBorrowStress({
					direction: trade.direction,
					entryAt: trade.entryAt,
					exitAt: trade.exitAt,
					entryPrice: trade.entryPrice,
					positionUnits: trade.positionUnits,
					riskCapital: trade.riskCapital,
				})
			: { chargedDays: 0, cost: 0, costR: 0 };
		return [
			{
				...row,
				sourceScan: input.sourceScan,
				utilityBeforeBorrowR: round(utilityBeforeBorrowR),
				shortBorrowCost: borrow.cost,
				shortBorrowCostR: borrow.costR,
				utilityAfterBorrowR: round(utilityBeforeBorrowR - borrow.costR),
			},
		];
	});
	return {
		rows,
		featureRecords: collected.featureRecords,
		liquidityRejected: collected.liquidityRejected,
		boundaryTruncatedRows,
	};
}

function rowsBetween(
	rows: readonly DailySwingSymmetricCandidateRow[],
	startsAt: string,
	endsBefore: string,
) {
	const start = timestamp(startsAt, "fold start");
	const end = timestamp(endsBefore, "fold end");
	return rows.filter((row) => {
		const signal = timestamp(row.signalAt, `${row.rowId}.signalAt`);
		return (
			signal >= start &&
			signal < end &&
			timestamp(row.resolvedAt, `${row.rowId}.resolvedAt`) < end
		);
	});
}

function metrics(rows: readonly DailySwingSymmetricCandidateRow[]): UtilityMetrics {
	if (rows.length === 0) throw new Error("Cannot calculate metrics for an empty cohort");
	const utilities = rows.map((row) =>
		finite(row.utilityAfterBorrowR, `${row.rowId}.utilityAfterBorrowR`),
	);
	const grossPositive = utilities.reduce(
		(total, value) => total + Math.max(value, 0),
		0,
	);
	const grossNegative = utilities.reduce(
		(total, value) => total + Math.min(value, 0),
		0,
	);
	const triggeredShorts = rows.filter(
		(row) => row.labels.triggered && row.features.direction === "short",
	);
	return {
		rows: rows.length,
		shortRows: rows.filter((row) => row.features.direction === "short").length,
		triggeredRows: rows.filter((row) => row.labels.triggered).length,
		triggeredShortRows: triggeredShorts.length,
		averageTriggeredShortBorrowCostR:
			triggeredShorts.length === 0
				? null
				: round(
						triggeredShorts.reduce(
							(total, row) => total + row.shortBorrowCostR,
							0,
						) / triggeredShorts.length,
					),
		averageSetupUtilityR: round(
			utilities.reduce((total, value) => total + value, 0) / rows.length,
		),
		grossPositiveUtilityR: round(grossPositive),
		grossNegativeUtilityR: round(grossNegative),
		profitFactor:
			grossNegative === 0 ? null : round(grossPositive / Math.abs(grossNegative)),
	};
}

function profitFactorPass(value: UtilityMetrics, threshold: number) {
	return value.grossNegativeUtilityR === 0
		? value.grossPositiveUtilityR > 0
		: value.profitFactor !== null && value.profitFactor >= threshold;
}

function cohortMetrics(
	rows: readonly DailySwingSymmetricCandidateRow[],
	cohort: "direction" | "setup_type" | "source_scan",
) {
	const groups = new Map<string, DailySwingSymmetricCandidateRow[]>();
	for (const row of rows) {
		const value =
			cohort === "direction"
				? row.features.direction
				: cohort === "setup_type"
					? row.features.setupType
					: row.sourceScan;
		const group = groups.get(value) ?? [];
		group.push(row);
		groups.set(value, group);
	}
	return [...groups.entries()]
		.sort(([left], [right]) => left.localeCompare(right))
		.map(([value, group]) => ({ cohort, value, ...metrics(group) }));
}

function validateInputs(input: {
	rows: readonly DailySwingSymmetricCandidateRow[];
	baseHistorySha256: string;
	expansionHistorySha256: string;
	rejectedDevelopment: RejectedDevelopmentReport;
	rejectedDevelopmentSha256: string;
}) {
	const checks = [
		[
			input.baseHistorySha256,
			PROTOCOL.sources.baseHistory.sha256,
			"Base history",
		],
		[
			input.expansionHistorySha256,
			PROTOCOL.sources.expansionHistory.sha256,
			"Expansion history",
		],
		[
			input.rejectedDevelopmentSha256,
			PROTOCOL.sources.rejectedBenchmarkRiskFilter.sha256,
			"Rejected benchmark development",
		],
	] as const;
	for (const [actual, expected, label] of checks) {
		if (normalizedSha256(actual, label) !== expected) {
			throw new Error(`${label} checksum does not match the frozen protocol`);
		}
	}
	if (
		input.rejectedDevelopment.decision?.status !==
		PROTOCOL.sources.rejectedBenchmarkRiskFilter.decision
	) {
		throw new Error("Benchmark development does not contain the frozen rejection");
	}
	if (input.rows.length === 0) throw new Error("Symmetric candidate rows are empty");
	const boundary = timestamp(PROTOCOL.dataAccess.periodEndsBefore, "periodEndsBefore");
	for (const row of input.rows) {
		if (
			timestamp(row.signalAt, `${row.rowId}.signalAt`) >= boundary ||
			timestamp(row.resolvedAt, `${row.rowId}.resolvedAt`) >= boundary
		) {
			throw new Error(`${row.rowId} is not train-only`);
		}
		const before = finite(
			row.utilityBeforeBorrowR,
			`${row.rowId}.utilityBeforeBorrowR`,
		);
		const cost = finite(row.shortBorrowCost, `${row.rowId}.shortBorrowCost`);
		const costR = finite(row.shortBorrowCostR, `${row.rowId}.shortBorrowCostR`);
		const after = finite(
			row.utilityAfterBorrowR,
			`${row.rowId}.utilityAfterBorrowR`,
		);
		if (cost < 0 || costR < 0) throw new Error(`${row.rowId} has negative borrow cost`);
		if (row.features.direction === "long" && (cost !== 0 || costR !== 0)) {
			throw new Error(`${row.rowId} applies short borrow cost to a long setup`);
		}
		if (!row.labels.triggered && (before !== 0 || cost !== 0 || costR !== 0)) {
			throw new Error(`${row.rowId} charges or scores an untriggered setup`);
		}
		if (Math.abs(after - round(before - costR)) > 1e-8) {
			throw new Error(`${row.rowId} does not reconcile its short borrow adjustment`);
		}
	}
	if (new Set(input.rows.map((row) => row.rowId)).size !== input.rows.length) {
		throw new Error("Symmetric candidate row IDs must be unique across sources");
	}
}

export function runDailySwingSymmetricRegimeDevelopment(input: {
	rows: readonly DailySwingSymmetricCandidateRow[];
	baseHistorySha256: string;
	expansionHistorySha256: string;
	rejectedDevelopment: RejectedDevelopmentReport;
	rejectedDevelopmentSha256: string;
	scanInventory: {
		base: { featureRecords: number; liquidityRejected: number; boundaryTruncatedRows: number };
		expansion: { featureRecords: number; liquidityRejected: number; boundaryTruncatedRows: number };
	};
	generatedAt?: Date;
}) {
	validateInputs(input);
	const generatedAt = input.generatedAt ?? new Date();
	if (Number.isNaN(generatedAt.getTime())) throw new Error("generatedAt must be valid");

	const selectedByFold = DAILY_SWING_BROAD_WALK_FORWARD_FOLDS.map((fold) => {
		const sourceRows = rowsBetween(
			input.rows,
			fold.evaluationStartsAt,
			fold.evaluationEndsBefore,
		);
		const selectedRows = selectEpisodeFirstBroadRows(sourceRows);
		if (selectedRows.length === 0) throw new Error(`${fold.foldId} has no episodes`);
		const candidate = metrics(selectedRows);
		const baseline = PROTOCOL.baselineStrategy.folds.find(
			(item) => item.foldId === fold.foldId,
		);
		if (!baseline) throw new Error(`${fold.foldId} baseline is missing`);
		return {
			foldId: fold.foldId as FoldId,
			sourceRows: sourceRows.length,
			selectedRows,
			candidate,
			baselineAverageSetupUtilityR: baseline.averageUtilityR,
			averageUtilityImprovementR: round(
				candidate.averageSetupUtilityR - baseline.averageUtilityR,
			),
		};
	});
	const selectedRows = selectedByFold.flatMap((fold) => fold.selectedRows);
	const overall = metrics(selectedRows);
	const foldMetrics = selectedByFold.map((fold) => fold.candidate);
	const directionMetrics = (["long", "short"] as const).map((direction) => {
		const rows = selectedRows.filter((row) => row.features.direction === direction);
		if (rows.length === 0) throw new Error(`No ${direction} episodes were selected`);
		return { direction, metrics: metrics(rows) };
	});
	const foldUtilities = foldMetrics.map((value) => value.averageSetupUtilityR);
	const actuals = {
		total_evaluation_episode_rows: overall.rows,
		total_short_episode_rows: overall.shortRows,
		minimum_fold_episode_rows: Math.min(...foldMetrics.map((value) => value.rows)),
		minimum_fold_short_episode_rows: Math.min(
			...foldMetrics.map((value) => value.shortRows),
		),
		overall_average_setup_utility_r_after_short_borrow:
			overall.averageSetupUtilityR,
		minimum_fold_average_setup_utility_r_after_short_borrow: Math.min(
			...foldUtilities,
		),
		overall_profit_factor_after_short_borrow: overall.profitFactor,
		minimum_fold_profit_factor_after_short_borrow: (() => {
			const finiteValues = foldMetrics.flatMap((value) =>
				value.profitFactor === null ? [] : [value.profitFactor],
			);
			return finiteValues.length === 0 ? null : Math.min(...finiteValues);
		})(),
		minimum_direction_average_utility_r_after_short_borrow: Math.min(
			...directionMetrics.map((value) => value.metrics.averageSetupUtilityR),
		),
		overall_average_utility_improvement_r_over_long_only: round(
			overall.averageSetupUtilityR - PROTOCOL.baselineStrategy.averageUtilityR,
		),
		folds_with_positive_average_utility_improvement: selectedByFold.filter(
			(fold) => fold.averageUtilityImprovementR > 0,
		).length,
		fold_average_utility_range_r_after_short_borrow: round(
			Math.max(...foldUtilities) - Math.min(...foldUtilities),
		),
	};
	const gates = PROTOCOL.developmentGates.map((gate) => {
		const actual = actuals[gate.metric];
		let passed: boolean;
		if (gate.metric === "overall_profit_factor_after_short_borrow") {
			passed = profitFactorPass(overall, gate.threshold);
		} else if (gate.metric === "minimum_fold_profit_factor_after_short_borrow") {
			passed = foldMetrics.every((value) => profitFactorPass(value, gate.threshold));
		} else if (gate.operator === "=") passed = actual === gate.threshold;
		else if (gate.operator === "<=") passed = actual !== null && actual <= gate.threshold;
		else passed = actual !== null && actual >= gate.threshold;
		return { ...gate, actual, passed };
	});
	const passed = gates.every((gate) => gate.passed);
	return {
		reportVersion: "1.0.0",
		generatedAt: generatedAt.toISOString(),
		developmentId: PROTOCOL.developmentId,
		protocolVersion: PROTOCOL.protocolVersion,
		protocolSha256: createHash("sha256")
			.update(JSON.stringify(PROTOCOL))
			.digest("hex"),
		inputs: {
			baseHistorySha256: input.baseHistorySha256.toLowerCase(),
			expansionHistorySha256: input.expansionHistorySha256.toLowerCase(),
			rejectedBenchmarkDevelopmentSha256:
				input.rejectedDevelopmentSha256.toLowerCase(),
		},
		dataAccess: {
			periodEndsBefore: PROTOCOL.dataAccess.periodEndsBefore,
			fullHistoryCoverageMetadataUsed: true,
			barsAtOrAfterTrainBoundaryUsedForSignalsOrOutcomes: false,
			validationFeaturesRead: false,
			validationLabelsRead: false,
			testFeaturesRead: false,
			testLabelsRead: false,
		},
		scanInventory: input.scanInventory,
		candidateId: PROTOCOL.candidate.candidateId,
		shortBorrowStress: PROTOCOL.candidate.shortBorrowStress,
		overall,
		folds: selectedByFold.map((fold) => ({
			foldId: fold.foldId,
			sourceRows: fold.sourceRows,
			candidate: fold.candidate,
			baselineAverageSetupUtilityR: fold.baselineAverageSetupUtilityR,
			averageUtilityImprovementR: fold.averageUtilityImprovementR,
		})),
		cohorts: [
			...cohortMetrics(selectedRows, "direction"),
			...cohortMetrics(selectedRows, "setup_type"),
			...cohortMetrics(selectedRows, "source_scan"),
		],
		actuals,
		gates,
		decision: {
			status: passed
				? "advance_to_separate_validation_preregistration"
				: "reject_symmetric_regime_strategy",
			passed,
			authorizesValidationAccess: false,
			authorizesProductSignals: false,
			authorizesLiveTrading: false,
		},
		warnings: [
			"This is train-only strategy-development evidence, not validation evidence.",
			"No instrument-level outcomes are included.",
			"Historical borrow availability is unknown; the frozen borrow charge is only a stress assumption.",
			"A pass would require a separate one-shot validation preregistration.",
		],
	};
}
