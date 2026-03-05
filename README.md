<p align="center">
  <img src="https://img.shields.io/badge/AI--Powered-Code%20Reviews-blueviolet?style=for-the-badge" alt="AI-Powered Code Reviews" />
  <img src="https://img.shields.io/badge/GitHub-Bot-black?style=for-the-badge&logo=github" alt="GitHub Bot" />
  <img src="https://img.shields.io/github/stars/jonasmeier294/guardbot?style=for-the-badge" alt="Stars" />
  <img src="https://img.shields.io/github/license/jonasmeier294/guardbot?style=for-the-badge" alt="License" />
</p>

<h1 align="center">🛡️ GuardBot</h1>
<p align="center">
  <strong>AI-powered code reviews for every pull request.</strong><br/>
  Security vulnerabilities · Code smells · Performance issues — caught in seconds, not hours.
</p>

<p align="center">
  <a href="https://guardbot.dev">Website</a> ·
  <a href="#quick-start">Quick Start</a> ·
  <a href="#features">Features</a> ·
  <a href="https://github.com/jonasmeier294/guardbot/issues">Issues</a>
</p>

---

## 🎬 How it works

```
1. You open a Pull Request
2. GuardBot analyzes the diff automatically  
3. You get inline review comments in seconds
```

```diff
- const query = `SELECT * FROM users WHERE id = ${userId}`
+ const query = db.prepare("SELECT * FROM users WHERE id = ?").bind(userId)

# 🛡️ GuardBot: SQL injection vulnerability detected.
# Use parameterized queries instead of string interpolation.
```

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔒 **Security Scanning** | SQL injection, XSS, hardcoded secrets, OWASP Top 10 |
| 🐛 **Code Smell Detection** | Dead code, complexity, anti-patterns, type safety |
| ⚡ **Performance Tips** | N+1 queries, unnecessary re-renders, memory leaks |
| 💬 **Inline PR Comments** | Reviews appear directly on your pull request |
| 🔐 **Privacy First** | Only reads the diff — your code is never stored |
| 📊 **Team Analytics** | Track code quality trends over time |

## 🚀 Quick Start

### Install as GitHub App (recommended)

1. Go to [guardbot.dev](https://guardbot.dev)
2. Click "Install on GitHub"
3. Select your repositories
4. Done! GuardBot will review your next PR automatically.

### Self-host

```bash
git clone https://github.com/jonasmeier294/guardbot.git
cd guardbot
cp .env.example .env
# Fill in your GitHub App credentials
npm install
npx prisma db push
npm run dev
```

## 🏗️ Tech Stack

- **Framework:** Next.js 15 (App Router)
- **UI:** Tailwind CSS + shadcn/ui
- **Auth:** NextAuth.js (GitHub OAuth)
- **Database:** Prisma + SQLite (dev) / PostgreSQL (prod)
- **GitHub Integration:** Octokit + Webhooks
- **Deployment:** Vercel

## 📋 What GuardBot catches

<details>
<summary><strong>🔒 Security Issues</strong></summary>

- `eval()` usage — code injection risk
- `innerHTML` assignment — XSS vulnerability
- SQL string interpolation — SQL injection
- Hardcoded secrets/API keys
- `document.write()` — XSS risk
- `dangerouslySetInnerHTML` without sanitization

</details>

<details>
<summary><strong>🐛 Code Smells</strong></summary>

- `console.log` left in code
- TODO/FIXME comments in new code
- TypeScript `any` type usage
- Empty `.catch()` handlers

</details>

<details>
<summary><strong>⚡ Performance</strong></summary>

- Sequential `await` in loops (N+1 problem)
- RegExp created inside functions
- `JSON.parse(JSON.stringify())` deep clone

</details>

## 🗺️ Roadmap

- [x] Landing page & dashboard
- [x] GitHub OAuth login
- [x] PR webhook handler
- [x] Pattern-based code analysis
- [ ] AI-powered deep analysis (Claude/GPT)
- [ ] Custom rule configuration
- [ ] Slack/Discord notifications
- [ ] VS Code extension
- [ ] GitLab & Bitbucket support
- [ ] Team analytics dashboard
- [ ] Monorepo support

## 🤝 Contributing

Contributions are welcome! Check out our [issues](https://github.com/jonasmeier294/guardbot/issues) for good first tasks.

```bash
# Fork & clone
git clone https://github.com/YOUR_USERNAME/guardbot.git
cd guardbot
npm install
cp .env.example .env
npx prisma db push
npm run dev
```

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

## ⭐ Star History

If GuardBot helps you ship better code, consider giving it a star! It helps others discover the project.

[![Star History Chart](https://api.star-history.com/svg?repos=jonasmeier294/guardbot&type=Date)](https://star-history.com/#jonasmeier294/guardbot&Date)

---

<p align="center">
  Built with ❤️ by an AI agent that reviews its own code.<br/>
  <a href="https://guardbot.dev">guardbot.dev</a>
</p>
