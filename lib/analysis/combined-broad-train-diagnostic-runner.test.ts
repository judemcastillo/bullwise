import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { DailySwingBroadFeatureVector } from "@/lib/analysis/broad-dataset.types";
import type { DailySwingCombinedBroadFoldDataset } from "@/lib/analysis/combined-broad-fold-dataset.types";
import {
	COMBINED_BROAD_CATEGORICAL_FEATURES,
	COMBINED_BROAD_NUMERIC_FEATURES,
} from "@/lib/analysis/combined-broad-model-features";
import { runDailySwingCombinedBroadTrainDiagnostics } from "@/lib/analysis/combined-broad-train-diagnostic-runner";
import { DAILY_SWING_COMBINED_BROAD_TRAIN_DIAGNOSTIC_PROTOCOL } from "@/lib/analysis/combined-broad-train-diagnostics";

function syntheticDataset(): DailySwingCombinedBroadFoldDataset {
	const partitionIds = [
		"final_train",
		"evaluate_2020_fit",
		"evaluate_2020_evaluation",
		"evaluate_2021_fit",
		"evaluate_2021_evaluation",
		"evaluate_2022_fit",
		"evaluate_2022_evaluation",
	] as const;
	const rows = partitionIds.flatMap((partitionId) =>
		Array.from({ length: partitionId === "final_train" ? 4 : 100 }, (_, index) => {
			const positive = index % 2 === 1;
			const evaluation = partitionId.endsWith("_evaluation");
			const features = Object.fromEntries(
				COMBINED_BROAD_NUMERIC_FEATURES.map((name) => [
					name,
					positive ? (evaluation ? 2 : 1) : evaluation ? 0 : -1,
				]),
			) as unknown as DailySwingBroadFeatureVector;
			for (const [name, categories] of Object.entries(
				COMBINED_BROAD_CATEGORICAL_FEATURES,
			)) {
				(features as unknown as Record<string, unknown>)[name] =
					name === "direction" && positive ? categories[1] : categories[0];
			}
			return {
				rowId:
					partitionId.endsWith("_fit") && index === 0
						? "shared-expanding-fit-row"
						: `${partitionId}-${index.toString().padStart(3, "0")}`,
				instrumentId: `fixture:${index}`,
				displaySymbol: `F${index}`,
				sourceScan: index % 2 === 0 ? ("base" as const) : ("expansion" as const),
				signalAt: "2020-01-02T05:00:00.000Z",
				resolvedAt: "2020-01-03T05:00:00.000Z",
				features,
				targets: {
					actionableSuccess: positive,
					setupUtilityR: positive ? 1 : -1,
				},
				partitionId,
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
		partitions: partitionIds.map((partitionId) => ({
			partitionId,
			foldId:
				partitionId === "final_train"
					? null
					: (partitionId.slice(0, "evaluate_2020".length) as
							| "evaluate_2020"
							| "evaluate_2021"
							| "evaluate_2022"),
			role:
				partitionId === "final_train"
					? ("final_train" as const)
					: partitionId.endsWith("_fit")
						? ("fit" as const)
						: ("evaluation" as const),
			sourceRows: partitionId === "final_train" ? 60_381 : 100,
			episodeRows: partitionId === "final_train" ? 4 : 100,
		})),
		rows,
		warnings: [],
	};
}

function run() {
	return runDailySwingCombinedBroadTrainDiagnostics({
		dataset: syntheticDataset(),
		datasetSha256:
			DAILY_SWING_COMBINED_BROAD_TRAIN_DIAGNOSTIC_PROTOCOL.sources.foldDataset
				.sha256,
		rejectedDevelopmentReportSha256:
			DAILY_SWING_COMBINED_BROAD_TRAIN_DIAGNOSTIC_PROTOCOL.sources
				.rejectedDevelopmentReport.sha256,
		rejectedDevelopmentReport: {
			decision: { status: "reject_development" },
			candidates: [{ candidateId: "l2-logistic-0.3" }],
		},
		generatedAt: new Date("2026-08-20T12:00:00.000Z"),
	});
}

describe("combined broad train diagnostic runner", () => {
	it("produces deterministic train-only aggregate diagnostics", () => {
		const report = run();
		assert.equal(report.generatedAt, "2026-08-20T12:00:00.000Z");
		assert.equal(report.representativeModel.candidateId, "l2-logistic-0.3");
		assert.equal(report.representativeModel.status, "rejected_diagnostic_only");
		assert.equal(report.scoreDiagnostics.pooledDeciles.length, 10);
		assert.deepEqual(
			report.scoreDiagnostics.pooledDeciles.map((bin) => bin.rows),
			Array(10).fill(30),
		);
		assert.equal(report.scoreDiagnostics.folds.length, 3);
		assert.ok(
			report.scoreDiagnostics.folds.every(
				(fold) => fold.topDecileUtilityImprovementR > 0,
			),
		);
		assert.ok(
			report.cohortStability.every(
				(cohort) => cohort.rows >= 100 && !("symbol" in cohort),
			),
		);
		assert.equal(report.dataAccess.validationFeaturesRead, false);
		assert.equal(report.dataAccess.validationLabelsRead, false);
		assert.equal(report.dataAccess.testFeaturesRead, false);
		assert.equal(report.dataAccess.testLabelsRead, false);
		assert.equal(report.nextResearchDecision.authorizesModelFitting, false);
	});

	it("fails closed for a changed input hash or non-rejected report", () => {
		const dataset = syntheticDataset();
		const base = {
			dataset,
			datasetSha256:
				DAILY_SWING_COMBINED_BROAD_TRAIN_DIAGNOSTIC_PROTOCOL.sources.foldDataset
					.sha256,
			rejectedDevelopmentReportSha256:
				DAILY_SWING_COMBINED_BROAD_TRAIN_DIAGNOSTIC_PROTOCOL.sources
					.rejectedDevelopmentReport.sha256,
			rejectedDevelopmentReport: {
				decision: { status: "advance_to_final_preregistration" },
				candidates: [{ candidateId: "l2-logistic-0.3" }],
			},
		};
		assert.throws(
			() => runDailySwingCombinedBroadTrainDiagnostics(base),
			/not the frozen rejected experiment/,
		);
		assert.throws(
			() =>
				runDailySwingCombinedBroadTrainDiagnostics({
					...base,
					datasetSha256: "changed",
				}),
			/checksum does not match/,
		);
		const duplicateDataset = syntheticDataset();
		const fitRows = duplicateDataset.rows.filter(
			(row) => row.partitionId === "evaluate_2020_fit",
		);
		fitRows[1].rowId = fitRows[0].rowId;
		assert.throws(
			() =>
				runDailySwingCombinedBroadTrainDiagnostics({
					...base,
					dataset: duplicateDataset,
					rejectedDevelopmentReport: {
						decision: { status: "reject_development" },
						candidates: [{ candidateId: "l2-logistic-0.3" }],
					},
				}),
			/Duplicate row ID within evaluate_2020_fit/,
		);
	});
});
