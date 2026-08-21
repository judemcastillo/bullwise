import type { DailySwingAnalysisDataset } from "@/lib/analysis/analysis-dataset.types";

export const DAILY_SWING_BASELINE_MODEL_VERSION = "1.0.0";

export type BaselineTrainingConfiguration = {
	optimizer: "batch_gradient_descent";
	iterations: number;
	learningRate: number;
	l2Penalty: number;
	classificationThreshold: number;
};

export type NumericFeatureTransform = {
	name: string;
	nullable: boolean;
	median: number;
	mean: number;
	standardDeviation: number;
};

export type CategoricalFeatureTransform = {
	name: string;
	referenceCategory: string;
	encodedCategories: string[];
};

export type BaselineFeatureEncoder = {
	featureNames: string[];
	numeric: NumericFeatureTransform[];
	categorical: CategoricalFeatureTransform[];
};

export type BaselineLinearModel = {
	kind: "logistic_regression" | "ridge_linear_regression";
	target:
		| "triggered"
		| "profitable_if_triggered"
		| "net_r_if_triggered"
		| "actionable_success";
	intercept: number;
	coefficients: Record<string, number>;
	trainingRows: number;
	finalTrainingLoss: number;
};

export type ClassificationMetrics = {
	rows: number;
	positiveRate: number;
	accuracy: number;
	logLoss: number;
	brierScore: number;
	rocAuc: number | null;
};

export type RegressionMetrics = {
	rows: number;
	actualMean: number;
	predictedMean: number;
	meanAbsoluteError: number;
	rootMeanSquaredError: number;
	rSquared: number | null;
};

export type DailySwingBaselineModelReport = {
	modelVersion: typeof DAILY_SWING_BASELINE_MODEL_VERSION;
	generatedAt: string;
	dataset: {
		datasetVersion: DailySwingAnalysisDataset["datasetVersion"];
		sha256: string | null;
		sourceKind: DailySwingAnalysisDataset["source"]["kind"];
		universeName: string;
		trainRows: number;
		validationRows: number;
		testRows: number;
	};
	configuration: BaselineTrainingConfiguration;
	testPolicy: {
		status: "sealed";
		labelsRead: false;
		description: string;
	};
	preprocessing: BaselineFeatureEncoder;
	models: {
		trigger: BaselineLinearModel;
		profitability: BaselineLinearModel;
		expectedR: BaselineLinearModel;
	};
	validation: {
		trigger: {
			model: ClassificationMetrics;
			constantBaseline: ClassificationMetrics;
			logLossImprovement: number;
			brierImprovement: number;
			rocAucImprovement: number | null;
		};
		profitability: {
			model: ClassificationMetrics;
			constantBaseline: ClassificationMetrics;
			logLossImprovement: number;
			brierImprovement: number;
			rocAucImprovement: number | null;
		};
		expectedR: {
			model: RegressionMetrics;
			constantBaseline: RegressionMetrics;
			meanAbsoluteErrorImprovement: number;
			rootMeanSquaredErrorImprovement: number;
		};
	};
	warnings: string[];
};
