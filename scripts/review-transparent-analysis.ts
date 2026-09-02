import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
	buildTransparentAnalysisOperationalReview,
	TRANSPARENT_ANALYSIS_OPERATIONAL_REVIEW_PATH,
	validateTransparentAnalysisOperationalReviewArguments,
	writeTransparentAnalysisOperationalReview,
} from "@/lib/analysis/transparent-analysis-operational-review";
import { TRANSPARENT_ANALYSIS_LOCAL_TELEMETRY_PATH } from "@/lib/analysis/transparent-analysis-telemetry-file";

const USAGE = `Usage: npm run review:transparent-analysis

Performs the fixed aggregate-only operational review of local transparent-analysis
telemetry. The privacy-safe report is written once; no overrides are accepted.`;

async function main() {
	const { help } = validateTransparentAnalysisOperationalReviewArguments(
		process.argv.slice(2),
	);
	if (help) {
		console.log(USAGE);
		return;
	}

	const sourcePath = resolve(TRANSPARENT_ANALYSIS_LOCAL_TELEMETRY_PATH);
	const contents = readFileSync(sourcePath, "utf8");
	const review = buildTransparentAnalysisOperationalReview({
		contents,
		createdAt: new Date(),
	});
	const outputPath = resolve(TRANSPARENT_ANALYSIS_OPERATIONAL_REVIEW_PATH);
	await writeTransparentAnalysisOperationalReview(outputPath, review);

	const passed = review.gates.filter((gate) => gate.passed).length;
	console.log(`Transparent analysis operational review: ${outputPath}`);
	console.log(`Decision: ${review.decision} | ${passed}/${review.gates.length} gates`);
	console.log(`${review.coverage.validRequests} valid requests | ${review.coverage.distinctDays} UTC days | ${review.rates.availablePercent}% available`);
	console.log(`${review.rates.tenSecondsOrMorePercent}% at 10s+ | ${review.coverage.invalidLines} invalid lines`);
	for (const gate of review.gates.filter((candidate) => !candidate.passed)) {
		console.log(`Failed: ${gate.id} (${gate.value} ${gate.comparison} ${gate.threshold} ${gate.unit})`);
	}
	if (review.decision !== "pass_operational_review") process.exitCode = 1;
}

main().catch((error: unknown) => {
	if (error && typeof error === "object" && "code" in error && error.code === "EEXIST") {
		console.error("The operational review already exists; it was not replaced.");
	} else {
		console.error(error instanceof Error ? error.message : String(error));
	}
	process.exitCode = 1;
});
