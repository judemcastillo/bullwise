import { FROZEN_CONFIRMATION_SYMBOLS } from "@/lib/analysis/analysis-dataset";
import {
	applyDailySwingBroadSplitPolicy,
	collectDailySwingBroadRows,
} from "@/lib/analysis/broad-dataset";
import {
	DAILY_SWING_BROAD_SETUP_SCAN_SHA256,
	DAILY_SWING_BROAD_SPLIT_BOUNDARIES,
	DAILY_SWING_BROAD_SPLIT_POLICY_VERSION,
} from "@/lib/analysis/broad-dataset.types";
import {
	BROAD_DEVELOPMENT_SYMBOLS,
	BROAD_DEVELOPMENT_UNIVERSE_NAME,
} from "@/lib/analysis/broad-development-universe";
import {
	BROAD_DEVELOPMENT_V2_EXPANSION_NAME,
	BROAD_DEVELOPMENT_V2_EXPANSION_SOURCE_SHA256,
	BROAD_DEVELOPMENT_V2_EXPANSION_SYMBOLS,
} from "@/lib/analysis/broad-development-v2-universe";
import {
	DAILY_SWING_BROAD_EXPANSION_SETUP_SCAN_SHA256,
	DAILY_SWING_COMBINED_BROAD_DATASET_VERSION,
	DAILY_SWING_COMBINED_BROAD_UNIVERSE_NAME,
	type DailySwingCombinedBroadDataset,
	type DailySwingCombinedBroadSourceScan,
} from "@/lib/analysis/combined-broad-dataset.types";
import { DAILY_SWING_OBJECTIVE_FEATURE_VERSION } from "@/lib/analysis/objective-features.types";
import {
	DAILY_SWING_SETUP_SCAN_VERSION,
	type DailySwingSetupResearchPolicy,
	type DailySwingSetupScanReport,
} from "@/lib/analysis/setup-scan.types";
import { DAILY_SWING_BACKTEST_VERSION } from "@/lib/analysis/backtest.types";
import {
	DAILY_SWING_STRATEGY_VERSION,
	TECHNICAL_ANALYSIS_ENGINE_VERSION,
} from "@/lib/analysis/technical-analysis.types";

type FrozenSource = {
	sourceScan: DailySwingCombinedBroadSourceScan;
	report: DailySwingSetupScanReport;
	actualSha256: string;
	expectedSha256: string;
	universeName: string;
	researchPolicy: Exclude<DailySwingSetupResearchPolicy, "none">;
	candidates: readonly string[];
	excludedSymbols: readonly string[];
	expectedHistorySha256?: string;
};

function requireSha256(actual: string, expected: string, label: string) {
	const normalized = actual.trim().toLowerCase();
	if (!/^[a-f0-9]{64}$/.test(normalized) || normalized !== expected) {
		throw new Error(`${label} checksum does not match its frozen setup scan`);
	}
	return normalized;
}

function validateSource(source: FrozenSource) {
	const sha256 = requireSha256(
		source.actualSha256,
		source.expectedSha256,
		source.sourceScan,
	);
	const { report } = source;
	if (
		report.scanVersion !== DAILY_SWING_SETUP_SCAN_VERSION ||
		report.universeName !== source.universeName ||
		report.methodology.researchPolicy !== source.researchPolicy ||
		report.methodology.evaluationPolicy !== "every_eligible_completed_bar" ||
		report.methodology.labelPolicy !== "independent_fixed_equity_simulation"
	) {
		throw new Error(`${source.sourceScan} source methodology is not frozen`);
	}
	if (
		source.expectedHistorySha256 &&
		report.sourceSha256 !== source.expectedHistorySha256
	) {
		throw new Error(`${source.sourceScan} source history checksum is not frozen`);
	}
	const expectedSymbols = source.candidates.filter(
		(symbol) => !source.excludedSymbols.includes(symbol),
	);
	const actualSymbols = report.reports.map((item) =>
		item.instrument.displaySymbol.trim().toUpperCase(),
	);
	if (
		report.aggregate.candidatesReceived !== source.candidates.length ||
		report.aggregate.instrumentsScanned !== expectedSymbols.length ||
		report.aggregate.coverageExcluded !== source.excludedSymbols.length ||
		report.reports.length !== expectedSymbols.length ||
		JSON.stringify(actualSymbols) !== JSON.stringify(expectedSymbols)
	) {
		throw new Error(`${source.sourceScan} source coverage inventory is not frozen`);
	}
	const collected = collectDailySwingBroadRows(
		report.reports,
		source.researchPolicy,
	);
	if (
		collected.featureRecords !==
			report.aggregate.setups + report.aggregate.liquidityRejected ||
		collected.liquidityRejected !== report.aggregate.liquidityRejected ||
		collected.rows.length !== report.aggregate.setups
	) {
		throw new Error(`${source.sourceScan} aggregate rows do not reconcile`);
	}
	return { sha256, collected };
}

export function buildDailySwingCombinedBroadDataset(input: {
	baseReport: DailySwingSetupScanReport;
	baseSetupScanSha256: string;
	expansionReport: DailySwingSetupScanReport;
	expansionSetupScanSha256: string;
	generatedAt?: Date;
}): DailySwingCombinedBroadDataset {
	const generatedAt = input.generatedAt ?? new Date();
	if (Number.isNaN(generatedAt.getTime())) throw new Error("generatedAt must be valid");
	const base = validateSource({
		sourceScan: "base",
		report: input.baseReport,
		actualSha256: input.baseSetupScanSha256,
		expectedSha256: DAILY_SWING_BROAD_SETUP_SCAN_SHA256,
		universeName: BROAD_DEVELOPMENT_UNIVERSE_NAME,
		researchPolicy: "broad_development_v1",
		candidates: BROAD_DEVELOPMENT_SYMBOLS,
		excludedSymbols: ["JNK"],
	});
	const expansion = validateSource({
		sourceScan: "expansion",
		report: input.expansionReport,
		actualSha256: input.expansionSetupScanSha256,
		expectedSha256: DAILY_SWING_BROAD_EXPANSION_SETUP_SCAN_SHA256,
		universeName: BROAD_DEVELOPMENT_V2_EXPANSION_NAME,
		researchPolicy: "broad_development_v2_expansion",
		candidates: BROAD_DEVELOPMENT_V2_EXPANSION_SYMBOLS,
		excludedSymbols: ["GDXJ", "OIH"],
		expectedHistorySha256: BROAD_DEVELOPMENT_V2_EXPANSION_SOURCE_SHA256,
	});
	const split = applyDailySwingBroadSplitPolicy([
		...base.collected.rows.map((row) => ({ ...row, sourceScan: "base" as const })),
		...expansion.collected.rows.map((row) => ({
			...row,
			sourceScan: "expansion" as const,
		})),
	]);
	const bySource = {
		base: {
			coverageExcludedInstruments: input.baseReport.aggregate.coverageExcluded,
			liquidityRejectedSetups: base.collected.liquidityRejected,
			eligibleOutcomeRowsBeforeBoundaryPurge: base.collected.rows.length,
		},
		expansion: {
			coverageExcludedInstruments:
				input.expansionReport.aggregate.coverageExcluded,
			liquidityRejectedSetups: expansion.collected.liquidityRejected,
			eligibleOutcomeRowsBeforeBoundaryPurge: expansion.collected.rows.length,
		},
	};
	return {
		datasetVersion: DAILY_SWING_COMBINED_BROAD_DATASET_VERSION,
		generatedAt: generatedAt.toISOString(),
		source: {
			universeName: DAILY_SWING_COMBINED_BROAD_UNIVERSE_NAME,
			scans: [
				{
					sourceScan: "base",
					universeName: BROAD_DEVELOPMENT_UNIVERSE_NAME,
					setupScanSha256: base.sha256,
					setupScanVersion: DAILY_SWING_SETUP_SCAN_VERSION,
					researchPolicy: "broad_development_v1",
					candidatesReceived: input.baseReport.aggregate.candidatesReceived,
					instrumentsScanned: input.baseReport.aggregate.instrumentsScanned,
					coverageExcluded: input.baseReport.aggregate.coverageExcluded,
				},
				{
					sourceScan: "expansion",
					universeName: BROAD_DEVELOPMENT_V2_EXPANSION_NAME,
					setupScanSha256: expansion.sha256,
					setupScanVersion: DAILY_SWING_SETUP_SCAN_VERSION,
					researchPolicy: "broad_development_v2_expansion",
					candidatesReceived:
						input.expansionReport.aggregate.candidatesReceived,
					instrumentsScanned:
						input.expansionReport.aggregate.instrumentsScanned,
					coverageExcluded:
						input.expansionReport.aggregate.coverageExcluded,
				},
			],
			objectiveFeatureVersion: DAILY_SWING_OBJECTIVE_FEATURE_VERSION,
			backtestVersions: [DAILY_SWING_BACKTEST_VERSION],
			engineVersions: [TECHNICAL_ANALYSIS_ENGINE_VERSION],
			strategyVersions: [DAILY_SWING_STRATEGY_VERSION],
		},
		featureAvailability: {
			asOf: "signalAt",
			policy: "completed_signal_bar_only",
			instrumentIdentityUsedAsFeature: false,
			description:
				"Both sources use the same signal-time base and objective feature schemas. Source identity remains row provenance and is not a model feature.",
		},
		eligibility: {
			coverageExcludedInstruments:
				bySource.base.coverageExcludedInstruments +
				bySource.expansion.coverageExcludedInstruments,
			liquidityRejectedSetups:
				bySource.base.liquidityRejectedSetups +
				bySource.expansion.liquidityRejectedSetups,
			eligibleOutcomeRowsBeforeBoundaryPurge:
				bySource.base.eligibleOutcomeRowsBeforeBoundaryPurge +
				bySource.expansion.eligibleOutcomeRowsBeforeBoundaryPurge,
			bySource,
		},
		splitPolicy: {
			version: DAILY_SWING_BROAD_SPLIT_POLICY_VERSION,
			method: "fixed_calendar_expanding_walk_forward_with_resolution_purge",
			validationStartsAt: DAILY_SWING_BROAD_SPLIT_BOUNDARIES.validationStartsAt,
			testStartsAt: DAILY_SWING_BROAD_SPLIT_BOUNDARIES.testStartsAt,
			purgedFinalBoundaryRows: split.purgedFinalBoundaryRows,
			episodeSelection: "independently_within_each_fold_and_final_split",
			description:
				"Both frozen sources are joined before applying the unchanged calendar boundaries and outcome-resolution purges.",
		},
		walkForwardFolds: split.walkForwardFolds,
		splits: split.splits,
		rows: split.rows,
		warnings: [
			"Row counts are source inventory, not independent sample counts; overlapping signals remain correlated.",
			"Source-scan provenance is retained per row but is not a model input.",
			"Do not aggregate or inspect validation/test labels before the corresponding preregistered evaluation is authorized.",
			`Previously consumed confirmation symbols remain outside both sources: ${FROZEN_CONFIRMATION_SYMBOLS.length} symbols.`,
		],
	};
}
