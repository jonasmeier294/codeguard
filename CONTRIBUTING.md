# Contributing to GuardBot

Thanks for your interest in contributing! 🛡️

## Quick Start

```bash
git clone https://github.com/jonasmeier294/guardbot.git
cd guardbot
npm install
cp .env.example .env
npx prisma db push
npm run dev
```

## How to Contribute

### Report Bugs
Open an [issue](https://github.com/jonasmeier294/guardbot/issues/new?template=bug_report.md) with steps to reproduce.

### Suggest Features
Open an [issue](https://github.com/jonasmeier294/guardbot/issues/new?template=feature_request.md) describing your idea.

### Add Review Rules
The easiest way to contribute! Add new patterns to `action/src/ai-analyzer.ts`:

```typescript
{
  pattern: /your-regex-here/,
  title: "Short descriptive title",
  message: "Explain what's wrong and why.",
  suggestion: "How to fix it.",
  severity: "critical" | "warning" | "info",
  category: "security" | "bug" | "code-smell" | "performance",
}
```

### Submit PRs
1. Fork the repo
2. Create a branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Test locally (`npm run dev`)
5. Submit a PR

## Code Style
- TypeScript everywhere
- Meaningful variable names
- Comments for complex logic only

## Questions?
Open a [Discussion](https://github.com/jonasmeier294/guardbot/discussions) or ping us in issues.
