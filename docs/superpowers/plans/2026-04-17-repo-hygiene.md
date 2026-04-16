# Repo Hygiene Round 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `smartcapital` safe and clean to publish publicly — no secret leaks, no tracked local files, proper license, no stale docs with broken paths.

**Architecture:** Two logical commits: security/tracking fixes first, then cosmetic/docs. No new dependencies. No logic changes — pure config and file hygiene.

**Tech Stack:** Git, Vite, MIT License

---

## File Structure

| File | Action |
|---|---|
| `vite.config.ts` | Modify — remove `define` block + `loadEnv` |
| `.gitignore` | Modify — add `.env` and `.claude/` entries |
| `.env` | Untrack (git rm --cached) |
| `.env.example` | Create — Finnhub key placeholder |
| `.claude/settings.local.json` | Untrack (git rm --cached) |
| `LICENSE` | Create — MIT 2025 LAI-wen |
| `docs/COMPLETION_SUMMARY.md` | Delete |
| `docs/IMPLEMENTATION_COMPLETE.md` | Delete |
| `docs/PROJECT_STATUS_FINAL.md` | Delete |
| `docs/server/TEST_API.md` | Modify — fix absolute path |

---

## Task 1: Remove GEMINI_API_KEY frontend injection

**Files:**
- Modify: `vite.config.ts`

- [ ] **Step 1: Remove the `define` block and `loadEnv` from `vite.config.ts`**

The current file uses `loadEnv` only to feed `GEMINI_API_KEY` into `define`. Since `GEMINI_API_KEY` is server-only, both are unnecessary.

Replace the entire file content with:

```typescript
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return;
          }

          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/scheduler/')
          ) {
            return 'framework';
          }

          if (id.includes('react-router')) {
            return 'router';
          }

          if (id.includes('lucide-react')) {
            return 'icons';
          }

          if (id.includes('i18next') || id.includes('react-i18next')) {
            return 'i18n';
          }

          if (id.includes('date-fns')) {
            return 'date-utils';
          }
        }
      }
    }
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
});
```

- [ ] **Step 2: Verify build still passes**

```bash
npm run build 2>&1 | tail -5
```

Expected: `✓ built in X.XXs` with no errors.

- [ ] **Step 3: Verify typecheck still passes**

```bash
npm run typecheck
```

Expected: no output (exit 0).

---

## Task 2: Untrack `.env` and `.claude/settings.local.json`

**Files:**
- Modify: `.gitignore`
- Create: `.env.example`
- Untrack: `.env`, `.claude/settings.local.json`

- [ ] **Step 1: Add `.env` and `.claude/` to `.gitignore`**

Append to the end of `.gitignore`:

```
# Local environment variables
.env

# Claude Code local settings
.claude/
```

- [ ] **Step 2: Untrack `.env` from git without deleting the file**

```bash
git rm --cached .env
```

Expected output: `rm '.env'`

- [ ] **Step 3: Untrack `.claude/settings.local.json` from git without deleting the file**

```bash
git rm --cached .claude/settings.local.json
```

Expected output: `rm '.claude/settings.local.json'`

- [ ] **Step 4: Create `.env.example`**

Create a new file `.env.example` at the repo root with this content:

```
# Finnhub API key — used by the frontend price service for live US stock quotes
# Get a free key at https://finnhub.io
VITE_FINNHUB_API_KEY=your_key_here
```

- [ ] **Step 5: Verify neither file is tracked**

```bash
git ls-files .env .claude/settings.local.json
```

Expected: no output (both untracked).

- [ ] **Step 6: Verify `.env` still exists on disk**

```bash
ls -la .env .env.example
```

Expected: both files present.

---

## Task 3: Commit security fixes

**Files:** all changes from Tasks 1 and 2

- [ ] **Step 1: Stage all changes**

```bash
git add vite.config.ts .gitignore .env.example
```

- [ ] **Step 2: Confirm staging looks right**

```bash
git status
```

Expected:
```
Changes to be committed:
  modified:   .gitignore
  modified:   vite.config.ts
  new file:   .env.example
  deleted:    .env
  deleted:    .claude/settings.local.json
```

- [ ] **Step 3: Commit**

```bash
git commit -m "security: remove GEMINI_API_KEY frontend injection, untrack .env and .claude/settings.local.json"
```

---

## Task 4: Add root LICENSE

**Files:**
- Create: `LICENSE`

- [ ] **Step 1: Create `LICENSE` at repo root**

```
MIT License

Copyright (c) 2025 LAI-wen

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## Task 5: Delete stale docs and fix TEST_API.md

**Files:**
- Delete: `docs/COMPLETION_SUMMARY.md`
- Delete: `docs/IMPLEMENTATION_COMPLETE.md`
- Delete: `docs/PROJECT_STATUS_FINAL.md`
- Modify: `docs/server/TEST_API.md`

- [ ] **Step 1: Delete the three stale docs**

```bash
git rm docs/COMPLETION_SUMMARY.md docs/IMPLEMENTATION_COMPLETE.md docs/PROJECT_STATUS_FINAL.md
```

Expected:
```
rm 'docs/COMPLETION_SUMMARY.md'
rm 'docs/IMPLEMENTATION_COMPLETE.md'
rm 'docs/PROJECT_STATUS_FINAL.md'
```

- [ ] **Step 2: Fix the absolute path in `docs/server/TEST_API.md`**

Find line 278 in `docs/server/TEST_API.md`:
```
cd /Users/wen/Documents/smartcapital/server
```

Replace with:
```
cd server/
```

- [ ] **Step 3: Verify no `/Users/` paths remain in the docs directory**

```bash
grep -rn '/Users/' docs/
```

Expected: no output.

---

## Task 6: Commit cosmetic fixes

**Files:** all changes from Tasks 4 and 5

- [ ] **Step 1: Stage all changes**

```bash
git add LICENSE docs/
```

- [ ] **Step 2: Confirm staging looks right**

```bash
git status
```

Expected:
```
Changes to be committed:
  new file:   LICENSE
  deleted:    docs/COMPLETION_SUMMARY.md
  deleted:    docs/IMPLEMENTATION_COMPLETE.md
  deleted:    docs/PROJECT_STATUS_FINAL.md
  modified:   docs/server/TEST_API.md
```

- [ ] **Step 3: Final build check**

```bash
npm run build 2>&1 | tail -3
```

Expected: `✓ built in X.XXs`

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: add LICENSE, delete stale docs, fix absolute paths in TEST_API.md"
```

---

## Post-Implementation Verification

```bash
# No tracked .env or .claude files
git ls-files .env .claude/

# No GEMINI_API_KEY in frontend bundle config
grep -n 'GEMINI' vite.config.ts

# No absolute paths in docs
grep -rn '/Users/' docs/

# Build passes
npm run build 2>&1 | tail -3
```

All four commands should produce no output (or only the build success line).
