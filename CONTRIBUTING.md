# Contributing to SeedVault 🌱

Thank you for your interest in contributing to SeedVault! This is an open source project built for home gardeners and seed savers. Every contribution helps make it better for everyone.

## Ways to Contribute

- **Report bugs** — open a Bug Report issue
- **Suggest features** — open a Feature Request issue
- **Improve documentation** — fix typos, add examples, improve install guides
- **Add companion planting data** — expand the built-in companion database
- **Submit code** — fix bugs or implement features

## Getting Started

### Prerequisites
- Docker and Docker Compose
- Node.js 20+ (for local development without Docker)
- Git

### Local Development Setup

```bash
git clone https://github.com/Duhato/seedvault.git
cd seedvault/app
docker compose up -d
```

The app will be available at `https://localhost:8765`.

### Making Changes

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Test thoroughly — check all affected pages and features
5. Commit with a clear message: `git commit -m "Add X feature to Y page"`
6. Push to your fork: `git push origin feature/your-feature-name`
7. Open a Pull Request

## Code Style

- Vanilla JavaScript — no frameworks on the frontend
- Keep functions focused and small
- Always check syntax before committing:
```bash
  docker run --rm -v $(pwd)/public:/pub node:20-alpine node --check /pub/app.js
```
- Test on both desktop and mobile screen sizes

## Adding Companion Planting Data

The companion data lives in `public/app.js` in the `BUILTIN_COMPANIONS` object. Each entry is keyed by species code and follows this format:

```javascript
'CODE': {
  good: [
    { name: 'Plant Name', icon: '🌿', reason: 'Why it helps', how: 'How to plant them together', distance: '12 inches apart', timing: 'Plant at same time' }
  ],
  bad: [
    { name: 'Plant Name', icon: '🌿', reason: 'Why to avoid', how: 'How far to keep them', distance: 'Minimum 3 feet', timing: 'N/A' }
  ],
  tips: 'General growing tip for this crop.'
}
```

## Reporting Bugs

Please include:
- SeedVault version (Settings → About)
- Steps to reproduce
- What you expected vs what happened
- Browser and device
- Any error messages from the browser console (F12)
- Docker logs: `docker compose logs app --tail 50`

## Feature Requests

Open a Feature Request issue. Please describe:
- What problem it solves
- Where in the app it would live
- Any examples or mockups

## Pull Request Guidelines

- Keep PRs focused — one feature or fix per PR
- Update CHANGELOG.md with your changes under a new version
- Update README.md if you add new features
- Make sure existing features still work after your changes

## Questions?

Open a Question issue and we will help you out.

## License

By contributing you agree that your contributions will be licensed under the AGPL-3.0 license.
