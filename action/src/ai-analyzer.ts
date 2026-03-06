/**
 * GuardBot AI Analyzer
 *
 * LLM-powered code review that sends PR diffs to OpenAI or Anthropic
 * and returns structured findings. Falls back to pattern matching
 * when no API key is provided.
 */

export interface Finding {
  file: string;
  line?: number;
  severity: "critical" | "warning" | "info";
  category: "security" | "code-smell" | "performance" | "bug" | "suggestion";
  title: string;
  message: string;
  suggestion?: string;
}

export interface ReviewResult {
  findings: Finding[];
  summary: string;
  model: string;
  mode: "ai" | "pattern";
}

export interface FileChange {
  filename: string;
  status: string;
  patch?: string;
  additions: number;
  deletions: number;
}

export interface AIConfig {
  openaiKey?: string;
  openaiModel?: string;
  anthropicKey?: string;
  anthropicModel?: string;
  reviewLevel: "quick" | "standard" | "thorough";
}

const SYSTEM_PROMPT = `You are GuardBot, an expert AI code reviewer. You analyze pull request diffs and provide actionable feedback.

Your review should focus on:
1. **Security vulnerabilities** — SQL injection, XSS, hardcoded secrets, auth issues, OWASP Top 10
2. **Bugs** — Logic errors, null pointer risks, race conditions, off-by-one errors
3. **Code smells** — Dead code, unnecessary complexity, poor naming, anti-patterns
4. **Performance** — N+1 queries, memory leaks, unnecessary re-renders, inefficient algorithms
5. **Suggestions** — Better approaches, missing error handling, type safety improvements

Rules:
- Only review ADDED or MODIFIED lines (lines starting with +)
- Be specific — reference exact line numbers and code
- Be concise — no fluff, developers are busy
- Be actionable — always suggest a fix
- Don't nitpick formatting or style (leave that to linters)
- If the code looks good, say so briefly
- Focus on issues that could cause real problems in production

Respond with valid JSON matching this schema:
{
  "findings": [
    {
      "file": "path/to/file.ts",
      "line": 42,
      "severity": "critical|warning|info",
      "category": "security|bug|code-smell|performance|suggestion",
      "title": "Short title",
      "message": "Detailed explanation of the issue",
      "suggestion": "How to fix it (with code example if helpful)"
    }
  ],
  "summary": "Brief overall assessment (1-2 sentences)"
}

If there are no significant issues, return: {"findings": [], "summary": "Code looks clean! No significant issues found."}`;

const REVIEW_DEPTH: Record<string, string> = {
  quick:
    "Do a quick scan. Only flag critical security issues and obvious bugs. Skip minor suggestions.",
  standard:
    "Do a standard review. Flag security issues, bugs, and notable code smells. Include important suggestions.",
  thorough:
    "Do a thorough review. Flag everything: security, bugs, performance, code smells, and improvement suggestions. Be comprehensive.",
};

function buildUserPrompt(files: FileChange[], level: string): string {
  const depth = REVIEW_DEPTH[level] || REVIEW_DEPTH.standard;

  const diffs = files
    .filter((f) => f.patch)
    .map((f) => `### ${f.filename} (${f.status})\n\`\`\`diff\n${f.patch}\n\`\`\``)
    .join("\n\n");

  return `${depth}\n\nPull request diff:\n\n${diffs}`;
}

/**
 * Analyze files using OpenAI API
 */
async function analyzeWithOpenAI(
  files: FileChange[],
  config: AIConfig
): Promise<ReviewResult> {
  const model = config.openaiModel || "gpt-4o-mini";
  const userPrompt = buildUserPrompt(files, config.reviewLevel);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${err}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response from OpenAI");

  const parsed = JSON.parse(content);
  return {
    findings: parsed.findings || [],
    summary: parsed.summary || "Review complete.",
    model: `openai/${model}`,
    mode: "ai",
  };
}

/**
 * Analyze files using Anthropic API
 */
async function analyzeWithAnthropic(
  files: FileChange[],
  config: AIConfig
): Promise<ReviewResult> {
  const model = config.anthropicModel || "claude-sonnet-4-20250514";
  const userPrompt = buildUserPrompt(files, config.reviewLevel);

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": config.anthropicKey!,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt + "\n\nRespond with valid JSON only." }],
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${err}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text;
  if (!content) throw new Error("Empty response from Anthropic");

  // Extract JSON from response (Anthropic might wrap in markdown)
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in Anthropic response");

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    findings: parsed.findings || [],
    summary: parsed.summary || "Review complete.",
    model: `anthropic/${model}`,
    mode: "ai",
  };
}

/**
 * Pattern-based fallback analyzer (no API key needed)
 */
export function analyzeWithPatterns(files: FileChange[]): ReviewResult {
  const findings: Finding[] = [];

  const patterns: {
    pattern: RegExp;
    title: string;
    message: string;
    suggestion: string;
    severity: Finding["severity"];
    category: Finding["category"];
  }[] = [
    // Security
    {
      pattern: /eval\s*\(/,
      title: "Unsafe eval() usage",
      message: "Use of `eval()` detected. This can lead to code injection vulnerabilities.",
      suggestion: "Use `JSON.parse()` for data or `new Function()` if absolutely necessary.",
      severity: "critical",
      category: "security",
    },
    {
      pattern: /innerHTML\s*=/,
      title: "Potential XSS via innerHTML",
      message: "Direct `innerHTML` assignment can lead to Cross-Site Scripting (XSS).",
      suggestion: "Use `textContent` for plain text or sanitize with DOMPurify.",
      severity: "critical",
      category: "security",
    },
    {
      pattern: /SELECT\s+.*FROM.*\$\{/i,
      title: "SQL Injection risk",
      message: "String interpolation in SQL query detected.",
      suggestion: "Use parameterized queries or an ORM.",
      severity: "critical",
      category: "security",
    },
    {
      pattern: /(password|secret|api_key|apikey|token|private_key)\s*[:=]\s*["'][^"']{8,}["']/i,
      title: "Hardcoded secret",
      message: "Possible hardcoded credential detected.",
      suggestion: "Use environment variables. Never commit secrets to source control.",
      severity: "critical",
      category: "security",
    },
    {
      pattern: /dangerouslySetInnerHTML/,
      title: "dangerouslySetInnerHTML usage",
      message: "Ensure content passed to `dangerouslySetInnerHTML` is sanitized.",
      suggestion: "Sanitize HTML with DOMPurify before rendering.",
      severity: "warning",
      category: "security",
    },
    // Bugs
    {
      pattern: /\.catch\s*\(\s*\)/,
      title: "Swallowed error",
      message: "Empty `.catch()` silently swallows errors.",
      suggestion: "Log the error or handle it explicitly.",
      severity: "warning",
      category: "bug",
    },
    {
      pattern: /==(?!=)/,
      title: "Loose equality",
      message: "Loose equality (`==`) can cause unexpected type coercion.",
      suggestion: "Use strict equality (`===`) instead.",
      severity: "info",
      category: "bug",
    },
    // Code smells
    {
      pattern: /console\.(log|debug|info)\s*\(/,
      title: "Console statement",
      message: "Console statement left in production code.",
      suggestion: "Remove or replace with a proper logging library.",
      severity: "info",
      category: "code-smell",
    },
    {
      pattern: /TODO|FIXME|HACK|XXX/,
      title: "TODO/FIXME comment",
      message: "Unresolved TODO/FIXME in new code.",
      suggestion: "Resolve before merging or create a tracking issue.",
      severity: "info",
      category: "code-smell",
    },
    {
      pattern: /:\s*any(?:\s|;|,|\)|>)/,
      title: "TypeScript `any` type",
      message: "Using `any` weakens type safety.",
      suggestion: "Use a specific type or `unknown`.",
      severity: "info",
      category: "code-smell",
    },
    // Performance
    {
      pattern: /JSON\.parse\(JSON\.stringify\(/,
      title: "Slow deep clone",
      message: "JSON.parse(JSON.stringify()) is a slow way to deep clone.",
      suggestion: "Use `structuredClone()` or a library like lodash `cloneDeep`.",
      severity: "info",
      category: "performance",
    },
    {
      pattern: /new RegExp\(/,
      title: "Runtime RegExp compilation",
      message: "RegExp created at runtime. If in a hot path, this causes repeated compilation.",
      suggestion: "Move to a module-level constant if the pattern is static.",
      severity: "info",
      category: "performance",
    },
  ];

  for (const file of files) {
    if (!file.patch) continue;

    const lines = file.patch.split("\n");
    let lineNumber = 0;

    for (const line of lines) {
      // Parse diff line numbers
      const hunkMatch = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)/);
      if (hunkMatch) {
        lineNumber = parseInt(hunkMatch[1], 10) - 1;
        continue;
      }

      if (line.startsWith("+") && !line.startsWith("+++")) {
        lineNumber++;
        const addedCode = line.substring(1);

        for (const p of patterns) {
          if (p.pattern.test(addedCode)) {
            findings.push({
              file: file.filename,
              line: lineNumber,
              severity: p.severity,
              category: p.category,
              title: p.title,
              message: p.message,
              suggestion: p.suggestion,
            });
          }
        }
      } else if (!line.startsWith("-")) {
        lineNumber++;
      }
    }
  }

  const criticalCount = findings.filter((f) => f.severity === "critical").length;
  const summary =
    findings.length === 0
      ? "No issues found with pattern matching. Add an API key for deeper AI analysis."
      : `Found ${findings.length} issue(s) (${criticalCount} critical) via pattern matching.`;

  return { findings, summary, model: "pattern-matching", mode: "pattern" };
}

/**
 * Main analyzer entry point — tries AI first, falls back to patterns
 */
export async function analyze(
  files: FileChange[],
  config: AIConfig
): Promise<ReviewResult> {
  // Try AI analysis first
  if (config.openaiKey) {
    try {
      const result = await analyzeWithOpenAI(files, config);
      // Merge with pattern results for comprehensive coverage
      const patternResult = analyzeWithPatterns(files);
      return mergeResults(result, patternResult);
    } catch (error) {
      console.warn("OpenAI analysis failed, falling back to patterns:", error);
    }
  }

  if (config.anthropicKey) {
    try {
      const result = await analyzeWithAnthropic(files, config);
      const patternResult = analyzeWithPatterns(files);
      return mergeResults(result, patternResult);
    } catch (error) {
      console.warn("Anthropic analysis failed, falling back to patterns:", error);
    }
  }

  // Fallback to pattern matching
  return analyzeWithPatterns(files);
}

/**
 * Merge AI and pattern results, deduplicating similar findings
 */
function mergeResults(ai: ReviewResult, pattern: ReviewResult): ReviewResult {
  const merged = [...ai.findings];

  // Add pattern findings that don't overlap with AI findings
  for (const pf of pattern.findings) {
    const isDuplicate = ai.findings.some(
      (af) => af.file === pf.file && af.line === pf.line && af.category === pf.category
    );
    if (!isDuplicate) {
      merged.push(pf);
    }
  }

  return {
    findings: merged,
    summary: ai.summary,
    model: ai.model,
    mode: "ai",
  };
}
