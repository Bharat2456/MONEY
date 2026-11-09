# Changelog

## 1.0.1 — Documentation & media
- Professional GitHub README (banner, badges, Mermaid diagrams, screenshot gallery, walkthrough video).
- `docs/media/`: 18 screenshots, captioned MP4 + GIF walkthrough, logo and banner SVGs; generator in `tools/media/`.
- Webhooks page: endpoint "Events" column now reads "All events" instead of a bare `*`.

## 1.0.0 — Phase 1 initial build
- Free developer payment sandbox: accounts, projects, test API keys, `/api/v1` REST API, 10-scenario simulator, explicit state machine with immutable events, hosted checkout, signed webhooks (SSRF-hardened), refund simulation, dashboard, docs, legal drafts, admin console, sample merchant.
- 33 automated tests for the engine (unit + lifecycle scenarios A–H). UI/Firebase layers pending first real build — see `docs/STATUS.md`.
