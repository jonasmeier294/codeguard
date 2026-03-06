import { Octokit } from "@octokit/rest";
import { analyzeWithAI, resolveConfig } from "../src/lib/ai-analyzer";
import { formatReviewComment } from "../src/lib/analyzer";
import type { PullRequestFile } from "../src/lib/github";

// Minimal @actions/core replacement to avoid extra dependency
function getInput(name: string): string {
  const envName = `INPUT_${name.replace(/ /g, "_").toUpperCase()}`;
  return process.env[envName] ?? "";
}

function setFailed(message: string): void {
  console.error(`::error::${message}`);
  process.exitCode = 1;
}

function info(message: string): void {
  console.log(message);
}

async function run(): Promise<void> {
  try {
    const githubToken = getInput("github_token");
    const openaiKey = getInput("openai_api_key");
    const anthropicKey = getInput("anthropic_api_key");
    const model = getInput("model");

    if (!githubToken) {
      setFailed("github_token is required");
      return;
    }

    // Parse GitHub event
    const eventPath = process.env.GITHUB_EVENT_PATH;
    if (!eventPath) {
      setFailed("GITHUB_EVENT_PATH not set. Are you running inside a GitHub Action?");
      return;
    }

    const fs = await import("fs");
    const event = JSON.parse(fs.readFileSync(eventPath, "utf8"));

    const pullNumber = event.pull_request?.number;
    if (!pullNumber) {
      info("Not a pull request event, skipping.");
      return;
    }

    const owner = event.repository.owner.login;
    const repo = event.repository.name;

    info(`Reviewing PR #${pullNumber} on ${owner}/${repo}`);

    const octokit = new Octokit({ auth: githubToken });

    // Fetch PR files
    const { data: filesData } = await octokit.pulls.listFiles({
      owner,
      repo,
      pull_number: pullNumber,
      per_page: 100,
    });

    const files: PullRequestFile[] = filesData.map((f) => ({
      filename: f.filename,
      status: f.status,
      patch: f.patch,
      additions: f.additions,
      deletions: f.deletions,
    }));

    info(`Analyzing ${files.length} files...`);

    // Resolve AI config from action inputs
    const config = resolveConfig({
      OPENAI_API_KEY: openaiKey || undefined,
      ANTHROPIC_API_KEY: anthropicKey || undefined,
      GUARDBOT_MODEL: model || undefined,
    });

    const findings = await analyzeWithAI(files, config);

    info(`Found ${findings.length} issue(s)`);

    // Post review comment
    const comment = formatReviewComment(findings);
    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: pullNumber,
      body: comment,
    });

    info("Review comment posted successfully.");

    if (findings.some((f) => f.severity === "critical")) {
      setFailed(`Found ${findings.filter((f) => f.severity === "critical").length} critical issue(s)`);
    }
  } catch (error) {
    setFailed(`GuardBot Action failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

run();
