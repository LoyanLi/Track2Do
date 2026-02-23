# Contributing to Track2Do

## 1. Development Environment

- Node.js 20+
- Python 3.10+
- macOS (required for Electron packaging)

Install dependencies:

```bash
npm install
cd backend && python3 -m pip install -r requirements.txt
```

## 2. Branching and Commits

- Main branch: `main`
- Feature branch naming: `feat/<short-name>`, `fix/<short-name>`, `chore/<short-name>`
- Recommended commit format: `type(scope): summary`
  - Example: `feat(export): add snapshot progress polling`

## 3. Development Workflow

1. Create a new branch from `main`.
2. Implement the change and run local verification.
3. Pass the build checks:
   - `npm run build:main`
   - `npm run build:renderer`
4. Open a PR with change notes and test results.

## 4. PR Requirements

Every PR description must include:

- Background and goal
- Exact changes made
- Verification steps
- Risk and rollback plan (if applicable)

## 5. Coding Rules

- Do not place business logic inside UI components; prefer `hooks` or `services`.
- Route API access through `src/services/api/`.
- Do not commit build artifacts or local dependency directories.
- Do not commit secrets, account credentials, or real `.env` values.
