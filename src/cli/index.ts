#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import { Octokit } from "@octokit/rest";
import { analyzeWithAI, resolveConfig } from "../lib/ai-analyzer";
import type { Finding } from "../lib/analyzer";
import type { PullRequestFile } from "../lib/github";
import * as fs from "fs";

const program = new Command();

program
  .name("guardbot")
  .description("AI-powered code review CLI")
  .version("0.1.0");

program
  .command("review")
  .description("Review a PR or local diff")
  .argument("[pr-url]", "GitHub PR URL (e.g. https://github.com/owner/repo/pull/123)")
  .option("--diff <file>", "Path to a local diff file")
  .option("--provider <provider>", "AI provider: openai or anthropic")
  .option("--model <model>", "Model to use")
  .action(async (prUrl: string | undefined, opts: { diff?: string; provider?: string; model?: string }) => {
    try {
      let files: PullRequestFile[];

      if (opts.diff) {
        // Read local diff file
        const diffContent = fs.readFileSync(opts.diff, "utf8");
        files = parseDiffToFiles(diffContent);
      } else if (prUrl) {
        files = await fetchPRFiles(prUrl);
      } else {
        // Try reading from stdin
        console.error(chalk.red("Error: Provide a PR URL or --diff <file>"));
        process.exit(1);
      }

      console.log(chalk.blue.bold("\n  GuardBot - AI Code Review\n"));
      console.log(chalk.gray(`  Analyzing ${files.length} file(s)...\n`));

      const config = resolveConfig({
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
        GUARDBOT_MODEL: opts.model ?? process.env.GUARDBOT_MODEL,
      });

      if (!config) {
        console.log(chalk.yellow("  No API key found. Using regex-based analysis (limited)."));
        console.log(chalk.gray("  Set OPENAI_API_KEY or ANTHROPIC_API_KEY for AI-powered reviews.\n"));
      } else {
        console.log(chalk.gray(`  Using ${config.provider} (${config.model ?? "default model"})\n`));
      }

      const findings = await analyzeWithAI(files, config);
      printFindings(findings);
    } catch (error) {
      console.error(chalk.red(`\nError: ${error instanceof Error ? error.message : String(error)}`));
      process.exit(1);
    }
  });

function parseDiffToFiles(diff: string): PullRequestFile[] {
  const files: PullRequestFile[] = [];
  // Split on diff --git or --- a/ headers
  const fileSections = diff.split(/^diff --git /m).filter(Boolean);

  for (const section of fileSections) {
    const filenameMatch = section.match(/b\/(.+?)[\s\n]/);
    if (!filenameMatch) continue;

    const patchStart = section.indexOf("@@");
    const patch = patchStart >= 0 ? section.substring(patchStart) : section;

    const additions = (patch.match(/^\+[^+]/gm) ?? []).length;
    const deletions = (patch.match(/^-[^-]/gm) ?? []).length;

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

async function fetchPRFiles(prUrl: string): Promise<PullRequestFile[]> {
  const match = prUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
  if (!match) {
    throw new Error(`Invalid PR URL: ${prUrl}\nExpected format: https://github.com/owner/repo/pull/123`);
  }

  const [, owner, repo, prNumber] = match;
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN environment variable required to fetch PR data");
  }

  const octokit = new Octokit({ auth: token });
  const { data } = await octokit.pulls.listFiles({
    owner,
    repo,
    pull_number: parseInt(prNumber, 10),
    per_page: 100,
  });

  return data.map((f) => ({
    filename: f.filename,
    status: f.status,
    patch: f.patch,
    additions: f.additions,
    deletions: f.deletions,
  }));
}

function printFindings(findings: Finding[]): void {
  if (findings.length === 0) {
    console.log(chalk.green.bold("  No issues found! Your code looks clean.\n"));
    return;
  }

  const critical = findings.filter((f) => f.severity === "critical");
  const warnings = findings.filter((f) => f.severity === "warning");
  const infos = findings.filter((f) => f.severity === "info");

  console.log(chalk.bold(`  Found ${findings.length} issue(s):`));
  if (critical.length) console.log(chalk.red(`    ${critical.length} critical`));
  if (warnings.length) console.log(chalk.yellow(`    ${warnings.length} warning(s)`));
  if (infos.length) console.log(chalk.blue(`    ${infos.length} info`));
  console.log();

  for (const finding of findings) {
    const severityLabel =
      finding.severity === "critical"
        ? chalk.bgRed.white.bold(" CRITICAL ")
        : finding.severity === "warning"
          ? chalk.bgYellow.black.bold(" WARNING ")
          : chalk.bgBlue.white.bold(" INFO ");

    const location = finding.line
      ? chalk.cyan(`${finding.file}:${finding.line}`)
      : chalk.cyan(finding.file);

    console.log(`  ${severityLabel} ${chalk.gray(`[${finding.category}]`)} ${location}`);
    console.log(`  ${finding.message}`);
    if (finding.suggestion) {
      console.log(chalk.green(`  -> ${finding.suggestion}`));
    }
    console.log();
  }

  if (critical.length > 0) {
    process.exitCode = 1;
  }
}

program.parse();
