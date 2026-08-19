import type { DailySwingAnalysisDataset } from "@/lib/analysis/analysis-dataset.types";

export const DAILY_SWING_TRAINING_DIAGNOSTIC_VERSION = "1.0.0";
export const DAILY_SWING_TARGET_DESIGN_VERSION =
	"episode-first-actionable-success-v1";

export type TrainingTargetSummary = {
	rows: number;
	triggered: number;
	triggerRate: number;
	profitableTriggered: number;
	profitRateAmongTriggered: number | null;
	actionableSuccesses: number;
	actionableSuccessRate: number;
	averageNetRAmongTriggered: number | null;
	averageSetupUtilityR: number;
	setupUtilityRStandardDeviation: number;
};

export type DailySwingTrainingDiagnosticReport = {
	diagnosticVersion: typeof DAILY_SWING_TRAINING_DIAGNOSTIC_VERSION;
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
	nonTrainPolicy: {
		validationFeaturesRead: false;
		validationLabelsRead: false;
		testFeaturesRead: false;
		testLabelsRead: false;
		description: string;
	};
	episodeDefinition: {
		groupingKeys: ["instrumentId", "direction"];
		selection: "first_signal_while_prior_selected_setup_is_unresolved";
		sameResolutionSessionPolicy: "suppress";
		description: string;
	};
	episodes: {
		rows: number;
		episodeCount: number;
		rowsRemovedByFirstSignalSelection: number;
		reductionPercent: number;
		singletonEpisodes: number;
		multiRowEpisodes: number;
		rowsInMultiRowEpisodes: number;
		averageRowsPerEpisode: number;
		medianRowsPerEpisode: number;
		p90RowsPerEpisode: number;
		maximumRowsPerEpisode: number;
	};
	repeatOutcomeSimilarity: {
		comparisonsToEpisodeFirst: number;
		triggerAgreementPercent: number | null;
		profitableAgreementPercentWhenBothTriggered: number | null;
		averageAbsoluteRDifferenceWhenBothTriggered: number | null;
	};
	byInstrument: Array<{
		instrumentId: string;
		displaySymbol: string;
		rows: number;
		episodes: number;
		reductionPercent: number;
		maximumRowsPerEpisode: number;
	}>;
	targets: {
		actionableRThreshold: number;
		rowLevel: TrainingTargetSummary;
		episodeFirst: TrainingTargetSummary;
	};
	targetDesign: {
		version: typeof DAILY_SWING_TARGET_DESIGN_VERSION;
		population: "episode_first_signals";
		primaryTarget: "actionable_success";
		primaryDefinition: string;
		secondaryTarget: "setup_utility_r";
		secondaryDefinition: string;
		rationale: string[];
	};
	warnings: string[];
};
