# NIGHTWATCH — Coolify Deployment Guide

## Overview

NIGHTWATCH is a long-running Node.js backend that fetches each intern's GitHub commits, scores them with Claude, and emails a manager summary plus per-intern feedback. The scheduler uses an in-process `node-cron` loop that fires at 19:00 IST daily, so the container must stay alive 24/7 — this is not a one-shot job. Coolify deploys it from this repo's `Dockerfile` and keeps it running.

## Prerequisites

- Coolify is already installed and running on your VPS.
- This repo is pushed to GitHub and reachable by Coolify (public, or a GitHub App / deploy key configured in Coolify).
- You have the runtime values ready: GitHub PAT, Anthropic API key, SMTP credentials, manager email.

## Step 1 — Create Application

In Coolify:

1. **New Resource → Application**.
2. **Source**: select your Git provider and point to this repo's URL.
3. **Branch**: `main`.
4. **Build Pack**: **Dockerfile** (Coolify will use the `Dockerfile` at the repo root).
5. **Port**: leave empty / not exposed. NIGHTWATCH does not serve HTTP — it's a worker.
6. Save.

## Step 2 — Configure Environment Variables

Open the application's **Environment Variables** tab and add the values below. The canonical list lives in `.env.example` at the repo root.

| Variable | Required | Notes |
| --- | --- | --- |
| `USE_MOCKS` | always | Set to `false` for production. `true` runs fully offline with no external calls. |
| `MOCK_RANDOMIZE` | optional | Only relevant when `USE_MOCKS=true`. |
| `MANAGER_EMAIL` | always | Recipient of the daily summary email. |
| `CC_EMAIL` | always | CC'd on the manager email. |
| `SEND_STUDENT_EMAILS` | always | `true` to send per-intern feedback, `false` to suppress. |
| `GITHUB_TOKEN` | when `USE_MOCKS=false` | Fine-grained PAT, scopes: Contents read-only + Metadata read-only on each intern repo. |
| `ANTHROPIC_API_KEY` | when `USE_MOCKS=false` | `sk-ant-...` from console.anthropic.com. |
| `CLAUDE_MODEL` | when `USE_MOCKS=false` | e.g. `claude-sonnet-4-6`. |
| `SMTP_HOST` | when `USE_MOCKS=false` | e.g. `smtp.gmail.com`. |
| `SMTP_PORT` | when `USE_MOCKS=false` | `587` for STARTTLS. |
| `SMTP_USER` | when `USE_MOCKS=false` | SMTP login. |
| `SMTP_PASS` | when `USE_MOCKS=false` | For Gmail, this **must** be a 16-character App Password, not the account password. |
| `SMTP_FROM` | when `USE_MOCKS=false` | From address on outbound mail. |
| `SMTP_FROM_NAME` | when `USE_MOCKS=false` | Display name, e.g. `NIGHTWATCH Agent`. |

Mark each as **Build Variable: No** (these are runtime only) and use Coolify's **encrypted/secret** flag for the three credentials: `GITHUB_TOKEN`, `ANTHROPIC_API_KEY`, `SMTP_PASS`.

Use placeholder values like `<your-token-here>` until you paste in the real ones — never commit actual values.

## Step 3 — Persistent Storage

Add two **Persistent Storage** mounts so daily logs and report history survive container rebuilds:

| Mount Path (in container) | Purpose |
| --- | --- |
| `/app/logs` | Daily JSON logs written as `<date>.json`. Required for history and the dashboard. |
| `/app/reports` | Generated report artifacts. |

Without these mounts, every redeploy wipes the day's work. Coolify will create the host-side volumes automatically.

## Step 4 — Healthcheck & Restart Policy

- **Restart Policy**: `always` (Coolify default for applications). The cron loop must be revived if the process crashes.
- **Healthcheck**: inherited from the `Dockerfile` (`HEALTHCHECK --interval=5m`) — no override needed in Coolify. It runs a no-op `node -e "process.exit(0)"` every 5 minutes to confirm the runtime is responsive.

## Step 5 — Deploy & Verify

1. Click **Deploy** in Coolify.
2. Open the **Logs** panel and tail the build, then the runtime output.
3. Confirm the startup line appears:

   ```
   🌙 NIGHTWATCH scheduler started. Cron: "0 19 * * *" Asia/Kolkata
   ```

4. To verify end-to-end without waiting for 19:00 IST, exec into the container from Coolify's terminal and run a one-shot pass:

   ```
   node src/scheduler.js --once
   ```

   This runs the full pipeline immediately and exits, leaving the long-running container untouched on the next health tick (Coolify will restart it per the policy above — that's expected).
5. After 19:00 IST, confirm a fresh `<date>.json` appears under the `/app/logs` mount and that the manager email arrived.

## Troubleshooting

- **Cron fires at 13:30 UTC instead of 19:00 IST.** The image is missing `tzdata` or `TZ` is not set. The provided `Dockerfile` installs `tzdata` and sets `TZ=Asia/Kolkata` — if you've forked, verify both lines are intact. Without tzdata, alpine silently treats `Asia/Kolkata` as UTC.
- **Gmail SMTP returns `535 5.7.8 Username and Password not accepted`.** You're using the account password. Generate a 16-character App Password at https://myaccount.google.com/apppasswords and put that in `SMTP_PASS`. Requires 2FA on the Google account.
- **GitHub fetch returns 404 or empty commits for a repo that exists.** The PAT is missing repo access. For fine-grained PATs, edit the token and ensure each intern repo is in the **Selected repositories** list with **Contents: Read-only** and **Metadata: Read-only**.
- **Anthropic returns 401.** `ANTHROPIC_API_KEY` is wrong, expired, or scoped to a different workspace. Re-issue from console.anthropic.com and redeploy.

## Updating

- Push to `main`. If the Coolify GitHub webhook is configured, the app auto-redeploys.
- Otherwise, click **Redeploy** in Coolify.
- Persistent storage on `/app/logs` and `/app/reports` is preserved across redeploys, so history is not lost.
