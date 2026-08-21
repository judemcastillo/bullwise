import { createHash } from "node:crypto";
import { selectEpisodeFirstBroadRows } from "@/lib/analysis/broad-episode-dataset";
import { DAILY_SWING_BROAD_WALK_FORWARD_FOLDS } from "@/lib/analysis/broad-dataset.types";
import {
	DAILY_SWING_COMBINED_BROAD_DATASET_VERSION,
	type DailySwingCombinedBroadDataset,
	type DailySwingCombinedBroadDatasetRow,
	type DailySwingCombinedBroadSourceScan,
} from "@/lib/analysis/combined-broad-dataset.types";
import { DAILY_SWING_COMBINED_BROAD_STRATEGY_REDESIGN_PROTOCOL } from "@/lib/analysis/combined-broad-strategy-redesign";
import type { SerializedBenchmarkBars } from "@/lib/analysis/frozen-batch-benchmark-source";

type FoldId = "evaluate_2020" | "evaluate_2021" | "evaluate_2022";
type BenchmarkInput = Pick<SerializedBenchmarkBars, "providerSymbol" | "interval" | "adjusted"> & {
	bars: Array<{ startedAt: string; close: number }>;
};
type RejectedAudit = { decision?: { status?: unknown } };

type UtilityMetrics = {
	rows: number;
	actionableSuccessRate: number;
	averageSetupUtilityR: number;
	grossPositiveUtilityR: number;
	grossNegativeUtilityR: number;
	profitFactor: number | null;
};

function round(value: number, precision = 8) {
	const multiplier = 10 ** precision;
	return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
}

function average(values: readonly number[]) {
	if (values.length === 0) throw new Error("Cannot average an empty collection");
	return values.reduce((total, value) => total + value, 0) / values.length;
}

function timestamp(value: string, label: string) {
	const result = Date.parse(value);
	if (!Number.isFinite(result)) throw new Error(`${label} must be a valid timestamp`);
	return result;
}

function utility(row: DailySwingCombinedBroadDatasetRow) {
	if (!row.labels.triggered) return 0;
	const value = row.labels.netRMultiple;
	if (typeof value !== "number" || !Number.isFinite(value)) {
		throw new Error(`${row.rowId}.netRMultiple must be finite when triggered`);
	}
	return value;
}

function metrics(rows: readonly DailySwingCombinedBroadDatasetRow[]): UtilityMetrics {
	const utilities = rows.map(utility);
	const positive = utilities.filter((value) => value > 0);
	const negative = utilities.filter((value) => value < 0);
	const grossPositive = positive.reduce((total, value) => total + value, 0);
	const grossNegative = negative.reduce((total, value) => total + value, 0);
	return {
		rows: rows.length,
		actionableSuccessRate: round(
			rows.filter((row) => row.labels.triggered && utility(row) >= 0.5).length /
				rows.length,
		),
		averageSetupUtilityR: round(average(utilities)),
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

function prepareBenchmark(input: BenchmarkInput) {
	if (
		input.providerSymbol !== "SPY" ||
		input.interval !== "1d" ||
		input.adjusted !== true
	) {
		throw new Error("Strategy redesign requires adjusted daily SPY benchmark data");
	}
	const bars = input.bars
		.map((bar, index) => {
			const at = timestamp(bar.startedAt, `benchmark.bars[${index}].startedAt`);
			if (!Number.isFinite(bar.close) || bar.close <= 0) {
				throw new Error(`benchmark.bars[${index}].close must be positive`);
			}
			return { at, close: bar.close };
		})
		.sort((left, right) => left.at - right.at);
	if (new Set(bars.map((bar) => bar.at)).size !== bars.length) {
		throw new Error("Benchmark bars must have unique timestamps");
	}
	const prefix = [0];
	for (const bar of bars) prefix.push(prefix.at(-1)! + bar.close);
	return { bars, prefix };
}

export function benchmarkRiskAt(
	input: BenchmarkInput,
	signalAt: string,
) {
	const prepared = prepareBenchmark(input);
	const signal = timestamp(signalAt, "signalAt");
	let low = 0;
	let high = prepared.bars.length;
	while (low < high) {
		const middle = Math.floor((low + high) / 2);
		if (prepared.bars[middle].at <= signal) low = middle + 1;
		else high = middle;
	}
	const index = low - 1;
	if (index < 199 || index < 20) {
		return { eligible: false, reason: "insufficient_benchmark_history" as const };
	}
	const close = prepared.bars[index].close;
	const sma200 = (prepared.prefix[index + 1] - prepared.prefix[index - 199]) / 200;
	const return20Percent =
		((close / prepared.bars[index - 20].close) - 1) * 100;
	return {
		eligible: close > sma200 && return20Percent > 0,
		reason:
			close > sma200 && return20Percent > 0
				? ("risk_on" as const)
				: ("risk_filter_failed" as const),
		close: round(close),
		sma200: round(sma200),
		return20Percent: round(return20Percent),
	};
}

function riskEvaluator(input: BenchmarkInput) {
	const prepared = prepareBenchmark(input);
	return (signalAt: string) => {
		const signal = timestamp(signalAt, "signalAt");
		let low = 0;
		let high = prepared.bars.length;
		while (low < high) {
			const middle = Math.floor((low + high) / 2);
			if (prepared.bars[middle].at <= signal) low = middle + 1;
			else high = middle;
		}
		const index = low - 1;
		if (index < 199 || index < 20) return false;
		const close = prepared.bars[index].close;
		const sma200 =
			(prepared.prefix[index + 1] - prepared.prefix[index - 199]) / 200;
		const return20 = (close / prepared.bars[index - 20].close) - 1;
		return close > sma200 && return20 > 0;
	};
}

function rowsBetween(
	rows: readonly DailySwingCombinedBroadDatasetRow[],
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

function cohortMetrics(
	rows: readonly DailySwingCombinedBroadDatasetRow[],
	cohort: "setup_type" | "source_scan",
) {
	const groups = new Map<string, DailySwingCombinedBroadDatasetRow[]>();
	for (const row of rows) {
		const value = cohort === "setup_type" ? row.features.setupType : row.sourceScan;
		const group = groups.get(value);
		if (group) group.push(row);
		else groups.set(value, [row]);
	}
	return [...groups.entries()]
		.sort(([left], [right]) => left.localeCompare(right))
		.map(([value, group]) => ({ cohort, value, ...metrics(group) }));
}

function validateInputs(input: {
	dataset: DailySwingCombinedBroadDataset;
	datasetSha256: string;
	baseHistorySha256: string;
	expansionHistorySha256: string;
	rejectedAudit: RejectedAudit;
	rejectedAuditSha256: string;
}) {
	const protocol = DAILY_SWING_COMBINED_BROAD_STRATEGY_REDESIGN_PROTOCOL;
	const pairs = [
		[input.datasetSha256, protocol.sources.combinedDataset.sha256, "Combined dataset"],
		[input.baseHistorySha256, protocol.sources.baseHistory.sha256, "Base history"],
		[
			input.expansionHistorySha256,
			protocol.sources.expansionHistory.sha256,
			"Expansion history",
		],
		[
			input.rejectedAuditSha256,
			protocol.sources.rejectedStrategyAudit.sha256,
			"Strategy audit",
		],
	] as const;
	for (const [actual, expected, label] of pairs) {
		if (actual.toLowerCase() !== expected) {
			throw new Error(`${label} checksum does not match the frozen protocol`);
		}
	}
	if (
		input.rejectedAudit.decision?.status !==
		protocol.sources.rejectedStrategyAudit.decision
	) {
		throw new Error("Strategy audit does not contain the frozen rejection decision");
	}
	if (
		input.dataset.datasetVersion !== DAILY_SWING_COMBINED_BROAD_DATASET_VERSION ||
		input.dataset.rows.some((row) => row.split !== "train") ||
		input.dataset.rows.length !== input.dataset.splits.train.rows
	) {
		throw new Error("Combined dataset input is not the train-only inventory");
	}
}

export function runDailySwingCombinedBroadStrategyRedesign(input: {
	dataset: DailySwingCombinedBroadDataset;
	datasetSha256: string;
	baseBenchmark: BenchmarkInput;
	baseHistorySha256: string;
	expansionBenchmark: BenchmarkInput;
	expansionHistorySha256: string;
	rejectedAudit: RejectedAudit;
	rejectedAuditSha256: string;
	generatedAt?: Date;
}) {
	validateInputs(input);
	const generatedAt = input.generatedAt ?? new Date();
	if (Number.isNaN(generatedAt.getTime())) throw new Error("generatedAt must be valid");
	const riskBySource: Record<DailySwingCombinedBroadSourceScan, (at: string) => boolean> = {
		base: riskEvaluator(input.baseBenchmark),
		expansion: riskEvaluator(input.expansionBenchmark),
	};
	const foldReports = DAILY_SWING_BROAD_WALK_FORWARD_FOLDS.map((fold) => {
		const sourceRows = rowsBetween(
			input.dataset.rows,
			fold.evaluationStartsAt,
			fold.evaluationEndsBefore,
		);
		const eligibleRows = sourceRows.filter((row) =>
			riskBySource[row.sourceScan](row.signalAt),
		);
		const selectedRows = selectEpisodeFirstBroadRows(eligibleRows);
		if (selectedRows.length === 0) {
			throw new Error(`${fold.foldId} has no selected candidate episodes`);
		}
		const candidate = metrics(selectedRows);
		const baseline =
			DAILY_SWING_COMBINED_BROAD_STRATEGY_REDESIGN_PROTOCOL.baselineStrategy.folds.find(
				(item) => item.foldId === fold.foldId,
			);
		if (!baseline) throw new Error(`${fold.foldId} baseline is missing`);
		return {
			foldId: fold.foldId as FoldId,
			sourceRows: sourceRows.length,
			riskEligibleRows: eligibleRows.length,
			candidate,
			baseline: {
				rows: baseline.evaluationRows,
				averageSetupUtilityR: baseline.averageUtilityR,
			},
			averageUtilityImprovementR: round(
				candidate.averageSetupUtilityR - baseline.averageUtilityR,
			),
		};
	});
	const selectedRows = foldReports.flatMap((fold) => {
		const policy = DAILY_SWING_BROAD_WALK_FORWARD_FOLDS.find(
			(item) => item.foldId === fold.foldId,
		)!;
		return selectEpisodeFirstBroadRows(
			rowsBetween(
				input.dataset.rows,
				policy.evaluationStartsAt,
				policy.evaluationEndsBefore,
			).filter((row) => riskBySource[row.sourceScan](row.signalAt)),
		);
	});
	const overall = metrics(selectedRows);
	const foldUtilities = foldReports.map(
		(fold) => fold.candidate.averageSetupUtilityR,
	);
	const foldProfitFactors = foldReports.map((fold) => fold.candidate);
	const finiteFoldProfitFactors = foldProfitFactors.flatMap((value) =>
		value.profitFactor === null ? [] : [value.profitFactor],
	);
	const actuals = {
		total_evaluation_episode_rows: overall.rows,
		minimum_fold_evaluation_episode_rows: Math.min(
			...foldReports.map((fold) => fold.candidate.rows),
		),
		overall_average_setup_utility_r: overall.averageSetupUtilityR,
		minimum_fold_average_setup_utility_r: Math.min(...foldUtilities),
		overall_profit_factor: overall.profitFactor,
		minimum_fold_profit_factor:
			finiteFoldProfitFactors.length === 0
				? null
				: Math.min(...finiteFoldProfitFactors),
		overall_average_utility_improvement_r: round(
			overall.averageSetupUtilityR -
				DAILY_SWING_COMBINED_BROAD_STRATEGY_REDESIGN_PROTOCOL.baselineStrategy
					.averageUtilityR,
		),
		folds_with_positive_average_utility_improvement: foldReports.filter(
			(fold) => fold.averageUtilityImprovementR > 0,
		).length,
		fold_average_utility_range_r: round(
			Math.max(...foldUtilities) - Math.min(...foldUtilities),
		),
	};
	const gates =
		DAILY_SWING_COMBINED_BROAD_STRATEGY_REDESIGN_PROTOCOL.developmentGates.map(
			(gate) => {
				const actual = actuals[gate.metric];
				let passed: boolean;
				if (gate.metric === "overall_profit_factor") {
					passed = profitFactorPass(overall, gate.threshold);
				} else if (gate.metric === "minimum_fold_profit_factor") {
					passed = foldProfitFactors.every((value) =>
						profitFactorPass(value, gate.threshold),
					);
				} else if (gate.operator === "=") passed = actual === gate.threshold;
				else if (gate.operator === "<=") passed = actual !== null && actual <= gate.threshold;
				else passed = actual !== null && actual >= gate.threshold;
				return { ...gate, actual, passed };
			},
		);
	const passed = gates.every((gate) => gate.passed);
	return {
		reportVersion: "1.0.0",
		generatedAt: generatedAt.toISOString(),
		developmentId:
			DAILY_SWING_COMBINED_BROAD_STRATEGY_REDESIGN_PROTOCOL.developmentId,
		protocolVersion:
			DAILY_SWING_COMBINED_BROAD_STRATEGY_REDESIGN_PROTOCOL.protocolVersion,
		protocolSha256: createHash("sha256")
			.update(JSON.stringify(DAILY_SWING_COMBINED_BROAD_STRATEGY_REDESIGN_PROTOCOL))
			.digest("hex"),
		inputs: {
			combinedDatasetSha256: input.datasetSha256.toLowerCase(),
			baseHistorySha256: input.baseHistorySha256.toLowerCase(),
			expansionHistorySha256: input.expansionHistorySha256.toLowerCase(),
			rejectedStrategyAuditSha256: input.rejectedAuditSha256.toLowerCase(),
		},
		dataAccess: {
			trainRows: input.dataset.rows.length,
			benchmarkBarsAfterTrainBoundaryUsed: false,
			validationFeaturesRead: false,
			validationLabelsRead: false,
			testFeaturesRead: false,
			testLabelsRead: false,
		},
		candidateId:
			DAILY_SWING_COMBINED_BROAD_STRATEGY_REDESIGN_PROTOCOL.candidate.candidateId,
		overall,
		folds: foldReports,
		cohorts: [
			...cohortMetrics(selectedRows, "setup_type"),
			...cohortMetrics(selectedRows, "source_scan"),
		],
		actuals,
		gates,
		decision: {
			status: passed
				? "advance_to_separate_validation_preregistration"
				: "reject_benchmark_risk_filter",
			passed,
			authorizesValidationAccess: false,
			authorizesProductSignals: false,
		},
		warnings: [
			"This is train-only strategy-development evidence, not validation evidence.",
			"No instrument-level outcomes are included.",
			"A development pass would require a separate one-shot validation preregistration.",
		],
	};
}
