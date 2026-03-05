"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Github, Shield } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md border-border/50 bg-card/80">
        <CardHeader className="text-center">
          <Link href="/" className="mx-auto mb-4 flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">GuardBot</span>
          </Link>
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>
            Sign in with your GitHub account to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            className="w-full gap-2"
            size="lg"
            onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
          >
            <Github className="h-5 w-5" />
            Continue with GitHub
          </Button>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            By signing in, you agree to our{" "}
            <Link href="#" className="underline hover:text-foreground">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="#" className="underline hover:text-foreground">
              Privacy Policy
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
