# CodeGuard

AI-powered code review bot for GitHub. Automatically scans every pull request for security vulnerabilities, code smells, and performance issues.

## Tech Stack

- **Next.js 15** (App Router)
- **Tailwind CSS v4** + shadcn/ui components
- **Prisma** + SQLite (dev) / PostgreSQL (prod)
- **NextAuth.js** for GitHub OAuth
- **Octokit** for GitHub API

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Fill in your GitHub App credentials in .env

# Push database schema
npx prisma db push

# Start development server
npm run dev
```

## GitHub App Setup

1. Create a GitHub App at https://github.com/settings/apps
2. Set the webhook URL to `https://your-domain.com/api/webhook/github`
3. Enable permissions: Pull Requests (read & write), Repository contents (read)
4. Subscribe to events: Pull request
5. Generate a private key and add it to `.env`
6. Create an OAuth App for login and add client ID/secret to `.env`

## Project Structure

```
src/
  app/
    page.tsx                    # Landing page
    login/page.tsx              # GitHub OAuth login
    dashboard/
      page.tsx                  # Dashboard overview
      repos/page.tsx            # Repository management
      reviews/page.tsx          # Review history
    api/
      auth/[...nextauth]/       # NextAuth handler
      webhook/github/           # GitHub webhook handler
      repos/                    # Repository CRUD API
      reviews/                  # Review history API
  lib/
    auth.ts                     # NextAuth configuration
    prisma.ts                   # Prisma client singleton
    github.ts                   # GitHub API helpers
    analyzer.ts                 # Code analysis engine
    plans.ts                    # Pricing plan definitions
  components/
    ui/                         # shadcn/ui components
    dashboard/                  # Dashboard shell
```
