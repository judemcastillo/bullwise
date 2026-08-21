import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { RISK_CONTROLLED_MOMENTUM_V3_PROTOCOL } from "@/lib/analysis/risk-controlled-momentum-v3-development";
import { RISK_CONTROLLED_MOMENTUM_V3_HISTORY_POLICY } from "@/lib/analysis/risk-controlled-momentum-v3-history";
import {
	RISK_CONTROLLED_MOMENTUM_V2_MANIFEST_SHA256,
	RISK_CONTROLLED_MOMENTUM_V2_SYMBOLS,
	RISK_CONTROLLED_MOMENTUM_V2_UNIVERSE_NAME,
} from "@/lib/analysis/risk-controlled-momentum-v2-universe";
import type {
	RiskControlledMomentumBar,
	RiskControlledMomentumBenchmarkHistory,
	RiskControlledMomentumInstrumentHistory,
	RiskControlledMomentumSleeveId,
} from "@/lib/analysis/risk-controlled-momentum-v3-runner";

const PROTOCOL = RISK_CONTROLLED_MOMENTUM_V3_PROTOCOL;

type JsonObject = Record<string, unknown>;

function object(value: unknown, label: string): JsonObject {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		throw new Error(`${label} must be an object`);
	}
	return value as JsonObject;
}

function string(value: unknown, label: string) {
	if (typeof value !== "string" || !value.trim()) throw new Error(`${label} must be a string`);
	return value;
}

function positive(value: unknown, label: string) {
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${label} must be positive`);
	return parsed;
}

function bar(value: unknown, label: string): RiskControlledMomentumBar {
	const source = object(value, label);
	const volume = source.volume === undefined ? null : Number(source.volume);
	if (volume !== null && (!Number.isFinite(volume) || volume < 0)) {
		throw new Error(`${label}.volume must be nonnegative`);
	}
	return {
		startedAt: string(source.startedAt, `${label}.startedAt`),
		open: positive(source.open, `${label}.open`),
		close: positive(source.close, `${label}.close`),
		volume,
	};
}

function marketBars(value: unknown, label: string) {
	const source = object(value, label);
	if (
		source.provider !== RISK_CONTROLLED_MOMENTUM_V3_HISTORY_POLICY.provider ||
		source.currency !== "USD" ||
		source.interval !== "1d" ||
		source.adjusted !== true ||
		source.timeliness !== "historical" ||
		source.from !== RISK_CONTROLLED_MOMENTUM_V3_HISTORY_POLICY.requestedFrom ||
		source.to !== RISK_CONTROLLED_MOMENTUM_V3_HISTORY_POLICY.requestedTo
	) {
		throw new Error(`${label} does not match the registered Tiingo provenance`);
	}
	if (!Array.isArray(source.bars) || source.bars.length === 0) {
		throw new Error(`${label}.bars must be nonempty`);
	}
	return {
		providerSymbol: string(source.providerSymbol, `${label}.providerSymbol`).toUpperCase(),
		bars: source.bars.map((value, index) => bar(value, `${label}.bars[${index}]`)),
	};
}

export function parseRiskControlledMomentumV3HistoryArtifact(value: unknown) {
	const artifact = object(value, "history");
	if (
		artifact.schemaVersion !== "1.0.0" ||
		artifact.researchSourceId !== "etf-risk-controlled-momentum-v3-tiingo-source-v1" ||
		artifact.universeName !== RISK_CONTROLLED_MOMENTUM_V2_UNIVERSE_NAME ||
		artifact.universeManifestSha256 !== RISK_CONTROLLED_MOMENTUM_V2_MANIFEST_SHA256 ||
		artifact.exclusionInventorySha256 !== PROTOCOL.sources.exclusionInventorySha256
	) {
		throw new Error("History identity does not match the registered v3 source");
	}
	const requested = object(artifact.requested, "history.requested");
	for (const [key, expected] of Object.entries(RISK_CONTROLLED_MOMENTUM_V3_HISTORY_POLICY)) {
		if (requested[key] !== expected) {
			throw new Error(`history.requested.${key} does not match the registered policy`);
		}
	}
	const benchmarkData = marketBars(artifact.benchmarkData, "history.benchmarkData");
	if (benchmarkData.providerSymbol !== "SPY") throw new Error("Registered benchmark must be SPY");
	if (!Array.isArray(artifact.instruments) || artifact.instruments.length !== 48) {
		throw new Error("History must contain the exact 48-instrument manifest");
	}
	const instruments: RiskControlledMomentumInstrumentHistory[] = artifact.instruments.map(
		(value, index) => {
			const item = object(value, `history.instruments[${index}]`);
			const instrument = object(item.instrument, `history.instruments[${index}].instrument`);
			const displaySymbol = string(
				instrument.displaySymbol,
				`history.instruments[${index}].instrument.displaySymbol`,
			).toUpperCase();
			const data = marketBars(
				item.marketData,
				`history.instruments[${index}].marketData`,
			);
			if (data.providerSymbol !== displaySymbol) {
				throw new Error(`${displaySymbol} provider symbol does not match its manifest entry`);
			}
			return {
				instrumentId: string(
					instrument.instrumentId,
					`history.instruments[${index}].instrument.instrumentId`,
				),
				displaySymbol,
				sleeveId: string(
					item.sleeveId,
					`history.instruments[${index}].sleeveId`,
				) as RiskControlledMomentumSleeveId,
				bars: data.bars,
			};
		},
	);
	if (
		new Set(instruments.map((instrument) => instrument.displaySymbol)).size !== 48 ||
		RISK_CONTROLLED_MOMENTUM_V2_SYMBOLS.some(
			(symbol) => !instruments.some((instrument) => instrument.displaySymbol === symbol),
		)
	) {
		throw new Error("History symbols do not match the exact registered manifest");
	}
	const benchmark: RiskControlledMomentumBenchmarkHistory = {
		displaySymbol: "SPY",
		bars: benchmarkData.bars,
	};
	return { instruments, benchmark };
}

export async function readRegisteredRiskControlledMomentumV3History() {
	const raw = await readFile(PROTOCOL.sources.history.path);
	return verifyRegisteredRiskControlledMomentumV3History(raw);
}

export function verifyRegisteredRiskControlledMomentumV3History(raw: Buffer) {
	if (raw.byteLength !== PROTOCOL.sources.history.bytes) {
		throw new Error("Tiingo history byte size does not match the registered source");
	}
	const sha256 = createHash("sha256").update(raw).digest("hex");
	if (sha256 !== PROTOCOL.sources.history.sha256) {
		throw new Error("Tiingo history checksum does not match the registered source");
	}
	const parsed = parseRiskControlledMomentumV3HistoryArtifact(
		JSON.parse(raw.toString("utf8")),
	);
	return {
		...parsed,
		historySha256: sha256,
		protected2016PlusOrValidationTestDataRead: false as const,
	};
}
