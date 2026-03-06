<p align="center">
  <img src="https://img.shields.io/badge/AI--Powered-Code%20Reviews-blueviolet?style=for-the-badge" alt="AI-Powered Code Reviews" />
  <img src="https://img.shields.io/badge/GitHub-Action-black?style=for-the-badge&logo=github" alt="GitHub Action" />
  <img src="https://img.shields.io/github/stars/jonasmeier294/guardbot?style=for-the-badge" alt="Stars" />
  <img src="https://img.shields.io/github/license/jonasmeier294/guardbot?style=for-the-badge" alt="License" />
</p>

<h1 align="center">🛡️ GuardBot</h1>
<p align="center">
  <strong>AI-powered code reviews for every pull request.</strong><br/>
  Security vulnerabilities · Bugs · Performance issues — caught in seconds, not hours.
</p>

<p align="center">
  <a href="https://guardbot.dev">Website</a> ·
  <a href="#-quick-start-30-seconds">Quick Start</a> ·
  <a href="#-features">Features</a> ·
  <a href="#-cli">CLI</a> ·
  <a href="https://github.com/jonasmeier294/guardbot/issues">Issues</a>
</p>

---

## ⚡ Quick Start (30 seconds)

Add this to `.github/workflows/guardbot.yml` in your repo:

```yaml
name: GuardBot Code Review
on:
  pull_request:
    types: [opened, synchronize]

permissions:
  contents: read
  pull-requests: write

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: jonasmeier294/guardbot@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          openai_key: ${{ secrets.OPENAI_KEY }}  # Optional — works without it too
```

That's it. Open a PR and GuardBot reviews it automatically.

> **No API key?** GuardBot works out of the box with built-in pattern matching. Add an OpenAI or Anthropic key for deeper AI-powered analysis.

---

## 🎬 How it works

```
1. You open a Pull Request
2. GuardBot analyzes every changed file
3. You get a detailed review comment in seconds
```

```diff
- const query = `SELECT * FROM users WHERE id = ${userId}`
+ const query = db.prepare("SELECT * FROM users WHERE id = ?").bind(userId)

# 🛡️ GuardBot: SQL injection vulnerability detected.
# Use parameterized queries instead of string interpolation.
```

<!-- TODO: Add demo GIF here -->

---

## ✨ Features

- 🔒 **Security Scanning** — SQL injection, XSS, hardcoded secrets, OWASP Top 10
- 🐛 **Bug Detection** — Logic errors, null risks, race conditions, error handling gaps
- ⚡ **Performance Tips** — N+1 queries, memory leaks, unnecessary re-renders
- 👃 **Code Smells** — Dead code, complexity, anti-patterns, type safety
- 💡 **Smart Suggestions** — Better approaches, missing edge cases, refactoring tips
- 🔐 **Privacy First** — Only reads the diff. Your code is never stored. BYOK (Bring Your Own Key).
- ⚙️ **Configurable** — `.guardbot.yml` for per-repo settings, custom rules (coming soon)

### Two Modes

### Option 1: GitHub Action (recommended)

Add this to `.github/workflows/guardbot.yml`:

```yaml
name: GuardBot Review
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: jonasmeier294/guardbot@main
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          # or: openai_api_key: ${{ secrets.OPENAI_API_KEY }}
```

That's it! GuardBot will review every PR automatically.

### Option 2: CLI

```bash
# Review a GitHub PR
export ANTHROPIC_API_KEY=sk-ant-...  # or OPENAI_API_KEY
npx guardbot review https://github.com/owner/repo/pull/123

# Review a local diff
git diff main > changes.diff
npx guardbot review --diff changes.diff
```

### Option 3: Install as GitHub App

Both modes run together when an API key is provided — patterns catch the obvious stuff, AI catches the subtle stuff.

### Option 4: Self-host

```bash
git clone https://github.com/jonasmeier294/guardbot.git
cd guardbot
cp .env.example .env
# Fill in your GitHub App credentials + ANTHROPIC_API_KEY or OPENAI_API_KEY
npm install
npx prisma db push
npm run dev
```

---

- **Framework:** Next.js 15 (App Router)
- **UI:** Tailwind CSS + shadcn/ui
- **Auth:** NextAuth.js (GitHub OAuth)
- **Database:** Prisma + SQLite (dev) / PostgreSQL (prod)
- **GitHub Integration:** Octokit + Webhooks
- **AI:** OpenAI GPT-4o / Anthropic Claude (BYOK)
- **Deployment:** Vercel

## 📋 What GuardBot catches

<details>
<summary><strong>🔒 Security (critical)</strong></summary>

- `eval()` — code injection
- `innerHTML` assignment — XSS
- SQL string interpolation — SQL injection
- Hardcoded secrets / API keys
- `document.write()` — XSS risk
- `dangerouslySetInnerHTML` without sanitization
- *With AI:* Auth bypass, SSRF, path traversal, insecure crypto, and more

</details>

<details>
<summary><strong>🐛 Bugs (warning)</strong></summary>

- Empty `.catch()` handlers — swallowed errors
- Loose equality (`==`) — type coercion bugs
- *With AI:* Null pointer risks, race conditions, logic errors, off-by-one

</details>

<details>
<summary><strong>⚡ Performance (info)</strong></summary>

- Sequential `await` in loops — N+1 problem
- `JSON.parse(JSON.stringify())` — slow deep clone
- Runtime RegExp compilation in hot paths
- *With AI:* Unnecessary re-renders, memory leaks, inefficient algorithms

</details>

<details>
<summary><strong>👃 Code Smells (info)</strong></summary>

- `console.log` left in code
- TODO/FIXME in new code
- TypeScript `any` type
- *With AI:* Complex functions, poor naming, missing docs, anti-patterns

</details>

---

## 🏗️ Architecture

```
guardbot/
├── action/          # GitHub Action (Node.js)
│   └── src/
│       ├── index.ts        # Action entry point
│       └── ai-analyzer.ts  # AI + pattern analysis engine
├── cli/             # CLI tool
│   └── guardbot.ts  # npx guardbot
├── src/             # Web dashboard (Next.js)
│   ├── app/         # Pages & API routes
│   ├── components/  # UI components
│   └── lib/         # Core libraries
├── action.yml       # GitHub Action manifest
├── .guardbot.yml    # Example config
└── README.md
```

## 🗺️ Roadmap

- [x] Pattern-based code analysis
- [x] AI-powered deep analysis (Claude/GPT)
- [x] GitHub Action
- [x] CLI tool (`npx guardbot review`)
- [ ] Custom rule configuration
- [ ] Slack/Discord notifications
- [ ] VS Code extension
- [ ] GitLab & Bitbucket support
- [ ] Slack/Discord notifications
- [ ] Rule marketplace

## 🤝 Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

```bash
git clone https://github.com/jonasmeier294/guardbot.git
cd guardbot
npm install
cp .env.example .env
npx prisma db push
npm run dev
```

Good first issues are tagged with [`good first issue`](https://github.com/jonasmeier294/guardbot/labels/good%20first%20issue).

## 📄 License

[MIT](LICENSE) — use it however you want.

## ⭐ Support

If GuardBot saves you time, give it a star! It helps others discover the project.

[![Star History Chart](https://api.star-history.com/svg?repos=jonasmeier294/guardbot&type=Date)](https://star-history.com/#jonasmeier294/guardbot&Date)

---

<p align="center">
  <strong>Every PR deserves a second pair of eyes.</strong><br/>
  <a href="https://guardbot.dev">guardbot.dev</a>
</p>
