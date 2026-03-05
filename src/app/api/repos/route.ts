import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOctokit } from "@/lib/github";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const repos = await prisma.repository.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(repos);
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user's GitHub token
  const account = await prisma.account.findFirst({
    where: { userId: session.user.id, provider: "github" },
  });

  if (!account?.access_token) {
    return NextResponse.json({ error: "No GitHub token" }, { status: 400 });
  }

  const octokit = getOctokit(account.access_token);

  // Fetch repos from GitHub
  const { data: githubRepos } = await octokit.repos.listForAuthenticatedUser({
    sort: "updated",
    per_page: 100,
  });

  // Sync repos
  const existingRepos = await prisma.repository.findMany({
    where: { userId: session.user.id },
  });

  const existingMap = new Map(existingRepos.map((r) => [r.githubId, r]));

  const repos = await Promise.all(
    githubRepos.map(async (ghRepo) => {
      const existing = existingMap.get(ghRepo.id);
      if (existing) {
        return prisma.repository.update({
          where: { id: existing.id },
          data: { name: ghRepo.name, fullName: ghRepo.full_name },
        });
      }
      return prisma.repository.create({
        data: {
          githubId: ghRepo.id,
          name: ghRepo.name,
          fullName: ghRepo.full_name,
          owner: ghRepo.owner.login,
          isActive: false,
          userId: session.user.id,
        },
      });
    })
  );

  return NextResponse.json(repos);
}
