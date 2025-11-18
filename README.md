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

## Remediation steps (if a secret was detected)

1. Rotate or delete the leaked secret immediately in the provider console (Google Cloud, Firebase, etc.).
	- For API keys: open Google API Console → Credentials → find the key → Delete or Restrict and regenerate.
	- For service account keys: go to IAM & Admin → Service Accounts → select account → Keys → Delete old key and create a new one.
2. Check logs for suspicious access or unauthorized calls and revoke keys if necessary.
3. If GitHub flagged the secret, mark it as "revoked" in the GitHub security alert UI, then follow the link to unblock the push if required.
4. Remove all sensitive files from the repository and history. We used a history rewrite (`git filter-branch`); `git filter-repo` or `BFG` are safer alternatives.
5. Use environment variables, `eas secret:create`, or GitHub secrets to provide secrets to CI builds (never embed them in the repository).
6. Add pre-commit and CI secret scans (we added `detect-secrets` and a `gitleaks` GitHub Action) to block accidental leaks on push.

## Local setup & future steps

- When you build locally, copy the `google-services.json` and `debug.keystore` from `ArafatHr-secrets` into `android/app` only on your machine (see the commands in this README above).
- To use secrets during EAS builds, add them with `eas secret:create --name SERVICE_ACCOUNT_JSON --value "$(cat ../ArafatHr-secrets/service-account.json)"` then use them in your `eas.json` or GitHub Actions for builds.

If you'd like, I can add `README_SETUP.md` with a full example for EAS / GitHub Actions secrets injection and how to safely add `google-services.json` for production builds.
