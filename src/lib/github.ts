import { Octokit } from "@octokit/rest";

export function getOctokit(token: string) {
  return new Octokit({ auth: token });
}

export interface PullRequestFile {
  filename: string;
  status: string;
  patch?: string;
  additions: number;
  deletions: number;
}

export async function getPullRequestDiff(
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number
): Promise<PullRequestFile[]> {
  const { data } = await octokit.pulls.listFiles({
    owner,
    repo,
    pull_number: pullNumber,
    per_page: 100,
  });

  return data.map((file) => ({
    filename: file.filename,
    status: file.status,
    patch: file.patch,
    additions: file.additions,
    deletions: file.deletions,
  }));
}

export async function postReviewComment(
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number,
  body: string
) {
  await octokit.issues.createComment({
    owner,
    repo,
    issue_number: pullNumber,
    body,
  });
}
