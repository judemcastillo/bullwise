import type { BaselineFeatureEncoder } from "@/lib/analysis/baseline-model.types";
import type { DailySwingAnalysisDataset } from "@/lib/analysis/analysis-dataset.types";
import type {
	ClassificationMetrics,
	RegressionMetrics,
} from "@/lib/analysis/baseline-model.types";

export const DAILY_SWING_BOOSTED_MODEL_VERSION = "1.0.0";

export type BoostedTrainingConfiguration = {
	algorithm: "gradient_boosted_decision_stumps";
	iterations: number;
	learningRate: number;
	candidateQuantiles: number;
	minimumLeafRows: number;
	maximumDepth: 1;
	classificationThreshold: number;
};

export type BoostedDecisionStump = {
	featureName: string;
	threshold: number;
	leftValue: number;
	rightValue: number;
	gain: number;
};

export type BoostedModel = {
	kind: "gradient_boosted_classifier" | "gradient_boosted_regressor";
	target: "triggered" | "profitable_if_triggered" | "net_r_if_triggered";
	initialPrediction: number;
	learningRate: number;
	trees: BoostedDecisionStump[];
	trainingRows: number;
	finalTrainingLoss: number;
};

export type BoostedValidationCriterion = {
	metric:
		| "triggerRocAuc"
		| "profitabilityRocAuc"
		| "expectedRRSquared"
		| "triggerLogLossImprovement"
		| "profitabilityLogLossImprovement"
		| "expectedRRootMeanSquaredErrorImprovement";
	actual: number | null;
	threshold: number;
	operator: ">=";
	passed: boolean;
};

export type DailySwingBoostedModelReport = {
	modelVersion: typeof DAILY_SWING_BOOSTED_MODEL_VERSION;
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
	configuration: BoostedTrainingConfiguration;
	testPolicy: {
		status: "sealed";
		labelsRead: false;
		description: string;
	};
	preprocessing: BaselineFeatureEncoder;
	models: {
		trigger: BoostedModel;
		profitability: BoostedModel;
		expectedR: BoostedModel;
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
	developmentGate: {
		passed: boolean;
		criteria: BoostedValidationCriterion[];
		description: string;
	};
	warnings: string[];
};
