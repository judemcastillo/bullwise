import {
	FROZEN_CONFIRMATION_SYMBOLS,
} from "@/lib/analysis/analysis-dataset";
import type {
	AnalysisDatasetFeatureVector,
	AnalysisDatasetLabels,
	AnalysisDatasetSplit,
	AnalysisDatasetSplitSummary,
} from "@/lib/analysis/analysis-dataset.types";
import {
	DAILY_SWING_BACKTEST_VERSION,
	type BacktestSignalFeatures,
	type BacktestSignalQuality,
	type BacktestTrade,
	type UntriggeredSetup,
} from "@/lib/analysis/backtest.types";
import {
	DAILY_SWING_BROAD_DATASET_VERSION,
	DAILY_SWING_BROAD_SPLIT_BOUNDARIES,
	DAILY_SWING_BROAD_SPLIT_POLICY_VERSION,
	DAILY_SWING_BROAD_SETUP_SCAN_SHA256,
	DAILY_SWING_BROAD_WALK_FORWARD_FOLDS,
	type DailySwingBroadDataset,
	type DailySwingBroadDatasetRow,
	type DailySwingBroadFeatureVector,
	type DailySwingBroadWalkForwardFold,
} from "@/lib/analysis/broad-dataset.types";
import {
	BROAD_DEVELOPMENT_SYMBOLS,
	BROAD_DEVELOPMENT_UNIVERSE_NAME,
} from "@/lib/analysis/broad-development-universe";
import {
	DAILY_SWING_OBJECTIVE_FEATURE_VERSION,
	type DailySwingObjectiveFeatureValues,
} from "@/lib/analysis/objective-features.types";
import {
	DAILY_SWING_SETUP_SCAN_VERSION,
	type DailySwingInstrumentSetupScan,
	type DailySwingSetupResearchPolicy,
	type DailySwingSetupScanReport,
} from "@/lib/analysis/setup-scan.types";
import {
	DAILY_SWING_STRATEGY_VERSION,
	TECHNICAL_ANALYSIS_ENGINE_VERSION,
} from "@/lib/analysis/technical-analysis.types";

const BASE_NULLABLE_FEATURES = new Set([
	"relativeStrength20Percent",
	"relativeStrength60Percent",
	"volumeZScore20",
]);

const OBJECTIVE_FEATURE_KEYS = [
	"medianDollarVolume20",
	"medianDollarVolume60",
	"missingOrZeroVolumeRate20",
	"dollarVolumePercentile252",
	"amihudIlliquidity20PerBillion",
	"bodyToRange",
	"upperWickToRange",
	"lowerWickToRange",
	"closeLocationInRange",
	"overnightGapAtr",
	"rangeAtr",
	"rangeCompression20",
	"directionalFollowThrough3Atr",
	"breakoutDisplacementAtr",
	"entryToNearestSupportAtr",
	"entryToNearestResistanceAtr",
	"nearestSupportPivotTouches",
	"nearestResistancePivotTouches",
	"supportZoneTouches120",
	"supportZoneRejections120",
	"resistanceZoneTouches120",
	"resistanceZoneRejections120",
	"volumePercentile252",
	"relativeVolume20",
	"volumeToPriceMove20",
] as const satisfies readonly (keyof DailySwingObjectiveFeatureValues)[];

const OBJECTIVE_NULLABLE_FEATURES = new Set<keyof DailySwingObjectiveFeatureValues>([
	"medianDollarVolume20",
	"medianDollarVolume60",
	"dollarVolumePercentile252",
	"amihudIlliquidity20PerBillion",
	"rangeCompression20",
	"breakoutDisplacementAtr",
	"entryToNearestSupportAtr",
	"entryToNearestResistanceAtr",
	"nearestSupportPivotTouches",
	"nearestResistancePivotTouches",
	"supportZoneTouches120",
	"supportZoneRejections120",
	"resistanceZoneTouches120",
	"resistanceZoneRejections120",
	"volumePercentile252",
	"relativeVolume20",
	"volumeToPriceMove20",
]);

type Outcome = BacktestTrade | UntriggeredSetup;
export type DailySwingBroadCandidateRow = Omit<
	DailySwingBroadDatasetRow,
	"split"
>;

function timestamp(value: string, label: string) {
	const result = new Date(value).getTime();
	if (!Number.isFinite(result)) throw new Error(`${label} must be a valid date`);
	return result;
}

function requireSha256(value: string) {
	const normalized = value.trim().toLowerCase();
	if (!/^[a-f0-9]{64}$/.test(normalized)) {
		throw new Error("setupScanSha256 must be a 64-character hexadecimal SHA-256");
	}
	return normalized;
}

function baseFeatures(input: {
	direction: AnalysisDatasetFeatureVector["direction"];
	setupType: AnalysisDatasetFeatureVector["setupType"];
	trendRegime: AnalysisDatasetFeatureVector["trendRegime"];
	volatilityRegime: AnalysisDatasetFeatureVector["volatilityRegime"];
	signalQuality: BacktestSignalQuality;
	signalFeatures: BacktestSignalFeatures | null;
}) {
	if (!input.signalFeatures) {
		throw new Error("A broad setup lacks its base signal-time feature snapshot");
	}
	const features = {
		direction: input.direction,
		setupType: input.setupType,
		trendRegime: input.trendRegime,
		volatilityRegime: input.volatilityRegime,
		...input.signalQuality,
		...input.signalFeatures,
	} satisfies AnalysisDatasetFeatureVector;
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
		if (!(allowed as readonly unknown[]).includes(features[key as keyof typeof features])) {
			throw new Error(`Signal feature ${key} has an unsupported value`);
		}
	}
	for (const [key, value] of Object.entries(features)) {
		if (key in categoricalValues) continue;
		if (value === null && BASE_NULLABLE_FEATURES.has(key)) continue;
		if (typeof value !== "number" || !Number.isFinite(value)) {
			throw new Error(`Signal feature ${key} must be finite`);
		}
	}
	return features;
}

function objectiveFeatures(value: DailySwingObjectiveFeatureValues) {
	const actualKeys = Object.keys(value).sort();
	const expectedKeys = [...OBJECTIVE_FEATURE_KEYS].sort();
	if (
		actualKeys.length !== expectedKeys.length ||
		actualKeys.some((key, index) => key !== expectedKeys[index])
	) {
		throw new Error("Objective feature keys do not match schema 1.0.0");
	}
	for (const key of OBJECTIVE_FEATURE_KEYS) {
		const feature = value[key];
		if (feature === null && OBJECTIVE_NULLABLE_FEATURES.has(key)) continue;
		if (typeof feature !== "number" || !Number.isFinite(feature)) {
			throw new Error(`Objective feature ${key} must be finite or schema-nullable`);
		}
	}
	return { ...value };
}

function labels(outcome: Outcome): AnalysisDatasetLabels {
	if ("entryAt" in outcome) {
		return {
			triggered: true,
			profitable: outcome.rMultiple > 0,
			netRMultiple: outcome.rMultiple,
			exitReason: outcome.exitReason,
			targetOneReached: outcome.exitFills.some(
				(fill) => fill.reason === "target_1",
			),
			maximumFavorableExcursionPercent:
				outcome.maximumFavorableExcursionPercent,
			maximumAdverseExcursionPercent:
				outcome.maximumAdverseExcursionPercent,
		};
	}
	return {
		triggered: false,
		profitable: null,
		netRMultiple: null,
		exitReason:
			outcome.reason === "expired"
				? "expired_untriggered"
				: "end_of_data_untriggered",
		targetOneReached: null,
		maximumFavorableExcursionPercent: null,
		maximumAdverseExcursionPercent: null,
	};
}

function resolvedAt(outcome: Outcome) {
	return "entryAt" in outcome ? outcome.exitAt : outcome.resolvedAt;
}

function validateSource(report: DailySwingSetupScanReport) {
	if (report.scanVersion !== DAILY_SWING_SETUP_SCAN_VERSION) {
		throw new Error(`Broad dataset requires setup scan ${DAILY_SWING_SETUP_SCAN_VERSION}`);
	}
	if (
		report.universeName !== BROAD_DEVELOPMENT_UNIVERSE_NAME ||
		report.methodology.researchPolicy !== "broad_development_v1" ||
		report.methodology.evaluationPolicy !== "every_eligible_completed_bar" ||
		report.methodology.labelPolicy !== "independent_fixed_equity_simulation"
	) {
		throw new Error("Broad dataset source does not match the frozen scan methodology");
	}
	if (
		report.aggregate.candidatesReceived !== BROAD_DEVELOPMENT_SYMBOLS.length ||
		report.aggregate.instrumentsScanned !== BROAD_DEVELOPMENT_SYMBOLS.length - 1 ||
		report.aggregate.coverageExcluded !== 1 ||
		report.reports.length !== report.aggregate.instrumentsScanned
	) {
		throw new Error("Broad dataset source does not match frozen coverage counts");
	}
	const symbols = report.reports.map((item) => item.instrument.displaySymbol.toUpperCase());
	const expectedSymbols = BROAD_DEVELOPMENT_SYMBOLS.filter((symbol) => symbol !== "JNK");
	if (
		new Set(symbols).size !== symbols.length ||
		expectedSymbols.some((symbol) => !symbols.includes(symbol)) ||
		symbols.some((symbol) => !expectedSymbols.includes(symbol as never))
	) {
		throw new Error("Broad dataset source instruments do not match the frozen coverage result");
	}
}

export function collectDailySwingBroadRows(
	reports: readonly DailySwingInstrumentSetupScan[],
	researchPolicy: Exclude<DailySwingSetupResearchPolicy, "none">,
) {
	const rows: DailySwingBroadCandidateRow[] = [];
	let featureRecords = 0;
	let liquidityRejected = 0;
	for (const report of reports) {
		if (
			report.backtestVersion !== DAILY_SWING_BACKTEST_VERSION ||
			report.engineVersion !== TECHNICAL_ANALYSIS_ENGINE_VERSION ||
			report.strategyVersion !== DAILY_SWING_STRATEGY_VERSION ||
			report.eligibility.researchPolicy !== researchPolicy
		) {
			throw new Error(`${report.instrument.displaySymbol} has incompatible provenance`);
		}
		const bySignal = new Map(
			report.objectiveFeatures.map((record) => [record.signalAt, record]),
		);
		if (bySignal.size !== report.objectiveFeatures.length) {
			throw new Error(`${report.instrument.displaySymbol} has duplicate feature timestamps`);
		}
		featureRecords += report.objectiveFeatures.length;
		const rejected = report.objectiveFeatures.filter(
			(record) => !record.snapshot.liquidity.eligible,
		).length;
		liquidityRejected += rejected;
		if (
			report.objectiveFeatures.length !== report.eligibility.setupsEvaluated ||
			rejected !== report.eligibility.liquidityRejected
		) {
			throw new Error(`${report.instrument.displaySymbol} liquidity counts do not reconcile`);
		}
		const outcomes: Outcome[] = [...report.trades, ...report.untriggeredSetups];
		if (
			outcomes.length !==
			report.signalCounts.longSetups + report.signalCounts.shortSetups
		) {
			throw new Error(`${report.instrument.displaySymbol} outcome counts do not reconcile`);
		}
		const usedSignals = new Set<string>();
		for (const outcome of outcomes) {
			const record = bySignal.get(outcome.signalAt);
			if (
				!record ||
				record.instrumentId !== outcome.instrumentId ||
				record.snapshot.signalAt !== outcome.signalAt ||
				record.snapshot.featureVersion !== DAILY_SWING_OBJECTIVE_FEATURE_VERSION ||
				!record.snapshot.liquidity.eligible
			) {
				throw new Error(`${outcome.instrumentId}|${outcome.signalAt} lacks one eligible feature snapshot`);
			}
			if (usedSignals.has(outcome.signalAt)) {
				throw new Error(`${outcome.instrumentId}|${outcome.signalAt} has duplicate outcomes`);
			}
			usedSignals.add(outcome.signalAt);
			const resolution = resolvedAt(outcome);
			if (timestamp(resolution, "resolvedAt") < timestamp(outcome.signalAt, "signalAt")) {
				throw new Error(`${outcome.instrumentId}|${outcome.signalAt} resolves before its signal`);
			}
			rows.push({
				rowId: `${outcome.instrumentId}|${outcome.signalAt}`,
				instrumentId: outcome.instrumentId,
				displaySymbol: report.instrument.displaySymbol.toUpperCase(),
				signalAt: outcome.signalAt,
				resolvedAt: resolution,
				features: {
					...baseFeatures(outcome),
					...objectiveFeatures(record.snapshot.features),
				} satisfies DailySwingBroadFeatureVector,
				labels: labels(outcome),
			});
		}
		for (const record of report.objectiveFeatures) {
			if (record.snapshot.liquidity.eligible !== usedSignals.has(record.signalAt)) {
				throw new Error(`${report.instrument.displaySymbol} has an unjoined eligibility record`);
			}
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
		throw new Error("Broad dataset row IDs must be unique");
	}
	return { rows, featureRecords, liquidityRejected };
}

function summary(
	rows: readonly Pick<DailySwingBroadDatasetRow, "signalAt">[],
	label: string,
): AnalysisDatasetSplitSummary {
	if (rows.length === 0) throw new Error(`${label} has no rows`);
	return {
		startsAt: rows[0].signalAt,
		endsAt: rows.at(-1)!.signalAt,
		rows: rows.length,
		signalSessions: new Set(rows.map((row) => row.signalAt)).size,
	};
}

function buildWalkForwardFolds(rows: readonly DailySwingBroadCandidateRow[]) {
	return DAILY_SWING_BROAD_WALK_FORWARD_FOLDS.map((policy) => {
		const startsAt = timestamp(policy.evaluationStartsAt, `${policy.foldId}.startsAt`);
		const endsBefore = timestamp(policy.evaluationEndsBefore, `${policy.foldId}.endsBefore`);
		const fitCandidates = rows.filter(
			(row) => timestamp(row.signalAt, `${row.rowId}.signalAt`) < startsAt,
		);
		const fit = fitCandidates.filter(
			(row) => timestamp(row.resolvedAt, `${row.rowId}.resolvedAt`) < startsAt,
		);
		const evaluationCandidates = rows.filter((row) => {
			const signal = timestamp(row.signalAt, `${row.rowId}.signalAt`);
			return signal >= startsAt && signal < endsBefore;
		});
		const evaluation = evaluationCandidates.filter(
			(row) => timestamp(row.resolvedAt, `${row.rowId}.resolvedAt`) < endsBefore,
		);
		return {
			foldId: policy.foldId,
			fit: summary(fit, `${policy.foldId}.fit`),
			evaluation: summary(evaluation, `${policy.foldId}.evaluation`),
			boundaries: {
				evaluationStartsAt: policy.evaluationStartsAt,
				evaluationEndsBefore: policy.evaluationEndsBefore,
			},
			purgedFitBoundaryRows: fitCandidates.length - fit.length,
			purgedEvaluationBoundaryRows:
				evaluationCandidates.length - evaluation.length,
		} satisfies DailySwingBroadWalkForwardFold;
	});
}

export function applyDailySwingBroadSplitPolicy<
	T extends DailySwingBroadCandidateRow,
>(candidateRows: readonly T[]) {
	const collectedRows = [...candidateRows].sort(
		(left, right) =>
			timestamp(left.signalAt, `${left.rowId}.signalAt`) -
				timestamp(right.signalAt, `${right.rowId}.signalAt`) ||
			left.displaySymbol.localeCompare(right.displaySymbol) ||
			left.rowId.localeCompare(right.rowId),
	);
	if (new Set(collectedRows.map((row) => row.rowId)).size !== collectedRows.length) {
		throw new Error("Broad dataset row IDs must be unique across all sources");
	}
	const validationStartsAt = timestamp(
		DAILY_SWING_BROAD_SPLIT_BOUNDARIES.validationStartsAt,
		"validationStartsAt",
	);
	const testStartsAt = timestamp(
		DAILY_SWING_BROAD_SPLIT_BOUNDARIES.testStartsAt,
		"testStartsAt",
	);
	let purgedFinalBoundaryRows = 0;
	const rows: Array<T & { split: AnalysisDatasetSplit }> = [];
	for (const row of collectedRows) {
		const signal = timestamp(row.signalAt, `${row.rowId}.signalAt`);
		const resolution = timestamp(row.resolvedAt, `${row.rowId}.resolvedAt`);
		let split: AnalysisDatasetSplit;
		if (signal < validationStartsAt) {
			if (resolution >= validationStartsAt) {
				purgedFinalBoundaryRows += 1;
				continue;
			}
			split = "train";
		} else if (signal < testStartsAt) {
			if (resolution >= testStartsAt) {
				purgedFinalBoundaryRows += 1;
				continue;
			}
			split = "validation";
		} else {
			split = "test";
		}
		rows.push({ ...row, split });
	}
	const trainRows = rows.filter((row) => row.split === "train");
	const validationRows = rows.filter((row) => row.split === "validation");
	const testRows = rows.filter((row) => row.split === "test");
	const developmentRows = collectedRows.filter(
		(row) => timestamp(row.signalAt, `${row.rowId}.signalAt`) < validationStartsAt,
	);
	return {
		rows,
		purgedFinalBoundaryRows,
		walkForwardFolds: buildWalkForwardFolds(developmentRows),
		splits: {
			train: summary(trainRows, "train"),
			validation: summary(validationRows, "validation"),
			test: summary(testRows, "test"),
		},
	};
}

export function buildDailySwingBroadDataset(input: {
	report: DailySwingSetupScanReport;
	setupScanSha256: string;
	generatedAt?: Date;
}): DailySwingBroadDataset {
	validateSource(input.report);
	const setupScanSha256 = requireSha256(input.setupScanSha256);
	if (setupScanSha256 !== DAILY_SWING_BROAD_SETUP_SCAN_SHA256) {
		throw new Error("Broad dataset source checksum does not match the frozen setup scan");
	}
	const generatedAt = input.generatedAt ?? new Date();
	if (Number.isNaN(generatedAt.getTime())) throw new Error("generatedAt must be valid");
	const collected = collectDailySwingBroadRows(
		input.report.reports,
		"broad_development_v1",
	);
	if (
		collected.featureRecords !==
			input.report.aggregate.setups + input.report.aggregate.liquidityRejected ||
		collected.liquidityRejected !== input.report.aggregate.liquidityRejected ||
		collected.rows.length !== input.report.aggregate.setups
	) {
		throw new Error("Broad aggregate feature and outcome counts do not reconcile");
	}
	const split = applyDailySwingBroadSplitPolicy(collected.rows);
	return {
		datasetVersion: DAILY_SWING_BROAD_DATASET_VERSION,
		generatedAt: generatedAt.toISOString(),
		source: {
			setupScanSha256,
			setupScanVersion: "2.0.0",
			objectiveFeatureVersion: "1.0.0",
			universeName: BROAD_DEVELOPMENT_UNIVERSE_NAME,
			backtestVersions: [DAILY_SWING_BACKTEST_VERSION],
			engineVersions: [TECHNICAL_ANALYSIS_ENGINE_VERSION],
			strategyVersions: [DAILY_SWING_STRATEGY_VERSION],
		},
		featureAvailability: {
			asOf: "signalAt",
			policy: "completed_signal_bar_only",
			instrumentIdentityUsedAsFeature: false,
			description:
				"Base and objective features are joined only at the same instrument and signal timestamp. Later fills, exits, excursions, and bars remain labels only.",
		},
		eligibility: {
			coverageExcludedInstruments: input.report.aggregate.coverageExcluded,
			liquidityRejectedSetups: collected.liquidityRejected,
			eligibleOutcomeRowsBeforeBoundaryPurge: collected.rows.length,
		},
		splitPolicy: {
			version: DAILY_SWING_BROAD_SPLIT_POLICY_VERSION,
			method: "fixed_calendar_expanding_walk_forward_with_resolution_purge",
			validationStartsAt:
				DAILY_SWING_BROAD_SPLIT_BOUNDARIES.validationStartsAt,
			testStartsAt: DAILY_SWING_BROAD_SPLIT_BOUNDARIES.testStartsAt,
			purgedFinalBoundaryRows: split.purgedFinalBoundaryRows,
			episodeSelection: "independently_within_each_fold_and_final_split",
			description:
				"Final splits use frozen calendar boundaries and purge outcomes crossing the next split. Expanding walk-forward folds are confined to train and apply the same resolution purge.",
		},
		walkForwardFolds: split.walkForwardFolds,
		splits: split.splits,
		rows: split.rows,
		warnings: [
			"Row counts are source inventory, not independent sample counts; overlapping signals remain correlated.",
			"Do not aggregate or inspect validation/test labels before the corresponding preregistered evaluation is authorized.",
			`Previously consumed confirmation symbols remain outside this frozen universe: ${FROZEN_CONFIRMATION_SYMBOLS.length} symbols.`,
		],
	};
}
