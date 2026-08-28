import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
	summarizeTransparentAnalysisObservation,
	transparentAnalysisDailyCandidates,
	transparentAnalysisObservationDate,
	validateTransparentAnalysisObservationArguments,
} from "@/lib/analysis/transparent-analysis-daily-observation";
import { TRANSPARENT_ANALYSIS_LOCAL_TELEMETRY_PATH } from "@/lib/analysis/transparent-analysis-telemetry-file";

const USAGE = `Usage: npm run observe:transparent-analysis

Reports aggregate local telemetry progress and prints today's rotating manual stock
checklist. It does not call the analysis API, authenticate, or create telemetry.`;

function sortedCounts(counts: Record<string, number>) {
	const entries = Object.entries(counts).sort(([left], [right]) => left.localeCompare(right));
	return entries.length > 0
		? entries.map(([name, count]) => `${name}=${count}`).join(", ")
		: "none";
}

function main() {
	const { help } = validateTransparentAnalysisObservationArguments(
		process.argv.slice(2),
	);
	if (help) {
		console.log(USAGE);
		return;
	}

	const now = new Date();
	const path = resolve(TRANSPARENT_ANALYSIS_LOCAL_TELEMETRY_PATH);
	const contents = existsSync(path) ? readFileSync(path, "utf8") : "";
	const progress = summarizeTransparentAnalysisObservation(contents, now);
	const candidates = transparentAnalysisDailyCandidates(now);

	console.log(`Transparent analysis observation — ${transparentAnalysisObservationDate(now)} UTC`);
	console.log(`Progress: ${progress.validRequests}/50 valid requests across ${progress.distinctDays}/7 days`);
	console.log(`Today: ${progress.todayRequests} valid requests`);
	console.log(`Remaining minimum: ${progress.remainingRequests} requests and ${progress.remainingDays} days`);
	console.log(`Outcomes: ${sortedCounts(progress.outcomes)}`);
	console.log(`Durations: ${sortedCounts(progress.durations)}`);
	console.log(`Operational failures: ${sortedCounts(progress.failureCategories)}`);
	if (progress.invalidLines > 0 || progress.undatedRequestEvents > 0) {
		console.log(`Excluded: ${progress.invalidLines} invalid lines, ${progress.undatedRequestEvents} undated requests`);
	}
	console.log("Today's manual checklist:");
	for (const candidate of candidates) {
		console.log(`- ${candidate.symbol} (${candidate.sector})`);
	}
	console.log("Open these through the signed-in UI and let each analysis panel finish. Do not automate or repeatedly refresh requests.");
	if (progress.requestMinimumMet && progress.dayMinimumMet) {
		console.log("Minimum observation coverage reached; run the formal aggregate review next.");
	}
}

try {
	main();
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error));
	process.exitCode = 1;
}
