import type { DailySwingBacktestReport } from "@/lib/analysis/backtest.types";
import {
	DAILY_SWING_PORTFOLIO_BACKTEST_VERSION,
	type DailySwingPortfolioBacktestReport,
	type PortfolioAcceptedTrade,
	type PortfolioBacktestConfiguration,
	type PortfolioRejectedTrade,
} from "@/lib/analysis/portfolio-backtest.types";

const DEFAULT_CONFIGURATION: PortfolioBacktestConfiguration = {
	initialEquity: 100_000,
	riskPerTradePercent: 1,
	maximumOpenPositions: 5,
	maximumTotalRiskPercent: 5,
	maximumGrossExposurePercent: 100,
	candidateSelectionPolicy: "symbol",
};

type PortfolioBacktestInput = {
	universeName: string;
	reports: DailySwingBacktestReport[];
	configuration?: Partial<PortfolioBacktestConfiguration>;
	generatedAt?: Date;
};

type Candidate = {
	instrumentId: string;
	displaySymbol: string;
	trade: DailySwingBacktestReport["trades"][number];
};

function round(value: number, precision = 8) {
	const multiplier = 10 ** precision;
	return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
}

function finitePositive(value: number, label: string) {
	if (!Number.isFinite(value) || value <= 0) {
		throw new Error(`${label} must be a positive finite number`);
	}
}

function resolveConfiguration(
	overrides: Partial<PortfolioBacktestConfiguration> = {},
) {
	const configuration = { ...DEFAULT_CONFIGURATION, ...overrides };
	finitePositive(configuration.initialEquity, "initialEquity");
	finitePositive(configuration.riskPerTradePercent, "riskPerTradePercent");
	finitePositive(configuration.maximumTotalRiskPercent, "maximumTotalRiskPercent");
	finitePositive(
		configuration.maximumGrossExposurePercent,
		"maximumGrossExposurePercent",
	);
	if (
		!Number.isInteger(configuration.maximumOpenPositions) ||
		configuration.maximumOpenPositions <= 0
	) {
		throw new Error("maximumOpenPositions must be a positive integer");
	}
	if (configuration.riskPerTradePercent > configuration.maximumTotalRiskPercent) {
		throw new Error("riskPerTradePercent cannot exceed maximumTotalRiskPercent");
	}
	if (
		configuration.candidateSelectionPolicy !== "symbol" &&
		configuration.candidateSelectionPolicy !== "v3_signal_quality"
	) {
		throw new Error(
			"candidateSelectionPolicy must be symbol or v3_signal_quality",
		);
	}
	return configuration;
}

function descendingNullable(left: number | null, right: number | null) {
	return (right ?? Number.NEGATIVE_INFINITY) -
		(left ?? Number.NEGATIVE_INFINITY);
}

function v3CandidateOrder(left: Candidate, right: Candidate) {
	const setupRank = { breakout: 3, pullback: 2, breakdown: 1 } as const;
	const evidenceRank = { strong: 3, moderate: 2, weak: 1, unavailable: 0 } as const;
	return (
		setupRank[right.trade.setupType] - setupRank[left.trade.setupType] ||
		evidenceRank[right.trade.signalQuality.evidenceStrength] -
			evidenceRank[left.trade.signalQuality.evidenceStrength] ||
		descendingNullable(
			left.trade.signalQuality.relativeStrength20Percent,
			right.trade.signalQuality.relativeStrength20Percent,
		) ||
		descendingNullable(
			left.trade.signalQuality.volumeZScore20,
			right.trade.signalQuality.volumeZScore20,
		) ||
		right.trade.signalQuality.planRiskReward -
			left.trade.signalQuality.planRiskReward ||
		left.displaySymbol.localeCompare(right.displaySymbol)
	);
}

function latestMark(
	trade: PortfolioAcceptedTrade,
	timestamp: number,
	strictlyBefore = false,
) {
	return [...trade.sourceTrade.markToMarket]
		.reverse()
		.find((mark) => {
			const at = new Date(mark.at).getTime();
			return strictlyBefore ? at < timestamp : at <= timestamp;
		});
}

function activeAtOpen(trade: PortfolioAcceptedTrade, timestamp: number) {
	return (
		new Date(trade.entryAt).getTime() < timestamp &&
		new Date(trade.exitAt).getTime() >= timestamp
	);
}

function activeOpeningExposure(
	trades: readonly PortfolioAcceptedTrade[],
	timestamp: number,
) {
	return trades.reduce(
		(total, trade) => {
			if (!activeAtOpen(trade, timestamp)) return total;
			const mark = latestMark(trade, timestamp, true);
			const remaining = mark?.remainingPositionFraction ?? 1;
			const markPrice = mark?.markPrice ?? trade.sourceTrade.entryPrice;
			total.positions += 1;
			total.grossNotional +=
				markPrice * trade.portfolioPositionUnits * remaining;
			total.committedRisk += trade.portfolioRiskCapital * remaining;
			return total;
		},
		{ positions: 0, grossNotional: 0, committedRisk: 0 },
	);
}

function validateCandidate(candidate: Candidate) {
	const trade = candidate.trade;
	if (!trade.signalQuality || trade.markToMarket.length === 0) {
		throw new Error(
			`${candidate.displaySymbol} trade at ${trade.entryAt} lacks portfolio provenance; regenerate it with a current backtest`,
		);
	}
	if (!(trade.positionUnits > 0 && trade.riskCapital > 0)) {
		throw new Error("Candidate trades require positive units and risk capital");
	}
	const terminalMark = trade.markToMarket.at(-1)!;
	if (Math.abs(terminalMark.netPnl - trade.netPnl) > 0.02) {
		throw new Error("Candidate terminal mark does not match its net PnL");
	}
}

export function runDailySwingPortfolioBacktest(
	input: PortfolioBacktestInput,
): DailySwingPortfolioBacktestReport {
	if (!input.universeName.trim()) throw new Error("universeName is required");
	if (input.reports.length === 0) throw new Error("At least one report is required");
	const generatedAt = input.generatedAt ?? new Date();
	if (Number.isNaN(generatedAt.getTime())) throw new Error("generatedAt must be valid");
	const configuration = resolveConfiguration(input.configuration);
	const instrumentIds = input.reports.map(
		(report) => report.instrument.instrumentId,
	);
	if (new Set(instrumentIds).size !== instrumentIds.length) {
		throw new Error("Portfolio source reports require unique instrument IDs");
	}
	const executionSignatures = new Set(
		input.reports.map((report) =>
			JSON.stringify({
				transactionCostBpsPerSide:
					report.configuration.transactionCostBpsPerSide,
				slippageBpsPerFill: report.configuration.slippageBpsPerFill,
				maximumHoldingBars: report.configuration.maximumHoldingBars,
				sameBarPolicy: report.configuration.sameBarPolicy,
			}),
		),
	);
	if (executionSignatures.size !== 1) {
		throw new Error("Portfolio source reports require identical execution settings");
	}
	const firstSourceConfiguration = input.reports[0].configuration;
	const candidates: Candidate[] = input.reports
		.flatMap((report) =>
			report.trades.map((trade) => ({
				instrumentId: report.instrument.instrumentId,
				displaySymbol: report.instrument.displaySymbol,
				trade,
			})),
		)
		.sort(
			(left, right) =>
				new Date(left.trade.entryAt).getTime() -
					new Date(right.trade.entryAt).getTime() ||
				left.displaySymbol.localeCompare(right.displaySymbol),
		);
	for (const candidate of candidates) validateCandidate(candidate);
	const dates = [
		...new Set(
			candidates.flatMap((candidate) => [
				candidate.trade.entryAt,
				...candidate.trade.markToMarket.map((mark) => mark.at),
			]),
		),
	].sort((left, right) => new Date(left).getTime() - new Date(right).getTime());
	const candidatesByEntry = new Map<string, Candidate[]>();
	for (const candidate of candidates) {
		const group = candidatesByEntry.get(candidate.trade.entryAt) ?? [];
		group.push(candidate);
		candidatesByEntry.set(candidate.trade.entryAt, group);
	}
	for (const group of candidatesByEntry.values()) {
		group.sort(
			configuration.candidateSelectionPolicy === "v3_signal_quality"
				? v3CandidateOrder
				: (left, right) =>
						left.displaySymbol.localeCompare(right.displaySymbol),
		);
	}

	const acceptedTrades: PortfolioAcceptedTrade[] = [];
	const rejectedTrades: PortfolioRejectedTrade[] = [];
	const equityCurve: DailySwingPortfolioBacktestReport["equityCurve"] = [];
	let currentEquity = configuration.initialEquity;
	let peakEquity = currentEquity;
	let maximumDrawdownPercent = 0;

	for (const at of dates) {
		const timestamp = new Date(at).getTime();
		const opening = activeOpeningExposure(acceptedTrades, timestamp);
		let sameDayPositions = 0;
		let sameDayGrossNotional = 0;
		let sameDayCommittedRisk = 0;
		for (const candidate of candidatesByEntry.get(at) ?? []) {
			const desiredRiskCapital =
				currentEquity * (configuration.riskPerTradePercent / 100);
			const riskPerUnit = Math.abs(
				candidate.trade.entryPrice - candidate.trade.stopPrice,
			);
			if (!(riskPerUnit > 0)) throw new Error("Candidate entry and stop require positive risk");
			const portfolioPositionUnits = desiredRiskCapital / riskPerUnit;
			const candidateGrossNotional =
				candidate.trade.entryPrice * portfolioPositionUnits;
			let reason: PortfolioRejectedTrade["reason"] | null = null;
			if (
				opening.positions + sameDayPositions >=
				configuration.maximumOpenPositions
			) {
				reason = "maximum_open_positions";
			} else if (
				opening.committedRisk +
					sameDayCommittedRisk +
					desiredRiskCapital >
				currentEquity * (configuration.maximumTotalRiskPercent / 100)
			) {
				reason = "maximum_total_risk";
			} else if (
				opening.grossNotional +
					sameDayGrossNotional +
					candidateGrossNotional >
				currentEquity * (configuration.maximumGrossExposurePercent / 100)
			) {
				reason = "maximum_gross_exposure";
			}
			if (reason) {
				rejectedTrades.push({
					instrumentId: candidate.instrumentId,
					displaySymbol: candidate.displaySymbol,
					entryAt: candidate.trade.entryAt,
					exitAt: candidate.trade.exitAt,
					reason,
				});
				continue;
			}
			const scaleFactor = portfolioPositionUnits / candidate.trade.positionUnits;
			acceptedTrades.push({
				instrumentId: candidate.instrumentId,
				displaySymbol: candidate.displaySymbol,
				entryAt: candidate.trade.entryAt,
				exitAt: candidate.trade.exitAt,
				portfolioPositionUnits: round(portfolioPositionUnits),
				portfolioRiskCapital: round(desiredRiskCapital),
				scaleFactor: round(scaleFactor),
				netPnl: round(candidate.trade.netPnl * scaleFactor),
				rMultiple: candidate.trade.rMultiple,
				sourceTrade: candidate.trade,
			});
			sameDayPositions += 1;
			sameDayGrossNotional += candidateGrossNotional;
			sameDayCommittedRisk += desiredRiskCapital;
		}

		let totalMarkedPnl = 0;
		let closingGrossNotional = 0;
		let closingCommittedRisk = 0;
		let openPositions = 0;
		for (const trade of acceptedTrades) {
			if (new Date(trade.entryAt).getTime() > timestamp) continue;
			const mark = latestMark(trade, timestamp);
			if (!mark) continue;
			totalMarkedPnl += mark.netPnl * trade.scaleFactor;
			if (mark.remainingPositionFraction > 0) {
				openPositions += 1;
				closingGrossNotional +=
					mark.markPrice *
					trade.portfolioPositionUnits *
					mark.remainingPositionFraction;
				closingCommittedRisk +=
					trade.portfolioRiskCapital * mark.remainingPositionFraction;
			}
		}
		currentEquity = configuration.initialEquity + totalMarkedPnl;
		peakEquity = Math.max(peakEquity, currentEquity);
		const drawdownPercent =
			peakEquity > 0 ? ((peakEquity - currentEquity) / peakEquity) * 100 : 0;
		maximumDrawdownPercent = Math.max(maximumDrawdownPercent, drawdownPercent);
		equityCurve.push({
			at,
			equity: round(currentEquity),
			drawdownPercent: round(drawdownPercent),
			openPositions,
			grossExposurePercent: round(
				currentEquity > 0 ? (closingGrossNotional / currentEquity) * 100 : 0,
			),
			committedRiskPercent: round(
				currentEquity > 0 ? (closingCommittedRisk / currentEquity) * 100 : 0,
			),
		});
	}

	const wins = acceptedTrades.filter((trade) => trade.netPnl > 0).length;
	const losses = acceptedTrades.filter((trade) => trade.netPnl < 0).length;
	const grossProfits = acceptedTrades.reduce(
		(total, trade) => total + Math.max(0, trade.netPnl),
		0,
	);
	const grossLosses = Math.abs(
		acceptedTrades.reduce(
			(total, trade) => total + Math.min(0, trade.netPnl),
			0,
		),
	);
	const periodStartAt = acceptedTrades[0]?.entryAt ?? null;
	const periodEndAt =
		acceptedTrades.length === 0
			? null
			: acceptedTrades.reduce(
					(latest, trade) => (trade.exitAt > latest ? trade.exitAt : latest),
					acceptedTrades[0].exitAt,
				);
	const periodYears =
		periodStartAt && periodEndAt
			? (new Date(periodEndAt).getTime() - new Date(periodStartAt).getTime()) /
				(365.25 * 24 * 60 * 60 * 1_000)
			: null;
	const annualizedReturnPercent =
		periodYears && periodYears > 0 && currentEquity > 0
			? round(
					(((currentEquity / configuration.initialEquity) ** (1 / periodYears)) -
						1) *
						100,
				)
			: null;
	return {
		portfolioBacktestVersion: DAILY_SWING_PORTFOLIO_BACKTEST_VERSION,
		generatedAt: generatedAt.toISOString(),
		universeName: input.universeName.trim(),
		configuration,
		source: {
			backtestVersions: [
				...new Set(input.reports.map((report) => report.backtestVersion)),
			],
			strategyVersions: [
				...new Set(input.reports.map((report) => report.strategyVersion)),
			],
			transactionCostBpsPerSide:
				firstSourceConfiguration.transactionCostBpsPerSide,
			slippageBpsPerFill: firstSourceConfiguration.slippageBpsPerFill,
			maximumHoldingBars: firstSourceConfiguration.maximumHoldingBars,
			sameBarPolicy: firstSourceConfiguration.sameBarPolicy,
		},
		candidateTrades: candidates.length,
		acceptedTrades,
		rejectedTrades,
		performance: {
			tradeCount: acceptedTrades.length,
			wins,
			losses,
			winRatePercent:
				acceptedTrades.length === 0
					? null
					: round((wins / acceptedTrades.length) * 100),
			averageRMultiple:
				acceptedTrades.length === 0
					? null
					: round(
							acceptedTrades.reduce(
								(total, trade) => total + trade.rMultiple,
								0,
							) / acceptedTrades.length,
						),
			profitFactor: grossLosses > 0 ? round(grossProfits / grossLosses) : null,
			initialEquity: configuration.initialEquity,
			endingEquity: round(currentEquity),
			totalReturnPercent: round(
				((currentEquity / configuration.initialEquity) - 1) * 100,
			),
			annualizedReturnPercent,
			maximumDrawdownPercent: round(maximumDrawdownPercent),
		},
		period: {
			startAt: periodStartAt,
			endAt: periodEndAt,
			years: periodYears === null ? null : round(periodYears),
		},
		exposure: {
			maximumConcurrentPositions: Math.max(
				0,
				...equityCurve.map((point) => point.openPositions),
			),
			maximumGrossExposurePercent: Math.max(
				0,
				...equityCurve.map((point) => point.grossExposurePercent),
			),
			maximumCommittedRiskPercent: Math.max(
				0,
				...equityCurve.map((point) => point.committedRiskPercent),
			),
		},
		rejections: {
			maximumOpenPositions: rejectedTrades.filter(
				(trade) => trade.reason === "maximum_open_positions",
			).length,
			maximumTotalRisk: rejectedTrades.filter(
				(trade) => trade.reason === "maximum_total_risk",
			).length,
			maximumGrossExposure: rejectedTrades.filter(
				(trade) => trade.reason === "maximum_gross_exposure",
			).length,
		},
		equityCurve,
		warnings: [
			"Signals are candidate trades from independent per-instrument backtests; the opportunity stream still permits only one pending setup or open trade per instrument.",
			configuration.candidateSelectionPolicy === "v3_signal_quality"
				? "Same-session entries use the frozen v3 signal-quality ranking; positions exiting that session continue to consume opening capacity."
				: "Same-session entries are ordered by display symbol and positions exiting that session continue to consume opening capacity.",
			"Portfolio equity and exposure mark open positions to completed daily closes and do not model intraday portfolio paths.",
			"Gross exposure uses position market value and does not model broker margin, borrow availability, taxes, or financing costs.",
			"Idle cash earns no interest.",
		],
	};
}
