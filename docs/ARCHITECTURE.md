# Track2Do Architecture

## Goals

- Keep UI, domain behavior, and infrastructure separated.
- Make API and process lifecycle easier to maintain.
- Keep existing public interfaces stable during refactors.

## Runtime Overview

- `electron/main.ts`: desktop shell, window lifecycle, IPC registration.
- `src/*`: renderer UI and user workflows.
- `backend/*`: FastAPI + PTSL integration.

## Renderer Layering

- `src/components`: visual components.
- `src/hooks`: feature state and interaction logic.
- `src/services/api`: infrastructure API client split by domain.
  - `httpClient.ts`: transport concerns (Electron IPC vs HTTP fallback).
  - `sessionApi.ts`: session, tracks, snapshots endpoints.
  - `exportApi.ts`: export task endpoints.
  - `index.ts`: composition root + compatibility facade.
- `src/services/api.ts`: compatibility entry for existing imports.
- `src/types`: shared app types.

## Refactor Rules

- Keep UI imports using `src/services/api.ts` until full migration is done.
- Add new backend endpoint wrappers in domain modules under `src/services/api/`.
- Keep transport code only in `httpClient.ts`.
- Avoid business logic inside React components.

## Suggested Next Steps

1. Move snapshot persistence from `src/utils/snapshotManager.ts` into `src/services/storage/`.
2. Split large components (`ExportPanel`, `SnapshotPanel`) into feature folders.
3. Add unit tests for `sessionApi.ts` and `exportApi.ts`.
