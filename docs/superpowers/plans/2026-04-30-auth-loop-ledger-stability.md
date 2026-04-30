# Auth Loop And Ledger Stability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the frontend auth reload loop, make LIFF failures recoverable, and keep ledger from loading with unstable identity.

**Architecture:** Replace browser reloads with an in-memory auth-expired signal, let app-shell code own the signed-out fallback, and tighten user-id access so feature pages only load after auth is settled. Keep the fix frontend-only and focused on the current auth and ledger flows.

**Tech Stack:** React 19, TypeScript, Vite, LIFF SDK, localStorage-backed auth helpers, Vitest, ESLint

---

## File Map

- Modify: `/Users/wen/Documents/Development/smartcapital/services/core/http.ts`
  Own auth-expired signaling and remove hard reload behavior.
- Modify: `/Users/wen/Documents/Development/smartcapital/services/auth.service.ts`
  Centralize token clearing helpers used by auth recovery.
- Modify: `/Users/wen/Documents/Development/smartcapital/services/user.service.ts`
  Make guest identity creation explicit instead of implicit in protected flows.
- Modify: `/Users/wen/Documents/Development/smartcapital/contexts/LiffContext.tsx`
  Prevent automatic retry loops and keep guest-mode behavior explicit.
- Modify: `/Users/wen/Documents/Development/smartcapital/App.tsx`
  React to auth-expired state and gate protected data loading on settled auth.
- Modify: `/Users/wen/Documents/Development/smartcapital/components/Ledger.tsx`
  Avoid ledger fetches until auth is ready.
- Test: `/Users/wen/Documents/Development/smartcapital` package scripts

### Task 1: Replace Reload-Based 401 Handling

**Files:**
- Modify: `/Users/wen/Documents/Development/smartcapital/services/core/http.ts`
- Modify: `/Users/wen/Documents/Development/smartcapital/services/auth.service.ts`

- [ ] **Step 1: Add a small auth-expired event mechanism in the HTTP layer**

Create a module-level subscriber set in `services/core/http.ts`, export a subscribe helper, and replace the old reload call with token clearing plus event emission.

- [ ] **Step 2: Reuse auth token clearing from the auth service**

Export token key constants or a shared clear function from `services/auth.service.ts` so HTTP auth recovery does not duplicate storage-clearing logic.

- [ ] **Step 3: Remove `window.location.reload()` from 401 handling**

Update `assertOk()` so `401` clears auth state and notifies listeners, then throws `ApiError(401, ...)` without reloading.

- [ ] **Step 4: Run frontend typecheck**

Run: `npm run typecheck`
Expected: PASS

### Task 2: Make App-Level Auth Recovery Explicit

**Files:**
- Modify: `/Users/wen/Documents/Development/smartcapital/App.tsx`

- [ ] **Step 1: Add explicit auth-settled / auth-expired state**

Track whether the app has resolved to signed-in, guest, or signed-out, and subscribe to the auth-expired signal from the HTTP layer.

- [ ] **Step 2: Route expired auth back to a stable signed-out view**

On auth-expired, clear UI session markers, reset user-owned state, and show welcome instead of leaving the app in a loading loop.

- [ ] **Step 3: Gate protected startup fetches**

Do not fetch user settings, accounts, or assets until auth is ready enough for the chosen mode. If LIFF has errored or auth has expired, skip protected fetches.

- [ ] **Step 4: Run frontend typecheck**

Run: `npm run typecheck`
Expected: PASS

### Task 3: Tighten LIFF And Identity Fallbacks

**Files:**
- Modify: `/Users/wen/Documents/Development/smartcapital/contexts/LiffContext.tsx`
- Modify: `/Users/wen/Documents/Development/smartcapital/services/user.service.ts`

- [ ] **Step 1: Keep guest identity creation inside explicit guest flows**

Add a helper in `user.service.ts` for reading existing user id without creating a new one, and a separate explicit guest-id creation path.

- [ ] **Step 2: Update LIFF context to avoid silent downgrade**

If LINE login fails, surface a stable error state and stop retrying automatically. Only reuse or create guest identities when the app is actually in guest mode.

- [ ] **Step 3: Preserve non-LIFF browser access**

When `VITE_LIFF_ID` is missing or guest mode is selected, continue to support guest login intentionally, but do not let protected pages auto-create identities during auth failure.

- [ ] **Step 4: Run frontend typecheck**

Run: `npm run typecheck`
Expected: PASS

### Task 4: Guard Ledger Loading

**Files:**
- Modify: `/Users/wen/Documents/Development/smartcapital/components/Ledger.tsx`

- [ ] **Step 1: Add an auth-readiness prop or equivalent guard**

Make `Ledger` wait until app auth is settled before loading transactions and budgets.

- [ ] **Step 2: Keep failure mode calm**

If the user is signed out, ledger should not look broken; it should simply avoid firing protected requests until the app returns to a valid session.

- [ ] **Step 3: Run frontend typecheck**

Run: `npm run typecheck`
Expected: PASS

### Task 5: Verify The Frontend End-To-End At Repo-Script Level

**Files:**
- Test: `/Users/wen/Documents/Development/smartcapital`

- [ ] **Step 1: Run lint**

Run: `npm run lint -- --max-warnings 0`
Expected: PASS

- [ ] **Step 2: Run tests**

Run: `npm run test:run`
Expected: PASS

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Summarize residual risk**

Document any remaining limitation, especially that a truly invalid LIFF authorization code still needs user re-entry or manual retry rather than silent recovery.
