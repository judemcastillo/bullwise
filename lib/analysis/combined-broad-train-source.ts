import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import type { AnalysisDatasetSplit } from "@/lib/analysis/analysis-dataset.types";
import type {
	DailySwingCombinedBroadDataset,
	DailySwingCombinedBroadDatasetRow,
} from "@/lib/analysis/combined-broad-dataset.types";

const ROWS_MARKER = Buffer.from('"rows":[');
const MAXIMUM_METADATA_BYTES = 5 * 1024 * 1024;
const SPLIT_SUFFIX = /,"split":"(train|validation|test)"}$/;

async function sha256File(path: string) {
	const hash = createHash("sha256");
	for await (const chunk of createReadStream(path)) hash.update(chunk as Buffer);
	return hash.digest("hex");
}

function normalizedSha256(value: string, label: string) {
	const normalized = value.trim().toLowerCase();
	if (!/^[a-f0-9]{64}$/.test(normalized)) {
		throw new Error(`${label} must be a SHA-256 checksum`);
	}
	return normalized;
}

function parseMetadata(prefix: Buffer) {
	const raw = Buffer.concat([prefix, Buffer.from('"rows":[]}')]).toString("utf8");
	const metadata = JSON.parse(raw) as DailySwingCombinedBroadDataset;
	metadata.warnings = [];
	return metadata;
}

/**
 * Verifies the complete source checksum, then deserializes train rows only.
 * Non-train rows are structurally scanned solely to read their top-level split.
 */
export async function readDailySwingCombinedBroadTrainSource(input: {
	path: string;
	expectedSha256: string;
}) {
	const expectedSha256 = normalizedSha256(input.expectedSha256, "expectedSha256");
	const actualSha256 = await sha256File(input.path);
	if (actualSha256 !== expectedSha256) {
		throw new Error("Combined broad source checksum does not match the frozen dataset");
	}

	let metadataPrefix = Buffer.alloc(0);
	let metadata: DailySwingCombinedBroadDataset | null = null;
	let insideRows = false;
	let rowsComplete = false;
	let rowDepth = 0;
	let rowParts: Buffer[] = [];
	let rowPartStartsAt = 0;
	let inString = false;
	let escaped = false;
	const rows: DailySwingCombinedBroadDatasetRow[] = [];
	const splitCounts: Record<AnalysisDatasetSplit, number> = {
		train: 0,
		validation: 0,
		test: 0,
	};

	for await (const streamChunk of createReadStream(input.path)) {
		let chunk = streamChunk as Buffer;
		if (!insideRows) {
			const candidate = Buffer.concat([metadataPrefix, chunk]);
			const markerIndex = candidate.indexOf(ROWS_MARKER);
			if (markerIndex < 0) {
				if (candidate.length > MAXIMUM_METADATA_BYTES) {
					throw new Error("Combined broad source rows marker was not found");
				}
				metadataPrefix = candidate;
				continue;
			}
			metadata = parseMetadata(candidate.subarray(0, markerIndex));
			chunk = candidate.subarray(markerIndex + ROWS_MARKER.length);
			metadataPrefix = Buffer.alloc(0);
			insideRows = true;
		}

		let index = 0;
		while (index < chunk.length && !rowsComplete) {
			const byte = chunk[index];
			if (rowDepth === 0) {
				if (byte === 0x5d) {
					rowsComplete = true;
					break;
				}
				if (byte === 0x7b) {
					rowDepth = 1;
					rowParts = [];
					rowPartStartsAt = index;
					inString = false;
					escaped = false;
				}
				index += 1;
				continue;
			}

			if (inString) {
				if (escaped) escaped = false;
				else if (byte === 0x5c) escaped = true;
				else if (byte === 0x22) inString = false;
			} else if (byte === 0x22) {
				inString = true;
			} else if (byte === 0x7b || byte === 0x5b) {
				rowDepth += 1;
			} else if (byte === 0x7d || byte === 0x5d) {
				rowDepth -= 1;
				if (rowDepth === 0) {
					rowParts.push(chunk.subarray(rowPartStartsAt, index + 1));
					const rawRow = Buffer.concat(rowParts).toString("utf8");
					const split = SPLIT_SUFFIX.exec(rawRow)?.[1] as
						| AnalysisDatasetSplit
						| undefined;
					if (!split) {
						throw new Error("Combined broad row has no final top-level split field");
					}
					splitCounts[split] += 1;
					if (split === "train") {
						rows.push(JSON.parse(rawRow) as DailySwingCombinedBroadDatasetRow);
					}
					rowParts = [];
				}
			}
			index += 1;
		}
		if (rowDepth > 0) {
			rowParts.push(chunk.subarray(rowPartStartsAt));
			rowPartStartsAt = 0;
		}
		if (rowsComplete) break;
	}

	if (!metadata || !rowsComplete || rowDepth !== 0) {
		throw new Error("Combined broad source rows array is incomplete");
	}
	for (const split of ["train", "validation", "test"] as const) {
		if (splitCounts[split] !== metadata.splits[split].rows) {
			throw new Error(`${split} row count does not match frozen source metadata`);
		}
	}
	metadata.rows = rows;
	return { dataset: metadata, sha256: actualSha256, splitCounts };
}
