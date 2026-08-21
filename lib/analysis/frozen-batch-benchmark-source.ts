import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";

export type SerializedBenchmarkBars = {
	providerSymbol: string;
	interval: string;
	adjusted: boolean;
	bars: Array<{ startedAt: string; close: string }>;
};

const BENCHMARK_MARKER = Buffer.from('"benchmarkData":');
const MAXIMUM_PREFIX_BYTES = 5 * 1024 * 1024;

async function sha256File(path: string) {
	const hash = createHash("sha256");
	for await (const chunk of createReadStream(path)) hash.update(chunk as Buffer);
	return hash.digest("hex");
}

function normalizedSha256(value: string) {
	const normalized = value.trim().toLowerCase();
	if (!/^[a-f0-9]{64}$/.test(normalized)) {
		throw new Error("expectedSha256 must be a SHA-256 checksum");
	}
	return normalized;
}

/** Verifies the whole bundle, then deserializes only its benchmarkData object. */
export async function readFrozenBatchBenchmark(input: {
	path: string;
	expectedSha256: string;
	periodEndsBefore: string;
}) {
	const expectedSha256 = normalizedSha256(input.expectedSha256);
	const actualSha256 = await sha256File(input.path);
	if (actualSha256 !== expectedSha256) {
		throw new Error("Batch history checksum does not match the frozen protocol");
	}
	const boundary = Date.parse(input.periodEndsBefore);
	if (!Number.isFinite(boundary)) throw new Error("periodEndsBefore must be valid");

	let prefix = Buffer.alloc(0);
	let found = false;
	let depth = 0;
	let started = false;
	let inString = false;
	let escaped = false;
	const parts: Buffer[] = [];
	let partStartsAt = 0;
	let complete = false;

	for await (const streamChunk of createReadStream(input.path)) {
		let chunk = streamChunk as Buffer;
		if (!found) {
			const candidate = Buffer.concat([prefix, chunk]);
			const markerIndex = candidate.indexOf(BENCHMARK_MARKER);
			if (markerIndex < 0) {
				if (candidate.length > MAXIMUM_PREFIX_BYTES) {
					throw new Error("Batch history benchmarkData marker was not found");
				}
				prefix = candidate;
				continue;
			}
			chunk = candidate.subarray(markerIndex + BENCHMARK_MARKER.length);
			prefix = Buffer.alloc(0);
			found = true;
		}

		let index = 0;
		while (index < chunk.length && !complete) {
			const byte = chunk[index];
			if (!started) {
				if (byte === 0x7b) {
					started = true;
					depth = 1;
					partStartsAt = index;
				}
				index += 1;
				continue;
			}
			if (inString) {
				if (escaped) escaped = false;
				else if (byte === 0x5c) escaped = true;
				else if (byte === 0x22) inString = false;
			} else if (byte === 0x22) inString = true;
			else if (byte === 0x7b || byte === 0x5b) depth += 1;
			else if (byte === 0x7d || byte === 0x5d) {
				depth -= 1;
				if (depth === 0) {
					parts.push(chunk.subarray(partStartsAt, index + 1));
					complete = true;
				}
			}
			index += 1;
		}
		if (started && !complete) {
			parts.push(chunk.subarray(partStartsAt));
			partStartsAt = 0;
		}
		if (complete) break;
	}
	if (!found || !complete || depth !== 0) {
		throw new Error("Batch history benchmarkData object is incomplete");
	}
	const benchmark = JSON.parse(Buffer.concat(parts).toString("utf8")) as
		SerializedBenchmarkBars;
	if (
		benchmark.providerSymbol !== "SPY" ||
		benchmark.interval !== "1d" ||
		benchmark.adjusted !== true ||
		!Array.isArray(benchmark.bars)
	) {
		throw new Error("Frozen batch benchmark must be adjusted daily SPY data");
	}
	const bars = benchmark.bars.flatMap((bar, index) => {
		const startedAt = Date.parse(bar.startedAt);
		if (!Number.isFinite(startedAt)) {
			throw new Error(`benchmarkData.bars[${index}].startedAt must be valid`);
		}
		if (startedAt >= boundary) return [];
		const close = Number(bar.close);
		if (!Number.isFinite(close) || close <= 0) {
			throw new Error(`benchmarkData.bars[${index}].close must be positive`);
		}
		return [{ startedAt: bar.startedAt, close }];
	});
	return {
		sha256: actualSha256,
		providerSymbol: "SPY" as const,
		interval: "1d" as const,
		adjusted: true as const,
		periodEndsBefore: input.periodEndsBefore,
		bars,
		barsAtOrAfterBoundaryUsed: false as const,
	};
}
