#!/usr/bin/env node

/**
 * GuardBot CLI
 *
 * Usage:
 *   npx guardbot review <pr-url>
 *   npx guardbot review --diff <file.patch>
 *   npx guardbot scan <directory>
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

// Re-use the shared analyzer
import { analyze, analyzeWithPatterns, type AIConfig, type FileChange, type Finding } from "../action/src/ai-analyzer";

const HELP = `
🛡️  GuardBot — AI-Powered Code Review CLI

Usage:
  guardbot review <github-pr-url>     Review a GitHub PR
  guardbot review --diff <file>        Review a local diff/patch file
  guardbot scan [directory]            Scan files in a directory

Options:
  --openai-key <key>          OpenAI API key (or OPENAI_API_KEY env)
  --anthropic-key <key>       Anthropic API key (or ANTHROPIC_API_KEY env)
  --model <model>             Model to use
  --level <quick|standard|thorough>  Review depth (default: standard)
  --format <text|json|markdown>      Output format (default: text)
  --token <token>             GitHub token (or GITHUB_TOKEN env)
  -h, --help                  Show this help

Examples:
  guardbot review https://github.com/owner/repo/pull/123
  guardbot review --diff changes.patch --openai-key sk-...
  guardbot scan ./src --level thorough
  OPENAI_API_KEY=sk-... guardbot review https://github.com/owner/repo/pull/42

Environment Variables:
  OPENAI_API_KEY       OpenAI API key
  ANTHROPIC_API_KEY    Anthropic API key
  GITHUB_TOKEN         GitHub personal access token

Learn more: https://guardbot.dev
`;

interface CLIArgs {
  command: string;
  target?: string;
  diffFile?: string;
  openaiKey?: string;
  anthropicKey?: string;
  model?: string;
  level: string;
  format: string;
  token?: string;
}

function parseArgs(argv: string[]): CLIArgs {
  const args: CLIArgs = {
    command: "",
    level: "standard",
    format: "text",
  };

  let i = 2; // skip node and script name
  if (argv[i]) args.command = argv[i++];
  
  while (i < argv.length) {
    const arg = argv[i];
    if (arg === "--diff") {
      args.diffFile = argv[++i];
    } else if (arg === "--openai-key") {
      args.openaiKey = argv[++i];
    } else if (arg === "--anthropic-key") {
      args.anthropicKey = argv[++i];
    } else if (arg === "--model") {
      args.model = argv[++i];
    } else if (arg === "--level") {
      args.level = argv[++i];
    } else if (arg === "--format") {
      args.format = argv[++i];
    } else if (arg === "--token") {
      args.token = argv[++i];
    } else if (arg === "-h" || arg === "--help") {
      console.log(HELP);
      process.exit(0);
    } else if (!arg.startsWith("-")) {
      args.target = arg;
    }
    i++;
  }

  return args;
}

function parsePRUrl(url: string): { owner: string; repo: string; number: number } | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2], number: parseInt(match[3], 10) };
}

async function fetchPRFiles(
  owner: string,
  repo: string,
  prNumber: number,
  token: string
): Promise<FileChange[]> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files?per_page=100`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`GitHub API error (${response.status}): ${await response.text()}`);
  }

  const files = await response.json();
  return files.map((f: any) => ({
    filename: f.filename,
    status: f.status,
    patch: f.patch,
    additions: f.additions,
    deletions: f.deletions,
  }));
}

function parseDiffFile(content: string): FileChange[] {
  const files: FileChange[] = [];
  const fileDiffs = content.split(/^diff --git /m).filter(Boolean);

  for (const diff of fileDiffs) {
    const filenameMatch = diff.match(/b\/(.+?)$/m);
    if (!filenameMatch) continue;

    const patchStart = diff.indexOf("@@");
    const patch = patchStart >= 0 ? diff.substring(patchStart) : "";

    const additions = (patch.match(/^\+[^+]/gm) || []).length;
    const deletions = (patch.match(/^-[^-]/gm) || []).length;

    files.push({
      filename: filenameMatch[1],
      status: "modified",
      patch,
      additions,
      deletions,
    });
  }

  return files;
}

const SEVERITY_COLORS = {
  critical: "\x1b[31m", // red
  warning: "\x1b[33m",  // yellow
  info: "\x1b[36m",     // cyan
};
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";

function formatTextOutput(result: { findings: Finding[]; summary: string; model: string; mode: string }): string {
  let output = `\n${BOLD}🛡️  GuardBot Review${RESET}\n`;
  output += `${DIM}Mode: ${result.mode} | Model: ${result.model}${RESET}\n\n`;

  if (result.findings.length === 0) {
    output += `✅ ${result.summary}\n`;
    return output;
  }

  output += `${result.summary}\n\n`;

  // Group by file
  const byFile = new Map<string, Finding[]>();
  for (const f of result.findings) {
    const group = byFile.get(f.file) || [];
    group.push(f);
    byFile.set(f.file, group);
  }

  for (const [file, findings] of byFile) {
    output += `${BOLD}📄 ${file}${RESET}\n`;
    for (const f of findings) {
      const color = SEVERITY_COLORS[f.severity] || "";
      const line = f.line ? `:${f.line}` : "";
      output += `  ${color}${f.severity.toUpperCase()}${RESET} ${f.title}${DIM}${line}${RESET}\n`;
      output += `  ${f.message}\n`;
      if (f.suggestion) {
        output += `  ${DIM}💡 ${f.suggestion}${RESET}\n`;
      }
      output += "\n";
    }
  }

  return output;
}

async function main() {
  const args = parseArgs(process.argv);

  if (!args.command || args.command === "help") {
    console.log(HELP);
    process.exit(0);
  }

  const config: AIConfig = {
    openaiKey: args.openaiKey || process.env.OPENAI_API_KEY,
    anthropicKey: args.anthropicKey || process.env.ANTHROPIC_API_KEY,
    openaiModel: args.model,
    anthropicModel: args.model,
    reviewLevel: (args.level as AIConfig["reviewLevel"]) || "standard",
  };

  let files: FileChange[];

  if (args.command === "review") {
    if (args.diffFile) {
      // Review a local diff file
      const diffPath = resolve(args.diffFile);
      if (!existsSync(diffPath)) {
        console.error(`❌ File not found: ${diffPath}`);
        process.exit(1);
      }
      const content = readFileSync(diffPath, "utf-8");
      files = parseDiffFile(content);
    } else if (args.target) {
      // Review a GitHub PR
      const pr = parsePRUrl(args.target);
      if (!pr) {
        console.error("❌ Invalid PR URL. Expected: https://github.com/owner/repo/pull/123");
        process.exit(1);
      }
      const token = args.token || process.env.GITHUB_TOKEN;
      if (!token) {
        console.error("❌ GitHub token required. Set GITHUB_TOKEN or use --token.");
        process.exit(1);
      }
      console.log(`Fetching PR #${pr.number} from ${pr.owner}/${pr.repo}...`);
      files = await fetchPRFiles(pr.owner, pr.repo, pr.number, token);
    } else {
      console.error("❌ Please provide a PR URL or --diff file.");
      process.exit(1);
    }
  } else if (args.command === "scan") {
    console.error("❌ scan command coming soon! Use 'review' with a diff for now.");
    process.exit(1);
  } else {
    console.error(`❌ Unknown command: ${args.command}`);
    console.log(HELP);
    process.exit(1);
  }

  if (files.length === 0) {
    console.log("No files to review.");
    process.exit(0);
  }

  console.log(`Analyzing ${files.length} file(s)...\n`);

  const result = await analyze(files, config);

  if (args.format === "json") {
    console.log(JSON.stringify(result, null, 2));
  } else if (args.format === "markdown") {
    // Reuse the comment formatter from the action
    console.log(`## 🛡️ GuardBot Review\n\n${result.summary}`);
    for (const f of result.findings) {
      console.log(`\n### ${f.file}${f.line ? `:${f.line}` : ""}`);
      console.log(`**${f.severity}** — ${f.title}`);
      console.log(f.message);
      if (f.suggestion) console.log(`> 💡 ${f.suggestion}`);
    }
  } else {
    console.log(formatTextOutput(result));
  }

  // Exit with error code if critical findings
  const criticalCount = result.findings.filter((f) => f.severity === "critical").length;
  if (criticalCount > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
