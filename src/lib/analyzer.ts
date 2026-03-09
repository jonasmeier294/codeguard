import type { PullRequestFile } from "./github";
import { loadConfig } from "./config";

export interface Finding {
  file: string;
  line?: number;
  severity: "critical" | "warning" | "info";
  category: "security" | "code-smell" | "performance" | "best-practices";
  message: string;
  suggestion?: string;
}

// Assigned an 'id' to each rule so they can be referenced in .guardbot.yml
const securityPatterns: {
  id: string;
  pattern: RegExp;
  message: string;
  suggestion: string;
  severity: Finding["severity"];
}[] = [
  {
    id: "no-eval",
    pattern: /eval\s*\(/,
    message: "Use of `eval()` detected. This can lead to code injection.",
    suggestion: "Avoid `eval()`. Use safer alternatives like `JSON.parse()` for data or `new Function()` if absolutely necessary.",
    severity: "critical",
  },
  {
    id: "no-innerhtml",
    pattern: /innerHTML\s*=/,
    message: "Direct `innerHTML` assignment detected. Potential XSS vulnerability.",
    suggestion: "Use `textContent` for plain text or a sanitization library like DOMPurify.",
    severity: "critical",
  },
  {
    id: "no-sql-interpolation",
    pattern: /SELECT\s+.*FROM.*\$\{/i,
    message: "Potential SQL injection via string interpolation.",
    suggestion: "Use parameterized queries or an ORM to prevent SQL injection.",
    severity: "critical",
  },
  {
    id: "no-hardcoded-secrets",
    pattern: /(password|secret|api_key|apikey|token)\s*=\s*["'][^"']+["']/i,
    message: "Possible hardcoded secret or credential detected.",
    suggestion: "Use environment variables to store secrets. Never commit credentials to source control.",
    severity: "critical",
  },
  {
    id: "no-document-write",
    pattern: /document\.write\s*\(/,
    message: "`document.write()` can be exploited for XSS attacks.",
    suggestion: "Use DOM manipulation methods like `createElement` and `appendChild` instead.",
    severity: "warning",
  },
  {
    id: "no-dangerously-set-innerhtml",
    pattern: /dangerouslySetInnerHTML/,
    message: "`dangerouslySetInnerHTML` used. Ensure input is sanitized.",
    suggestion: "Sanitize HTML content with a library like DOMPurify before rendering.",
    severity: "warning",
  },
];

const codeSmellPatterns: {
  id: string;
  pattern: RegExp;
  message: string;
  suggestion: string;
}[] = [
  {
    id: "no-console",
    pattern: /console\.(log|debug|info)\s*\(/,
    message: "Console statement left in code.",
    suggestion: "Remove console statements before merging, or use a proper logging library.",
  },
  {
    id: "no-todo",
    pattern: /TODO|FIXME|HACK|XXX/,
    message: "TODO/FIXME comment found in new code.",
    suggestion: "Resolve TODOs before merging or create an issue to track them.",
  },
  {
    id: "no-any",
    pattern: /any(?:\s|;|,|\))/,
    message: "TypeScript `any` type used. This weakens type safety.",
    suggestion: "Use a more specific type or `unknown` if the type is truly uncertain.",
  },
  {
    id: "no-empty-catch",
    pattern: /\.catch\s*\(\s*\)/,
    message: "Empty `.catch()` handler swallows errors silently.",
    suggestion: "Handle or log the error in the `.catch()` block.",
  },
];

const performancePatterns: {
  id: string;
  pattern: RegExp;
  message: string;
  suggestion: string;
}[] = [
  {
    id: "no-await-in-loop",
    pattern: /await.*(?:for|while|forEach)\s*\(/,
    message: "Sequential async operations inside a loop. May cause N+1 performance issues.",
    suggestion: "Use `Promise.all()` to batch async operations when possible.",
  },
  {
    id: "no-regex-in-func",
    pattern: /new RegExp\(/,
    message: "RegExp created inside a function. Consider compiling it once outside.",
    suggestion: "Move the RegExp to a module-level constant to avoid recompilation.",
  },
  {
    id: "no-json-clone",
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

// Maps the severity from the first config.ts to the Finding interface severity
function mapSeverity(configSeverity?: string): Finding["severity"] | undefined {
  if (!configSeverity) return undefined;
  
  switch (configSeverity) {
    case 'error':
    case 'high':
      return 'critical';
    case 'medium':
      return 'warning';
    case 'low':
      return 'info';
    default:
      if (['critical', 'warning', 'info'].includes(configSeverity)) {
        return configSeverity as Finding["severity"];
      }
      return undefined;
  }
}

export function analyzeFiles(files: PullRequestFile[]): Finding[] {
  const findings: Finding[] = [];
  
  // Load config from the current working directory (repo root)
  const config = loadConfig(process.cwd());

  for (const file of files) {
    if (!file.patch) continue;

    // Only analyze added lines
    const addedLines = file.patch
      .split("\n")
      .filter((line) => line.startsWith("+") && !line.startsWith("+++"));

    const addedContent = addedLines.join("\n");

    // Reusable function to process rules against the config
    const processRules = (
      rules: any[], 
      category: Finding["category"], 
      defaultSeverity: Finding["severity"]
    ) => {
      for (const rule of rules) {
        // Fetch user configuration for this specific rule ID
        const userConfig = config.rules?.[rule.id];

        // 1. Skip if the rule is explicitly disabled in .guardbot.yml
        if (userConfig && userConfig.enabled === false) {
          continue;
        }

        const match = rule.pattern.exec(addedContent);
        if (match) {
          // 2. Determine final severity (User Override -> Rule Default -> Category Default)
          const finalSeverity = mapSeverity(userConfig?.severity) || rule.severity || defaultSeverity;

          findings.push({
            file: file.filename,
            line: extractLineNumber(file.patch, file.patch.indexOf(match[0])),
            severity: finalSeverity,
            category: category,
            message: rule.message,
            suggestion: rule.suggestion,
          });
        }
      }
    };

    // Run the configurable rule sets
    processRules(securityPatterns, "security", "critical");
    processRules(codeSmellPatterns, "code-smell", "warning");
    processRules(performancePatterns, "performance", "info");
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
