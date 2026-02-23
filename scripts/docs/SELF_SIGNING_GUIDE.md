# Track2Do macOS Self-Signing Guide

This guide describes available self-signing workflows for Track2Do under different development and distribution scenarios.

## 📋 Signing Method Comparison

| Method | Script | Best For | Advantages | Limitations |
|---------|---------|---------|------|------|
| **Ad-hoc signing** | `simple_self_sign.sh` | Local development testing | No certificate required, fast and simple | Runs only on the signing machine |
| **Self-signed certificate** | `self_sign.sh` | Internal team distribution | Can be shared with other users | Users must manually trust the certificate |
| **Developer signing** | `quick_sign.sh` | Developer validation | Apple-recognized signature | Requires Apple Developer account |
| **Full signing + notarization** | `sign_and_notarize.sh` | Public distribution | Fully compatible with Gatekeeper | Requires Apple account + notarization |

## 🚀 Quick Start

### 1. Ad-hoc Signing (recommended for local tests)

```bash
# Build app
./scripts/build/build_mac.sh

# Ad-hoc sign
./scripts/signing/simple_self_sign.sh
```

**Characteristics:**
- ✅ No certificate or developer account required
- ✅ Fastest and simplest signing flow
- ✅ Best for local development and debugging
- ❌ Can only run on the signing machine
- ❌ Not suitable for distribution to other users

**Typical scenarios:**
- Local developer testing
- Fast build verification
- Functional debugging

### 2. Self-Signed Certificate (recommended for internal distribution)

```bash
# Build app
./scripts/build/build_mac.sh

# Create self-signed cert and sign
./scripts/signing/self_sign.sh
```

**Characteristics:**
- ✅ No Apple Developer account required
- ✅ Can be distributed to team members
- ✅ Certificate can be reused
- ❌ Users must manually trust the certificate
- ❌ Not fully trusted by Gatekeeper

**Typical scenarios:**
- Internal team testing
- Enterprise internal distribution
- Beta testing

## 📖 Detailed Instructions

### Detailed Steps for Ad-hoc Signing

1. **Build the app**
   ```bash
   ./scripts/build/build_mac.sh
   ```

2. **Run ad-hoc signing**
   ```bash
   ./scripts/signing/simple_self_sign.sh
   ```

3. **Run the app**
   - Double-click `./release/mac/Track2Do.app`
   - If blocked by macOS, right-click and choose "Open"
   - Click "Open" in the confirmation dialog

### Detailed Steps for Self-Signed Certificate

1. **Build the app**
   ```bash
   ./scripts/build/build_mac.sh
   ```

2. **Create certificate and sign**
   ```bash
   ./scripts/signing/self_sign.sh
   ```

   The script automatically:
   - Creates a self-signed certificate
   - Imports it into Keychain
   - Signs the app bundles
   - Produces distribution archives

3. **Distribute the app**
   - Share the generated `.zip` artifacts
   - Recipients need to trust and open the app as described below

4. **Recipient install steps**
   - Unzip the app package
   - Right-click app, select "Open"
   - Click "Open" in the prompt
   - Or allow the app in `System Settings > Privacy & Security`

## 🔧 Certificate Management

### View Installed Certificates
```bash
# List all code-signing certificates
security find-identity -v -p codesigning

# Filter Track2Do-related entries
security find-identity -v -p codesigning | grep "Track2Do"
```

### Remove Self-Signed Certificate
```bash
# Remove self-signed keychain
security delete-keychain track2do-keychain

# Or remove manually in Keychain Access
```

### Recreate Certificate
```bash
# Re-run script after removing old keychain/certs
./scripts/signing/self_sign.sh
```

## 🛠️ Troubleshooting

### Common Issues

**Q: App does not run after ad-hoc signing**
A: Check:
- The app was built completely
- Run directly in terminal: `./release/mac/Track2Do.app/Contents/MacOS/Track2Do`
- Inspect system diagnostics in `Console.app`

**Q: Failed to create self-signed certificate**
A: Try:
- Ensure `openssl` is installed: `brew install openssl`
- Verify Keychain permissions
- Delete old keychain and run again

**Q: End users cannot run the self-signed app**
A: Guide users to:
1. Do not double-click first
2. Right-click app and choose "Open"
3. Click "Open" in security warning
4. Or manually allow in System Settings

**Q: Signature verification fails**
A: Run:
```bash
# Verify signature
codesign -v -v ./release/mac/Track2Do.app

# Inspect signature metadata
codesign -d -v ./release/mac/Track2Do.app

# Inspect entitlements
codesign -d --entitlements - ./release/mac/Track2Do.app
```

### Debug Commands

```bash
# Verify app signature
codesign -v -v /path/to/Track2Do.app

# Show detailed signature info
codesign -d -v /path/to/Track2Do.app

# Check Gatekeeper verdict
spctl -a -v /path/to/Track2Do.app

# Inspect system logs
log show --predicate 'process == "syspolicyd"' --last 1h
```

## 📚 Advanced Options

### Enterprise Deployment

For enterprise internal deployment, consider:

1. **MDM pre-trusted certificate**
   - Push self-signed cert to managed devices
   - Avoid manual trust steps for users

2. **Internal certificate authority**
   - Establish internal CA
   - Issue company code-signing certificates

3. **Scripted deployment**
   ```bash
   # Automated signing and distribution package
   ./scripts/signing/self_sign.sh

   # Upload to internal distribution platform
   # rsync ./release/*.zip deploy-server:/apps/
   ```

### Custom Configuration

You can adjust signing variables in script:

```bash
# In self_sign.sh
CERT_NAME="Your Company Certificate"  # Certificate name
KEYCHAIN_NAME="your-keychain"         # Keychain name
VALIDITY_DAYS=365                       # Certificate validity period
```

## 🔒 Security Notes

1. **Certificate safety**
   - Use self-signed certificates only for development/internal testing
   - Do not use self-signed certs in production distribution
   - Rotate certificates regularly

2. **Distribution safety**
   - Share artifacts through secure channels
   - Verify package integrity
   - Inform users about trust prompts and risks

3. **User education**
   - Teach users how to identify trusted app sources
   - Provide official download channels
   - Keep a feedback and issue-reporting process

## 📞 Getting Help

If you run into issues:

1. Check script output logs first
2. Inspect macOS system logs
3. Refer to Apple documentation
4. Contact project maintainers

---

**Related documents:**
- [Full Signing Guide](SIGNING_GUIDE.md)
- [Scripts Index](../README.md)
- [Apple Code Signing Docs](https://developer.apple.com/documentation/security/code_signing_services)
