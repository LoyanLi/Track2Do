# Development Guide

## 1. Run Locally

```bash
npm run dev
```

This command starts both:

- Electron main process build and runtime
- Vite renderer development server

## 2. Directory Responsibilities

- `src/components`: Pure UI components.
- `src/hooks`: Page state and interaction logic.
- `src/services/api`: API access and transport layer.
- `electron`: Main-process capabilities and IPC registration.
- `backend`: FastAPI and PTSL business implementation.

## 3. API Extension Rules

When adding backend endpoints:

1. Add methods in `src/services/api/sessionApi.ts` or `exportApi.ts`.
2. For a new domain, add `src/services/api/<domain>Api.ts`.
3. Export from `src/services/api/index.ts`.
4. Keep `src/services/api.ts` as a compatible entry point.

## 4. Build and Verification

```bash
npm run build:main
npm run build:renderer
```

Package:

```bash
npm run package:mac
```

## 5. Common Issues

- `hdiutil` failure: usually a permissions or sandbox issue; package in a local environment with proper system access.
- Renderer build reports circular re-export: verify that `src/services/api.ts` re-exports from `./api/index`.
