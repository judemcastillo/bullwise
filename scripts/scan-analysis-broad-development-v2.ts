import { spawn } from "node:child_process";
import { resolve } from "node:path";
import {
	BROAD_DEVELOPMENT_V2_EXPANSION_NAME,
	BROAD_DEVELOPMENT_V2_EXPANSION_SOURCE_SHA256,
} from "@/lib/analysis/broad-development-v2-universe";

const INPUT = "analysis-broad-v2-expansion-history.json";
const OUTPUT = "analysis-broad-v2-expansion-setup-scan.json";
const USAGE = `Usage: npm run scan:analysis-broad-development-v2

Scans the frozen ${BROAD_DEVELOPMENT_V2_EXPANSION_NAME} source:
  source SHA-256: ${BROAD_DEVELOPMENT_V2_EXPANSION_SOURCE_SHA256}
  strategy:       v1
  research policy: broad_development_v2_expansion
  input:          ${INPUT}
  output:         ${OUTPUT}

No overrides or overwrite flag are accepted. The source hash, coverage exclusions,
objective features, liquidity policy, and independent-label methodology are frozen.`;

async function main() {
	if (process.argv.includes("--help") || process.argv.includes("-h")) {
		console.log(USAGE);
		return;
	}
	if (process.argv.length > 2) {
		throw new Error(
			"The frozen broad-development v2 scan does not accept overrides",
		);
	}
	const scanScript = resolve("scripts/scan-analysis-setups.ts");
	const arguments_ = [
		"--import",
		"tsx",
		scanScript,
		INPUT,
		"--strategy=v1",
		"--research-policy=broad_development_v2_expansion",
		`--output=${OUTPUT}`,
	];
	const exitCode = await new Promise<number>((resolveExit, reject) => {
		const child = spawn(process.execPath, arguments_, {
			cwd: process.cwd(),
			stdio: "inherit",
		});
		child.once("error", reject);
		child.once("exit", (code, signal) => {
			if (signal) reject(new Error(`Setup scan terminated by ${signal}`));
			else resolveExit(code ?? 1);
		});
	});
	if (exitCode !== 0) throw new Error(`Setup scan exited with code ${exitCode}`);
}

main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exitCode = 1;
});
