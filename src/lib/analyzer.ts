import type { PullRequestFile } from "./github";

export interface Finding {
  file: string;
  line?: number;
  severity: "critical" | "warning" | "info";
  category: "security" | "code-smell" | "performance" | "best-practices";
  message: string;
  suggestion?: string;
}

const securityPatterns: {
  pattern: RegExp;
  message: string;
  suggestion: string;
  severity: Finding["severity"];
}[] = [
  {
    pattern: /eval\s*\(/,
    message: "Use of `eval()` detected. This can lead to code injection.",
    suggestion: "Avoid `eval()`. Use safer alternatives like `JSON.parse()` for data or `new Function()` if absolutely necessary.",
    severity: "critical",
  },
  {
    pattern: /innerHTML\s*=/,
    message: "Direct `innerHTML` assignment detected. Potential XSS vulnerability.",
    suggestion: "Use `textContent` for plain text or a sanitization library like DOMPurify.",
    severity: "critical",
  },
  {
    pattern: /SELECT\s+.*FROM.*\$\{/i,
    message: "Potential SQL injection via string interpolation.",
    suggestion: "Use parameterized queries or an ORM to prevent SQL injection.",
    severity: "critical",
  },
  {
    pattern: /(password|secret|api_key|apikey|token)\s*=\s*["'][^"']+["']/i,
    message: "Possible hardcoded secret or credential detected.",
    suggestion: "Use environment variables to store secrets. Never commit credentials to source control.",
    severity: "critical",
  },
  {
    pattern: /document\.write\s*\(/,
    message: "`document.write()` can be exploited for XSS attacks.",
    suggestion: "Use DOM manipulation methods like `createElement` and `appendChild` instead.",
    severity: "warning",
  },
  {
    pattern: /dangerouslySetInnerHTML/,
    message: "`dangerouslySetInnerHTML` used. Ensure input is sanitized.",
    suggestion: "Sanitize HTML content with a library like DOMPurify before rendering.",
    severity: "warning",
  },
];

const codeSmellPatterns: {
  pattern: RegExp;
  message: string;
  suggestion: string;
}[] = [
  {
    pattern: /console\.(log|debug|info)\s*\(/,
    message: "Console statement left in code.",
    suggestion: "Remove console statements before merging, or use a proper logging library.",
  },
  {
    pattern: /TODO|FIXME|HACK|XXX/,
    message: "TODO/FIXME comment found in new code.",
    suggestion: "Resolve TODOs before merging or create an issue to track them.",
  },
  {
    pattern: /any(?:\s|;|,|\))/,
    message: "TypeScript `any` type used. This weakens type safety.",
    suggestion: "Use a more specific type or `unknown` if the type is truly uncertain.",
  },
  {
    pattern: /\.catch\s*\(\s*\)/,
    message: "Empty `.catch()` handler swallows errors silently.",
    suggestion: "Handle or log the error in the `.catch()` block.",
  },
];

const performancePatterns: {
  pattern: RegExp;
  message: string;
  suggestion: string;
}[] = [
  {
    pattern: /await.*(?:for|while|forEach)\s*\(/,
    message: "Sequential async operations inside a loop. May cause N+1 performance issues.",
    suggestion: "Use `Promise.all()` to batch async operations when possible.",
  },
  {
    pattern: /new RegExp\(/,
    message: "RegExp created inside a function. Consider compiling it once outside.",
    suggestion: "Move the RegExp to a module-level constant to avoid recompilation.",
  },
  {
    pattern: /JSON\.parse\(JSON\.stringify\(/,
    message: "Deep clone via JSON serialize/deserialize is slow.",
    suggestion: "Use `structuredClone()` or a library like lodash `cloneDeep` for better performance.",
  },
];

function extractLineNumber(patch: string, matchIndex: number): number | undefined {
  const lines = patch.substring(0, matchIndex).split("\n");
  let currentLine = 0;

  for (const line of lines) {
    const hunkMatch = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)/);
    if (hunkMatch) {
      currentLine = parseInt(hunkMatch[1], 10);
    } else if (!line.startsWith("-")) {
      currentLine++;
    }
  }

  return currentLine > 0 ? currentLine : undefined;
}

export function analyzeFiles(files: PullRequestFile[]): Finding[] {
  const findings: Finding[] = [];

  for (const file of files) {
    if (!file.patch) continue;

    // Only analyze added lines
    const addedLines = file.patch
      .split("\n")
      .filter((line) => line.startsWith("+") && !line.startsWith("+++"));

    const addedContent = addedLines.join("\n");

    for (const rule of securityPatterns) {
      const match = rule.pattern.exec(addedContent);
      if (match) {
        findings.push({
          file: file.filename,
          line: extractLineNumber(file.patch, file.patch.indexOf(match[0])),
          severity: rule.severity,
          category: "security",
          message: rule.message,
          suggestion: rule.suggestion,
        });
      }
    }

    for (const rule of codeSmellPatterns) {
      const match = rule.pattern.exec(addedContent);
      if (match) {
        findings.push({
          file: file.filename,
          line: extractLineNumber(file.patch, file.patch.indexOf(match[0])),
          severity: "warning",
          category: "code-smell",
          message: rule.message,
          suggestion: rule.suggestion,
        });
      }
    }

    for (const rule of performancePatterns) {
      const match = rule.pattern.exec(addedContent);
      if (match) {
        findings.push({
          file: file.filename,
          line: extractLineNumber(file.patch, file.patch.indexOf(match[0])),
          severity: "info",
          category: "performance",
          message: rule.message,
          suggestion: rule.suggestion,
        });
      }
    }
  }

  return findings;
}

export function formatReviewComment(findings: Finding[]): string {
  if (findings.length === 0) {
    return [
      "## :shield: GuardBot Review",
      "",
      ":white_check_mark: **No issues found!** Your code looks clean.",
      "",
      "---",
      "*Automated review by [GuardBot](https://guardbot.dev)*",
    ].join("\n");
  }

  const critical = findings.filter((f) => f.severity === "critical");
  const warnings = findings.filter((f) => f.severity === "warning");
  const infos = findings.filter((f) => f.severity === "info");

  const lines: string[] = [
    "## :shield: GuardBot Review",
    "",
    `Found **${findings.length}** issue${findings.length === 1 ? "" : "s"}:`,
    `- :red_circle: ${critical.length} critical`,
    `- :warning: ${warnings.length} warnings`,
    `- :information_source: ${infos.length} info`,
    "",
  ];

  for (const finding of findings) {
    const icon =
      finding.severity === "critical"
        ? ":red_circle:"
        : finding.severity === "warning"
          ? ":warning:"
          : ":information_source:";

    const location = finding.line
      ? `\`${finding.file}:${finding.line}\``
      : `\`${finding.file}\``;

    lines.push(`### ${icon} ${finding.category.toUpperCase()}: ${finding.message}`);
    lines.push(`**File:** ${location}`);
    if (finding.suggestion) {
      lines.push(`> **Suggestion:** ${finding.suggestion}`);
    }
    lines.push("");
  }

  lines.push("---");
  lines.push("*Automated review by [GuardBot](https://guardbot.dev)*");

  return lines.join("\n");
}
