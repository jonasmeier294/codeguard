import { NextRequest, NextResponse } from "next/server";
import { Webhooks } from "@octokit/webhooks";
import { prisma } from "@/lib/prisma";
import { getOctokit, getPullRequestDiff, postReviewComment } from "@/lib/github";
import { formatReviewComment } from "@/lib/analyzer";
import { analyzeWithAI } from "@/lib/ai-analyzer";
import { getReviewLimit } from "@/lib/plans";

const webhooks = new Webhooks({
  secret: process.env.GITHUB_WEBHOOK_SECRET || "development",
});

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-hub-signature-256") ?? "";

  // Verify webhook signature in production
  if (process.env.GITHUB_WEBHOOK_SECRET) {
    try {
      await webhooks.verify(body, signature);
    } catch {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  const event = req.headers.get("x-github-event");
  const payload = JSON.parse(body);

  if (event === "pull_request" && ["opened", "synchronize"].includes(payload.action)) {
    await handlePullRequest(payload);
  }

  return NextResponse.json({ ok: true });
}

async function handlePullRequest(payload: {
  action: string;
  number: number;
  pull_request: {
    title: string;
    number: number;
    user: { login: string };
  };
  repository: {
    id: number;
    name: string;
    full_name: string;
    owner: { login: string };
  };
  installation?: { id: number };
}) {
  const { repository, pull_request } = payload;

  // Find the repo in our database
  const repo = await prisma.repository.findUnique({
    where: { githubId: repository.id },
    include: { user: { include: { accounts: true } } },
  });

  if (!repo || !repo.isActive) return;

  // Check usage limit
  const user = repo.user;
  const limit = getReviewLimit(user.plan);
  if (user.reviewsUsed >= limit) return;

  // Get the access token from the user's GitHub account
  const githubAccount = user.accounts.find((a) => a.provider === "github");
  if (!githubAccount?.access_token) return;

  const octokit = getOctokit(githubAccount.access_token);

  try {
    // Fetch the PR diff
    const files = await getPullRequestDiff(
      octokit,
      repository.owner.login,
      repository.name,
      pull_request.number
    );

    // Analyze the code (AI-powered with regex fallback)
    const findings = await analyzeWithAI(files);

    // Format and post the review
    const comment = formatReviewComment(findings);
    await postReviewComment(
      octokit,
      repository.owner.login,
      repository.name,
      pull_request.number,
      comment
    );

    // Save the review
    await prisma.review.create({
      data: {
        prNumber: pull_request.number,
        prTitle: pull_request.title,
        status: "completed",
        findings: JSON.stringify(findings),
        summary: `Found ${findings.length} issue(s)`,
        repositoryId: repo.id,
        userId: user.id,
      },
    });

    // Increment usage counter
    await prisma.user.update({
      where: { id: user.id },
      data: { reviewsUsed: { increment: 1 } },
    });
  } catch (error) {
    console.error("Error processing PR review:", error);

    await prisma.review.create({
      data: {
        prNumber: pull_request.number,
        prTitle: pull_request.title,
        status: "error",
        findings: "[]",
        summary: "Review failed due to an internal error",
        repositoryId: repo.id,
        userId: user.id,
      },
    });
  }
}
