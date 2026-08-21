import {
	DAILY_SWING_ANALYSIS_DATASET_VERSION,
	type AnalysisDatasetFeatureVector,
	type AnalysisDatasetRow,
	type DailySwingAnalysisDataset,
} from "@/lib/analysis/analysis-dataset.types";
import {
	DAILY_SWING_BASELINE_MODEL_VERSION,
	type BaselineFeatureEncoder,
	type BaselineLinearModel,
	type BaselineTrainingConfiguration,
	type ClassificationMetrics,
	type DailySwingBaselineModelReport,
	type RegressionMetrics,
} from "@/lib/analysis/baseline-model.types";

export const BASELINE_TRAINING_CONFIGURATION = {
	optimizer: "batch_gradient_descent",
	iterations: 400,
	learningRate: 0.05,
	l2Penalty: 0.001,
	classificationThreshold: 0.5,
} as const satisfies BaselineTrainingConfiguration;

const CATEGORICAL_FEATURES = {
	direction: ["long", "short"],
	setupType: ["pullback", "breakout", "breakdown"],
	trendRegime: ["bullish", "mixed", "bearish"],
	volatilityRegime: ["low", "normal", "high"],
	evidenceStrength: ["weak", "moderate", "strong", "unavailable"],
	momentumRegime: ["bullish", "mixed", "bearish"],
	participationRegime: ["weak", "normal", "strong", "unavailable"],
} as const;

const NUMERIC_FEATURES = [
	"relativeStrength20Percent",
	"volumeZScore20",
	"planRiskReward",
	"sma20DistancePercent",
	"sma50DistancePercent",
	"sma200DistancePercent",
	"sma20SlopePercent",
	"sma50SlopePercent",
	"rsi14",
	"macdHistogramPercent",
	"atrPercent",
	"return5Percent",
	"return20Percent",
	"return60Percent",
	"realizedVolatility20Percent",
	"realizedVolatility60Percent",
	"volatilityPercentile",
	"relativeStrength60Percent",
] as const satisfies readonly (keyof AnalysisDatasetFeatureVector)[];

const NULLABLE_NUMERIC_FEATURES = new Set<keyof AnalysisDatasetFeatureVector>([
	"relativeStrength20Percent",
	"volumeZScore20",
	"relativeStrength60Percent",
]);

export type EncodedBaselineRows = {
	values: number[][];
	rows: AnalysisDatasetRow[];
};

function round(value: number, precision = 8) {
	const multiplier = 10 ** precision;
	return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
}

function median(values: readonly number[]) {
	if (values.length === 0) throw new Error("Cannot calculate a median without values");
	const sorted = [...values].sort((left, right) => left - right);
	const middle = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 0
		? (sorted[middle - 1] + sorted[middle]) / 2
		: sorted[middle];
}

function finiteNumeric(value: unknown, name: string, nullable: boolean) {
	if (value === null && nullable) return null;
	if (typeof value !== "number" || !Number.isFinite(value)) {
		throw new Error(`Feature ${name} must be a finite number${nullable ? " or null" : ""}`);
	}
	return value;
}

export function fitBaselineFeatureEncoder(
	rows: readonly AnalysisDatasetRow[],
): BaselineFeatureEncoder {
	if (rows.length === 0) throw new Error("Training rows are required to fit features");
	const numeric = NUMERIC_FEATURES.map((name) => {
		const nullable = NULLABLE_NUMERIC_FEATURES.has(name);
		const observed = rows.flatMap((row) => {
			const value = finiteNumeric(row.features[name], name, nullable);
			return value === null ? [] : [value];
		});
		if (observed.length === 0) {
			throw new Error(`Feature ${name} has no observed training values`);
		}
		const imputationMedian = median(observed);
		const imputed = rows.map((row) => {
			const value = finiteNumeric(row.features[name], name, nullable);
			return value ?? imputationMedian;
		});
		const mean = imputed.reduce((total, value) => total + value, 0) / imputed.length;
		const variance =
			imputed.reduce((total, value) => total + (value - mean) ** 2, 0) /
			imputed.length;
		return {
			name,
			nullable,
			median: round(imputationMedian),
			mean: round(mean),
			standardDeviation: round(Math.sqrt(variance) || 1),
		};
	});
	const categorical = Object.entries(CATEGORICAL_FEATURES).map(
		([name, categories]) => ({
			name,
			referenceCategory: categories[0],
			encodedCategories: categories.slice(1),
		}),
	);
	const featureNames = [
		...numeric.flatMap((feature) => [
			`numeric:${feature.name}`,
			...(feature.nullable ? [`missing:${feature.name}`] : []),
		]),
		...categorical.flatMap((feature) =>
			feature.encodedCategories.map(
				(category) => `category:${feature.name}=${category}`,
			),
		),
	];
	return { featureNames, numeric, categorical };
}

export function encodeBaselineFeatureRows(
	rows: AnalysisDatasetRow[],
	encoder: BaselineFeatureEncoder,
): EncodedBaselineRows {
	return {
		rows,
		values: rows.map((row) => {
			const values: number[] = [];
			for (const feature of encoder.numeric) {
				const raw = finiteNumeric(
					row.features[feature.name as keyof AnalysisDatasetFeatureVector],
					feature.name,
					feature.nullable,
				);
				values.push(((raw ?? feature.median) - feature.mean) / feature.standardDeviation);
				if (feature.nullable) values.push(raw === null ? 1 : 0);
			}
			for (const feature of encoder.categorical) {
				const value = row.features[
					feature.name as keyof AnalysisDatasetFeatureVector
				];
				const allowed = [feature.referenceCategory, ...feature.encodedCategories];
				if (typeof value !== "string" || !allowed.includes(value)) {
					throw new Error(`Feature ${feature.name} has an unsupported category`);
				}
				for (const category of feature.encodedCategories) {
					values.push(value === category ? 1 : 0);
				}
			}
			return values;
		}),
	};
}

function sigmoid(value: number) {
	if (value >= 0) return 1 / (1 + Math.exp(-value));
	const exponential = Math.exp(value);
	return exponential / (1 + exponential);
}

function linearPrediction(intercept: number, weights: readonly number[], row: readonly number[]) {
	let prediction = intercept;
	for (let index = 0; index < weights.length; index += 1) {
		prediction += weights[index] * row[index];
	}
	return prediction;
}

export function fitBaselineLinearModel(input: {
	features: number[][];
	targets: number[];
	kind: BaselineLinearModel["kind"];
	target: BaselineLinearModel["target"];
	featureNames: string[];
	configuration: BaselineTrainingConfiguration;
}) {
	if (input.features.length === 0 || input.features.length !== input.targets.length) {
		throw new Error(`${input.target} requires aligned, non-empty training rows`);
	}
	const width = input.featureNames.length;
	if (input.features.some((row) => row.length !== width)) {
		throw new Error(`${input.target} feature widths are inconsistent`);
	}
	const weights = Array.from({ length: width }, () => 0);
	const targetMean =
		input.targets.reduce((total, value) => total + value, 0) /
		input.targets.length;
	let intercept =
		input.kind === "logistic_regression"
			? Math.log(
					Math.min(1 - 1e-6, Math.max(1e-6, targetMean)) /
						(1 - Math.min(1 - 1e-6, Math.max(1e-6, targetMean))),
				)
			: targetMean;
	for (let iteration = 0; iteration < input.configuration.iterations; iteration += 1) {
		const gradient = Array.from({ length: width }, () => 0);
		let interceptGradient = 0;
		for (let rowIndex = 0; rowIndex < input.features.length; rowIndex += 1) {
			const raw = linearPrediction(intercept, weights, input.features[rowIndex]);
			const prediction =
				input.kind === "logistic_regression" ? sigmoid(raw) : raw;
			const error = prediction - input.targets[rowIndex];
			interceptGradient += error;
			for (let column = 0; column < width; column += 1) {
				gradient[column] += error * input.features[rowIndex][column];
			}
		}
		const scale = 1 / input.features.length;
		intercept -= input.configuration.learningRate * interceptGradient * scale;
		for (let column = 0; column < width; column += 1) {
			weights[column] -=
				input.configuration.learningRate *
				(gradient[column] * scale + input.configuration.l2Penalty * weights[column]);
		}
	}
	const predictions = input.features.map((row) => {
		const raw = linearPrediction(intercept, weights, row);
		return input.kind === "logistic_regression" ? sigmoid(raw) : raw;
	});
	const epsilon = 1e-12;
	const finalTrainingLoss =
		input.kind === "logistic_regression"
			? -input.targets.reduce((total, target, index) => {
					const probability = Math.min(1 - epsilon, Math.max(epsilon, predictions[index]));
					return total + target * Math.log(probability) + (1 - target) * Math.log(1 - probability);
				}, 0) / input.targets.length
			: input.targets.reduce(
					(total, target, index) => total + (predictions[index] - target) ** 2,
					0,
				) / input.targets.length;
	return {
		model: {
			kind: input.kind,
			target: input.target,
			intercept: round(intercept),
			coefficients: Object.fromEntries(
				input.featureNames.map((name, index) => [name, round(weights[index])]),
			),
			trainingRows: input.targets.length,
			finalTrainingLoss: round(finalTrainingLoss),
		} satisfies BaselineLinearModel,
		intercept,
		weights,
	};
}

export function predictBaselineProbabilities(
	model: ReturnType<typeof fitBaselineLinearModel>,
	features: number[][],
) {
	return features.map((row) =>
		sigmoid(linearPrediction(model.intercept, model.weights, row)),
	);
}

function predictions(
	model: ReturnType<typeof fitBaselineLinearModel>,
	features: number[][],
) {
	return features.map((row) =>
		linearPrediction(model.intercept, model.weights, row),
	);
}

function auc(targets: number[], scores: number[]) {
	const positives = targets.filter((target) => target === 1).length;
	const negatives = targets.length - positives;
	if (positives === 0 || negatives === 0) return null;
	const ranked = scores
		.map((score, index) => ({ score, target: targets[index] }))
		.sort((left, right) => left.score - right.score);
	let positiveRankSum = 0;
	let index = 0;
	while (index < ranked.length) {
		let end = index + 1;
		while (end < ranked.length && ranked[end].score === ranked[index].score) end += 1;
		const averageRank = (index + 1 + end) / 2;
		for (let cursor = index; cursor < end; cursor += 1) {
			if (ranked[cursor].target === 1) positiveRankSum += averageRank;
		}
		index = end;
	}
	return (positiveRankSum - (positives * (positives + 1)) / 2) /
		(positives * negatives);
}

export function evaluateClassificationMetrics(
	targets: number[],
	probabilityValues: number[],
	threshold: number,
): ClassificationMetrics {
	if (targets.length === 0 || targets.length !== probabilityValues.length) {
		throw new Error("Classification metrics require aligned, non-empty values");
	}
	const epsilon = 1e-12;
	const positives = targets.reduce((total, target) => total + target, 0);
	const accuracy = targets.filter(
		(target, index) => (probabilityValues[index] >= threshold ? 1 : 0) === target,
	).length / targets.length;
	const logLoss = -targets.reduce((total, target, index) => {
		const probability = Math.min(
			1 - epsilon,
			Math.max(epsilon, probabilityValues[index]),
		);
		return total + target * Math.log(probability) + (1 - target) * Math.log(1 - probability);
	}, 0) / targets.length;
	const brierScore = targets.reduce(
		(total, target, index) => total + (probabilityValues[index] - target) ** 2,
		0,
	) / targets.length;
	return {
		rows: targets.length,
		positiveRate: round(positives / targets.length),
		accuracy: round(accuracy),
		logLoss: round(logLoss),
		brierScore: round(brierScore),
		rocAuc: auc(targets, probabilityValues) === null
			? null
			: round(auc(targets, probabilityValues)!),
	};
}

export function evaluateRegressionMetrics(
	targets: number[],
	predictionValues: number[],
): RegressionMetrics {
	if (targets.length === 0 || targets.length !== predictionValues.length) {
		throw new Error("Regression metrics require aligned, non-empty values");
	}
	const actualMean = targets.reduce((total, value) => total + value, 0) / targets.length;
	const predictedMean =
		predictionValues.reduce((total, value) => total + value, 0) /
		predictionValues.length;
	const absoluteError = targets.reduce(
		(total, target, index) => total + Math.abs(predictionValues[index] - target),
		0,
	);
	const squaredError = targets.reduce(
		(total, target, index) => total + (predictionValues[index] - target) ** 2,
		0,
	);
	const totalVariance = targets.reduce(
		(total, target) => total + (target - actualMean) ** 2,
		0,
	);
	return {
		rows: targets.length,
		actualMean: round(actualMean),
		predictedMean: round(predictedMean),
		meanAbsoluteError: round(absoluteError / targets.length),
		rootMeanSquaredError: round(Math.sqrt(squaredError / targets.length)),
		rSquared: totalVariance === 0 ? null : round(1 - squaredError / totalVariance),
	};
}

export function compareClassificationToConstantBaseline(
	targets: number[],
	modelProbabilities: number[],
	trainPositiveRate: number,
	threshold: number,
) {
	const model = evaluateClassificationMetrics(targets, modelProbabilities, threshold);
	const constantBaseline = evaluateClassificationMetrics(
		targets,
		targets.map(() => trainPositiveRate),
		threshold,
	);
	return {
		model,
		constantBaseline,
		logLossImprovement: round(constantBaseline.logLoss - model.logLoss),
		brierImprovement: round(constantBaseline.brierScore - model.brierScore),
		rocAucImprovement:
			model.rocAuc === null || constantBaseline.rocAuc === null
				? null
				: round(model.rocAuc - constantBaseline.rocAuc),
	};
}

export function compareRegressionToConstantBaseline(
	targets: number[],
	modelPredictions: number[],
	trainMean: number,
) {
	const model = evaluateRegressionMetrics(targets, modelPredictions);
	const constantBaseline = evaluateRegressionMetrics(
		targets,
		targets.map(() => trainMean),
	);
	return {
		model,
		constantBaseline,
		meanAbsoluteErrorImprovement: round(
			constantBaseline.meanAbsoluteError - model.meanAbsoluteError,
		),
		rootMeanSquaredErrorImprovement: round(
			constantBaseline.rootMeanSquaredError - model.rootMeanSquaredError,
		),
	};
}

function binaryTarget(value: unknown, label: string) {
	if (typeof value !== "boolean") throw new Error(`${label} must be boolean`);
	return value ? 1 : 0;
}

export function trainDailySwingBaselineModels(input: {
	dataset: DailySwingAnalysisDataset;
	datasetSha256?: string;
	generatedAt?: Date;
}): DailySwingBaselineModelReport {
	if (input.dataset.datasetVersion !== DAILY_SWING_ANALYSIS_DATASET_VERSION) {
		throw new Error(
			`Dataset version ${input.dataset.datasetVersion} is not supported; expected ${DAILY_SWING_ANALYSIS_DATASET_VERSION}`,
		);
	}
	if (input.dataset.source.kind !== "exhaustive_setup_scan") {
		throw new Error("Baseline training requires an exhaustive setup-scan dataset");
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
	const encoder = fitBaselineFeatureEncoder(trainRows);
	const train = encodeBaselineFeatureRows(trainRows, encoder);
	const validation = encodeBaselineFeatureRows(validationRows, encoder);
	const triggerTrainTargets = train.rows.map((row) =>
		binaryTarget(row.labels.triggered, `${row.rowId}.triggered`),
	);
	const triggerValidationTargets = validation.rows.map((row) =>
		binaryTarget(row.labels.triggered, `${row.rowId}.triggered`),
	);
	const triggeredTrainIndexes = train.rows.flatMap((row, index) =>
		row.labels.triggered ? [index] : [],
	);
	const triggeredValidationIndexes = validation.rows.flatMap((row, index) =>
		row.labels.triggered ? [index] : [],
	);
	const triggeredTrainFeatures = triggeredTrainIndexes.map(
		(index) => train.values[index],
	);
	const triggeredValidationFeatures = triggeredValidationIndexes.map(
		(index) => validation.values[index],
	);
	const profitTrainTargets = triggeredTrainIndexes.map((index) =>
		binaryTarget(
			train.rows[index].labels.profitable,
			`${train.rows[index].rowId}.profitable`,
		),
	);
	const profitValidationTargets = triggeredValidationIndexes.map((index) =>
		binaryTarget(
			validation.rows[index].labels.profitable,
			`${validation.rows[index].rowId}.profitable`,
		),
	);
	const rTrainTargets = triggeredTrainIndexes.map((index) => {
		const value = train.rows[index].labels.netRMultiple;
		if (typeof value !== "number" || !Number.isFinite(value)) {
			throw new Error(`${train.rows[index].rowId}.netRMultiple must be finite`);
		}
		return value;
	});
	const rValidationTargets = triggeredValidationIndexes.map((index) => {
		const value = validation.rows[index].labels.netRMultiple;
		if (typeof value !== "number" || !Number.isFinite(value)) {
			throw new Error(`${validation.rows[index].rowId}.netRMultiple must be finite`);
		}
		return value;
	});
	const configuration = { ...BASELINE_TRAINING_CONFIGURATION };
	const trigger = fitBaselineLinearModel({
		features: train.values,
		targets: triggerTrainTargets,
		kind: "logistic_regression",
		target: "triggered",
		featureNames: encoder.featureNames,
		configuration,
	});
	const profitability = fitBaselineLinearModel({
		features: triggeredTrainFeatures,
		targets: profitTrainTargets,
		kind: "logistic_regression",
		target: "profitable_if_triggered",
		featureNames: encoder.featureNames,
		configuration,
	});
	const expectedR = fitBaselineLinearModel({
		features: triggeredTrainFeatures,
		targets: rTrainTargets,
		kind: "ridge_linear_regression",
		target: "net_r_if_triggered",
		featureNames: encoder.featureNames,
		configuration,
	});
	const triggerTrainRate =
		triggerTrainTargets.reduce<number>((total, value) => total + value, 0) /
		triggerTrainTargets.length;
	const profitTrainRate =
		profitTrainTargets.reduce<number>((total, value) => total + value, 0) /
		profitTrainTargets.length;
	const rTrainMean =
		rTrainTargets.reduce((total, value) => total + value, 0) /
		rTrainTargets.length;
	return {
		modelVersion: DAILY_SWING_BASELINE_MODEL_VERSION,
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
				"Test rows are counted by split only. Their labels are not accessed, evaluated, or used for preprocessing or fitting.",
		},
		preprocessing: encoder,
		models: {
			trigger: trigger.model,
			profitability: profitability.model,
			expectedR: expectedR.model,
		},
		validation: {
			trigger: compareClassificationToConstantBaseline(
				triggerValidationTargets,
		predictBaselineProbabilities(trigger, validation.values),
				triggerTrainRate,
				configuration.classificationThreshold,
			),
			profitability: compareClassificationToConstantBaseline(
				profitValidationTargets,
		predictBaselineProbabilities(profitability, triggeredValidationFeatures),
				profitTrainRate,
				configuration.classificationThreshold,
			),
			expectedR: compareRegressionToConstantBaseline(
				rValidationTargets,
				predictions(expectedR, triggeredValidationFeatures),
				rTrainMean,
			),
		},
		warnings: [
			"These are development baselines, not customer-facing trading models.",
			"Overlapping and consecutive setup labels are correlated; row counts do not represent independent samples.",
			"Validation results may guide one frozen model specification. The test split must be evaluated exactly once afterward.",
			"Instrument identity is excluded from model features to reduce symbol memorization.",
		],
	};
}
