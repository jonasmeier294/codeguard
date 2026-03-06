import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import type { PullRequestFile } from "./github";
import type { Finding } from "./analyzer";
import { analyzeFiles } from "./analyzer";

export interface AIAnalyzerConfig {
  provider: "openai" | "anthropic";
  apiKey: string;
  model?: string;
}

const REVIEW_PROMPT = `You are GuardBot, an expert code reviewer. Analyze the following PR diff and return findings as JSON.

Review for:
1. **Security**: SQL injection, XSS, hardcoded secrets, command injection, SSRF, path traversal, insecure crypto, OWASP Top 10
2. **Code Smells**: Dead code, high complexity, anti-patterns, poor naming, missing error handling, type safety issues
3. **Performance**: N+1 queries, unnecessary re-renders, memory leaks, inefficient algorithms, missing caching opportunities
4. **Best Practices**: Missing input validation, improper error handling, race conditions, missing null checks, API design issues

Only analyze ADDED lines (lines starting with +). Be specific about the issue and provide actionable suggestions.

Respond ONLY with a JSON array. Each element must match this schema exactly:
{
  "file": "string (filename from the diff)",
  "line": "number | null (line number in the new file)",
  "severity": "critical | warning | info",
  "category": "security | code-smell | performance | best-practices",
  "message": "string (concise description of the issue)",
  "suggestion": "string (how to fix it)"
}

If there are no issues, return an empty array: []

PR Diff:
`;

function buildDiffString(files: PullRequestFile[]): string {
  return files
    .filter((f) => f.patch)
    .map((f) => `--- a/${f.filename}\n+++ b/${f.filename}\n${f.patch}`)
    .join("\n\n");
}

function parseFindingsFromResponse(text: string): Finding[] {
  // Extract JSON from the response (handle markdown code blocks)
  let jsonStr = text.trim();
  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  }

  const parsed: unknown = JSON.parse(jsonStr);
  if (!Array.isArray(parsed)) {
    throw new Error("LLM response is not a JSON array");
  }

  return parsed.map((item: Record<string, unknown>) => ({
    file: String(item.file ?? ""),
    line: typeof item.line === "number" ? item.line : undefined,
    severity: validateSeverity(item.severity),
    category: validateCategory(item.category),
    message: String(item.message ?? ""),
    suggestion: item.suggestion ? String(item.suggestion) : undefined,
  }));
}

function validateSeverity(val: unknown): Finding["severity"] {
  if (val === "critical" || val === "warning" || val === "info") return val;
  return "warning";
}

function validateCategory(val: unknown): Finding["category"] {
  if (val === "security" || val === "code-smell" || val === "performance" || val === "best-practices") {
    return val as Finding["category"];
  }
  return "code-smell";
}

async function analyzeWithOpenAI(
  config: AIAnalyzerConfig,
  diff: string
): Promise<Finding[]> {
  const client = new OpenAI({ apiKey: config.apiKey });
  const model = config.model ?? "gpt-4o";

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: "You are a precise code review assistant. Always respond with valid JSON." },
      { role: "user", content: REVIEW_PROMPT + diff },
    ],
    temperature: 0.1,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Empty response from OpenAI");

  // OpenAI json_object mode may wrap in { "findings": [...] }
  const parsed: unknown = JSON.parse(content);
  if (Array.isArray(parsed)) {
    return parseFindingsFromResponse(content);
  }
  if (typeof parsed === "object" && parsed !== null) {
    const obj = parsed as Record<string, unknown>;
    const arr = obj.findings ?? obj.results ?? obj.issues ?? obj.data;
    if (Array.isArray(arr)) {
      return parseFindingsFromResponse(JSON.stringify(arr));
    }
  }
  return parseFindingsFromResponse(content);
}

async function analyzeWithAnthropic(
  config: AIAnalyzerConfig,
  diff: string
): Promise<Finding[]> {
  const client = new Anthropic({ apiKey: config.apiKey });
  const model = config.model ?? "claude-sonnet-4-20250514";

  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    messages: [
      { role: "user", content: REVIEW_PROMPT + diff },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Empty response from Anthropic");
  }

  return parseFindingsFromResponse(textBlock.text);
}

/**
 * Resolve analyzer config from environment variables or explicit config.
 * Returns null if no API key is available (will fallback to regex analyzer).
 */
export function resolveConfig(env?: Record<string, string | undefined>): AIAnalyzerConfig | null {
  const e = env ?? process.env;

  if (e.ANTHROPIC_API_KEY) {
    return {
      provider: "anthropic",
      apiKey: e.ANTHROPIC_API_KEY,
      model: e.GUARDBOT_MODEL,
    };
  }
  if (e.OPENAI_API_KEY) {
    return {
      provider: "openai",
      apiKey: e.OPENAI_API_KEY,
      model: e.GUARDBOT_MODEL,
    };
  }

  return null;
}

/**
 * Run AI-powered code analysis on PR files.
 * Falls back to regex analyzer if no API key is configured or if the AI call fails.
 */
export async function analyzeWithAI(
  files: PullRequestFile[],
  config?: AIAnalyzerConfig | null
): Promise<Finding[]> {
  const resolvedConfig = config ?? resolveConfig();

  if (!resolvedConfig) {
    return analyzeFiles(files);
  }

  const diff = buildDiffString(files);
  if (!diff.trim()) return [];

  try {
    const findings =
      resolvedConfig.provider === "anthropic"
        ? await analyzeWithAnthropic(resolvedConfig, diff)
        : await analyzeWithOpenAI(resolvedConfig, diff);

    return findings;
  } catch (error) {
    console.error("AI analysis failed, falling back to regex analyzer:", error);
    return analyzeFiles(files);
  }
}
