# Track2Do Quick Reference

## 🚀 One-Step Commands

### Build the App
```bash
# Full build flow
./scripts/build/build_mac.sh

# One-step self-signed DMG build (recommended)
./scripts/build/build_self_signed_dmg.sh
```

### Signing Options (pick one based on your release scenario)
```bash
# Local development test (fastest)
./scripts/signing/simple_self_sign.sh

# Internal team distribution
./scripts/signing/self_sign.sh

# Developer validation (requires certificate)
./scripts/signing/quick_sign.sh

# Production release (requires certificate + notarization)
./scripts/signing/sign_and_notarize.sh
```

## 📋 Signing Method Comparison

| Script | Scenario | Certificate Required | Distributable | User Experience | Output Type |
|------|----------|----------|--------|----------|----------|
| `build_self_signed_dmg.sh` | Self-signed DMG | ❌ | ✅ | Manual approval needed | DMG installer |
| `simple_self_sign.sh` | Local test | ❌ | ❌ | Manual approval needed | ZIP package |
| `self_sign.sh` | Internal distribution | ❌ | ✅ | Manual approval needed | ZIP package |
| `quick_sign.sh` | Developer test | ✅ | ✅ | Good | ZIP package |
| `sign_and_notarize.sh` | Production release | ✅ | ✅ | Best | DMG installer |

## 🔧 Configuration Files

```bash
# Signing config (if using Developer ID signing)
cp scripts/config/.env.signing .env.signing
# Edit .env.signing and fill in certificate details

# App entitlement config
# scripts/config/entitlements.plist
```

## 🐛 Common Debug Commands

```bash
# Inspect app signing status
codesign -dv --verbose=4 ./release/mac/Track2Do.app
codesign -dv --verbose=4 ./release/mac-arm64/Track2Do.app

# Verify signatures
codesign --verify --verbose ./release/mac/Track2Do.app
codesign --verify --verbose ./release/mac-arm64/Track2Do.app

# List available certificates
security find-identity -v -p codesigning
security find-identity -v -p codesigning track2do-keychain

# Inspect keychains
security list-keychains

# Clean self-signed keychain (if you need to recreate)
security delete-keychain track2do-keychain

# Test Gatekeeper assessment
spctl -a -v ./release/mac/Track2Do.app
```

## 📁 Output Locations

```
release/
├── Track2Do-*.dmg              # Installer
├── mac/Track2Do.app            # x64 app
├── mac-arm64/Track2Do.app      # ARM64 app
├── Track2Do-*.app.zip          # Signed distribution package
└── Track2Do-arm64-*.app.zip    # ARM64 distribution package
```

## 🆘 Quick Troubleshooting

### Build Failure
```bash
# Clean and reinstall dependencies
rm -rf node_modules
npm install

# Check Python dependencies
cd backend && pip install -r requirements.txt
```

### Signing Failure
```bash
# Check available certificates
security find-identity -v -p codesigning

# Recreate self-signed certificates
security delete-keychain track2do-keychain
./scripts/signing/self_sign.sh
```

### App Fails to Launch
```bash
# Right-click app and choose Open
# Or allow it in System Settings

# Check system log
log show --predicate 'process == "syspolicyd"' --last 1h
```

## 📖 Detailed Documentation

- [Scripts Guide](../../scripts/README.md)
- [Code Signing Guide](../../scripts/docs/SIGNING_GUIDE.md)
- [Self-Signing Guide](../../scripts/docs/SELF_SIGNING_GUIDE.md)

---

💡 **Tip**: For first-time setup, start with `simple_self_sign.sh` for quick local verification.
