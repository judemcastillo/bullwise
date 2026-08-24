import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import type { AnalysisPanelResponse } from "@/lib/analysis/transparent-analysis-panel.types";
import {
	handleTransparentAnalysisRequest,
	type TransparentAnalysisRouteDependencies,
} from "@/lib/analysis/transparent-analysis-route";
import type { TransparentAnalysisOrchestrationResult } from "@/lib/analysis/transparent-analysis-orchestrator";
import { AuthenticationError } from "@/lib/auth/access-policy";

const unavailableResponse: AnalysisPanelResponse = {
	version: "1.0.0",
	status: "unavailable",
	reason: "insufficient_history",
	message: "At least 300 completed daily bars are required for analysis.",
	disclaimer: "Descriptive market context—not investment advice or a trading signal.",
};

function dependencies(
	overrides: Partial<TransparentAnalysisRouteDependencies> = {},
): TransparentAnalysisRouteDependencies {
	return {
		authenticate: async () => ({ id: "user-1" }),
		getAnalysis: async () => ({
			kind: "response",
			transportStatus: 200,
			response: unavailableResponse,
		}),
		...overrides,
	};
}

async function body(response: Response) {
	return response.json() as Promise<Record<string, unknown>>;
}

describe("transparent analysis API boundary", () => {
	it("requires authentication before validating or loading an instrument", async () => {
		let analysisCalls = 0;
		const response = await handleTransparentAnalysisRequest(
			"not a canonical key",
			dependencies({
				authenticate: async () => {
					throw new AuthenticationError();
				},
				getAnalysis: async () => {
					analysisCalls += 1;
					return { kind: "not_found" };
				},
			}),
		);

		assert.equal(response.status, 401);
		assert.deepEqual(await body(response), {
			error: "Authentication required.",
		});
		assert.equal(analysisCalls, 0);
	});

	it("returns 400 for a malformed canonical key without loading analysis", async () => {
		let analysisCalls = 0;
		const response = await handleTransparentAnalysisRequest(
			"not a canonical key",
			dependencies({
				getAnalysis: async () => {
					analysisCalls += 1;
					return { kind: "not_found" };
				},
			}),
		);

		assert.equal(response.status, 400);
		assert.deepEqual(await body(response), {
			error: "Invalid instrument identifier.",
		});
		assert.equal(analysisCalls, 0);
	});

	it("normalizes the path key and returns 404 for an unknown instrument", async () => {
		let receivedKey: string | undefined;
		const response = await handleTransparentAnalysisRequest(
			"EQUITY%3AXNAS%3AAAPL",
			dependencies({
				getAnalysis: async (canonicalKey) => {
					receivedKey = canonicalKey;
					return { kind: "not_found" };
				},
			}),
		);

		assert.equal(receivedKey, "equity:xnas:aapl");
		assert.equal(response.status, 404);
		assert.deepEqual(await body(response), { error: "Instrument not found." });
	});

	it("returns the allow-listed analysis body with its orchestration status", async () => {
		for (const transportStatus of [200, 503] as const) {
			const result: TransparentAnalysisOrchestrationResult = {
				kind: "response",
				transportStatus,
				response: unavailableResponse,
			};
			const response = await handleTransparentAnalysisRequest(
				"equity:xnas:aapl",
				dependencies({ getAnalysis: async () => result }),
			);

			assert.equal(response.status, transportStatus);
			assert.deepEqual(await response.json(), unavailableResponse);
			assert.equal(response.headers.get("cache-control"), "private, no-store");
		}
	});

	it("does not swallow unexpected authentication infrastructure failures", async () => {
		const failure = new Error("session store unavailable");
		await assert.rejects(
			handleTransparentAnalysisRequest(
				"equity:xnas:aapl",
				dependencies({
					authenticate: async () => {
						throw failure;
					},
				}),
			),
			(error) => error === failure,
		);
	});

	it("keeps the production route dynamic and ignores all request overrides", () => {
		const routeSource = readFileSync(
			new URL(
				"../../app/api/instruments/[canonicalKey]/analysis/route.ts",
				import.meta.url,
			),
			"utf8",
		);

		assert.match(routeSource, /export const dynamic = "force-dynamic"/);
		assert.match(routeSource, /authenticate: requireUser/);
		assert.match(routeSource, /getAnalysis: getTransparentAnalysisPanel/);
		assert.doesNotMatch(
			routeSource,
			/searchParams|request\.url|request\.json|providerSymbol|benchmark|dateRange|strategy|model/,
		);
	});
});
