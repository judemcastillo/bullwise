import {
	link,
	open,
	rename,
	unlink,
	type FileHandle,
} from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import type { DailySwingSetupScanReport } from "@/lib/analysis/setup-scan.types";

async function writeText(handle: FileHandle, value: string) {
	await handle.write(value);
}

/** Writes large scan reports without constructing one V8-sized JSON string. */
export async function writeDailySwingSetupScanReport(
	outputPath: string,
	report: DailySwingSetupScanReport,
	options: { force?: boolean } = {},
) {
	const absoluteOutputPath = resolve(outputPath);
	const temporaryPath = resolve(
		dirname(absoluteOutputPath),
		`.${basename(absoluteOutputPath)}.${process.pid}.tmp`,
	);
	let handle: FileHandle | null = await open(temporaryPath, "wx");
	try {
		await writeText(handle, "{");
		const entries = Object.entries(report);
		for (let index = 0; index < entries.length; index += 1) {
			const [key, value] = entries[index];
			if (index > 0) await writeText(handle, ",");
			await writeText(handle, `${JSON.stringify(key)}:`);
			if (key !== "reports") {
				await writeText(handle, JSON.stringify(value));
				continue;
			}
			await writeText(handle, "[");
			for (let reportIndex = 0; reportIndex < report.reports.length; reportIndex += 1) {
				if (reportIndex > 0) await writeText(handle, ",");
				await writeText(handle, JSON.stringify(report.reports[reportIndex]));
			}
			await writeText(handle, "]");
		}
		await writeText(handle, "}\n");
		await handle.sync();
		await handle.close();
		handle = null;
		if (options.force) {
			await rename(temporaryPath, absoluteOutputPath);
		} else {
			await link(temporaryPath, absoluteOutputPath);
			await unlink(temporaryPath);
		}
	} catch (error) {
		if (handle) await handle.close().catch(() => undefined);
		await unlink(temporaryPath).catch(() => undefined);
		throw error;
	}
}
