import type {
	TransparentAnalysisAiMeasuredGeneration,
	TransparentAnalysisAiProvider,
	TransparentAnalysisAiProviderRequest,
} from "@/lib/analysis/transparent-analysis-ai-provider";

export const GOOGLE_TRANSPARENT_ANALYSIS_AI_CANDIDATE = {
	model: "gemini-3.5-flash",
	tier: "free" as const,
	inputUsdPerMillionTokens: 0,
	outputUsdPerMillionTokens: 0,
} as const;

type FetchImplementation = (
	input: string | URL | Request,
	init?: RequestInit,
) => Promise<Response>;

type GeminiResponse = {
	candidates?: Array<{
		content?: { parts?: Array<{ text?: unknown }> };
	}>;
	usageMetadata?: {
		promptTokenCount?: unknown;
		candidatesTokenCount?: unknown;
	};
};

const UNSUPPORTED_SCHEMA_KEYS = new Set([
	"uniqueItems",
	"minLength",
	"maxLength",
]);

function geminiCompatibleSchema(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(geminiCompatibleSchema);
	if (typeof value !== "object" || value === null) return value;
	const entries = Object.entries(value);
	const constant = entries.find(([key]) => key === "const")?.[1];
	const translated = entries
		.filter(([key]) => key !== "const" && !UNSUPPORTED_SCHEMA_KEYS.has(key))
		.map(([key, child]) => [key, geminiCompatibleSchema(child)] as const);
	if (typeof constant === "string") {
		translated.push(["type", "string"], ["enum", [constant]]);
	}
	return Object.fromEntries(translated);
}

function outputText(response: GeminiResponse): string | null {
	for (const candidate of response.candidates ?? []) {
		for (const part of candidate.content?.parts ?? []) {
			if (typeof part.text === "string") return part.text;
		}
	}
	return null;
}

function tokenCount(value: unknown): number {
	return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
		? value
		: 0;
}

export class GoogleTransparentAnalysisAiProvider
	implements TransparentAnalysisAiProvider
{
	private readonly apiKey: string;
	private readonly fetchImplementation: FetchImplementation;

	constructor(input: {
		apiKey: string;
		fetchImplementation?: FetchImplementation;
	}) {
		if (!input.apiKey.trim()) throw new Error("Gemini API key is required");
		this.apiKey = input.apiKey;
		this.fetchImplementation = input.fetchImplementation ?? fetch;
	}

	async generate(request: TransparentAnalysisAiProviderRequest): Promise<unknown> {
		return (await this.generateForEvaluation(request)).output;
	}

	async generateForEvaluation(
		request: TransparentAnalysisAiProviderRequest,
	): Promise<TransparentAnalysisAiMeasuredGeneration> {
		const response = await this.fetchImplementation(
			`https://generativelanguage.googleapis.com/v1beta/models/${GOOGLE_TRANSPARENT_ANALYSIS_AI_CANDIDATE.model}:generateContent`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-goog-api-key": this.apiKey,
				},
				body: JSON.stringify({
					systemInstruction: {
						parts: [{ text: request.systemPrompt }],
					},
					contents: [
						{
							role: "user",
							parts: [{ text: JSON.stringify(request.input) }],
						},
					],
					generationConfig: {
						responseMimeType: "application/json",
						responseJsonSchema: geminiCompatibleSchema(request.outputSchema),
						maxOutputTokens: 2_000,
					},
				}),
				signal: request.signal,
			},
		);
		if (!response.ok) throw new Error(`Gemini request failed (${response.status})`);

		let body: GeminiResponse;
		try {
			body = (await response.json()) as GeminiResponse;
		} catch {
			throw new Error("Gemini response was not JSON");
		}
		const text = outputText(body);
		if (!text) throw new Error("Gemini response contained no output text");

		let output: unknown;
		try {
			output = JSON.parse(text);
		} catch {
			throw new Error("Gemini output text was not JSON");
		}
		const inputTokens = tokenCount(body.usageMetadata?.promptTokenCount);
		const outputTokens = tokenCount(body.usageMetadata?.candidatesTokenCount);
		return {
			output,
			usage: { inputTokens, outputTokens, costUsd: 0 },
		};
	}
}
