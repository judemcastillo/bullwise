import { writeFile } from "node:fs/promises";

export async function writeMomentumDevelopmentReport(
	path: string,
	report: unknown,
) {
	const output = `${JSON.stringify(report)}\n`;
	await writeFile(path, output, { encoding: "utf8", flag: "wx" });
	return output;
}
