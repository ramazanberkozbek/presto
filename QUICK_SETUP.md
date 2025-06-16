# Quick Setup Guide for Automatic Updates

This is a condensed guide for developers who want to quickly set up automatic updates for their Presto fork.

## ⚡ Quick Setup (5 minutes)

### 1. Generate Keys
```bash
npx tauri signer generate -w ~/.tauri/presto_signing_key --password "your_secure_password"
```

### 2. Get Public Key
```bash
cat ~/.tauri/tempo_signing_key.pub
```

### 3. Update Configuration
Edit `src-tauri/tauri.conf.json`:
```json
{
  "plugins": {
    "updater": {
      "endpoints": [
        "https://api.github.com/repos/YOUR_USERNAME/YOUR_REPO/releases/latest"
      ],
      "pubkey": "PASTE_YOUR_PUBLIC_KEY_HERE"
    }
  }
}
```

### 4. Set GitHub Secrets
Go to **Settings** → **Secrets** → **Actions** in your GitHub repo and add:
- `TAURI_SIGNING_PRIVATE_KEY`: Content of `~/.tauri/tempo_signing_key`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`: Your password

### 5. Test Release
```bash
git tag v0.1.1
git push origin v0.1.1
```

## 🔧 What's Included

- ✅ **GitHub Actions workflow** - Automatically builds and signs releases
- ✅ **Update manager** - Handles checking and downloading updates
- ✅ **UI components** - Beautiful update notifications and progress
- ✅ **Settings panel** - Users can configure update preferences
- ✅ **Security** - All updates are cryptographically signed

## 🚨 Important Notes

- **Never commit your private key** to the repository
- **Keep your password secure** - store it in GitHub Secrets
- **Test with a small version bump** before major releases
- **The first release** won't trigger auto-updates (nothing to update from)

## 🎯 For Production

1. **Use a strong password** for your signing key
2. **Backup your keys** securely (encrypted storage)
3. **Monitor release builds** to ensure they complete successfully
4. **Test updates** on different platforms before releasing

## 🔗 Full Documentation

For detailed setup and troubleshooting, see [UPDATES.md](UPDATES.md).

---

**Happy updating!** 🚀
