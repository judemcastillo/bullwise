import { loadEnvConfig } from "@next/env";
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
loadEnvConfig(process.cwd());
async function main() {
	const { values } = parseArgs({
		options: {
			file: { type: "string" },
			publish: { type: "boolean", default: false },
		},
		strict: true,
	});
	if (!values.file)
		throw new Error(
			"Usage: npm run notifications:announce -- --file announcement.json [--publish]",
		);
	const input: unknown = JSON.parse(await readFile(values.file, "utf8"));
	const { publishAnnouncement } =
		await import("@/lib/notifications/announcements");
	const { connectToDatabase } = await import("@/database/mongoose");
	const mongoose = await connectToDatabase();
	try {
		console.log(
			JSON.stringify(await publishAnnouncement(input, values.publish), null, 2),
		);
	} finally {
		await mongoose.disconnect();
	}
}
main().catch((error) => {
	console.error(
		error instanceof Error ? error.message : "Announcement publication failed",
	);
	process.exitCode = 1;
});
