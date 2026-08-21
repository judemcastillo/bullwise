import {
	DAILY_SWING_ANALYSIS_DATASET_VERSION,
	type AnalysisDatasetFeatureVector,
	type AnalysisDatasetRow,
	type AnalysisDatasetSplit,
	type AnalysisDatasetSplitRatios,
	type DailySwingAnalysisDataset,
} from "@/lib/analysis/analysis-dataset.types";
import {
	DAILY_SWING_BACKTEST_VERSION,
	type BacktestSignalFeatures,
	type BacktestSignalQuality,
} from "@/lib/analysis/backtest.types";
import {
	DAILY_SWING_BATCH_BACKTEST_VERSION,
	type DailySwingBatchBacktestReport,
} from "@/lib/analysis/batch-backtest.types";
import {
	SUPPORTED_DAILY_SWING_SETUP_SCAN_VERSIONS,
	type DailySwingInstrumentSetupScan,
	type DailySwingSetupScanReport,
} from "@/lib/analysis/setup-scan.types";

export const V2_FROZEN_CONFIRMATION_SYMBOLS = [
	"VTI",
	"MDY",
	"EFA",
	"EEM",
	"VNQ",
	"TLT",
	"IEF",
	"HYG",
	"LQD",
	"GLD",
	"SLV",
	"USO",
	"DBA",
	"XBI",
	"SMH",
] as const;

export const V3_FROZEN_CONFIRMATION_SYMBOLS = [
	"ACWI",
	"VEA",
	"VWO",
	"SCHD",
	"RSP",
	"IJH",
	"IJR",
	"VGK",
	"EWJ",
	"EWZ",
	"MBB",
	"TIP",
	"SHY",
	"BND",
	"EMB",
	"PDBC",
	"DBC",
	"IAU",
	"GDX",
	"KRE",
] as const;

export const FROZEN_CONFIRMATION_SYMBOLS = [
	...V2_FROZEN_CONFIRMATION_SYMBOLS,
	...V3_FROZEN_CONFIRMATION_SYMBOLS,
] as const;

export const DEFAULT_ANALYSIS_DATASET_SPLIT_RATIOS = {
	train: 0.6,
	validation: 0.2,
	test: 0.2,
} as const;

type BuildDatasetInput = {
	report: DailySwingBatchBacktestReport | DailySwingSetupScanReport;
	generatedAt?: Date;
	additionalExcludedSymbols?: readonly string[];
	splitRatios?: AnalysisDatasetSplitRatios;
};

type CandidateRow = Omit<AnalysisDatasetRow, "split">;

type DatasetOutcomeReport =
	| DailySwingBatchBacktestReport["reports"][number]
	| DailySwingInstrumentSetupScan;

type ValidatedDatasetSource = {
	kind: DailySwingAnalysisDataset["source"]["kind"];
	universeName: string;
	batchVersion: string | null;
	setupScanVersion: string | null;
	reports: DatasetOutcomeReport[];
};

function timestamp(value: string, label: string) {
	const result = new Date(value).getTime();
	if (!Number.isFinite(result)) throw new Error(`${label} must be a valid date`);
	return result;
}

function normalizedSymbols(symbols: readonly string[]) {
	return [...new Set(symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean))]
		.sort((left, right) => left.localeCompare(right));
}

function resolveRatios(
	ratios: AnalysisDatasetSplitRatios | undefined,
): AnalysisDatasetSplitRatios {
	const resolved = ratios ?? DEFAULT_ANALYSIS_DATASET_SPLIT_RATIOS;
	const values = [resolved.train, resolved.validation, resolved.test];
	if (values.some((value) => !Number.isFinite(value) || value <= 0)) {
		throw new Error("All analysis dataset split ratios must be positive");
	}
	if (Math.abs(values.reduce((total, value) => total + value, 0) - 1) > 1e-9) {
		throw new Error("Analysis dataset split ratios must sum to 1");
	}
	return { ...resolved };
}

function features(input: {
	direction: AnalysisDatasetFeatureVector["direction"];
	setupType: AnalysisDatasetFeatureVector["setupType"];
	trendRegime: AnalysisDatasetFeatureVector["trendRegime"];
	volatilityRegime: AnalysisDatasetFeatureVector["volatilityRegime"];
	signalQuality: BacktestSignalQuality;
	signalFeatures: BacktestSignalFeatures | null;
}) {
	if (!input.signalFeatures) {
		throw new Error(
			"A setup lacks signal-time features; regenerate its source with backtest version 1.3.0 or later",
		);
	}
	const vector = {
		direction: input.direction,
		setupType: input.setupType,
		trendRegime: input.trendRegime,
		volatilityRegime: input.volatilityRegime,
		...input.signalQuality,
		...input.signalFeatures,
	};
	const categoricalValues = {
		direction: ["long", "short"],
		setupType: ["pullback", "breakout", "breakdown"],
		trendRegime: ["bullish", "mixed", "bearish"],
		volatilityRegime: ["low", "normal", "high"],
		momentumRegime: ["bullish", "mixed", "bearish"],
		participationRegime: ["weak", "normal", "strong", "unavailable"],
		evidenceStrength: ["weak", "moderate", "strong", "unavailable"],
	} as const;
	for (const [key, allowed] of Object.entries(categoricalValues)) {
		if (!(allowed as readonly unknown[]).includes(vector[key as keyof typeof vector])) {
			throw new Error(`Signal feature ${key} has an unsupported value`);
		}
	}
	const nullableNumeric = new Set([
		"relativeStrength20Percent",
		"relativeStrength60Percent",
		"volumeZScore20",
	]);
	for (const [key, value] of Object.entries(vector)) {
		if (key in categoricalValues) continue;
		if (value === null && nullableNumeric.has(key)) continue;
		if (typeof value !== "number" || !Number.isFinite(value)) {
			throw new Error(`Signal feature ${key} must be a finite number`);
		}
	}
	return vector;
}

function validateOutcomeReports(reports: DatasetOutcomeReport[]) {
	if (!Array.isArray(reports) || reports.length === 0) {
		throw new Error("The dataset source must contain at least one instrument report");
	}
	for (const instrumentReport of reports) {
		if (instrumentReport.backtestVersion !== DAILY_SWING_BACKTEST_VERSION) {
			throw new Error(
				`${instrumentReport.instrument.displaySymbol} uses backtest version ${instrumentReport.backtestVersion}; expected ${DAILY_SWING_BACKTEST_VERSION}`,
			);
		}
		const setupCount =
			instrumentReport.signalCounts.longSetups +
			instrumentReport.signalCounts.shortSetups;
		if (
			setupCount !==
			instrumentReport.trades.length + instrumentReport.untriggeredSetups.length
		) {
			throw new Error(
				`${instrumentReport.instrument.displaySymbol} setup counts do not match its outcome records`,
			);
		}
	}
}

function validateReport(
	report: DailySwingBatchBacktestReport | DailySwingSetupScanReport,
): ValidatedDatasetSource {
	if ("scanVersion" in report) {
		if (
			!SUPPORTED_DAILY_SWING_SETUP_SCAN_VERSIONS.includes(
				report.scanVersion as (typeof SUPPORTED_DAILY_SWING_SETUP_SCAN_VERSIONS)[number],
			)
		) {
			throw new Error(
				`Setup scan version ${report.scanVersion} is not supported; expected one of ${SUPPORTED_DAILY_SWING_SETUP_SCAN_VERSIONS.join(", ")}`,
			);
		}
		if (
			report.methodology?.evaluationPolicy !== "every_eligible_completed_bar" ||
			report.methodology.labelPolicy !== "independent_fixed_equity_simulation"
		) {
			throw new Error("The setup scan does not have exhaustive independent-label provenance");
		}
		validateOutcomeReports(report.reports);
		return {
			kind: "exhaustive_setup_scan",
			universeName: report.universeName,
			batchVersion: null,
			setupScanVersion: report.scanVersion,
			reports: report.reports,
		};
	}
	if (report.batchVersion !== DAILY_SWING_BATCH_BACKTEST_VERSION) {
		throw new Error(
			`Batch report version ${report.batchVersion} is not supported; expected ${DAILY_SWING_BATCH_BACKTEST_VERSION}`,
		);
	}
	if (!Array.isArray(report.reports) || report.reports.length === 0) {
		throw new Error("The batch report must contain at least one instrument report");
	}
	validateOutcomeReports(report.reports);
	return {
		kind: "sequential_backtest",
		universeName: report.universeName,
		batchVersion: report.batchVersion,
		setupScanVersion: null,
		reports: report.reports,
	};
}

function collectRows(
	reports: DatasetOutcomeReport[],
	excludedSymbols: ReadonlySet<string>,
) {
	const rows: CandidateRow[] = [];
	const excludedInstruments: string[] = [];
	let excludedSetupRows = 0;
	for (const instrumentReport of reports) {
		const symbol = instrumentReport.instrument.displaySymbol.trim().toUpperCase();
		const setupCount =
			instrumentReport.trades.length + instrumentReport.untriggeredSetups.length;
		if (excludedSymbols.has(symbol)) {
			excludedInstruments.push(symbol);
			excludedSetupRows += setupCount;
			continue;
		}
		for (const trade of instrumentReport.trades) {
			rows.push({
				rowId: `${trade.instrumentId}|${trade.signalAt}`,
				instrumentId: trade.instrumentId,
				displaySymbol: symbol,
				signalAt: trade.signalAt,
				resolvedAt: trade.exitAt,
				features: features(trade),
				labels: {
					triggered: true,
					profitable: trade.rMultiple > 0,
					netRMultiple: trade.rMultiple,
					exitReason: trade.exitReason,
					targetOneReached: trade.exitFills.some(
						(fill) => fill.reason === "target_1",
					),
					maximumFavorableExcursionPercent:
						trade.maximumFavorableExcursionPercent,
					maximumAdverseExcursionPercent:
						trade.maximumAdverseExcursionPercent,
				},
			});
		}
		for (const setup of instrumentReport.untriggeredSetups) {
			rows.push({
				rowId: `${setup.instrumentId}|${setup.signalAt}`,
				instrumentId: setup.instrumentId,
				displaySymbol: symbol,
				signalAt: setup.signalAt,
				resolvedAt: setup.resolvedAt,
				features: features(setup),
				labels: {
					triggered: false,
					profitable: null,
					netRMultiple: null,
					exitReason:
						setup.reason === "expired"
							? "expired_untriggered"
							: "end_of_data_untriggered",
					targetOneReached: null,
					maximumFavorableExcursionPercent: null,
					maximumAdverseExcursionPercent: null,
				},
			});
		}
	}
	rows.sort(
		(left, right) =>
			timestamp(left.signalAt, `${left.rowId}.signalAt`) -
				timestamp(right.signalAt, `${right.rowId}.signalAt`) ||
			left.displaySymbol.localeCompare(right.displaySymbol) ||
			left.rowId.localeCompare(right.rowId),
	);
	if (new Set(rows.map((row) => row.rowId)).size !== rows.length) {
		throw new Error("Analysis dataset row IDs must be unique");
	}
	for (const row of rows) {
		if (
			timestamp(row.resolvedAt, `${row.rowId}.resolvedAt`) <
			timestamp(row.signalAt, `${row.rowId}.signalAt`)
		) {
			throw new Error(`${row.rowId} resolves before its signal timestamp`);
		}
	}
	return {
		rows,
		excludedInstruments: normalizedSymbols(excludedInstruments),
		excludedSetupRows,
	};
}

function splitSummary(rows: readonly AnalysisDatasetRow[], split: AnalysisDatasetSplit) {
	const selected = rows.filter((row) => row.split === split);
	if (selected.length === 0) {
		throw new Error(`${split} contains no rows after boundary purging`);
	}
	return {
		startsAt: selected[0].signalAt,
		endsAt: selected.at(-1)!.signalAt,
		rows: selected.length,
		signalSessions: new Set(selected.map((row) => row.signalAt)).size,
	};
}

export function buildDailySwingAnalysisDataset(
	input: BuildDatasetInput,
): DailySwingAnalysisDataset {
	const source = validateReport(input.report);
	const generatedAt = input.generatedAt ?? new Date();
	if (Number.isNaN(generatedAt.getTime())) throw new Error("generatedAt must be valid");
	const ratios = resolveRatios(input.splitRatios);
	const additionalSymbols = normalizedSymbols(
		input.additionalExcludedSymbols ?? [],
	);
	const frozenSymbols = normalizedSymbols(FROZEN_CONFIRMATION_SYMBOLS);
	const excludedSymbols = new Set([...frozenSymbols, ...additionalSymbols]);
	const collected = collectRows(source.reports, excludedSymbols);
	const sessions = [...new Set(collected.rows.map((row) => row.signalAt))];
	if (sessions.length < 3) {
		throw new Error(
			"At least three distinct signal sessions are required after symbol exclusions",
		);
	}
	const validationIndex = Math.min(
		Math.max(1, Math.floor(sessions.length * ratios.train)),
		sessions.length - 2,
	);
	const testIndex = Math.min(
		Math.max(validationIndex + 1, Math.floor(sessions.length * (ratios.train + ratios.validation))),
		sessions.length - 1,
	);
	const validationStartsAt = sessions[validationIndex];
	const testStartsAt = sessions[testIndex];
	const validationTimestamp = timestamp(validationStartsAt, "validationStartsAt");
	const testTimestamp = timestamp(testStartsAt, "testStartsAt");
	let purgedBoundaryRows = 0;
	const rows: AnalysisDatasetRow[] = [];
	for (const row of collected.rows) {
		const signalTimestamp = timestamp(row.signalAt, `${row.rowId}.signalAt`);
		const resolvedTimestamp = timestamp(row.resolvedAt, `${row.rowId}.resolvedAt`);
		let split: AnalysisDatasetSplit;
		if (signalTimestamp < validationTimestamp) {
			if (resolvedTimestamp >= validationTimestamp) {
				purgedBoundaryRows += 1;
				continue;
			}
			split = "train";
		} else if (signalTimestamp < testTimestamp) {
			if (resolvedTimestamp >= testTimestamp) {
				purgedBoundaryRows += 1;
				continue;
			}
			split = "validation";
		} else {
			split = "test";
		}
		rows.push({ ...row, split });
	}
	const splits = {
		train: splitSummary(rows, "train"),
		validation: splitSummary(rows, "validation"),
		test: splitSummary(rows, "test"),
	};
	return {
		datasetVersion: DAILY_SWING_ANALYSIS_DATASET_VERSION,
		generatedAt: generatedAt.toISOString(),
		source: {
			kind: source.kind,
			universeName: source.universeName,
			batchVersion: source.batchVersion,
			setupScanVersion: source.setupScanVersion,
			backtestVersions: [
				...new Set(source.reports.map((report) => report.backtestVersion)),
			].sort(),
			engineVersions: [
				...new Set(source.reports.map((report) => report.engineVersion)),
			].sort(),
			strategyVersions: [
				...new Set(source.reports.map((report) => report.strategyVersion)),
			].sort(),
		},
		featureAvailability: {
			asOf: "signalAt",
			policy: "completed_signal_bar_only",
			description:
				"Every feature is snapshotted from completed bars through signalAt; entries, exits, excursions, and later bars are labels only.",
		},
		exclusions: {
			frozenConfirmationSymbols: frozenSymbols,
			additionalSymbols,
			excludedInstruments: collected.excludedInstruments,
			excludedSetupRows: collected.excludedSetupRows,
			purgedBoundaryRows,
		},
		splitPolicy: {
			method: "chronological_signal_sessions_with_resolution_purge",
			ratios,
			validationStartsAt,
			testStartsAt,
			description:
				"Rows are ordered by signal session. Earlier rows whose outcomes resolve on or after the next split begins are purged.",
		},
		splits,
		rows,
	};
}
