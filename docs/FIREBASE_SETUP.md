# Firebase setup (free Spark plan, no credit card)

~10 minutes. You need a Google account.

## 1. Create the project
1. Open https://console.firebase.google.com → **Add project** → name it (e.g. `money-sandbox`). Google Analytics is not needed — turn it off.

## 2. Enable Authentication
**Build → Authentication → Get started → Sign-in method → Email/Password → Enable → Save.** (Leave "Email link" off.)

## 3. Create Firestore
**Build → Firestore Database → Create database → Production mode** → choose a location near you (e.g. `asia-south1` Mumbai). The location cannot be changed later.

## 4. Register the web app (public config)
**Project settings (gear) → General → Your apps → `</>` Web** → register → copy `apiKey`, `authDomain`, `projectId`, `appId` into `.env.local`:
```
NEXT_PUBLIC_FIREBASE_API_KEY=…
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=…
NEXT_PUBLIC_FIREBASE_PROJECT_ID=…
NEXT_PUBLIC_FIREBASE_APP_ID=…
```
These are safe to expose to browsers; security comes from server-side verification and closed Firestore rules.

## 5. Create the service account (SECRET)
**Project settings → Service accounts → Generate new private key.** A JSON file downloads. From it copy:
```
FIREBASE_PROJECT_ID=<project_id>
FIREBASE_CLIENT_EMAIL=<client_email>
FIREBASE_PRIVATE_KEY="<private_key — keep the quotes and the \n sequences>"
```
Then **delete the JSON file or store it outside the repository.** Never commit it (`.gitignore` blocks `.env*` and `*service-account*.json`).

## 6. MONEY's own secrets
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])   # MONEY_ENCRYPTION_KEY
-join ((48..57)+(97..122) | Get-Random -Count 48 | ForEach-Object { [char]$_ })                 # MONEY_KEY_PEPPER
```
Losing `MONEY_ENCRYPTION_KEY` makes stored webhook secrets undecryptable; changing `MONEY_KEY_PEPPER` invalidates all API keys.

## 7. Deploy rules and indexes
```powershell
npm install -g firebase-tools
firebase login
firebase use --add            # pick your project
firebase deploy --only firestore:rules,firestore:indexes
```
The rules deny **all** direct client access; the server uses the Admin SDK.

## 8. Run
`npm run dev` → http://localhost:3000. `localhost` is an authorised Auth domain by default. Check `http://localhost:3000/api/health` — it must report `configured: true`.

## Optional: Firebase Emulator Suite (no cloud project needed)
Requires `firebase-tools` and **Java 11+** (Firestore emulator). In `.env.local` set:
```
NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true
FIREBASE_PROJECT_ID=demo-money
NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-money
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
MONEY_ENCRYPTION_KEY=…   MONEY_KEY_PEPPER=…
```
Run `firebase emulators:start` in one terminal and `npm run dev` in another. Emulated verification emails appear in the Emulator UI (http://localhost:4000 → Authentication). **Not yet exercised** — see STATUS.md.

## Quotas
The Spark plan has daily Firestore read/write limits (check current numbers in the Firebase console → Usage). MONEY maps quota errors to HTTP 429 `quota_exceeded` and outages to 503. Each API call costs several reads/writes (auth, order, events, logs).
