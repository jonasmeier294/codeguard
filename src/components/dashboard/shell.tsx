"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Shield,
  LayoutDashboard,
  GitFork,
  History,
  LogOut,
  User,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/repos", label: "Repositories", icon: GitFork },
  { href: "/dashboard/reviews", label: "Reviews", icon: History },
];

interface DashboardShellProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    plan?: string;
  };
  children: React.ReactNode;
}

export function DashboardShell({ user, children }: DashboardShellProps) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-border/50 bg-card/50">
        <div className="flex h-16 items-center gap-2 border-b border-border/50 px-6">
          <Shield className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold">CodeGuard</span>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border/50 p-4">
          <div className="flex items-center gap-3">
            {user.image ? (
              <Image
                src={user.image}
                alt={user.name ?? "Avatar"}
                width={32}
                height={32}
                className="h-8 w-8 rounded-full"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
                <User className="h-4 w-4" />
              </div>
            )}
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground capitalize">
                {user.plan ?? "free"} plan
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => signOut({ callbackUrl: "/" })}
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 flex-1 p-8">{children}</main>
    </div>
  );
}
