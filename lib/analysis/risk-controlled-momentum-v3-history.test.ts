import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
	buildRiskControlledMomentumV3HistoryArtifact,
	RISK_CONTROLLED_MOMENTUM_V3_HISTORY_POLICY,
	serializeRiskControlledMomentumV3HistoryArtifact,
	validateRiskControlledMomentumV3FetchArguments,
	writeRiskControlledMomentumV3HistoryArtifact,
} from "@/lib/analysis/risk-controlled-momentum-v3-history";
import {
	RISK_CONTROLLED_MOMENTUM_V2_MANIFEST_SHA256,
	RISK_CONTROLLED_MOMENTUM_V2_SYMBOLS,
} from "@/lib/analysis/risk-controlled-momentum-v2-universe";
import type { MarketBars } from "@/lib/market-data/types";

function bars(symbol: string): MarketBars {
	return {
		instrumentId: `download:${symbol.toLowerCase()}`,
		provider: "tiingo",
		providerSymbol: symbol,
		currency: "USD",
		interval: "1d",
		from: new Date(RISK_CONTROLLED_MOMENTUM_V3_HISTORY_POLICY.requestedFrom),
		to: new Date(RISK_CONTROLLED_MOMENTUM_V3_HISTORY_POLICY.requestedTo),
		adjusted: true,
		timeliness: "historical",
		bars: [
			{
				startedAt: new Date("2007-01-03T00:00:00.000Z"),
				open: "100",
				high: "101",
				low: "99",
				close: "100.5",
				volume: "1000000",
			},
		],
	};
}

function fixture() {
	return new Map(
		["SPY", ...RISK_CONTROLLED_MOMENTUM_V2_SYMBOLS].map((symbol) => [
			symbol,
			bars(symbol),
		]),
	);
}

describe("risk-controlled momentum v3 Tiingo history contract", () => {
	it("rejects every CLI override while allowing help", () => {
		assert.deepEqual(validateRiskControlledMomentumV3FetchArguments([]), { help: false });
		assert.deepEqual(validateRiskControlledMomentumV3FetchArguments(["--help"]), {
			help: true,
		});
		assert.throws(
			() => validateRiskControlledMomentumV3FetchArguments(["--from=2010-01-01"]),
			/accepts no overrides/,
		);
		assert.throws(
			() => validateRiskControlledMomentumV3FetchArguments(["--force"]),
			/accepts no overrides/,
		);
	});

	it("serializes the exact checksum-bound Tiingo inventory deterministically", () => {
		const input = {
			marketDataBySymbol: fixture(),
			createdAt: new Date("2026-08-21T12:00:00.000Z"),
		};
		const artifact = buildRiskControlledMomentumV3HistoryArtifact(input);
		assert.equal(artifact.universeManifestSha256, RISK_CONTROLLED_MOMENTUM_V2_MANIFEST_SHA256);
		assert.equal(artifact.instruments.length, 48);
		assert.equal(artifact.requested.provider, "tiingo");
		assert.equal(artifact.requested.feed, "eod_composite");
		assert.equal(artifact.requested.overwrite, false);
		assert.equal(
			serializeRiskControlledMomentumV3HistoryArtifact(artifact),
			serializeRiskControlledMomentumV3HistoryArtifact(
				buildRiskControlledMomentumV3HistoryArtifact(input),
			),
		);
		const missing = fixture();
		missing.delete("IJK");
		assert.throws(
			() => buildRiskControlledMomentumV3HistoryArtifact({ ...input, marketDataBySymbol: missing }),
			/exact frozen symbol inventory/,
		);
	});

	it("writes once and refuses to replace the history artifact", async () => {
		const directory = await mkdtemp(join(tmpdir(), "bullwise-risk-v3-history-"));
		try {
			const path = join(directory, "history.json");
			const artifact = buildRiskControlledMomentumV3HistoryArtifact({
				marketDataBySymbol: fixture(),
				createdAt: new Date("2026-08-21T12:00:00.000Z"),
			});
			const written = await writeRiskControlledMomentumV3HistoryArtifact({ path, artifact });
			assert.match(written.sha256, /^[a-f0-9]{64}$/);
			assert.ok(written.bytes > 0);
			await assert.rejects(
				writeRiskControlledMomentumV3HistoryArtifact({ path, artifact }),
				(error: NodeJS.ErrnoException) => error.code === "EEXIST",
			);
			assert.equal(JSON.parse(await readFile(path, "utf8")).instruments.length, 48);
		} finally {
			await rm(directory, { recursive: true, force: true });
		}
	});
});
