import { GoogleGenAI, ThinkingLevel } from "@google/genai";

/**
 * Model chains, verified live against this project's key.
 *
 * Preview ids get rotated and retired without warning — `gemini-2.5-flash` and
 * `gemini-3-pro-preview` both 404 on this key today despite being current not
 * long ago. Each chain therefore ends in a `-latest` alias, and a 404 on one
 * entry falls through to the next rather than failing the request.
 */
export const CHAINS = {
  /** Stage 1. Turning prose into food slugs is easy; speed matters more. */
  parser: ["gemini-3-flash-preview", "gemini-3.1-flash-lite", "gemini-flash-latest"],
  /**
   * Stage 3. Flash leads rather than pro: pro's thinking pass took ~59s on a
   * real report, which blows the 60s function ceiling for a page someone is
   * sitting and waiting on. Flash produces the same structure in a fraction of
   * that, and the hard reasoning already happened in TypeScript.
   */
  writer: ["gemini-3-flash-preview", "gemini-flash-latest", "gemini-3.1-pro-preview"],
} as const;

export class LlmUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LlmUnavailableError";
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Quota, billing or permission — retrying or falling through will not help. */
function isBillingError(error: unknown): boolean {
  const text = messageOf(error);
  return (
    text.includes("PERMISSION_DENIED") ||
    text.includes("RESOURCE_EXHAUSTED") ||
    text.includes("quota")
  );
}

/** This model id is gone. Try the next one in the chain. */
function isModelMissing(error: unknown): boolean {
  const text = messageOf(error);
  return (
    text.includes("NOT_FOUND") ||
    text.includes("404") ||
    text.includes("no longer available") ||
    text.includes("is not supported")
  );
}

export interface GenerateJsonOptions {
  chain: readonly string[];
  systemInstruction: string;
  prompt: string;
  responseSchema: object;
  maxOutputTokens: number;
  temperature?: number;
  /**
   * Gemini 3 reasoning depth. Thinking tokens are billed and capped as OUTPUT
   * tokens, so a low budget here is what keeps a long JSON body from being
   * truncated mid-string by a model that spent its allowance deliberating.
   */
  thinkingLevel?: ThinkingLevel;
}

/**
 * One JSON-constrained call, walking the chain until a model answers.
 *
 * `responseMimeType` plus `responseSchema` makes the shape a decoding
 * constraint rather than a request, so the caller can parse without repair
 * logic. Callers still validate the contents — a well-formed object can still
 * hold a food slug that does not exist.
 */
export async function generateJson<T>(options: GenerateJsonOptions): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new LlmUnavailableError("GEMINI_API_KEY is not set.");

  const ai = new GoogleGenAI({ apiKey });
  let lastError: unknown;

  for (const model of options.chain) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: options.prompt,
        config: {
          systemInstruction: options.systemInstruction,
          temperature: options.temperature ?? 0,
          responseMimeType: "application/json",
          responseSchema: options.responseSchema as never,
          maxOutputTokens: options.maxOutputTokens,
          ...(options.thinkingLevel
            ? { thinkingConfig: { thinkingLevel: options.thinkingLevel } }
            : {}),
        },
      });

      // A truncated body is still valid-looking JSON right up until it isn't,
      // so check the reason before parsing and fail with something diagnosable.
      const finishReason = response.candidates?.[0]?.finishReason;
      if (finishReason === "MAX_TOKENS") {
        throw new Error(`${model} hit the output token ceiling and returned partial JSON`);
      }

      const text = response.text;
      if (!text) throw new Error(`${model} returned an empty response`);
      return JSON.parse(text) as T;
    } catch (error) {
      lastError = error;
      if (isBillingError(error)) {
        throw new LlmUnavailableError(`Gemini refused the request: ${messageOf(error)}`);
      }
      if (isModelMissing(error)) continue;
      throw error;
    }
  }

  throw new LlmUnavailableError(
    `No model in the chain answered. Last error: ${messageOf(lastError)}`,
  );
}
