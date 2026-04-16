# Repo Hygiene — Round 1 Design

**Date:** 2026-04-17  
**Scope:** Security fixes, untrack local files, add LICENSE, delete stale docs, fix absolute paths  
**Out of scope:** ESLint, frontend tests, CI, monitoring

---

## Problem

`smartcapital` is not safe to make public yet:
- `vite.config.ts` injects `GEMINI_API_KEY` into the frontend bundle via `define` — key is server-only and should never reach the browser
- `.env` and `.claude/settings.local.json` are tracked in git
- No root `LICENSE` file
- Three stale build-log docs clog the repo
- `docs/server/TEST_API.md` has absolute local paths that break on GitHub

---

## Commit 1 — Security / Tracking

### 1. Remove GEMINI_API_KEY frontend injection

**File:** `vite.config.ts`

Remove the `define` block entirely (both lines inject the same key):
```ts
// DELETE these two lines:
'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
```

`GEMINI_API_KEY` is only consumed in `server/src/services/geminiParserService.ts`. It has no frontend usage. The `loadEnv` call and `env` variable can also be removed if `define` becomes empty — verify after deletion.

### 2. Untrack `.env`

```bash
git rm --cached .env
```

Add `.env` to `.gitignore` (currently missing).

Create `.env.example` at repo root:
```
# Finnhub API key for live stock prices (used by frontend price service)
VITE_FINNHUB_API_KEY=your_key_here
```

### 3. Untrack `.claude/settings.local.json`

```bash
git rm --cached .claude/settings.local.json
```

Add `.claude/` to `.gitignore`.

---

## Commit 2 — License / Docs

### 4. Add root LICENSE

MIT License, year 2025, holder `LAI-wen`.

### 5. Delete stale build-log docs

- `docs/COMPLETION_SUMMARY.md`
- `docs/IMPLEMENTATION_COMPLETE.md`
- `docs/PROJECT_STATUS_FINAL.md`

These are internal build notes with no value for readers of the public repo.

### 6. Fix absolute paths in `docs/server/TEST_API.md`

Replace all occurrences of `/Users/wen/Documents/smartcapital/server` and `/Users/wen/Documents/dev/smartcapital/server` with `server/` so the commands work when cloned to any machine.

---

## Completion Criteria

- `vite.config.ts` has no `define` block referencing `GEMINI_API_KEY`
- `.env` and `.claude/settings.local.json` are not in `git ls-files`
- `.env.example` exists at repo root
- Root `LICENSE` exists
- Three stale docs deleted
- `docs/server/TEST_API.md` has no `/Users/` paths
- `npm run typecheck` and `npm run build` still pass
