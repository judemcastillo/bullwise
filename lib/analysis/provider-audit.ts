import type { MarketBars } from "@/lib/market-data/types";

export type ProviderSeriesAudit = {
	displaySymbol: string;
	referenceProvider: string;
	candidateProvider: string;
	overlapStartAt: string | null;
	overlapEndAt: string | null;
	overlappingBars: number;
	dateCoveragePercent: number;
	medianAbsoluteReturnDifferenceBps: number | null;
	percentile95AbsoluteReturnDifferenceBps: number | null;
	maximumAbsoluteReturnDifferenceBps: number | null;
	latestCloseDifferenceBps: number | null;
	medianAbsoluteVolumeDifferencePercent: number | null;
	passed: boolean;
	findings: string[];
};

export type BacktestProviderAuditReport = {
	generatedAt: string;
	referenceProvider: string;
	candidateProvider: string;
	instrumentsAudited: number;
	instrumentsPassed: number;
	passed: boolean;
	thresholds: {
		minimumOverlappingBars: 400;
		minimumDateCoveragePercent: 98;
		maximumMedianReturnDifferenceBps: 5;
		maximumPercentile95ReturnDifferenceBps: 50;
		maximumLatestCloseDifferenceBps: 50;
		maximumMedianVolumeDifferencePercent: 5;
	};
	instruments: ProviderSeriesAudit[];
	warnings: string[];
};

const THRESHOLDS = {
	minimumOverlappingBars: 400,
	minimumDateCoveragePercent: 98,
	maximumMedianReturnDifferenceBps: 5,
	maximumPercentile95ReturnDifferenceBps: 50,
	maximumLatestCloseDifferenceBps: 50,
	maximumMedianVolumeDifferencePercent: 5,
} as const;

function round(value: number, precision = 8) {
	const multiplier = 10 ** precision;
	return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
}

function median(values: readonly number[]) {
	if (values.length === 0) return null;
	const sorted = [...values].sort((left, right) => left - right);
	const middle = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 0
		? (sorted[middle - 1] + sorted[middle]) / 2
		: sorted[middle];
}

function percentile(values: readonly number[], percentileValue: number) {
	if (values.length === 0) return null;
	const sorted = [...values].sort((left, right) => left - right);
	const index = Math.min(
		sorted.length - 1,
		Math.max(0, Math.ceil((percentileValue / 100) * sorted.length) - 1),
	);
	return sorted[index];
}

function dateKey(date: Date) {
	return date.toISOString().slice(0, 10);
}

export function auditProviderSeries(
	displaySymbol: string,
	reference: MarketBars,
	candidate: MarketBars,
): ProviderSeriesAudit {
	const referenceByDate = new Map(
		reference.bars.map((bar) => [dateKey(bar.startedAt), bar]),
	);
	const candidateByDate = new Map(
		candidate.bars.map((bar) => [dateKey(bar.startedAt), bar]),
	);
	const overlapDates = [...referenceByDate.keys()]
		.filter((date) => candidateByDate.has(date))
		.sort();
	const firstDate = overlapDates[0];
	const lastDate = overlapDates.at(-1);
	const referenceDatesInWindow = firstDate
		? [...referenceByDate.keys()].filter(
				(date) => date >= firstDate && date <= lastDate!,
			).length
		: 0;
	const candidateDatesInWindow = firstDate
		? [...candidateByDate.keys()].filter(
				(date) => date >= firstDate && date <= lastDate!,
			).length
		: 0;
	const possibleDates = Math.max(
		referenceDatesInWindow,
		candidateDatesInWindow,
		overlapDates.length,
	);
	const dateCoveragePercent =
		possibleDates === 0 ? 0 : (overlapDates.length / possibleDates) * 100;
	const returnDifferences: number[] = [];
	const volumeDifferences: number[] = [];
	for (let index = 1; index < overlapDates.length; index += 1) {
		const previousDate = overlapDates[index - 1];
		const currentDate = overlapDates[index];
		const referencePrevious = Number(referenceByDate.get(previousDate)!.close);
		const referenceCurrent = Number(referenceByDate.get(currentDate)!.close);
		const candidatePrevious = Number(candidateByDate.get(previousDate)!.close);
		const candidateCurrent = Number(candidateByDate.get(currentDate)!.close);
		if (
			[referencePrevious, referenceCurrent, candidatePrevious, candidateCurrent].every(
				(value) => Number.isFinite(value) && value > 0,
			)
		) {
			const referenceReturn = referenceCurrent / referencePrevious - 1;
			const candidateReturn = candidateCurrent / candidatePrevious - 1;
			returnDifferences.push(
				Math.abs(referenceReturn - candidateReturn) * 10_000,
			);
		}
		const referenceVolume = Number(referenceByDate.get(currentDate)!.volume);
		const candidateVolume = Number(candidateByDate.get(currentDate)!.volume);
		if (
			Number.isFinite(referenceVolume) &&
			referenceVolume > 0 &&
			Number.isFinite(candidateVolume) &&
			candidateVolume > 0
		) {
			volumeDifferences.push(
				Math.abs(candidateVolume / referenceVolume - 1) * 100,
			);
		}
	}
	const medianReturnDifference = median(returnDifferences);
	const percentile95ReturnDifference = percentile(returnDifferences, 95);
	const maximumReturnDifference =
		returnDifferences.length === 0 ? null : Math.max(...returnDifferences);
	const medianVolumeDifference = median(volumeDifferences);
	let latestCloseDifference: number | null = null;
	if (lastDate) {
		const referenceClose = Number(referenceByDate.get(lastDate)!.close);
		const candidateClose = Number(candidateByDate.get(lastDate)!.close);
		if (referenceClose > 0 && candidateClose > 0) {
			latestCloseDifference = Math.abs(candidateClose / referenceClose - 1) * 10_000;
		}
	}
	const findings: string[] = [];
	if (overlapDates.length < THRESHOLDS.minimumOverlappingBars) {
		findings.push("Insufficient overlapping bars");
	}
	if (dateCoveragePercent < THRESHOLDS.minimumDateCoveragePercent) {
		findings.push("Trading-date coverage differs materially");
	}
	if (
		medianReturnDifference === null ||
		medianReturnDifference > THRESHOLDS.maximumMedianReturnDifferenceBps
	) {
		findings.push("Median daily return difference exceeds tolerance");
	}
	if (
		percentile95ReturnDifference === null ||
		percentile95ReturnDifference >
			THRESHOLDS.maximumPercentile95ReturnDifferenceBps
	) {
		findings.push("95th-percentile daily return difference exceeds tolerance");
	}
	if (
		latestCloseDifference === null ||
		latestCloseDifference > THRESHOLDS.maximumLatestCloseDifferenceBps
	) {
		findings.push("Latest close differs materially");
	}
	if (
		medianVolumeDifference === null ||
		medianVolumeDifference > THRESHOLDS.maximumMedianVolumeDifferencePercent
	) {
		findings.push("Median daily volume difference exceeds tolerance");
	}
	return {
		displaySymbol,
		referenceProvider: reference.provider,
		candidateProvider: candidate.provider,
		overlapStartAt: firstDate ?? null,
		overlapEndAt: lastDate ?? null,
		overlappingBars: overlapDates.length,
		dateCoveragePercent: round(dateCoveragePercent),
		medianAbsoluteReturnDifferenceBps:
			medianReturnDifference === null ? null : round(medianReturnDifference),
		percentile95AbsoluteReturnDifferenceBps:
			percentile95ReturnDifference === null
				? null
				: round(percentile95ReturnDifference),
		maximumAbsoluteReturnDifferenceBps:
			maximumReturnDifference === null ? null : round(maximumReturnDifference),
		latestCloseDifferenceBps:
			latestCloseDifference === null ? null : round(latestCloseDifference),
		medianAbsoluteVolumeDifferencePercent:
			medianVolumeDifference === null ? null : round(medianVolumeDifference),
		passed: findings.length === 0,
		findings,
	};
}

export function buildProviderAuditReport(
	referenceProvider: string,
	candidateProvider: string,
	instruments: ProviderSeriesAudit[],
	generatedAt = new Date(),
): BacktestProviderAuditReport {
	if (Number.isNaN(generatedAt.getTime())) throw new Error("generatedAt must be valid");
	const instrumentsPassed = instruments.filter((instrument) => instrument.passed).length;
	return {
		generatedAt: generatedAt.toISOString(),
		referenceProvider,
		candidateProvider,
		instrumentsAudited: instruments.length,
		instrumentsPassed,
		passed: instruments.length > 0 && instrumentsPassed === instruments.length,
		thresholds: THRESHOLDS,
		instruments,
		warnings: [
			"Return-series comparison tolerates isolated corporate-action differences but not persistent price divergence.",
			"Passing overlap checks does not guarantee that either provider is free of historical errors.",
		],
	};
}
