import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getReviewLimit } from "@/lib/plans";
import { GitFork, History, Shield, AlertTriangle } from "lucide-react";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const [repoCount, reviewCount, recentReviews, user] = await Promise.all([
    prisma.repository.count({
      where: { userId: session.user.id, isActive: true },
    }),
    prisma.review.count({
      where: { userId: session.user.id },
    }),
    prisma.review.findMany({
      where: { userId: session.user.id },
      include: { repository: { select: { fullName: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { plan: true, reviewsUsed: true },
    }),
  ]);

  const limit = getReviewLimit(user?.plan ?? "free");
  const usagePercent =
    limit === Infinity ? 0 : ((user?.reviewsUsed ?? 0) / limit) * 100;

  return (
    <div>
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="mt-1 text-muted-foreground">
        Overview of your CodeGuard activity.
      </p>

      <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Repos
            </CardTitle>
            <GitFork className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{repoCount}</div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Reviews
            </CardTitle>
            <History className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reviewCount}</div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Usage
            </CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {user?.reviewsUsed ?? 0}
              {limit !== Infinity && (
                <span className="text-sm font-normal text-muted-foreground">
                  {" "}
                  / {limit}
                </span>
              )}
            </div>
            {limit !== Infinity && (
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min(usagePercent, 100)}%` }}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Plan
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {user?.plan ?? "free"}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold">Recent Reviews</h2>
        <div className="mt-4 space-y-3">
          {recentReviews.length === 0 ? (
            <Card className="border-border/50 bg-card/50">
              <CardContent className="py-8 text-center text-muted-foreground">
                No reviews yet. Activate a repository and open a pull request to
                get started.
              </CardContent>
            </Card>
          ) : (
            recentReviews.map((review) => {
              const findings = JSON.parse(review.findings);
              return (
                <Card key={review.id} className="border-border/50 bg-card/50">
                  <CardContent className="flex items-center justify-between py-4">
                    <div>
                      <p className="font-medium">
                        {review.repository.fullName} #{review.prNumber}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {review.prTitle}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={
                          review.status === "completed"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {review.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {findings.length} issue
                        {findings.length !== 1 ? "s" : ""}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
