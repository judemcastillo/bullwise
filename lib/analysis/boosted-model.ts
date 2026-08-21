import {
	DAILY_SWING_ANALYSIS_DATASET_VERSION,
	type AnalysisDatasetRow,
	type DailySwingAnalysisDataset,
} from "@/lib/analysis/analysis-dataset.types";
import {
	compareClassificationToConstantBaseline,
	compareRegressionToConstantBaseline,
	encodeBaselineFeatureRows,
	fitBaselineFeatureEncoder,
} from "@/lib/analysis/baseline-model";
import {
	DAILY_SWING_BOOSTED_MODEL_VERSION,
	type BoostedDecisionStump,
	type BoostedModel,
	type BoostedTrainingConfiguration,
	type BoostedValidationCriterion,
	type DailySwingBoostedModelReport,
} from "@/lib/analysis/boosted-model.types";

export const BOOSTED_TRAINING_CONFIGURATION = {
	algorithm: "gradient_boosted_decision_stumps",
	iterations: 60,
	learningRate: 0.05,
	candidateQuantiles: 8,
	minimumLeafRows: 100,
	maximumDepth: 1,
	classificationThreshold: 0.5,
} as const satisfies BoostedTrainingConfiguration;

export const BOOSTED_DEVELOPMENT_THRESHOLDS = {
	minimumTriggerRocAuc: 0.6,
	minimumProfitabilityRocAuc: 0.6,
	minimumExpectedRRSquared: 0.02,
	minimumTriggerLogLossImprovement: 0.005,
	minimumProfitabilityLogLossImprovement: 0.01,
	minimumExpectedRRootMeanSquaredErrorImprovement: 0.01,
} as const;

type CandidateThresholds = number[][];

function round(value: number, precision = 8) {
	const multiplier = 10 ** precision;
	return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
}

function sigmoid(value: number) {
	if (value >= 0) return 1 / (1 + Math.exp(-value));
	const exponential = Math.exp(value);
	return exponential / (1 + exponential);
}

function candidateThresholds(
	features: number[][],
	quantiles: number,
): CandidateThresholds {
	if (features.length === 0) throw new Error("Training features are required");
	const width = features[0].length;
	return Array.from({ length: width }, (_, column) => {
		const sorted = features.map((row) => row[column]).sort((left, right) => left - right);
		const thresholds = Array.from({ length: quantiles }, (_, index) => {
			const rank = Math.floor(((index + 1) / (quantiles + 1)) * (sorted.length - 1));
			return sorted[rank];
		});
		return [...new Set(thresholds)].filter(
			(threshold) => threshold < sorted.at(-1)!,
		);
	});
}

function fitStump(input: {
	features: number[][];
	residuals: number[];
	thresholds: CandidateThresholds;
	featureNames: string[];
	minimumLeafRows: number;
}) {
	const totalSum = input.residuals.reduce((total, value) => total + value, 0);
	const parentScore = (totalSum * totalSum) / input.residuals.length;
	let best:
		| (BoostedDecisionStump & { featureIndex: number })
		| null = null;
	for (let featureIndex = 0; featureIndex < input.featureNames.length; featureIndex += 1) {
		for (const threshold of input.thresholds[featureIndex]) {
			let leftCount = 0;
			let leftSum = 0;
			for (let rowIndex = 0; rowIndex < input.features.length; rowIndex += 1) {
				if (input.features[rowIndex][featureIndex] <= threshold) {
					leftCount += 1;
					leftSum += input.residuals[rowIndex];
				}
			}
			const rightCount = input.features.length - leftCount;
			if (
				leftCount < input.minimumLeafRows ||
				rightCount < input.minimumLeafRows
			) {
				continue;
			}
			const rightSum = totalSum - leftSum;
			const gain =
				(leftSum * leftSum) / leftCount +
				(rightSum * rightSum) / rightCount -
				parentScore;
			if (!best || gain > best.gain) {
				best = {
					featureIndex,
					featureName: input.featureNames[featureIndex],
					threshold,
					leftValue: leftSum / leftCount,
					rightValue: rightSum / rightCount,
					gain,
				};
			}
		}
	}
	return best;
}

function trainBoostedModel(input: {
	features: number[][];
	targets: number[];
	featureNames: string[];
	configuration: BoostedTrainingConfiguration;
	kind: BoostedModel["kind"];
	target: BoostedModel["target"];
}) {
	if (input.features.length === 0 || input.features.length !== input.targets.length) {
		throw new Error(`${input.target} requires aligned, non-empty training rows`);
	}
	const targetMean =
		input.targets.reduce((total, value) => total + value, 0) /
		input.targets.length;
	const clippedMean = Math.min(1 - 1e-6, Math.max(1e-6, targetMean));
	const initialPrediction =
		input.kind === "gradient_boosted_classifier"
			? Math.log(clippedMean / (1 - clippedMean))
			: targetMean;
	const scores = input.targets.map(() => initialPrediction);
	const thresholds = candidateThresholds(
		input.features,
		input.configuration.candidateQuantiles,
	);
	const trees: BoostedDecisionStump[] = [];
	for (let iteration = 0; iteration < input.configuration.iterations; iteration += 1) {
		const residuals = input.targets.map((target, index) =>
			input.kind === "gradient_boosted_classifier"
				? target - sigmoid(scores[index])
				: target - scores[index],
		);
		const stump = fitStump({
			features: input.features,
			residuals,
			thresholds,
			featureNames: input.featureNames,
			minimumLeafRows: input.configuration.minimumLeafRows,
		});
		if (!stump || stump.gain <= 1e-12) break;
		const { featureIndex, ...serialized } = stump;
		trees.push({
			...serialized,
			threshold: round(serialized.threshold),
			leftValue: round(serialized.leftValue),
			rightValue: round(serialized.rightValue),
			gain: round(serialized.gain),
		});
		for (let rowIndex = 0; rowIndex < scores.length; rowIndex += 1) {
			scores[rowIndex] +=
				input.configuration.learningRate *
				(input.features[rowIndex][featureIndex] <= stump.threshold
					? stump.leftValue
					: stump.rightValue);
		}
	}
	const epsilon = 1e-12;
	const finalTrainingLoss =
		input.kind === "gradient_boosted_classifier"
			? -input.targets.reduce((total, target, index) => {
					const probability = Math.min(
						1 - epsilon,
						Math.max(epsilon, sigmoid(scores[index])),
					);
					return (
						total +
						target * Math.log(probability) +
						(1 - target) * Math.log(1 - probability)
					);
				}, 0) / input.targets.length
			: input.targets.reduce(
					(total, target, index) => total + (scores[index] - target) ** 2,
					0,
				) / input.targets.length;
	return {
		model: {
			kind: input.kind,
			target: input.target,
			initialPrediction: round(initialPrediction),
			learningRate: input.configuration.learningRate,
			trees,
			trainingRows: input.targets.length,
			finalTrainingLoss: round(finalTrainingLoss),
		} satisfies BoostedModel,
		featureIndexes: trees.map((tree) => input.featureNames.indexOf(tree.featureName)),
	};
}

function rawPredictions(
	trained: ReturnType<typeof trainBoostedModel>,
	features: number[][],
) {
	return features.map((row) => {
		let prediction = trained.model.initialPrediction;
		for (let index = 0; index < trained.model.trees.length; index += 1) {
			const tree = trained.model.trees[index];
			prediction +=
				trained.model.learningRate *
				(row[trained.featureIndexes[index]] <= tree.threshold
					? tree.leftValue
					: tree.rightValue);
		}
		return prediction;
	});
}

function binaryTarget(value: unknown, label: string) {
	if (typeof value !== "boolean") throw new Error(`${label} must be boolean`);
	return value ? 1 : 0;
}

function minimum(
	metric: BoostedValidationCriterion["metric"],
	actual: number | null,
	threshold: number,
): BoostedValidationCriterion {
	return {
		metric,
		actual,
		threshold,
		operator: ">=",
		passed: actual !== null && actual >= threshold,
	};
}

export function trainDailySwingBoostedModels(input: {
	dataset: DailySwingAnalysisDataset;
	datasetSha256?: string;
	generatedAt?: Date;
}): DailySwingBoostedModelReport {
	if (input.dataset.datasetVersion !== DAILY_SWING_ANALYSIS_DATASET_VERSION) {
		throw new Error(
			`Dataset version ${input.dataset.datasetVersion} is not supported; expected ${DAILY_SWING_ANALYSIS_DATASET_VERSION}`,
		);
	}
	if (input.dataset.source.kind !== "exhaustive_setup_scan") {
		throw new Error("Boosted training requires an exhaustive setup-scan dataset");
	}
	const generatedAt = input.generatedAt ?? new Date();
	if (Number.isNaN(generatedAt.getTime())) throw new Error("generatedAt must be valid");
	const trainRows = input.dataset.rows.filter((row) => row.split === "train");
	const validationRows = input.dataset.rows.filter(
		(row) => row.split === "validation",
	);
	const testRows = input.dataset.rows.filter((row) => row.split === "test").length;
	if (trainRows.length === 0 || validationRows.length === 0 || testRows === 0) {
		throw new Error("Train, validation, and sealed test rows are all required");
	}
	const preprocessing = fitBaselineFeatureEncoder(trainRows);
	const train = encodeBaselineFeatureRows(trainRows, preprocessing);
	const validation = encodeBaselineFeatureRows(validationRows, preprocessing);
	const triggerTrainTargets = train.rows.map((row) =>
		binaryTarget(row.labels.triggered, `${row.rowId}.triggered`),
	);
	const triggerValidationTargets = validation.rows.map((row) =>
		binaryTarget(row.labels.triggered, `${row.rowId}.triggered`),
	);
	const triggeredIndexes = (rows: AnalysisDatasetRow[]) =>
		rows.flatMap((row, index) => (row.labels.triggered ? [index] : []));
	const triggeredTrain = triggeredIndexes(train.rows);
	const triggeredValidation = triggeredIndexes(validation.rows);
	const triggeredTrainFeatures = triggeredTrain.map((index) => train.values[index]);
	const triggeredValidationFeatures = triggeredValidation.map(
		(index) => validation.values[index],
	);
	const profitTrainTargets = triggeredTrain.map((index) =>
		binaryTarget(
			train.rows[index].labels.profitable,
			`${train.rows[index].rowId}.profitable`,
		),
	);
	const profitValidationTargets = triggeredValidation.map((index) =>
		binaryTarget(
			validation.rows[index].labels.profitable,
			`${validation.rows[index].rowId}.profitable`,
		),
	);
	const finiteR = (row: AnalysisDatasetRow) => {
		const value = row.labels.netRMultiple;
		if (typeof value !== "number" || !Number.isFinite(value)) {
			throw new Error(`${row.rowId}.netRMultiple must be finite`);
		}
		return value;
	};
	const rTrainTargets = triggeredTrain.map((index) => finiteR(train.rows[index]));
	const rValidationTargets = triggeredValidation.map((index) =>
		finiteR(validation.rows[index]),
	);
	const configuration = { ...BOOSTED_TRAINING_CONFIGURATION };
	const trigger = trainBoostedModel({
		features: train.values,
		targets: triggerTrainTargets,
		featureNames: preprocessing.featureNames,
		configuration,
		kind: "gradient_boosted_classifier",
		target: "triggered",
	});
	const profitability = trainBoostedModel({
		features: triggeredTrainFeatures,
		targets: profitTrainTargets,
		featureNames: preprocessing.featureNames,
		configuration,
		kind: "gradient_boosted_classifier",
		target: "profitable_if_triggered",
	});
	const expectedR = trainBoostedModel({
		features: triggeredTrainFeatures,
		targets: rTrainTargets,
		featureNames: preprocessing.featureNames,
		configuration,
		kind: "gradient_boosted_regressor",
		target: "net_r_if_triggered",
	});
	const average = (values: number[]) =>
		values.reduce((total, value) => total + value, 0) / values.length;
	const triggerValidation = compareClassificationToConstantBaseline(
		triggerValidationTargets,
		rawPredictions(trigger, validation.values).map(sigmoid),
		average(triggerTrainTargets),
		configuration.classificationThreshold,
	);
	const profitabilityValidation = compareClassificationToConstantBaseline(
		profitValidationTargets,
		rawPredictions(profitability, triggeredValidationFeatures).map(sigmoid),
		average(profitTrainTargets),
		configuration.classificationThreshold,
	);
	const expectedRValidation = compareRegressionToConstantBaseline(
		rValidationTargets,
		rawPredictions(expectedR, triggeredValidationFeatures),
		average(rTrainTargets),
	);
	const criteria = [
		minimum(
			"triggerRocAuc",
			triggerValidation.model.rocAuc,
			BOOSTED_DEVELOPMENT_THRESHOLDS.minimumTriggerRocAuc,
		),
		minimum(
			"profitabilityRocAuc",
			profitabilityValidation.model.rocAuc,
			BOOSTED_DEVELOPMENT_THRESHOLDS.minimumProfitabilityRocAuc,
		),
		minimum(
			"expectedRRSquared",
			expectedRValidation.model.rSquared,
			BOOSTED_DEVELOPMENT_THRESHOLDS.minimumExpectedRRSquared,
		),
		minimum(
			"triggerLogLossImprovement",
			triggerValidation.logLossImprovement,
			BOOSTED_DEVELOPMENT_THRESHOLDS.minimumTriggerLogLossImprovement,
		),
		minimum(
			"profitabilityLogLossImprovement",
			profitabilityValidation.logLossImprovement,
			BOOSTED_DEVELOPMENT_THRESHOLDS.minimumProfitabilityLogLossImprovement,
		),
		minimum(
			"expectedRRootMeanSquaredErrorImprovement",
			expectedRValidation.rootMeanSquaredErrorImprovement,
			BOOSTED_DEVELOPMENT_THRESHOLDS.minimumExpectedRRootMeanSquaredErrorImprovement,
		),
	];
	return {
		modelVersion: DAILY_SWING_BOOSTED_MODEL_VERSION,
		generatedAt: generatedAt.toISOString(),
		dataset: {
			datasetVersion: input.dataset.datasetVersion,
			sha256: input.datasetSha256?.trim() || null,
			sourceKind: input.dataset.source.kind,
			universeName: input.dataset.source.universeName,
			trainRows: trainRows.length,
			validationRows: validationRows.length,
			testRows,
		},
		configuration,
		testPolicy: {
			status: "sealed",
			labelsRead: false,
			description:
				"Test rows are counted by split only. Their features and labels are not used for preprocessing, fitting, thresholds, or metrics.",
		},
		preprocessing,
		models: {
			trigger: trigger.model,
			profitability: profitability.model,
			expectedR: expectedR.model,
		},
		validation: {
			trigger: triggerValidation,
			profitability: profitabilityValidation,
			expectedR: expectedRValidation,
		},
		developmentGate: {
			passed: criteria.every((criterion) => criterion.passed),
			criteria,
			description:
				"All preregistered validation criteria must pass before freezing a candidate for one-shot test evaluation.",
		},
		warnings: [
			"This is one fixed nonlinear development experiment, not a customer-facing trading model.",
			"Decision stumps capture nonlinear thresholds but not feature interactions or deep tree structure.",
			"Overlapping and consecutive setup labels are correlated; row counts do not represent independent samples.",
			"Do not evaluate the sealed test split unless the development gate passes and the complete candidate is frozen first.",
		],
	};
}
