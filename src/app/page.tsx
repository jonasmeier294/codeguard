import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Bug,
  Zap,
  GitPullRequest,
  Github,
  Check,
  ArrowRight,
  Code2,
  Lock,
  BarChart3,
} from "lucide-react";

function Navbar() {
  return (
    <nav className="fixed top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <Shield className="h-7 w-7 text-primary" />
          <span className="text-xl font-bold">CodeGuard</span>
        </Link>
        <div className="hidden items-center gap-8 md:flex">
          <Link
            href="#features"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Features
          </Link>
          <Link
            href="#pricing"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Pricing
          </Link>
          <Link
            href="#how-it-works"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            How it Works
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Sign In
            </Button>
          </Link>
          <Link href="/login">
            <Button size="sm">
              <Github className="mr-2 h-4 w-4" />
              Install on GitHub
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center px-6 pt-16">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--color-primary)_0%,_transparent_50%)] opacity-15" />
      <Badge variant="secondary" className="mb-6">
        <Zap className="mr-1 h-3 w-3" /> Now in Public Beta
      </Badge>
      <h1 className="max-w-4xl text-center text-5xl font-bold leading-tight tracking-tight md:text-7xl">
        AI-Powered Code Reviews{" "}
        <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          in Seconds
        </span>
      </h1>
      <p className="mt-6 max-w-2xl text-center text-lg text-muted-foreground md:text-xl">
        CodeGuard automatically reviews every pull request for security
        vulnerabilities, code smells, and performance issues. Get actionable
        feedback before you merge.
      </p>
      <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
        <Link href="/login">
          <Button size="lg" className="gap-2">
            <Github className="h-5 w-5" />
            Install on GitHub
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
        <Link href="#how-it-works">
          <Button variant="outline" size="lg">
            See How it Works
          </Button>
        </Link>
      </div>
      <div className="mt-16 w-full max-w-4xl rounded-xl border border-border/50 bg-card/50 p-1 backdrop-blur-sm">
        <div className="rounded-lg bg-muted/50 p-4 font-mono text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="flex gap-1.5">
              <div className="h-3 w-3 rounded-full bg-red-500/70" />
              <div className="h-3 w-3 rounded-full bg-yellow-500/70" />
              <div className="h-3 w-3 rounded-full bg-green-500/70" />
            </div>
            <span className="ml-2">codeguard-review.ts</span>
          </div>
          <div className="mt-4 space-y-1">
            <p>
              <span className="text-red-400">-</span>{" "}
              <span className="text-red-400/70">
                const query = `SELECT * FROM users WHERE id = {"${`$\{userId\}`}"}`
              </span>
            </p>
            <p>
              <span className="text-green-400">+</span>{" "}
              <span className="text-green-400/70">
                const query = db.prepare(&quot;SELECT * FROM users WHERE id =
                ?&quot;).bind(userId)
              </span>
            </p>
            <p className="mt-3 text-yellow-400">
              {"// "}
              <Shield className="inline h-3 w-3" /> CodeGuard: SQL injection
              vulnerability detected. Use parameterized queries instead.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

const features = [
  {
    icon: Shield,
    title: "Security Scanning",
    description:
      "Automatically detect SQL injections, XSS vulnerabilities, hardcoded secrets, and other OWASP Top 10 issues in every PR.",
  },
  {
    icon: Bug,
    title: "Code Smell Detection",
    description:
      "Identify duplicated code, overly complex functions, unused variables, and anti-patterns that harm maintainability.",
  },
  {
    icon: Zap,
    title: "Performance Tips",
    description:
      "Get suggestions for N+1 queries, unnecessary re-renders, inefficient algorithms, and memory leaks.",
  },
  {
    icon: GitPullRequest,
    title: "PR Integration",
    description:
      "Reviews appear as inline comments directly on your pull request. No context switching needed.",
  },
  {
    icon: Lock,
    title: "Privacy First",
    description:
      "Your code is analyzed in real-time and never stored. We only access the diff, not your entire codebase.",
  },
  {
    icon: BarChart3,
    title: "Team Analytics",
    description:
      "Track code quality trends, most common issues, and improvement over time across your team.",
  },
];

function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-24">
      <div className="text-center">
        <Badge variant="secondary" className="mb-4">
          Features
        </Badge>
        <h2 className="text-3xl font-bold md:text-4xl">
          Everything You Need for Better Code
        </h2>
        <p className="mt-4 text-muted-foreground">
          CodeGuard catches what humans miss, in milliseconds.
        </p>
      </div>
      <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <Card
            key={feature.title}
            className="border-border/50 bg-card/50 transition-colors hover:border-primary/30"
          >
            <CardHeader>
              <feature.icon className="mb-2 h-10 w-10 text-primary" />
              <CardTitle className="text-lg">{feature.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {feature.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      step: "01",
      title: "Install the GitHub App",
      description:
        "One click to add CodeGuard to your repositories. No configuration required.",
    },
    {
      step: "02",
      title: "Open a Pull Request",
      description:
        "Push your code and create a PR as you normally would. CodeGuard activates automatically.",
    },
    {
      step: "03",
      title: "Get Instant Review",
      description:
        "Receive detailed inline comments with security findings, code smells, and performance suggestions.",
    },
  ];

  return (
    <section id="how-it-works" className="border-y border-border/50 bg-card/30 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center">
          <Badge variant="secondary" className="mb-4">
            How it Works
          </Badge>
          <h2 className="text-3xl font-bold md:text-4xl">
            Up and Running in 60 Seconds
          </h2>
        </div>
        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {steps.map((step) => (
            <div key={step.step} className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
                {step.step}
              </div>
              <h3 className="text-xl font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const plans = [
  {
    name: "Free",
    price: "0",
    description: "For individual developers getting started.",
    features: [
      "5 reviews per month",
      "Public repositories",
      "Basic security scanning",
      "Community support",
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Pro",
    price: "19",
    description: "For professional developers who ship fast.",
    features: [
      "Unlimited reviews",
      "Public & private repos",
      "Advanced security scanning",
      "Performance analysis",
      "Priority support",
      "Custom rules",
    ],
    cta: "Start Pro Trial",
    popular: true,
  },
  {
    name: "Team",
    price: "49",
    description: "For teams that care about code quality.",
    features: [
      "Everything in Pro",
      "Up to 25 team members",
      "Team analytics dashboard",
      "Custom review policies",
      "Slack integration",
      "Dedicated support",
    ],
    cta: "Start Team Trial",
    popular: false,
  },
];

function Pricing() {
  return (
    <section id="pricing" className="mx-auto max-w-6xl px-6 py-24">
      <div className="text-center">
        <Badge variant="secondary" className="mb-4">
          Pricing
        </Badge>
        <h2 className="text-3xl font-bold md:text-4xl">
          Simple, Transparent Pricing
        </h2>
        <p className="mt-4 text-muted-foreground">
          Start free. Upgrade when you need more.
        </p>
      </div>
      <div className="mt-16 grid gap-8 md:grid-cols-3">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={`relative flex flex-col border-border/50 bg-card/50 ${
              plan.popular ? "border-primary/50 shadow-lg shadow-primary/10" : ""
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge>Most Popular</Badge>
              </div>
            )}
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">&euro;{plan.price}</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Link href="/login" className="w-full">
                <Button
                  className="w-full"
                  variant={plan.popular ? "default" : "outline"}
                >
                  {plan.cta}
                </Button>
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="border-y border-border/50 bg-card/30 py-24">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <Code2 className="mx-auto mb-6 h-12 w-12 text-primary" />
        <h2 className="text-3xl font-bold md:text-4xl">
          Ship Better Code, Faster
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Join thousands of developers who trust CodeGuard to catch bugs before
          they hit production.
        </p>
        <div className="mt-8">
          <Link href="/login">
            <Button size="lg" className="gap-2">
              <Github className="h-5 w-5" />
              Install on GitHub
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/50 py-12">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <span className="text-lg font-bold">CodeGuard</span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              AI-powered code reviews for every pull request.
            </p>
          </div>
          <div>
            <h4 className="font-semibold">Product</h4>
            <ul className="mt-3 space-y-2">
              <li>
                <Link
                  href="#features"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link
                  href="#pricing"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Pricing
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Changelog
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold">Resources</h4>
            <ul className="mt-3 space-y-2">
              <li>
                <Link
                  href="#"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Documentation
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  API Reference
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Blog
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold">Legal</h4>
            <ul className="mt-3 space-y-2">
              <li>
                <Link
                  href="#"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Imprint
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-12 border-t border-border/50 pt-8 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} CodeGuard. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Pricing />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
