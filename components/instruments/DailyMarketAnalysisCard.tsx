"use client";

import type {
	AnalysisPanelAvailableResponse,
	AnalysisPanelDataQuality,
	AnalysisPanelEvidenceFactor,
	AnalysisPanelLevel,
	AnalysisPanelResponse,
	AnalysisPanelUnavailableReason,
} from "@/lib/analysis/transparent-analysis-panel.types";
import {
	Activity,
	BarChart3,
	Gauge,
	RefreshCw,
	ShieldCheck,
	Target,
	TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type DailyMarketAnalysisCardProps = {
	canonicalKey: string;
	eligible: boolean;
};

type AnalysisLoadState =
	| { kind: "loading" }
	| { kind: "loaded"; response: AnalysisPanelResponse }
	| { kind: "error"; reason: "authentication" | "request_failed" };

const factorIcons = {
	trend: TrendingUp,
	momentum: Activity,
	volatility: Gauge,
	participation: BarChart3,
} as const;

const unavailableGuidance: Record<AnalysisPanelUnavailableReason, string> = {
	unsupported_instrument:
		"Daily analysis currently supports active U.S. common stocks with daily market data.",
	bars_provider_unavailable:
		"The market-data service may recover shortly. You can retry this request.",
	completed_session_unavailable:
		"Try again after the next completed U.S. market session is available.",
	invalid_market_data:
		"The returned daily history did not pass the required data-quality checks.",
	insufficient_history:
		"Analysis will become available after enough completed daily history is present.",
	stale_market_data:
		"The latest completed daily history has not arrived from the provider yet.",
	analysis_failed: "You can retry the analysis. No market context was inferred.",
};

const retryableUnavailableReasons = new Set<AnalysisPanelUnavailableReason>([
	"bars_provider_unavailable",
	"completed_session_unavailable",
	"analysis_failed",
]);

const unavailableReasons = new Set<AnalysisPanelUnavailableReason>([
	"unsupported_instrument",
	"bars_provider_unavailable",
	"completed_session_unavailable",
	"invalid_market_data",
	"insufficient_history",
	"stale_market_data",
	"analysis_failed",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function isStringArray(value: unknown): value is string[] {
	return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isFactor(value: unknown, states: readonly string[]) {
	return (
		isRecord(value) &&
		typeof value.state === "string" &&
		states.includes(value.state) &&
		isStringArray(value.evidence) &&
		isStringArray(value.counterEvidence)
	);
}

function isLevelArray(value: unknown) {
	return (
		Array.isArray(value) &&
		value.every(
			(level) =>
				isRecord(level) &&
				(level.kind === "support" || level.kind === "resistance") &&
				typeof level.price === "string" &&
				typeof level.distancePercent === "number" &&
				Number.isFinite(level.distancePercent) &&
				typeof level.touches === "number" &&
				Number.isInteger(level.touches) &&
				(level.source === "swing_cluster" || level.source === "range_boundary"),
		)
	);
}

function isDataQuality(value: unknown) {
	return (
		isRecord(value) &&
		typeof value.provider === "string" &&
		value.interval === "1d" &&
		value.adjusted === true &&
		typeof value.barsUsed === "number" &&
		typeof value.firstBarAt === "string" &&
		typeof value.lastBarAt === "string" &&
		typeof value.completedThrough === "string" &&
		isStringArray(value.warnings)
	);
}

export function isAnalysisPanelResponse(value: unknown): value is AnalysisPanelResponse {
	if (
		!isRecord(value) ||
		value.version !== "1.0.0" ||
		value.disclaimer !==
			"Descriptive market context—not investment advice or a trading signal."
	) {
		return false;
	}
	if (value.status === "unavailable") {
		return (
			typeof value.reason === "string" &&
			unavailableReasons.has(value.reason as AnalysisPanelUnavailableReason) &&
			typeof value.message === "string" &&
			(value.dataQuality === undefined || isDataQuality(value.dataQuality))
		);
	}
	return (
		(value.status === "ready" || value.status === "partial") &&
		isRecord(value.instrument) &&
		typeof value.instrument.canonicalKey === "string" &&
		typeof value.instrument.displaySymbol === "string" &&
		typeof value.instrument.name === "string" &&
		typeof value.instrument.currency === "string" &&
		typeof value.asOf === "string" &&
		isRecord(value.timeframe) &&
		value.timeframe.interval === "1d" &&
		value.timeframe.description === "Daily context" &&
		(value.context === "constructive" || value.context === "mixed" || value.context === "defensive") &&
		isRecord(value.factors) &&
		isFactor(value.factors.trend, ["bullish", "mixed", "bearish"]) &&
		isFactor(value.factors.momentum, ["bullish", "mixed", "bearish"]) &&
		isFactor(value.factors.volatility, ["low", "normal", "high"]) &&
		isFactor(value.factors.participation, [
			"weak",
			"normal",
			"strong",
			"unavailable",
		]) &&
		isRecord(value.levels) &&
		isLevelArray(value.levels.support) &&
		isLevelArray(value.levels.resistance) &&
		isDataQuality(value.dataQuality)
	);
}

export function analysisEndpointForInstrument(
	canonicalKey: string,
	eligible: boolean,
) {
	return eligible
		? `/api/instruments/${encodeURIComponent(canonicalKey)}/analysis`
		: null;
}

function formatTimestamp(value: string) {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "Unknown session";
	return new Intl.DateTimeFormat("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
		timeZone: "America/New_York",
		timeZoneName: "short",
	}).format(date);
}

function formatDate(value: string) {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "Unknown";
	return new Intl.DateTimeFormat("en-US", {
		dateStyle: "medium",
		timeZone: "America/New_York",
	}).format(date);
}

function CardShell({ children }: { children: React.ReactNode }) {
	return (
		<section className="stock-card" aria-labelledby="daily-analysis-heading">
			<div className="stock-card-heading">
				<div className="flex min-w-0 items-center gap-2">
					<BarChart3
						className="size-5 shrink-0 text-yellow-500"
						aria-hidden="true"
					/>
					<h2 id="daily-analysis-heading">Daily market analysis</h2>
				</div>
				<span className="shrink-0 text-xs font-medium text-gray-500">Daily context</span>
			</div>
			{children}
		</section>
	);
}

export function DailyMarketAnalysisLoading() {
	return (
		<CardShell>
			<div className="py-10 text-center" role="status" aria-live="polite">
				<div className="mx-auto size-7 animate-spin rounded-full border-2 border-gray-600 border-t-yellow-500" />
				<p className="mt-4 text-sm font-medium text-gray-300">
					Preparing daily market context…
				</p>
				<p className="mt-1 text-xs text-gray-500">
					Validating completed daily prices, participation, and SPY-relative data.
				</p>
			</div>
		</CardShell>
	);
}

export function DailyMarketAnalysisError({
	reason,
	onRetry,
}: {
	reason: "authentication" | "request_failed";
	onRetry?: () => void;
}) {
	return (
		<CardShell>
			<div className="py-8 text-center" role="alert">
				<h3 className="text-base font-semibold text-gray-200">
					{reason === "authentication"
						? "Your session has expired"
						: "Analysis could not be loaded"}
				</h3>
				<p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-gray-400">
					{reason === "authentication"
						? "Sign in again to request daily market analysis."
						: "The request did not complete. No market context was inferred."}
				</p>
				{reason === "authentication" ? (
					<Link
						href="/sign-in"
						className="mt-5 inline-flex h-10 items-center rounded-md bg-yellow-500 px-4 text-sm font-semibold text-gray-900"
					>
						Sign in
					</Link>
				) : (
					<button
						type="button"
						onClick={onRetry}
						className="mt-5 inline-flex h-10 cursor-pointer items-center gap-2 rounded-md bg-yellow-500 px-4 text-sm font-semibold text-gray-900"
					>
						<RefreshCw className="size-4" aria-hidden="true" />
						Retry
					</button>
				)}
			</div>
		</CardShell>
	);
}

function FactorCard({
	label,
	factor,
}: {
	label: keyof typeof factorIcons;
	factor: AnalysisPanelEvidenceFactor<string>;
}) {
	const Icon = factorIcons[label];
	const title = label[0].toUpperCase() + label.slice(1);
	return (
		<article className="rounded-lg border border-gray-600 bg-gray-800 p-4">
			<div className="flex items-center justify-between gap-3">
				<div className="flex items-center gap-2 text-gray-400">
					<Icon className="size-4" aria-hidden="true" />
					<h3 className="text-sm font-medium">{title}</h3>
				</div>
				<span className="rounded-full bg-gray-700 px-2 py-1 text-xs font-semibold capitalize text-gray-200">
					{factor.state}
				</span>
			</div>
			<details className="mt-4 text-xs text-gray-400">
				<summary className="cursor-pointer font-medium text-gray-300">Review evidence</summary>
				<div className="mt-3 space-y-3 leading-5">
					<div>
						<p className="font-semibold text-gray-300">Supporting evidence</p>
						{factor.evidence.length > 0 ? (
							<ul className="mt-1 list-disc space-y-1 pl-4">
								{factor.evidence.map((item) => (
									<li key={item}>{item}</li>
								))}
							</ul>
						) : (
							<p className="mt-1">No supporting evidence is available.</p>
						)}
					</div>
					<div>
						<p className="font-semibold text-gray-300">Counter evidence</p>
						{factor.counterEvidence.length > 0 ? (
							<ul className="mt-1 list-disc space-y-1 pl-4">
								{factor.counterEvidence.map((item) => (
									<li key={item}>{item}</li>
								))}
							</ul>
						) : (
							<p className="mt-1">No counter evidence was identified.</p>
						)}
					</div>
				</div>
			</details>
		</article>
	);
}

function LevelRow({ label, level }: { label: string; level?: AnalysisPanelLevel }) {
	return (
		<div className="flex items-start justify-between gap-4 py-3 text-sm">
			<span className="text-gray-400">{label}</span>
			{level ? (
				<div className="text-right">
					<p className="font-mono font-semibold text-gray-200">{level.price}</p>
					<p className="mt-1 text-xs text-gray-500">
						{Math.abs(level.distancePercent)}% away · {level.touches}{" "}
						{level.touches === 1 ? "touch" : "touches"}
					</p>
				</div>
			) : (
				<span className="text-xs text-gray-500">Not identified</span>
			)}
		</div>
	);
}

function PartialNotice({ response }: { response: AnalysisPanelAvailableResponse }) {
	if (response.status !== "partial") return null;
	const missing: string[] = [];
	if (response.factors.participation.state === "unavailable") {
		missing.push("participation");
	}
	if (
		response.dataQuality.warnings.some((warning) =>
			warning.includes("SPY benchmark"),
		)
	) {
		missing.push("SPY-relative strength");
	}
	return (
		<div className="mt-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-100">
			<strong>Partial analysis.</strong>{" "}
			{missing.length > 0
				? `${missing.join(" and ")} ${missing.length === 1 ? "is" : "are"} unavailable.`
				: "One or more non-fatal market-data checks require review."}
		</div>
	);
}

function Provenance({ dataQuality }: { dataQuality: AnalysisPanelDataQuality }) {
	return (
		<details className="mt-5 rounded-lg border border-gray-600 bg-gray-800/70 p-4">
			<summary className="cursor-pointer text-sm font-semibold text-gray-200">
				Data quality and provenance
			</summary>
			<dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
				<div>
					<dt className="text-gray-500">Provider</dt>
					<dd className="mt-1 text-gray-300">{dataQuality.provider}</dd>
				</div>
				<div>
					<dt className="text-gray-500">Interval</dt>
					<dd className="mt-1 text-gray-300">Daily · adjusted</dd>
				</div>
				<div>
					<dt className="text-gray-500">Bars used</dt>
					<dd className="mt-1 text-gray-300">{dataQuality.barsUsed}</dd>
				</div>
				<div>
					<dt className="text-gray-500">First bar</dt>
					<dd className="mt-1 text-gray-300">{formatDate(dataQuality.firstBarAt)}</dd>
				</div>
				<div>
					<dt className="text-gray-500">Latest bar</dt>
					<dd className="mt-1 text-gray-300">{formatDate(dataQuality.lastBarAt)}</dd>
				</div>
				<div>
					<dt className="text-gray-500">Completed through</dt>
					<dd className="mt-1 text-gray-300">
						{formatTimestamp(dataQuality.completedThrough)}
					</dd>
				</div>
			</dl>
			{dataQuality.warnings.length > 0 ? (
				<div className="mt-4">
					<p className="text-xs font-semibold text-gray-300">Data notes</p>
					<ul className="mt-1 list-disc space-y-1 pl-4 text-xs leading-5 text-gray-400">
						{dataQuality.warnings.map((warning) => (
							<li key={warning}>{warning}</li>
						))}
					</ul>
				</div>
			) : null}
		</details>
	);
}

function AvailableAnalysis({ response }: { response: AnalysisPanelAvailableResponse }) {
	const contextLabel =
		response.context[0].toUpperCase() + response.context.slice(1);
	return (
		<CardShell>
			<div className="pt-4">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
							Market context · {response.instrument.displaySymbol}
						</p>
						<p className="mt-2 text-xl font-semibold text-gray-100">{contextLabel}</p>
					</div>
					<p className="text-xs text-gray-400">
						As of {formatTimestamp(response.asOf)}
					</p>
				</div>
				<PartialNotice response={response} />
				<div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
					{(Object.keys(factorIcons) as Array<keyof typeof factorIcons>).map((factor) => (
						<FactorCard
							key={factor}
							label={factor}
							factor={response.factors[factor]}
						/>
					))}
				</div>
				<div className="mt-5 rounded-lg border border-gray-600 bg-gray-700/30 p-4">
					<div className="flex items-center gap-2">
						<Target className="size-4 text-yellow-500" aria-hidden="true" />
						<h3 className="text-sm font-semibold text-gray-200">
							Nearest price levels
						</h3>
					</div>
					<div className="mt-2 divide-y divide-gray-600 sm:grid sm:grid-cols-2 sm:divide-x sm:divide-y-0">
						<div className="sm:pr-4">
							<LevelRow label="Support" level={response.levels.support[0]} />
						</div>
						<div className="sm:pl-4">
							<LevelRow
								label="Resistance"
								level={response.levels.resistance[0]}
							/>
						</div>
					</div>
				</div>
				<Provenance dataQuality={response.dataQuality} />
				<p className="mt-5 flex items-start gap-2 text-xs leading-5 text-gray-500">
					<ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
					{response.disclaimer}
				</p>
			</div>
		</CardShell>
	);
}

function UnavailableAnalysis({
	response,
	onRetry,
}: {
	response: Extract<AnalysisPanelResponse, { status: "unavailable" }>;
	onRetry?: () => void;
}) {
	const retryable = retryableUnavailableReasons.has(response.reason);
	return (
		<CardShell>
			<div className="py-8 text-center" role="status">
				<h3 className="text-base font-semibold text-gray-200">
					Daily analysis is unavailable
				</h3>
				<p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-gray-400">
					{response.message}
				</p>
				<p className="mx-auto mt-1 max-w-xl text-xs leading-5 text-gray-500">
					{unavailableGuidance[response.reason]}
				</p>
				{retryable && onRetry ? (
					<button
						type="button"
						onClick={onRetry}
						className="mt-5 inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-gray-600 bg-gray-700 px-4 text-sm font-semibold text-gray-200"
					>
						<RefreshCw className="size-4" aria-hidden="true" /> Retry
					</button>
				) : null}
				{response.dataQuality ? (
					<Provenance dataQuality={response.dataQuality} />
				) : null}
				<p className="mx-auto mt-5 max-w-xl text-xs leading-5 text-gray-500">
					{response.disclaimer}
				</p>
			</div>
		</CardShell>
	);
}

export function DailyMarketAnalysisView({
	response,
	onRetry,
}: {
	response: AnalysisPanelResponse;
	onRetry?: () => void;
}) {
	return response.status === "unavailable" ? (
		<UnavailableAnalysis response={response} onRetry={onRetry} />
	) : (
		<AvailableAnalysis response={response} />
	);
}

const knownIneligibleResponse: AnalysisPanelResponse = {
	version: "1.0.0",
	status: "unavailable",
	reason: "unsupported_instrument",
	message: "Daily market analysis is currently available only for eligible U.S. common stocks.",
	disclaimer: "Descriptive market context—not investment advice or a trading signal.",
};

export default function DailyMarketAnalysisCard({
	canonicalKey,
	eligible,
}: DailyMarketAnalysisCardProps) {
	const [requestVersion, setRequestVersion] = useState(0);
	const [state, setState] = useState<AnalysisLoadState>({ kind: "loading" });
	const endpoint = analysisEndpointForInstrument(canonicalKey, eligible);

	useEffect(() => {
		if (!endpoint) return;
		const controller = new AbortController();
		void (async () => {
			try {
				const result = await fetch(endpoint, {
					cache: "no-store",
					credentials: "same-origin",
					headers: { Accept: "application/json" },
					signal: controller.signal,
				});
				if (result.status === 401) {
					setState({ kind: "error", reason: "authentication" });
					return;
				}
				const payload: unknown = await result.json();
				if (!isAnalysisPanelResponse(payload)) {
					throw new Error("Invalid analysis response");
				}
				setState({ kind: "loaded", response: payload });
			} catch (error) {
				if (error instanceof DOMException && error.name === "AbortError") return;
				setState({ kind: "error", reason: "request_failed" });
			}
		})();
		return () => controller.abort();
	}, [endpoint, requestVersion]);

	const retry = () => {
		setState({ kind: "loading" });
		setRequestVersion((value) => value + 1);
	};

	if (!endpoint) {
		return <DailyMarketAnalysisView response={knownIneligibleResponse} />;
	}
	if (state.kind === "loading") return <DailyMarketAnalysisLoading />;
	if (state.kind === "error") {
		return <DailyMarketAnalysisError reason={state.reason} onRetry={retry} />;
	}
	return <DailyMarketAnalysisView response={state.response} onRetry={retry} />;
}
