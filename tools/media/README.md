# Media generator (maintainers)

Produces `docs/media/**` (screenshots, walkthrough MP4/GIF) **without Firebase or a deployed instance**.

**What it is:** `build.mjs` bundles the project's *real* React pages/components with esbuild and compiles the project's *real* stylesheet with the Tailwind engine; `server.ts` serves them on top of the *real* `MoneyService` (in-memory store, seeded through the real state machine); `capture.mjs` drives Chromium with Playwright and encodes the video with ffmpeg.

**What is stubbed:** Firebase sign-in (a fixed, verified demo user), the Next.js router/`Link` (tiny shims in `shims/`), and webhook delivery (an in-process fake receiver that fails one delivery once so the Retry flow is visible). The API route handlers are mirrored by `server.ts`, not executed.

**Offline-toolchain caveats:** the CSS is compiled by the Tailwind 4 engine available in the build sandbox (production uses Tailwind 3.4), and the display face is substituted (Lora italic for Cormorant Garamond) because web fonts were unavailable offline. Pixel details may differ slightly from a real `next build`.

```powershell
node tools/media/build.mjs
$env:PLAYWRIGHT_BROWSERS_PATH = "<path to playwright browsers>"
node tools/media/capture.mjs          # SKIP_SHOTS=1 to re-record only the video
```
Paths to `esbuild`, `tailwindcss` and `playwright` are hard-coded to the build sandbox (`/opt/npm-tools/node_modules`); adjust them to run elsewhere. Excluded from `tsc` and the Next.js build.
