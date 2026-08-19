import { spawn } from "node:child_process";
import { resolve } from "node:path";
import {
	BROAD_DEVELOPMENT_V2_EXPANSION_DATA_POLICY,
	BROAD_DEVELOPMENT_V2_EXPANSION_NAME,
	BROAD_DEVELOPMENT_V2_EXPANSION_SYMBOLS,
	BROAD_DEVELOPMENT_V2_EXPANSION_VERSION,
} from "@/lib/analysis/broad-development-v2-universe";

const OUTPUT = "analysis-broad-v2-expansion-history.json";
const USAGE = `Usage: npm run fetch:analysis-broad-development-v2

Fetches the frozen ${BROAD_DEVELOPMENT_V2_EXPANSION_NAME} universe:
  manifest version: ${BROAD_DEVELOPMENT_V2_EXPANSION_VERSION}
  candidates:       ${BROAD_DEVELOPMENT_V2_EXPANSION_SYMBOLS.length}
  provider:         ${BROAD_DEVELOPMENT_V2_EXPANSION_DATA_POLICY.provider}
  requested range:  ${BROAD_DEVELOPMENT_V2_EXPANSION_DATA_POLICY.requestedFrom} through ${BROAD_DEVELOPMENT_V2_EXPANSION_DATA_POLICY.requestedThrough}
  output:           ${OUTPUT}

No overrides or overwrite flag are accepted. Change the versioned manifest before
retrieval if the frozen contract is wrong; never silently replace a fetched artifact.`;

async function main() {
	if (process.argv.includes("--help") || process.argv.includes("-h")) {
		console.log(USAGE);
		return;
	}
	if (process.argv.length > 2) {
		throw new Error(
			"The frozen broad-development v2 fetch does not accept overrides",
		);
	}
	const fetchScript = resolve("scripts/fetch-backtest-batch.ts");
	const arguments_ = [
		"--import",
		"tsx",
		fetchScript,
		`--provider=${BROAD_DEVELOPMENT_V2_EXPANSION_DATA_POLICY.provider}`,
		`--symbols=${BROAD_DEVELOPMENT_V2_EXPANSION_SYMBOLS.join(",")}`,
		`--benchmark=${BROAD_DEVELOPMENT_V2_EXPANSION_DATA_POLICY.benchmarkSymbol}`,
		`--from=${BROAD_DEVELOPMENT_V2_EXPANSION_DATA_POLICY.requestedFrom}`,
		`--to=${BROAD_DEVELOPMENT_V2_EXPANSION_DATA_POLICY.requestedThrough}`,
		`--universe-name=${BROAD_DEVELOPMENT_V2_EXPANSION_NAME}`,
		`--output=${OUTPUT}`,
	];
	console.error(
		`Fetching frozen ${BROAD_DEVELOPMENT_V2_EXPANSION_VERSION} expansion with ${BROAD_DEVELOPMENT_V2_EXPANSION_SYMBOLS.length} ETF candidates...`,
	);
	const exitCode = await new Promise<number>((resolveExit, reject) => {
		const child = spawn(process.execPath, arguments_, {
			cwd: process.cwd(),
			stdio: "inherit",
		});
		child.once("error", reject);
		child.once("exit", (code, signal) => {
			if (signal) reject(new Error(`History fetch terminated by ${signal}`));
			else resolveExit(code ?? 1);
		});
	});
	if (exitCode !== 0) throw new Error(`History fetch exited with code ${exitCode}`);
}

main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exitCode = 1;
});
