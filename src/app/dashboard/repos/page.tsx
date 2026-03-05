"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, GitFork } from "lucide-react";

interface Repository {
  id: string;
  githubId: number;
  name: string;
  fullName: string;
  owner: string;
  isActive: boolean;
}

export default function ReposPage() {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchRepos();
  }, []);

  async function fetchRepos() {
    setLoading(true);
    const res = await fetch("/api/repos");
    if (res.ok) {
      setRepos(await res.json());
    }
    setLoading(false);
  }

  async function syncRepos() {
    setSyncing(true);
    const res = await fetch("/api/repos", { method: "POST" });
    if (res.ok) {
      setRepos(await res.json());
    }
    setSyncing(false);
  }

  async function toggleRepo(id: string) {
    const res = await fetch(`/api/repos/${id}/toggle`, { method: "PATCH" });
    if (res.ok) {
      const updated = await res.json();
      setRepos((prev) =>
        prev.map((r) => (r.id === id ? { ...r, isActive: updated.isActive } : r))
      );
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Repositories</h1>
          <p className="mt-1 text-muted-foreground">
            Manage which repositories CodeGuard reviews.
          </p>
        </div>
        <Button onClick={syncRepos} disabled={syncing} variant="outline" className="gap-2">
          <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing..." : "Sync from GitHub"}
        </Button>
      </div>

      <div className="mt-8 space-y-3">
        {loading ? (
          <Card className="border-border/50 bg-card/50">
            <CardContent className="py-8 text-center text-muted-foreground">
              Loading repositories...
            </CardContent>
          </Card>
        ) : repos.length === 0 ? (
          <Card className="border-border/50 bg-card/50">
            <CardContent className="py-8 text-center">
              <GitFork className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground">
                No repositories found. Click &quot;Sync from GitHub&quot; to
                import your repos.
              </p>
            </CardContent>
          </Card>
        ) : (
          repos.map((repo) => (
            <Card key={repo.id} className="border-border/50 bg-card/50">
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <GitFork className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{repo.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      {repo.owner}/{repo.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={repo.isActive ? "default" : "secondary"}>
                    {repo.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <Switch
                    checked={repo.isActive}
                    onCheckedChange={() => toggleRepo(repo.id)}
                  />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
