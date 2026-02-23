# Track2Do

**Description:** A macOS desktop app that automates Pro Tools stem export workflows with snapshot-based batch processing.

Track2Do is built for audio engineers who need repeatable, fast, and less error-prone stem exports from Pro Tools sessions.

## Features

- Snapshot-based track state management (Solo/Mute combinations)
- Batch export pipeline for repeatable delivery workflows
- Real-time Pro Tools connection and session status
- Electron desktop UI with React + TypeScript
- Python FastAPI backend for PTSL integration

## Tech Stack

- Desktop: Electron
- Frontend: React + TypeScript + Vite + Tailwind CSS
- Backend: Python + FastAPI
- Protocol: PTSL

## Requirements

- macOS (primary target)
- Node.js 20+
- npm 10+
- Python 3.10+
- Pro Tools with PTSL available

## Quick Start

```bash
npm install
cd backend && python3 -m pip install -r requirements.txt && cd ..
npm run dev
```

## Build

```bash
npm run build
npm run package:mac
```

Or use the build script:

```bash
./scripts/build/build_mac.sh
```

## Common Scripts

- `npm run dev`: run Electron + renderer in development
- `npm run build`: build main + renderer
- `npm run package:mac`: package DMG installers
- `npm run clean`: remove build outputs
- `npm run build:mac`: run `scripts/build/build_mac.sh`
- `npm run icon:convert`: generate app icons
- `npm run version:bump`: bump project version via script

## Project Structure

```text
.
├── src/                    # Renderer app (React + TS)
├── electron/               # Main process, preload, IPC
├── backend/                # FastAPI + PTSL integration
├── scripts/                # Build and release scripts
├── docs/                   # Architecture, protocol, guides
├── assets/                 # Icons and design resources
└── tools/                  # Local helper utilities
```

## Documentation

- `docs/README.md`
- `docs/ARCHITECTURE.md`
- `docs/DEVELOPMENT_GUIDE.md`
- `docs/release/RELEASE_PROCESS.md`
- `docs/release/GITHUB_RELEASE_CHECKLIST.md`
- `CONTRIBUTING.md`

## Release Artifacts

Packaged outputs are generated in `release/`:

- `Track2Do-<version>.dmg`
- `Track2Do-<version>-arm64.dmg`

## Contributing

See `CONTRIBUTING.md` for branch conventions, PR rules, and local validation steps.

## License

This project is licensed under the MIT License. See `LICENSE`.
