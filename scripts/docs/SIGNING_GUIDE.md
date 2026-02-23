# Track2Do macOS Code Signing and Notarization Guide

This guide explains how to configure code signing and notarization for Track2Do so the app can run on macOS without security warnings.

## 📋 Prerequisites

### 1. Apple Developer Account
- Paid Apple Developer Program membership is required (USD $99/year).
- Access [Apple Developer Portal](https://developer.apple.com/).

### 2. Developer Certificates
- **Developer ID Application** certificate (required for app distribution)
- **Developer ID Installer** certificate (optional, for installer packages)

### 3. System Requirements
- macOS 10.15+
- Xcode Command Line Tools
- Node.js 16+
- Python 3.8+

## 🔧 Setup Steps

### Step 1: Install Xcode Command Line Tools

```bash
xcode-select --install
```

### Step 2: Generate Developer Certificate

#### Method A: Use Xcode (recommended)
1. Open Xcode.
2. Go to `Xcode > Preferences > Accounts`.
3. Add your Apple ID.
4. Select your team, then click "Manage Certificates".
5. Click "+" and choose "Developer ID Application".

#### Method B: Use Apple Developer Portal
1. Open [Apple Developer Portal](https://developer.apple.com/account/resources/certificates/list).
2. Create a new certificate: "Developer ID Application".
3. Upload CSR generated in Keychain Access.
4. Download and install the certificate.

### Step 3: Get Team ID
1. Open [Apple Developer Portal](https://developer.apple.com/account/).
2. Find your Team ID in the account section (format: `ABC123DEF4`).

### Step 4: Create App-Specific Password
1. Open [Apple ID account page](https://appleid.apple.com/account/manage).
2. Sign in with your Apple ID.
3. Go to "Sign-In and Security" > "App-Specific Passwords".
4. Generate a new app-specific password.
5. Save the generated value (format: `xxxx-xxxx-xxxx-xxxx`).

### Step 5: Configure Environment Variables

1. Copy template:
```bash
cp .env.signing .env.signing.local
```

2. Edit `.env.signing.local`:
```bash
# Full certificate name shown in Keychain Access
DEVELOPER_ID_APPLICATION="Developer ID Application: Your Name (ABC123DEF4)"

# Apple ID email
APPLE_ID="your-email@example.com"

# Team ID
TEAM_ID="ABC123DEF4"

# App-specific password
APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
```

### Step 6: Confirm Certificate Name

Run in terminal:
```bash
security find-identity -v -p codesigning
```

Expected output example:
```
1) ABC123DEF4567890... "Developer ID Application: Your Name (ABC123DEF4)"
```

Copy the full certificate name inside quotes to your env configuration.

## 🚀 Usage

### Method 1: Automated Script (recommended)

1. Load environment variables:
```bash
source .env.signing.local
```

2. Build app:
```bash
./scripts/build/build_mac.sh
```

3. Sign and notarize:
```bash
./scripts/signing/sign_and_notarize.sh
```

### Method 2: electron-builder Auto Signing

1. Export environment variables:
```bash
export CSC_NAME="Developer ID Application: Your Name (ABC123DEF4)"
export APPLE_ID="your-email@example.com"
export APPLE_ID_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export TEAM_ID="ABC123DEF4"
```

2. Build and package:
```bash
npm run build
npm run package:mac
```

## 📁 Output Files

After signing/notarization, expected files in `release/`:

- `Track2Do-signed.app.zip` - signed x64 app archive
- `Track2Do-arm64-signed.app.zip` - signed ARM64 app archive
- `mac/Track2Do.app` - signed x64 app bundle
- `mac-arm64/Track2Do.app` - signed ARM64 app bundle

## 🔍 Validate Signature

### Verify Code Signature
```bash
codesign -v -v ./release/mac/Track2Do.app
```

### Validate Notarization Staple
```bash
xcrun stapler validate ./release/mac/Track2Do.app
```

### Inspect Signature Metadata
```bash
codesign -d -v -v ./release/mac/Track2Do.app
```

## ❗ Common Issues

### Issue 1: "Developer ID Application" certificate not found
**Resolution:**
- Confirm the correct certificate is installed in Keychain.
- Check certificate expiration date.
- Run `security find-identity -v -p codesigning` to list available certs.

### Issue 2: Notarization fails
**Resolution:**
- Confirm app-specific password is correct.
- Confirm Team ID is correct.
- Check network connectivity.
- Review logs with `xcrun notarytool log <submission-id> --keychain-profile track2do-notary`.

### Issue 3: "Developer cannot be verified"
**Resolution:**
- Ensure app is correctly signed and notarized.
- Check Gatekeeper settings.
- Right-click app and choose "Open" for first launch.

### Issue 4: Entitlement/permission error
**Resolution:**
- Verify `entitlements.plist`.
- Ensure entitlement settings match app behavior.
- Re-sign app after entitlement updates.

## 🔒 Security Notes

1. **Protect private keys:** never commit private keys or raw certificate files.
2. **Environment variables:** keep secrets in `.env.signing.local`.
3. **App-specific password:** rotate periodically.
4. **Certificate management:** monitor expiration and renew in advance.

## 📚 References

- [Apple Code Signing Guide](https://developer.apple.com/library/archive/documentation/Security/Conceptual/CodeSigningGuide/)
- [Apple Notarization Guide](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
- [Electron Builder Docs](https://www.electron.build/code-signing)
- [Practical Tutorial Reference](https://juejin.cn/post/7296286286155300883)

## 🆘 Support

If problems persist:
1. Recheck the troubleshooting section above.
2. Review Apple developer documentation.
3. Open an issue in this repository.

---

**Related documents:**
- [Self-Signing Guide](SELF_SIGNING_GUIDE.md) - signing without developer account
- [Scripts Index](../README.md) - scripts and tool usage
- [Build Guide](../../README.md) - app build instructions

**Note:** Code signing and notarization are critical for secure macOS app distribution. Follow Apple best practices for release security.
