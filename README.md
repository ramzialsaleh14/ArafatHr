# Arafat HR (Expo React Native)

Basic Expo React Native scaffold with a simple login screen.

Getting started:

1. Install dependencies: npm install
2. Start the dev server: npm start
3. Use Expo Go (mobile) or an emulator to run the app.

Notes: This is a minimal starter. No backend is configured; login is client-side only.

## Secrets & local config (IMPORTANT)

This repository had confidential files (Firebase service account, google-services.json, debug keystore) — they were removed from the repository and moved to a local folder outside the repository named `ArafatHr-secrets/`.

Follow these steps for a safe local setup:

1. Create a local secrets folder outside the repo root (if it doesn't exist):

```powershell
New-Item -ItemType Directory -Force -Path "..\ArafatHr-secrets"
```

2. Place your secret files from your provider (Firebase `serviceAccount.json`, `google-services.json`, `debug.keystore`) inside `ArafatHr-secrets`.

3. For Android local development, copy `google-services.json` into the Android folder before building locally:

```powershell
Copy-Item "..\ArafatHr-secrets\google-services.json" -Destination "android/app/google-services.json" -Force
Copy-Item "..\ArafatHr-secrets\debug.keystore" -Destination "android/app/debug.keystore" -Force
```

4. For production builds with EAS, store secrets using EAS secrets or GitHub Actions secrets and inject them at build time instead of committing them.

Security recommendations:

- Revoke and rotate any keys that were committed to the repo (GitHub flagged a Google API key). See steps below.
- Use EAS secrets, GitHub secrets, or a secure secret manager (AWS Secrets Manager, GCP Secret Manager) for CI builds.
- Add pre-commit/CI scans for secrets (see `pre-commit-config.yaml` example below).

If you want, I can add a `README_SETUP.md` with detailed EAS + CI steps for secrets injection.
