# HDGEcalls APK distribution

Static files served by Vercel at `https://calls.hdgelabs.com/app/`. The Android
app (`HDGEcalls-App` repo) polls `latest.json` from here on every launch and
shows an in-app banner when `version` is newer than what's installed.

## Files

- **`HDGEcalls-latest.apk`** — the current bootstrap APK (tracked by Git LFS).
- **`latest.json`** — the manifest the app polls. Shape:
  ```json
  {
    "version": "0.4.0",
    "apk_url": "https://calls.hdgelabs.com/app/HDGEcalls-latest.apk",
    "release_notes": "What changed in this release"
  }
  ```

## Shipping a new APK release

1. In the `HDGEcalls-App` repo, bump `version` in `app.json`, `git tag vX.Y.Z`,
   `git push --tags`. The GitHub Action builds the APK.
2. Download the built APK from the GitHub Release.
3. Replace this folder's APK:
   ```bash
   cp ~/Downloads/HDGEcalls-vX.Y.Z.apk \
      "/Users/dev16/Documents/calling/calls.hdgelabs.com/web/public/app/HDGEcalls-latest.apk"
   ```
4. Edit `latest.json` — change `version` to match, update `release_notes`.
5. Commit + push:
   ```bash
   cd "/Users/dev16/Documents/calling/calls.hdgelabs.com"
   git add web/public/app/HDGEcalls-latest.apk web/public/app/latest.json
   git commit -m "release: HDGEcalls vX.Y.Z"
   git push
   ```
   Git LFS handles the APK upload automatically (configured in `.gitattributes`).
6. Vercel auto-deploys within ~60s. Testers see the update banner on their
   next app launch.

## JS-only updates (no APK rebuild)

For changes that don't touch native code, ship via EAS Update — no APK, no
work in this folder:

```bash
cd "/Users/dev16/Documents/calling/HDGEcalls app"
eas update --branch production --message "what changed"
```

Updates arrive on the next app launch.
