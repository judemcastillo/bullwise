import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
	buildRiskControlledMomentumV2HistoryArtifact,
	RISK_CONTROLLED_MOMENTUM_V2_HISTORY_POLICY,
	serializeRiskControlledMomentumV2HistoryArtifact,
	validateRiskControlledMomentumV2FetchArguments,
	writeRiskControlledMomentumV2HistoryArtifact,
} from "@/lib/analysis/risk-controlled-momentum-v2-history";
import {
	RISK_CONTROLLED_MOMENTUM_V2_MANIFEST_SHA256,
	RISK_CONTROLLED_MOMENTUM_V2_SYMBOLS,
} from "@/lib/analysis/risk-controlled-momentum-v2-universe";
import type { MarketBars } from "@/lib/market-data/types";

function bars(symbol: string): MarketBars {
	return {
		instrumentId: `download:${symbol.toLowerCase()}`,
		provider: "alpaca",
		providerSymbol: symbol,
		currency: "USD",
		interval: "1d",
		from: new Date(RISK_CONTROLLED_MOMENTUM_V2_HISTORY_POLICY.requestedFrom),
		to: new Date(RISK_CONTROLLED_MOMENTUM_V2_HISTORY_POLICY.requestedTo),
		adjusted: true,
		timeliness: "historical",
		bars: [
			{
				startedAt: new Date("2007-01-03T05:00:00.000Z"),
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

describe("risk-controlled momentum v2 history fetch contract", () => {
	it("rejects every CLI override while allowing help", () => {
		assert.deepEqual(validateRiskControlledMomentumV2FetchArguments([]), { help: false });
		assert.deepEqual(validateRiskControlledMomentumV2FetchArguments(["--help"]), {
			help: true,
		});
		assert.throws(
			() => validateRiskControlledMomentumV2FetchArguments(["--from=2010-01-01"]),
			/accepts no overrides/,
		);
		assert.throws(
			() => validateRiskControlledMomentumV2FetchArguments(["--help", "--force"]),
			/accepts no overrides/,
		);
	});

	it("serializes the exact checksum-bound inventory deterministically", () => {
		const input = {
			marketDataBySymbol: fixture(),
			createdAt: new Date("2026-08-21T12:00:00.000Z"),
		};
		const artifact = buildRiskControlledMomentumV2HistoryArtifact(input);
		assert.equal(artifact.universeManifestSha256, RISK_CONTROLLED_MOMENTUM_V2_MANIFEST_SHA256);
		assert.equal(artifact.instruments.length, 48);
		assert.equal(artifact.requested.overwrite, false);
		assert.equal(artifact.requested.feed, "sip");
		assert.equal(artifact.requested.adjustment, "all");
		assert.equal(
			serializeRiskControlledMomentumV2HistoryArtifact(artifact),
			serializeRiskControlledMomentumV2HistoryArtifact(
				buildRiskControlledMomentumV2HistoryArtifact(input),
			),
		);
		const missing = fixture();
		missing.delete("IJK");
		assert.throws(
			() => buildRiskControlledMomentumV2HistoryArtifact({ ...input, marketDataBySymbol: missing }),
			/exact frozen symbol inventory/,
		);
	});

	it("writes once and refuses to replace the history artifact", async () => {
		const directory = await mkdtemp(join(tmpdir(), "bullwise-risk-v2-history-"));
		try {
			const path = join(directory, "history.json");
			const artifact = buildRiskControlledMomentumV2HistoryArtifact({
				marketDataBySymbol: fixture(),
				createdAt: new Date("2026-08-21T12:00:00.000Z"),
			});
			const written = await writeRiskControlledMomentumV2HistoryArtifact({ path, artifact });
			assert.match(written.sha256, /^[a-f0-9]{64}$/);
			assert.ok(written.bytes > 0);
			await assert.rejects(
				writeRiskControlledMomentumV2HistoryArtifact({ path, artifact }),
				(error: NodeJS.ErrnoException) => error.code === "EEXIST",
			);
			assert.equal(JSON.parse(await readFile(path, "utf8")).instruments.length, 48);
		} finally {
			await rm(directory, { recursive: true, force: true });
		}
	});
});
