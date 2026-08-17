import {
	Activity,
	Gauge,
	LockKeyhole,
	Sparkles,
	Target,
	TrendingUp,
} from "lucide-react";

type AiTechnicalAnalysisCardProps = {
	displaySymbol: string;
	provider: string;
};

const analysisFactors = [
	{ label: "Trend", icon: TrendingUp },
	{ label: "Momentum", icon: Activity },
	{ label: "Volatility", icon: Gauge },
];

const keyLevels = ["Support", "Resistance", "Invalidation"];

export default function AiTechnicalAnalysisCard({
	displaySymbol,
	provider,
}: AiTechnicalAnalysisCardProps) {
	return (
		<section className="stock-card" aria-labelledby="ai-analysis-heading">
			<div className="stock-card-heading">
				<div className="flex min-w-0 items-center gap-2">
					<Sparkles className="size-5 shrink-0 text-yellow-500" aria-hidden="true" />
					<h2 id="ai-analysis-heading">AI technical analysis</h2>
					<span className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-yellow-500">
						Preview
					</span>
				</div>
				<span className="shrink-0 text-xs font-medium text-gray-500">1D outlook</span>
			</div>

			<div className="grid gap-4 pt-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)]">
				<div className="rounded-lg border border-gray-600 bg-gray-700/30 p-4 sm:p-5">
					<div className="flex flex-wrap items-start justify-between gap-3">
						<div>
							<p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
								Overall signal · {displaySymbol}
							</p>
							<p className="mt-2 text-xl font-semibold text-gray-200">
								Awaiting analysis
							</p>
						</div>
						<div className="rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-right">
							<p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
								Confidence
							</p>
							<p className="mt-0.5 font-mono text-sm font-semibold text-gray-400">—</p>
						</div>
					</div>

					<div className="my-5 rounded-lg border border-dashed border-gray-600 bg-gray-800/50 px-4 py-5 text-center">
						<Sparkles className="mx-auto size-6 text-gray-500" aria-hidden="true" />
						<h3 className="mt-3 text-sm font-semibold text-gray-300">
							Market narrative is not available yet
						</h3>
						<p className="mx-auto mt-1 max-w-2xl text-xs leading-5 text-gray-500">
							BullWise will summarize trend structure, momentum, volatility, and risk
							conditions when the AI analysis pipeline is enabled.
						</p>
					</div>

					<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
						{analysisFactors.map(({ label, icon: Icon }) => (
							<div key={label} className="rounded-md border border-gray-600 bg-gray-800 p-3">
								<div className="flex items-center gap-2 text-gray-500">
									<Icon className="size-4" aria-hidden="true" />
									<span className="text-xs font-medium">{label}</span>
								</div>
								<p className="mt-3 text-sm font-semibold text-gray-400">Pending</p>
							</div>
						))}
					</div>
				</div>

				<aside className="rounded-lg border border-gray-600 bg-gray-700/30 p-4 sm:p-5">
					<div className="flex items-center gap-2">
						<Target className="size-4 text-yellow-500" aria-hidden="true" />
						<h3 className="text-sm font-semibold text-gray-200">Key levels</h3>
					</div>

					<div className="mt-4 divide-y divide-gray-600">
						{keyLevels.map((level) => (
							<div key={level} className="flex items-center justify-between py-3 text-sm">
								<span className="text-gray-500">{level}</span>
								<span className="font-mono font-semibold text-gray-400">—</span>
							</div>
						))}
					</div>

					<button
						type="button"
						disabled
						title="AI technical analysis is not available yet."
						className="mt-5 flex h-10 w-full cursor-not-allowed items-center justify-center gap-2 rounded-md bg-yellow-500 text-sm font-semibold text-gray-900 opacity-50"
					>
						<LockKeyhole className="size-4" aria-hidden="true" />
						Generate analysis
					</button>

					<div className="mt-4 flex items-center justify-between gap-3 text-xs">
						<span className="text-gray-500">Analysis provider</span>
						<span className="text-right font-medium text-gray-400">{provider}</span>
					</div>
				</aside>
			</div>
		</section>
	);
}
