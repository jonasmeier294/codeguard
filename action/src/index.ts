/**
 * GuardBot GitHub Action
 *
 * Runs AI-powered code review on pull requests.
 * Posts findings as PR comments, review comments, or check runs.
 */

import * as core from "@actions/core";
import * as github from "@actions/github";
import { analyze, type AIConfig, type FileChange, type Finding } from "./ai-analyzer";
import { minimatch } from "minimatch";

async function run(): Promise<void> {
  try {
    const token = core.getInput("github_token", { required: true });
    const openaiKey = core.getInput("openai_key");
    const openaiModel = core.getInput("openai_model");
    const anthropicKey = core.getInput("anthropic_key");
    const anthropicModel = core.getInput("anthropic_model");
    const reviewLevel = core.getInput("review_level") as AIConfig["reviewLevel"];
    const postAs = core.getInput("post_as");
    const ignorePatterns = core.getInput("ignore_patterns").split(",").map((p) => p.trim());
    const maxFiles = parseInt(core.getInput("max_files"), 10) || 30;
    const failOn = core.getInput("fail_on");

    const octokit = github.getOctokit(token);
    const context = github.context;

    if (!context.payload.pull_request) {
      core.info("Not a pull request event, skipping.");
      return;
    }

    const pr = context.payload.pull_request;
    const owner = context.repo.owner;
    const repo = context.repo.repo;
    const pullNumber = pr.number;

    core.info(`🛡️ GuardBot reviewing PR #${pullNumber}: ${pr.title}`);

    // Fetch changed files
    const { data: files } = await octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: pullNumber,
      per_page: 100,
    });

    // Filter out ignored patterns
    const filteredFiles: FileChange[] = files
      .filter((f) => {
        if (!f.patch) return false;
        return !ignorePatterns.some((pattern) => minimatch(f.filename, pattern));
      })
      .slice(0, maxFiles)
      .map((f) => ({
        filename: f.filename,
        status: f.status,
        patch: f.patch,
        additions: f.additions,
        deletions: f.deletions,
      }));

    if (filteredFiles.length === 0) {
      core.info("No reviewable files found, skipping.");
      return;
    }

    core.info(`Analyzing ${filteredFiles.length} file(s)...`);

    // Run analysis
    const config: AIConfig = {
      openaiKey: openaiKey || undefined,
      openaiModel: openaiModel || undefined,
      anthropicKey: anthropicKey || undefined,
      anthropicModel: anthropicModel || undefined,
      reviewLevel: reviewLevel || "standard",
    };

    const result = await analyze(filteredFiles, config);

    core.info(
      `Review complete (${result.mode}/${result.model}): ${result.findings.length} finding(s)`
    );

    // Post results
    const body = formatComment(result.findings, result.summary, result.model, result.mode);

    if (postAs === "review") {
      await postAsReview(octokit, owner, repo, pullNumber, result.findings, result.summary, pr.head.sha);
    } else if (postAs === "check-run") {
      await postAsCheckRun(octokit, owner, repo, pr.head.sha, result, failOn);
    } else {
      // Default: comment
      await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: pullNumber,
        body,
      });
    }

    // Set outputs
    const criticalCount = result.findings.filter((f) => f.severity === "critical").length;
    core.setOutput("findings_count", result.findings.length.toString());
    core.setOutput("critical_count", criticalCount.toString());

    // Fail if configured
    if (failOn !== "none") {
      const severityLevel = { critical: 3, warning: 2, info: 1 };
      const threshold = severityLevel[failOn as keyof typeof severityLevel] || 0;
      const shouldFail = result.findings.some(
        (f) => (severityLevel[f.severity] || 0) >= threshold
      );
      if (shouldFail) {
        core.setFailed(
          `GuardBot found ${result.findings.length} issue(s) meeting the '${failOn}' threshold.`
        );
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    }
  }
}

function formatComment(
  findings: Finding[],
  summary: string,
  model: string,
  mode: string
): string {
  const header = "## 🛡️ GuardBot Code Review\n";

  if (findings.length === 0) {
    return `${header}\n✅ **All clear!** ${summary}\n\n---\n<sub>Reviewed by [GuardBot](https://guardbot.dev) (${mode}) · ⭐ [Star on GitHub](https://github.com/jonasmeier294/guardbot)</sub>`;
  }

  const severityEmoji = { critical: "🔴", warning: "🟡", info: "🔵" };
  const categoryEmoji = {
    security: "🔒",
    bug: "🐛",
    "code-smell": "👃",
    performance: "⚡",
    suggestion: "💡",
  };

  const criticalCount = findings.filter((f) => f.severity === "critical").length;
  const warningCount = findings.filter((f) => f.severity === "warning").length;
  const infoCount = findings.filter((f) => f.severity === "info").length;

  let body = `${header}\n`;
  body += `**${summary}**\n\n`;
  body += `| Severity | Count |\n|----------|-------|\n`;
  if (criticalCount) body += `| 🔴 Critical | ${criticalCount} |\n`;
  if (warningCount) body += `| 🟡 Warning | ${warningCount} |\n`;
  if (infoCount) body += `| 🔵 Info | ${infoCount} |\n`;
  body += "\n---\n\n";

  // Group by file
  const byFile = new Map<string, Finding[]>();
  for (const f of findings) {
    const group = byFile.get(f.file) || [];
    group.push(f);
    byFile.set(f.file, group);
  }

  for (const [file, fileFindings] of byFile) {
    body += `### 📄 \`${file}\`\n\n`;
    for (const f of fileFindings) {
      const sev = severityEmoji[f.severity] || "⚪";
      const cat = categoryEmoji[f.category as keyof typeof categoryEmoji] || "📋";
      const line = f.line ? ` (line ${f.line})` : "";
      body += `${sev} ${cat} **${f.title}**${line}\n`;
      body += `> ${f.message}\n`;
      if (f.suggestion) {
        body += `> 💡 *${f.suggestion}*\n`;
      }
      body += "\n";
    }
  }

  body += `---\n<sub>Reviewed by [GuardBot](https://guardbot.dev) (${mode}/${model}) · ⭐ [Star on GitHub](https://github.com/jonasmeier294/guardbot)</sub>`;

  return body;
}

async function postAsReview(
  octokit: ReturnType<typeof github.getOctokit>,
  owner: string,
  repo: string,
  pullNumber: number,
  findings: Finding[],
  summary: string,
  commitSha: string
): Promise<void> {
  // Post inline review comments for findings with line numbers
  const comments = findings
    .filter((f) => f.line)
    .map((f) => ({
      path: f.file,
      line: f.line!,
      body: `🛡️ **${f.title}** (${f.severity})\n\n${f.message}${f.suggestion ? `\n\n💡 ${f.suggestion}` : ""}`,
    }));

  const event = findings.some((f) => f.severity === "critical")
    ? ("REQUEST_CHANGES" as const)
    : ("COMMENT" as const);

  await octokit.rest.pulls.createReview({
    owner,
    repo,
    pull_number: pullNumber,
    commit_id: commitSha,
    body: `## 🛡️ GuardBot Review\n\n${summary}\n\nFound **${findings.length}** issue(s).`,
    event,
    comments: comments.slice(0, 50), // GitHub limits to ~60 comments per review
  });
}

async function postAsCheckRun(
  octokit: ReturnType<typeof github.getOctokit>,
  owner: string,
  repo: string,
  sha: string,
  result: { findings: Finding[]; summary: string },
  failOn: string
): Promise<void> {
  const severityLevel = { critical: 3, warning: 2, info: 1 };
  const threshold = severityLevel[failOn as keyof typeof severityLevel] || 0;
  const hasFailing = result.findings.some(
    (f) => (severityLevel[f.severity] || 0) >= threshold
  );

  const annotations = result.findings
    .filter((f) => f.line)
    .slice(0, 50)
    .map((f) => ({
      path: f.file,
      start_line: f.line!,
      end_line: f.line!,
      annotation_level: (
        f.severity === "critical" ? "failure" : f.severity === "warning" ? "warning" : "notice"
      ) as "failure" | "warning" | "notice",
      title: f.title,
      message: f.message + (f.suggestion ? `\n\nSuggestion: ${f.suggestion}` : ""),
    }));

  await octokit.rest.checks.create({
    owner,
    repo,
    name: "GuardBot Code Review",
    head_sha: sha,
    status: "completed",
    conclusion: hasFailing && failOn !== "none" ? "failure" : "success",
    output: {
      title: `GuardBot: ${result.findings.length} finding(s)`,
      summary: result.summary,
      annotations,
    },
  });
}

run();
