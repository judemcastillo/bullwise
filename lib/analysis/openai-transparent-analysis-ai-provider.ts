import type {
	TransparentAnalysisAiProvider,
	TransparentAnalysisAiProviderRequest,
} from "@/lib/analysis/transparent-analysis-ai-provider";

export const OPENAI_TRANSPARENT_ANALYSIS_AI_CANDIDATES = [
	{
		model: "gpt-5.6-luna",
		role: "primary" as const,
		inputUsdPerMillionTokens: 0.2,
		outputUsdPerMillionTokens: 1.2,
	},
	{
		model: "gpt-5.4-nano-2026-03-17",
		role: "snapshot_comparator" as const,
		inputUsdPerMillionTokens: 0.2,
		outputUsdPerMillionTokens: 1.25,
	},
] as const;

export type OpenAiTransparentAnalysisAiCandidate =
	(typeof OPENAI_TRANSPARENT_ANALYSIS_AI_CANDIDATES)[number];

export type OpenAiTransparentAnalysisAiGeneration = {
	output: unknown;
	usage: {
		inputTokens: number;
		outputTokens: number;
		costUsd: number;
	};
};

type FetchImplementation = (
	input: string | URL | Request,
	init?: RequestInit,
) => Promise<Response>;

type OpenAiResponse = {
	status?: unknown;
	output?: unknown;
	usage?: {
		input_tokens?: unknown;
		output_tokens?: unknown;
	};
};

function apiCompatibleSchema(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(apiCompatibleSchema);
	if (typeof value !== "object" || value === null) return value;
	return Object.fromEntries(
		Object.entries(value)
			.filter(([key]) => key !== "uniqueItems")
			.map(([key, child]) => [key, apiCompatibleSchema(child)]),
	);
}

function outputText(response: OpenAiResponse): string | null {
	if (!Array.isArray(response.output)) return null;
	for (const item of response.output) {
		if (typeof item !== "object" || item === null || !("content" in item)) continue;
		const content = item.content;
		if (!Array.isArray(content)) continue;
		for (const part of content) {
			if (
				typeof part === "object" &&
				part !== null &&
				"type" in part &&
				part.type === "output_text" &&
				"text" in part &&
				typeof part.text === "string"
			) {
				return part.text;
			}
		}
	}
	return null;
}

function tokenCount(value: unknown): number {
	return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
		? value
		: 0;
}

export class OpenAiTransparentAnalysisAiProvider
	implements TransparentAnalysisAiProvider
{
	readonly candidate: OpenAiTransparentAnalysisAiCandidate;
	private readonly apiKey: string;
	private readonly fetchImplementation: FetchImplementation;

	constructor(input: {
		apiKey: string;
		candidate: OpenAiTransparentAnalysisAiCandidate;
		fetchImplementation?: FetchImplementation;
	}) {
		if (!input.apiKey.trim()) throw new Error("OpenAI API key is required");
		this.apiKey = input.apiKey;
		this.candidate = input.candidate;
		this.fetchImplementation = input.fetchImplementation ?? fetch;
	}

	async generate(
		request: TransparentAnalysisAiProviderRequest,
	): Promise<unknown> {
		return (await this.generateForEvaluation(request)).output;
	}

	async generateForEvaluation(
		request: TransparentAnalysisAiProviderRequest,
	): Promise<OpenAiTransparentAnalysisAiGeneration> {
		const response = await this.fetchImplementation(
			"https://api.openai.com/v1/responses",
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${this.apiKey}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					model: this.candidate.model,
					instructions: request.systemPrompt,
					input: JSON.stringify(request.input),
					store: false,
					reasoning: { effort: "none" },
					max_output_tokens: 2_000,
					text: {
						format: {
							type: "json_schema",
							name: "transparent_analysis_ai_explanation_v1",
							strict: true,
							schema: apiCompatibleSchema(request.outputSchema),
						},
					},
				}),
				signal: request.signal,
			},
		);
		if (!response.ok) throw new Error("OpenAI request failed");

		let body: OpenAiResponse;
		try {
			body = (await response.json()) as OpenAiResponse;
		} catch {
			throw new Error("OpenAI response was not JSON");
		}
		if (body.status !== "completed") throw new Error("OpenAI response was incomplete");
		const text = outputText(body);
		if (!text) throw new Error("OpenAI response contained no output text");

		let output: unknown;
		try {
			output = JSON.parse(text);
		} catch {
			throw new Error("OpenAI output text was not JSON");
		}
		const inputTokens = tokenCount(body.usage?.input_tokens);
		const outputTokens = tokenCount(body.usage?.output_tokens);
		return {
			output,
			usage: {
				inputTokens,
				outputTokens,
				costUsd:
					(inputTokens * this.candidate.inputUsdPerMillionTokens +
						outputTokens * this.candidate.outputUsdPerMillionTokens) /
					1_000_000,
			},
		};
	}
}
