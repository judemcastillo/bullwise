import {
	assertRiskControlledMomentumV3IsOpen,
	RISK_CONTROLLED_MOMENTUM_V3_CLOSURE,
} from "@/lib/analysis/risk-controlled-momentum-v3-closure";
import { RISK_CONTROLLED_MOMENTUM_V3_PROTOCOL } from "@/lib/analysis/risk-controlled-momentum-v3-development";

const PROTOCOL = RISK_CONTROLLED_MOMENTUM_V3_PROTOCOL;
const USAGE = `Usage: npm run develop:etf-risk-controlled-momentum-v3

This experiment is permanently closed.

  history: ${PROTOCOL.sources.history.path}
  SHA-256: ${PROTOCOL.sources.history.sha256}
  status:  ${RISK_CONTROLLED_MOMENTUM_V3_CLOSURE.status}

The registered source lacks complete held-position valuation coverage. No report
or gate decision was produced. Rerunning or repairing this exact experiment is
not authorized.`;

function main() {
	if (process.argv.includes("--help") || process.argv.includes("-h")) {
		console.log(USAGE);
		return;
	}
	if (process.argv.length > 2) {
		throw new Error("The frozen v3 development command accepts no overrides");
	}
	assertRiskControlledMomentumV3IsOpen();
}

try {
	main();
} catch (error: unknown) {
	console.error(error instanceof Error ? error.message : String(error));
	process.exitCode = 1;
}
