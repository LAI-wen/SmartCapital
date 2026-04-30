# Auth Loop And Ledger Stability Design

## Goal

Stabilize the frontend authentication flow so the app no longer enters a reload loop when LIFF authorization fails or when protected API calls return `401`, and ensure the ledger page behaves predictably while auth is unresolved.

## Problem Summary

The current frontend couples auth failure handling to full page reloads. When a `401` happens, the HTTP layer clears local auth state and calls `window.location.reload()`. If LIFF initialization is already failing, the reload immediately re-enters the same failing path and creates a visible loop.

At the same time, feature pages such as ledger still derive a user id from local storage or generate a fresh guest id even when authentication is unstable. This makes the UI look partially broken rather than clearly unauthenticated.

## Current Root Causes

1. The HTTP client treats any `401` as a hard reload event.
2. LIFF initialization failure is surfaced as an error message, but the app state around auth recovery is not centralized.
3. `getUserId()` can mint a new guest identity on demand, which hides auth problems and causes feature pages to fetch with mismatched identity.

## Recommended Approach

Use a recoverable auth-failure flow instead of reloading the whole app.

### Frontend Auth Recovery

- Replace `401 => clear auth + reload` with `401 => clear tokens + mark auth as expired`.
- Expose a small auth reset signal that app-level code can react to without forcing a browser refresh.
- Keep the recovery logic in one place so service calls and LIFF initialization do not each invent their own fallback behavior.

### LIFF Failure Handling

- Treat LIFF initialization or LINE token exchange failures as terminal for the current session, but recoverable by user action.
- Show a stable error state or welcome state instead of re-triggering login automatically after failure.
- Preserve guest-mode access for non-LIFF browsing when appropriate, but do not silently downgrade a failed LINE login into a fresh guest identity.

### Ledger Stability

- Prevent ledger data loading until auth state is settled.
- Avoid generating a new user id from inside feature services when auth is unresolved.
- If the user is effectively signed out, show the normal welcome / signed-out flow instead of half-loading ledger data.

## Implementation Shape

### 1. HTTP Layer

Update the HTTP core to:

- clear auth tokens on `401`
- emit an in-memory auth-expired event or callback
- stop calling `window.location.reload()`

### 2. App-Level Auth State

Update app shell behavior so that:

- auth expiry returns the user to a stable signed-out state
- expired sessions can land on welcome page without reload loops
- LIFF errors do not compete with loading states

### 3. LIFF Context

Update the LIFF provider so that:

- failed LINE auth does not keep retrying automatically
- guest mode stays explicit
- existing local guest identities are reused only in actual guest flows

### 4. User Identity Access

Update user-id helpers so that:

- protected flows do not create identities implicitly
- guest identity creation is explicit and tied to guest login flow

### 5. Ledger Page

Update ledger loading so that:

- it only fetches after auth is ready
- failed auth does not masquerade as empty or broken transaction data
- user-facing failure messaging stays calm and specific

## Alternatives Considered

### Option A: Remove reload only

This is the smallest patch, but it leaves auth ownership fragmented and risks more partial-broken states.

### Option B: Full auth state machine rewrite

This would be the cleanest long-term architecture, but it is larger than needed for the current bug-fix scope.

### Option C: Recoverable auth reset with targeted page guards

This is the recommended option because it stops the loop quickly while improving the weakest identity boundaries without rewriting the whole app.

## Error Handling

- `LIFF invalid authorization code` should resolve to a stable error or signed-out screen, not a reload.
- `401 Unauthorized` from protected endpoints should clear the session and route the app back to a recoverable state.
- Feature pages should not invent new identity when the real issue is lost auth.

## Testing Plan

1. Verify LIFF-failure path does not reload repeatedly.
2. Verify normal guest mode still reaches the app successfully.
3. Verify signed-in path still loads protected data after valid login.
4. Verify ledger does not fetch with a newly generated identity during auth failure.
5. Run frontend typecheck, lint, tests, and build.

## Scope

In scope:

- frontend auth recovery behavior
- LIFF initialization failure behavior
- ledger auth-readiness guards
- user-id helper tightening

Out of scope:

- redesigning the ledger UI
- changing backend auth contracts
- rewriting the full auth architecture
