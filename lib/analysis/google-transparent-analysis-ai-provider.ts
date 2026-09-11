import type {
	TransparentAnalysisAiMeasuredGeneration,
	TransparentAnalysisAiProvider,
	TransparentAnalysisAiProviderRequest,
} from "@/lib/analysis/transparent-analysis-ai-provider";

export const GOOGLE_TRANSPARENT_ANALYSIS_AI_CANDIDATE = {
	model: "gemini-3.5-flash-lite",
	tier: "free" as const,
	inputUsdPerMillionTokens: 0,
	outputUsdPerMillionTokens: 0,
} as const;

export type GoogleTransparentAnalysisAiFetchImplementation = (
	input: string | URL | Request,
	init?: RequestInit,
) => Promise<Response>;

export type GoogleTransparentAnalysisAiEvaluationRequest<TInput> = Omit<
	TransparentAnalysisAiProviderRequest,
	"input"
> & { input: TInput };

type GeminiResponse = {
	candidates?: Array<{
		content?: { parts?: Array<{ text?: unknown }> };
	}>;
	usageMetadata?: {
		promptTokenCount?: unknown;
		candidatesTokenCount?: unknown;
	};
};

export type GoogleTransparentAnalysisAiProviderFailureCategory =
	| "transport_error"
	| "rate_limited"
	| "authentication_error"
	| "server_error"
	| "other_http_error"
	| "response_not_json"
	| "missing_output"
	| "output_not_json";

export class GoogleTransparentAnalysisAiProviderError extends Error {
	readonly category: GoogleTransparentAnalysisAiProviderFailureCategory;
	readonly httpStatus: number | null;
	readonly retryAfterSeconds: number | null;
	readonly usage: TransparentAnalysisAiMeasuredGeneration["usage"] | null;

	constructor(input: {
		message: string;
		category: GoogleTransparentAnalysisAiProviderFailureCategory;
		httpStatus?: number;
		retryAfterSeconds?: number;
		usage?: TransparentAnalysisAiMeasuredGeneration["usage"];
	}) {
		super(input.message);
		this.name = "GoogleTransparentAnalysisAiProviderError";
		this.category = input.category;
		this.httpStatus = input.httpStatus ?? null;
		this.retryAfterSeconds = input.retryAfterSeconds ?? null;
		this.usage = input.usage ?? null;
	}
}

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

function httpFailureCategory(
	status: number,
): GoogleTransparentAnalysisAiProviderFailureCategory {
	if (status === 429) return "rate_limited";
	if (status === 401 || status === 403) return "authentication_error";
	if (status >= 500) return "server_error";
	return "other_http_error";
}

function retryAfterSeconds(response: Response): number | undefined {
	const value = response.headers.get("retry-after");
	if (!value || !/^\d+$/.test(value)) return undefined;
	const seconds = Number(value);
	return Number.isSafeInteger(seconds) && seconds >= 0 && seconds <= 86_400
		? seconds
		: undefined;
}

export class GoogleTransparentAnalysisAiProvider
	implements TransparentAnalysisAiProvider
{
	private readonly apiKey: string;
	private readonly fetchImplementation: GoogleTransparentAnalysisAiFetchImplementation;

	constructor(input: {
		apiKey: string;
		fetchImplementation?: GoogleTransparentAnalysisAiFetchImplementation;
	}) {
		if (!input.apiKey.trim()) throw new Error("Gemini API key is required");
		this.apiKey = input.apiKey;
		this.fetchImplementation = input.fetchImplementation ?? fetch;
	}

	async generate(request: TransparentAnalysisAiProviderRequest): Promise<unknown> {
		return (await this.generateForEvaluation(request)).output;
	}

	async generateForEvaluation<TInput>(
		request: GoogleTransparentAnalysisAiEvaluationRequest<TInput>,
	): Promise<TransparentAnalysisAiMeasuredGeneration> {
		let response: Response;
		try {
			response = await this.fetchImplementation(
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
		} catch {
			throw new GoogleTransparentAnalysisAiProviderError({
				message: "Gemini request transport failed",
				category: "transport_error",
			});
		}
		if (!response.ok) {
			throw new GoogleTransparentAnalysisAiProviderError({
				message: `Gemini request failed (${response.status})`,
				category: httpFailureCategory(response.status),
				httpStatus: response.status,
				retryAfterSeconds: retryAfterSeconds(response),
			});
		}

		let body: GeminiResponse;
		try {
			body = (await response.json()) as GeminiResponse;
		} catch {
			throw new GoogleTransparentAnalysisAiProviderError({
				message: "Gemini response was not JSON",
				category: "response_not_json",
			});
		}
		const inputTokens = tokenCount(body.usageMetadata?.promptTokenCount);
		const outputTokens = tokenCount(body.usageMetadata?.candidatesTokenCount);
		const usage = { inputTokens, outputTokens, costUsd: 0 };
		const text = outputText(body);
		if (!text) {
			throw new GoogleTransparentAnalysisAiProviderError({
				message: "Gemini response contained no output text",
				category: "missing_output",
				usage,
			});
		}

		let output: unknown;
		try {
			output = JSON.parse(text);
		} catch {
			throw new GoogleTransparentAnalysisAiProviderError({
				message: "Gemini output text was not JSON",
				category: "output_not_json",
				usage,
			});
		}
		return {
			output,
			usage,
		};
	}
}
