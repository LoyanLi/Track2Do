# Track2Do Scripts

This directory contains helper scripts for build and release workflows.

## Directory Structure

```text
scripts/
├── build/
│   ├── build_mac.sh
│   ├── convert_icon.sh
│   └── update_version.sh
├── docs/
│   ├── SELF_SIGNING_FIXES.md
│   ├── SELF_SIGNING_GUIDE.md
│   └── SIGNING_GUIDE.md
└── README.md
```

## Common Commands

```bash
# Build macOS app
./scripts/build/build_mac.sh

# Generate app icons (defaults to assets/icons/source/T2D.png)
./scripts/build/convert_icon.sh

# Update version number
./scripts/build/update_version.sh 0.2.1
```

## Constraints

- Run all scripts from the project root directory.
- Version logs are written to `docs/release/version_history.txt`.
- Source icon files should be placed in `assets/icons/source/`.

## Reference Docs

- `scripts/docs/SIGNING_GUIDE.md`
- `scripts/docs/SELF_SIGNING_GUIDE.md`
- `scripts/docs/SELF_SIGNING_FIXES.md`
