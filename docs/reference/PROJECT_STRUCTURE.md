# Track2Do Project Structure Overview

## 📁 Full Directory Structure

```text
Track2Do/
├── README.md                          # Main project documentation
├── package.json                       # Node.js project config
├── .gitignore                         # Git ignore rules
├── .env.example                       # Environment variable template
│
├── assets/                            # Static assets
│   └── icons/                         # Application icons
│       ├── icon.icns                  # macOS icon
│       ├── icon.ico                   # Windows icon
│       └── icon.png                   # Generic icon
│
├── src/                               # Frontend source (React + TypeScript)
│   ├── App.tsx                        # Main app component
│   ├── main.tsx                       # Frontend entry
│   ├── components/                    # React components
│   ├── contexts/                      # React contexts
│   ├── hooks/                         # Custom hooks
│   ├── services/                      # API services
│   ├── utils/                         # Utility helpers
│   ├── config/                        # Frontend config
│   └── types/                         # Type definitions
│
├── electron/                          # Electron main process
│   ├── main.ts                        # Main process entry
│   └── preload.ts                     # Preload script
│
├── backend/                           # Python backend service
│   ├── main.py                        # FastAPI app entry
│   ├── start.py                       # Startup script
│   ├── requirements.txt               # Python dependencies
│   ├── api/                           # API routes
│   ├── core/                          # Core logic
│   ├── models/                        # Data schemas
│   └── output/                        # Generated outputs
│
├── scripts/                           # Build and distribution scripts
│   ├── build/                         # Build scripts
│   │   ├── build_mac.sh               # Build macOS app
│   │   ├── convert_icon.sh            # Convert icons
│   │   └── update_version.sh          # Update version
│   ├── signing/                       # Signing scripts
│   │   ├── simple_self_sign.sh        # Ad-hoc signing (local test)
│   │   ├── self_sign.sh               # Self-signed cert (internal distro)
│   │   ├── quick_sign.sh              # Quick Developer ID signing
│   │   └── sign_and_notarize.sh       # Full signing + notarization
│   ├── config/                        # Signing configs
│   │   ├── .env.signing               # Signing env template
│   │   └── entitlements.plist         # App entitlements
│   └── docs/                          # Script documentation
│
├── docs/                              # Project documentation
│   ├── ARCHITECTURE.md
│   ├── DEVELOPMENT_GUIDE.md
│   ├── reference/
│   ├── release/
│   └── user-guide/
│
└── release/                           # Build outputs (generated)
```

## 🎯 Core Modules

### Frontend (React + Electron)
- **UI Layer**: Modern React components.
- **State Management**: Context API + Hooks.
- **Access Model**: Direct access with no login required.
- **Realtime Connectivity**: WebSocket communication.
- **Desktop Integration**: Electron main process and IPC.

### Backend (Python + FastAPI)
- **API Service**: REST-style endpoints.
- **Pro Tools Communication**: PTSL integration.
- **Snapshot Management**: Save and restore track states.
- **Export Control**: Batch/stem export workflows.

### Build and Release
- **Automated Build**: One-command macOS packaging.
- **Multiple Signing Flows**: Local test, internal distro, production release.
- **Centralized Config**: Shared signing and entitlement files.
- **Operational Docs**: Build/sign/release runbooks.

## 🚀 Quick Navigation

### Development
- [Main README](../../README.md) - project overview and quick start.
- [Quick Reference](./QUICK_REFERENCE.md) - daily command cheatsheet.
- [Scripts Guide](../../scripts/README.md) - build/sign scripts index.

### Build and Release
- [Build Scripts](../../scripts/build/) - app packaging scripts.
- [Signing Scripts](../../scripts/signing/) - signing and notarization scripts.
- [Config Files](../../scripts/config/) - build/sign configuration files.

### Detailed Docs
- [Signing Guide](../../scripts/docs/SIGNING_GUIDE.md) - Apple Developer ID signing.
- [Self-Signing Guide](../../scripts/docs/SELF_SIGNING_GUIDE.md) - no developer account flow.

## 📋 File Types

### Config Files
- `package.json` - Node.js scripts and dependency management.
- `tsconfig.json` - TypeScript compiler config.
- `tailwind.config.js` - Tailwind CSS config.
- `vite.config.ts` - Vite build config.
- `.env.example` - environment variable template.

### Build Artifacts
- `release/` - generated build output directory.
- `Track2Do-*.dmg` - macOS installer package.
- `mac/Track2Do.app` - x64 app bundle.
- `mac-arm64/Track2Do.app` - ARM64 app bundle.

### Dev Tooling
- `.eslintrc.cjs` - ESLint rules.
- `postcss.config.js` - PostCSS settings.
- `.gitignore` - git ignore patterns.

## 🔄 Workflow

### Development Workflow
1. Prepare environment: install Node.js and Python dependencies.
2. Develop and debug: run local dev services.
3. Quality checks: run lint/build checks.
4. Build test: package and verify locally.

### Release Workflow
1. Build app: `./scripts/build/build_mac.sh`.
2. Select signing flow for release target.
3. Validate app behavior and signature.
4. Distribute on target channels.

## 💡 Best Practices

### Development
- Use TypeScript for stronger type safety.
- Keep UI components focused; move logic into hooks/services.
- Follow consistent linting and formatting standards.
- Keep API boundaries explicit in `src/services/api`.

### Build and Signing
- Use `simple_self_sign.sh` for quick local validation.
- Use `self_sign.sh` for internal testing distribution.
- Use `sign_and_notarize.sh` for public release.
- Rotate certificates and credentials regularly.

### Security
- Never commit `.env.signing` secrets.
- Use least-privilege entitlements.
- Keep dependencies updated.
- Rotate credentials and signing assets on a schedule.

---

Track2Do is a professional Pro Tools stem export utility for production workflows.
