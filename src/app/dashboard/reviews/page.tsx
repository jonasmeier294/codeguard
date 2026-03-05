"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, Shield, Bug, Zap } from "lucide-react";

interface Review {
  id: string;
  prNumber: number;
  prTitle: string;
  status: string;
  findings: string;
  summary: string | null;
  createdAt: string;
  repository: { fullName: string };
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReviews() {
      const res = await fetch("/api/reviews");
      if (res.ok) {
        setReviews(await res.json());
      }
      setLoading(false);
    }
    fetchReviews();
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold">Review History</h1>
      <p className="mt-1 text-muted-foreground">
        All code reviews performed by GuardBot.
      </p>

      <div className="mt-8 space-y-3">
        {loading ? (
          <Card className="border-border/50 bg-card/50">
            <CardContent className="py-8 text-center text-muted-foreground">
              Loading reviews...
            </CardContent>
          </Card>
        ) : reviews.length === 0 ? (
          <Card className="border-border/50 bg-card/50">
            <CardContent className="py-8 text-center">
              <History className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground">
                No reviews yet. Activate a repository and open a pull request.
              </p>
            </CardContent>
          </Card>
        ) : (
          reviews.map((review) => {
            const findings = JSON.parse(review.findings);
            const securityCount = findings.filter(
              (f: { category: string }) => f.category === "security"
            ).length;
            const smellCount = findings.filter(
              (f: { category: string }) => f.category === "code-smell"
            ).length;
            const perfCount = findings.filter(
              (f: { category: string }) => f.category === "performance"
            ).length;

            return (
              <Card key={review.id} className="border-border/50 bg-card/50">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">
                        {review.repository.fullName} #{review.prNumber}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {review.prTitle}
                      </p>
                      {review.summary && (
                        <p className="mt-1 text-sm">{review.summary}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge
                        variant={
                          review.status === "completed"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {review.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(review.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  {findings.length > 0 && (
                    <div className="mt-3 flex gap-4">
                      {securityCount > 0 && (
                        <div className="flex items-center gap-1 text-xs text-red-400">
                          <Shield className="h-3 w-3" />
                          {securityCount} security
                        </div>
                      )}
                      {smellCount > 0 && (
                        <div className="flex items-center gap-1 text-xs text-yellow-400">
                          <Bug className="h-3 w-3" />
                          {smellCount} code smell
                        </div>
                      )}
                      {perfCount > 0 && (
                        <div className="flex items-center gap-1 text-xs text-blue-400">
                          <Zap className="h-3 w-3" />
                          {perfCount} performance
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
