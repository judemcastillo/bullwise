import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { DailySwingBroadFeatureVector } from "@/lib/analysis/broad-dataset.types";
import type { DailySwingCombinedBroadFoldDataset } from "@/lib/analysis/combined-broad-fold-dataset.types";
import {
	COMBINED_BROAD_CATEGORICAL_FEATURES,
	COMBINED_BROAD_NUMERIC_FEATURES,
} from "@/lib/analysis/combined-broad-model-features";
import { runDailySwingCombinedBroadStrategyTargetAudit } from "@/lib/analysis/combined-broad-strategy-target-audit-runner";
import { DAILY_SWING_COMBINED_BROAD_STRATEGY_TARGET_AUDIT_PROTOCOL } from "@/lib/analysis/combined-broad-strategy-target-audit";

function features(direction: "long" | "short", setupType: "pullback" | "breakdown") {
	const result = Object.fromEntries(
		COMBINED_BROAD_NUMERIC_FEATURES.map((name) => [name, 0]),
	) as unknown as DailySwingBroadFeatureVector;
	for (const [name, categories] of Object.entries(
		COMBINED_BROAD_CATEGORICAL_FEATURES,
	)) {
		(result as unknown as Record<string, unknown>)[name] = categories[0];
	}
	result.direction = direction;
	result.setupType = setupType;
	return result;
}

function syntheticDataset(): DailySwingCombinedBroadFoldDataset {
	const partitions = [
		{ id: "evaluate_2020_evaluation" as const, rows: 900 },
		{ id: "evaluate_2021_evaluation" as const, rows: 900 },
		{ id: "evaluate_2022_evaluation" as const, rows: 896 },
	];
	const rows = partitions.flatMap((partition) =>
		Array.from({ length: partition.rows }, (_, index) => {
			const stableCandidate = index % 2 === 0;
			const positive = stableCandidate ? index % 10 < 6 : index % 10 < 4;
			const setupUtilityR = positive ? 1 : -1;
			return {
				rowId: `${partition.id}-${index}`,
				instrumentId: `fixture:${index % 20}`,
				displaySymbol: `F${index % 20}`,
				sourceScan: index % 3 === 0 ? ("expansion" as const) : ("base" as const),
				signalAt: "2020-01-02T05:00:00.000Z",
				resolvedAt: "2020-01-03T05:00:00.000Z",
				features: stableCandidate
					? features("long", "pullback")
					: features("short", "breakdown"),
				targets: {
					actionableSuccess: setupUtilityR >= 0.5,
					setupUtilityR,
				},
				partitionId: partition.id,
			};
		}),
	);
	return {
		datasetVersion: "1.0.0",
		generatedAt: "2026-08-20T00:00:00.000Z",
		source: {
			combinedBroadDatasetVersion: "3.0.0",
			combinedBroadDatasetSha256:
				"3ce82ae982ef3ac39df72fc3205788536e907cb187db061995c53730ab9b2030",
			finalEpisodeDatasetSha256:
				"0233cf9961e916e3079694ce0c887ba7f38ca4b5870271e9e769b563abea2a6b",
			trainSourceRows: 60_381,
			validationSourceRows: 25_935,
			testSourceRows: 25_082,
		},
		materializationPolicy: {
			materializedSplit: "train",
			episodeSelection: "independently_within_each_partition",
			validationFeaturesDeserialized: false,
			validationLabelsDeserialized: false,
			testFeaturesDeserialized: false,
			testLabelsDeserialized: false,
		},
		partitions: partitions.map((partition) => ({
			partitionId: partition.id,
			foldId: partition.id.replace("_evaluation", "") as
				| "evaluate_2020"
				| "evaluate_2021"
				| "evaluate_2022",
			role: "evaluation" as const,
			sourceRows: partition.rows,
			episodeRows: partition.rows,
		})),
		rows,
		warnings: [],
	};
}

function run(dataset = syntheticDataset()) {
	const protocol = DAILY_SWING_COMBINED_BROAD_STRATEGY_TARGET_AUDIT_PROTOCOL;
	return runDailySwingCombinedBroadStrategyTargetAudit({
		dataset,
		datasetSha256: protocol.sources.foldDataset.sha256,
		trainDiagnosticReportSha256: protocol.sources.trainDiagnosticReport.sha256,
		trainDiagnosticReport: {
			nextResearchDecision: {
				status: "revisit_strategy_target_or_signal_time_features",
			},
		},
		generatedAt: new Date("2026-08-20T12:00:00.000Z"),
	});
}

describe("combined broad strategy and target audit runner", () => {
	it("nominates only a cohort passing every frozen train-only gate", () => {
		const report = run();
		assert.equal(report.dataAccess.rows, 2_696);
		assert.equal(report.targetConsistency.passed, true);
		assert.equal(report.targetCompression.flagged, false);
		assert.deepEqual(report.decision.nominatedCandidates, ["long|pullback"]);
		assert.equal(
			report.decision.status,
			"nominate_for_separate_strategy_experiment",
		);
		const passing = report.strategyCandidates.find(
			(candidate) => candidate.cohort === "long|pullback",
		);
		const failing = report.strategyCandidates.find(
			(candidate) => candidate.cohort === "short|breakdown",
		);
		assert.equal(passing?.nominated, true);
		assert.equal(failing?.nominated, false);
		assert.ok(passing?.gates.every((gate) => gate.passed));
		assert.equal(report.decision.authorizesStrategyChange, false);
		assert.equal(report.decision.authorizesModelFitting, false);
		assert.equal(report.decision.authorizesValidationAccess, false);
		assert.ok(report.cohorts.every((cohort) => !("symbol" in cohort)));
	});

	it("fails closed when the target identity or frozen inputs change", () => {
		const dataset = syntheticDataset();
		dataset.rows[0].targets.actionableSuccess =
			!dataset.rows[0].targets.actionableSuccess;
		assert.throws(() => run(dataset), /violates the frozen actionable-success identity/);
		const protocol = DAILY_SWING_COMBINED_BROAD_STRATEGY_TARGET_AUDIT_PROTOCOL;
		assert.throws(
			() =>
				runDailySwingCombinedBroadStrategyTargetAudit({
					dataset: syntheticDataset(),
					datasetSha256: "changed",
					trainDiagnosticReportSha256:
						protocol.sources.trainDiagnosticReport.sha256,
					trainDiagnosticReport: {
						nextResearchDecision: {
							status: "revisit_strategy_target_or_signal_time_features",
						},
					},
				}),
			/checksum does not match/,
		);
	});
});
