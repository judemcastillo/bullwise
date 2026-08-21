import { writeFile } from "node:fs/promises";

export async function writeRiskControlledMomentumV3Report(path: string, report: unknown) {
	const output = `${JSON.stringify(report)}\n`;
	await writeFile(path, output, { encoding: "utf8", flag: "wx" });
	return output;
}
