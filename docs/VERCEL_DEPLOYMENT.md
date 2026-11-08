# Deploying to Vercel (free Hobby plan)

Subject to Vercel's current Hobby-plan eligibility, quotas and acceptable-use terms (Hobby is intended for non-commercial use) — verify before relying on it. Free usage is not unlimited.

## 1. Verify locally
```powershell
npm install
npm run check      # lint, typecheck, tests, production build must all pass
```
## 2. Push to GitHub
```powershell
git init
git add .
git status         # confirm .env.local and any service-account JSON are NOT listed
git commit -m "MONEY Phase 1"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```
Commit `package-lock.json` once `npm install` has generated it.
## 3. Import into Vercel
https://vercel.com/new → import the repo → Framework: Next.js (auto) → add **Environment Variables** (Production, Preview as desired):

| Name | Value |
|---|---|
| `NEXT_PUBLIC_APP_URL` | your deployed URL, no trailing slash (set after the first deploy, then redeploy) |
| `NEXT_PUBLIC_FIREBASE_API_KEY`, `_AUTH_DOMAIN`, `_PROJECT_ID`, `_APP_ID` | from Firebase web app |
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` | from service account |
| `FIREBASE_PRIVATE_KEY` | the full key; paste with literal `\n` sequences, in quotes if the UI allows |
| `MONEY_ENCRYPTION_KEY`, `MONEY_KEY_PEPPER` | the **same** values you use locally if you share a Firebase project |

Do **not** set any `*EMULATOR*` variable in Vercel.
## 4. Authorise the domain
Firebase console → Authentication → Settings → **Authorized domains** → add `<project>.vercel.app` (and any custom domain).
## 5. Smoke test
Open `/api/health` (`configured: true`), register, verify email, create a project, create an order, open the checkout.

## Serverless behaviour to know
- `vercel.json` is **not needed**: all routes use the Node.js runtime and default limits.
- Webhook delivery is attempted inline with a 4 s timeout per endpoint, inside the request that caused the event — it must fit the function's execution limit. No background queue; retry is manual.
- In-memory rate limits and the Firebase Admin singleton are per warm instance.
- Request bodies are capped at 64 KB by the app (platform limits are higher).
- No Vercel Cron is configured; delayed outcomes are applied lazily on read.
