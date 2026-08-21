import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { DailySwingBroadFeatureVector } from "@/lib/analysis/broad-dataset.types";
import type { DailySwingCombinedBroadFoldDataset } from "@/lib/analysis/combined-broad-fold-dataset.types";
import { DAILY_SWING_COMBINED_BROAD_FOLD_DATASET_SHA256 } from "@/lib/analysis/combined-broad-fold-dataset.types";
import {
	COMBINED_BROAD_CATEGORICAL_FEATURES,
	COMBINED_BROAD_NUMERIC_FEATURES,
} from "@/lib/analysis/combined-broad-model-features";
import {
	evaluateCombinedBroadDevelopmentGates,
	runDailySwingCombinedBroadModelDevelopment,
	selectCombinedBroadDevelopmentWinner,
	type CombinedBroadCandidateReport,
	type CombinedBroadDevelopmentActuals,
} from "@/lib/analysis/combined-broad-model-runner";

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
		Array.from({ length: partitionId === "final_train" ? 12 : 8 }, (_, index) => {
			const positive = index % 2 === 1;
			const features = Object.fromEntries(
				COMBINED_BROAD_NUMERIC_FEATURES.map((name) => [
					name,
					positive ? 1 : -1,
				]),
			) as unknown as DailySwingBroadFeatureVector;
			for (const [name, categories] of Object.entries(
				COMBINED_BROAD_CATEGORICAL_FEATURES,
			)) {
				(features as unknown as Record<string, unknown>)[name] = categories[0];
			}
			return {
				rowId: `${partitionId}-${index}`,
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
			foldId: partitionId === "final_train"
				? null
				: (partitionId.slice(0, "evaluate_2020".length) as
						| "evaluate_2020"
						| "evaluate_2021"
						| "evaluate_2022"),
			role: partitionId === "final_train"
				? ("final_train" as const)
				: partitionId.endsWith("_fit")
					? ("fit" as const)
					: ("evaluation" as const),
			sourceRows: partitionId === "final_train" ? 60_381 : 8,
			episodeRows: partitionId === "final_train" ? 12 : 8,
		})),
		rows,
		warnings: [],
	};
}

function passingActuals(): CombinedBroadDevelopmentActuals {
	return {
		folds_with_both_target_classes: 3,
		mean_fold_roc_auc: 0.6,
		minimum_fold_roc_auc: 0.55,
		mean_fold_log_loss_improvement: 0.01,
		mean_fold_brier_improvement: 0.005,
		folds_with_positive_log_loss_improvement: 3,
		folds_with_positive_brier_improvement: 3,
		folds_with_selected_utility_improvement: 3,
		mean_selected_utility_improvement_r: 0.1,
		base_pooled_roc_auc: 0.58,
		expansion_pooled_roc_auc: 0.57,
	};
}

function candidate(input: {
	id: string;
	l2: number;
	auc: number;
	logLoss?: number;
}): CombinedBroadCandidateReport {
	const actuals = {
		...passingActuals(),
		mean_fold_roc_auc: input.auc,
		mean_fold_log_loss_improvement: input.logLoss ?? 0.01,
	};
	return {
		candidateId: input.id,
		l2Penalty: input.l2,
		folds: [],
		actuals,
		gates: evaluateCombinedBroadDevelopmentGates(actuals),
		passed: true,
	};
}

describe("combined broad model development gates", () => {
	it("requires every frozen robustness gate", () => {
		const passing = evaluateCombinedBroadDevelopmentGates(passingActuals());
		assert.ok(passing.every((gate) => gate.passed));
		const failed = evaluateCombinedBroadDevelopmentGates({
			...passingActuals(),
			minimum_fold_roc_auc: 0.47,
		});
		assert.equal(
			failed.find((gate) => gate.metric === "minimum_fold_roc_auc")?.passed,
			false,
		);
	});

	it("selects by mean AUC and uses the frozen tie breakers", () => {
		const higherAuc = candidate({ id: "higher-auc", l2: 0.003, auc: 0.61 });
		const lowerAuc = candidate({ id: "lower-auc", l2: 0.3, auc: 0.6 });
		assert.equal(
			selectCombinedBroadDevelopmentWinner([lowerAuc, higherAuc])?.candidateId,
			"higher-auc",
		);
		const weak = candidate({ id: "weak", l2: 0.003, auc: 0.6, logLoss: 0.01 });
		const strong = candidate({ id: "strong", l2: 0.3, auc: 0.6, logLoss: 0.02 });
		assert.equal(
			selectCombinedBroadDevelopmentWinner([weak, strong])?.candidateId,
			"strong",
		);
	});

	it("returns no winner when every candidate fails", () => {
		const rejected = candidate({ id: "rejected", l2: 0.03, auc: 0.6 });
		rejected.passed = false;
		assert.equal(selectCombinedBroadDevelopmentWinner([rejected]), null);
	});

	it("runs only train partitions and fails closed when robustness coverage is absent", () => {
		const report = runDailySwingCombinedBroadModelDevelopment({
			dataset: syntheticDataset(),
			datasetSha256: DAILY_SWING_COMBINED_BROAD_FOLD_DATASET_SHA256,
			generatedAt: new Date("2026-08-20T12:00:00.000Z"),
		});
		assert.equal(report.candidates.length, 3);
		assert.equal(report.decision.status, "reject_development");
		assert.equal(report.finalArtifact, null);
		assert.equal(report.dataAccess.validationLabelsRead, false);
		assert.equal(report.dataAccess.testLabelsRead, false);
		assert.ok(
			report.candidates.every(
				(item) => item.actuals.base_pooled_roc_auc === null,
			),
		);
	});
});
