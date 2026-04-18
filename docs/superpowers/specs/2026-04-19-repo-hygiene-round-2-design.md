# Repo Hygiene Round 2 Design

**Date:** 2026-04-19  
**Repository:** `/Users/wen/Documents/Development/smartcapital`  
**Topic:** `repo-hygiene-round-2`

## Goal

Close the highest-risk security and stability gaps in `smartcapital` while also improving the project score in the areas that are currently being dragged down by noisy lint results, weak guardrails, and a few correctness issues.

## Why This Round Exists

The project is already feature-rich and broadly functional, but it still has a few problems that disproportionately hurt trust and maintainability:

- Authentication currently includes an unsafe downgrade path that can mint guest JWTs from a real LINE user identifier when LIFF cannot provide an ID token.
- The backend can fall back to a dangerous default JWT secret instead of refusing to start with a broken configuration.
- At least one frontend page can crash on a `null` API response.
- Frontend linting is not currently a reliable quality signal because it includes one real error, multiple correctness warnings, and noise from local snapshot directories that are not part of the product code.

This round is intentionally focused on fixing the highest-leverage issues first rather than attempting a full architectural cleanup.

## In Scope

### 1. Auth Hardening

Harden the authentication flow so unsafe behavior fails closed instead of silently degrading:

- Remove the path where a real LINE-authenticated user can be treated as a guest purely because LIFF did not return an ID token.
- Preserve legitimate guest mode for generated mock guest IDs.
- Require an explicit `JWT_SECRET` in the backend environment and stop startup if it is missing.
- Keep the user-facing failure mode understandable when secure authentication cannot complete.

### 2. Crash and Correctness Fixes

Fix correctness issues that directly affect runtime safety or code health:

- Prevent the known crash path in the budget settings screen when the budget API returns `null`.
- Resolve the current React hooks rule violation that causes frontend lint to fail.
- Fix other tightly related correctness issues only when they are necessary to restore a trustworthy baseline.

### 3. Repo Signal Cleanup

Make local quality signals meaningful again without turning this round into a huge cleanup:

- Stop frontend lint from scanning local snapshot or backup directories that are not part of the shipped app.
- Remove or reduce the highest-noise warnings that most directly hurt the project score, especially warnings tied to correctness or maintainability.
- Keep this cleanup targeted to the active codebase rather than broad stylistic churn.

### 4. Guardrail Verification

Add or update tests around the behavior changed in this round:

- Auth tests for secure failure and valid guest behavior.
- UI or unit tests for crash prevention where practical.
- Verification commands that prove frontend and backend still build and test successfully after the fixes.

## Out of Scope

This round explicitly does **not** include:

- Large-scale UI redesign
- Full decomposition of oversized files such as `App.tsx`, `apiController.ts`, or `webhookController.ts`
- Eliminating every warning in the repository
- Broad documentation refresh unrelated to the fixes above
- New features or product-scope expansion

Those belong in later maintainability- or UX-focused rounds.

## Recommended Approach

### Option A: Security-only patch set

Patch auth and crash issues only, then stop.

**Pros**
- Smallest possible change set
- Fastest path to closing the most dangerous gaps

**Cons**
- Leaves lint quality and repo hygiene largely unimproved
- Does not meaningfully improve engineering score beyond security

### Option B: Security + quality signal recovery

Fix the security and crash issues first, then immediately clean up the narrow set of lint and repo-signal problems that most affect project health.

**Pros**
- Best balance of risk reduction and visible score improvement
- Keeps the round focused and achievable
- Restores trust in local quality tooling

**Cons**
- Slightly broader than a pure hotfix round
- Requires discipline to avoid scope creep

### Option C: Full hygiene sweep

Combine security fixes with broad lint cleanup, large-file refactors, documentation cleanup, and structure changes.

**Pros**
- Highest potential score increase

**Cons**
- Too much surface area for one round
- Higher regression risk
- Too easy to lose focus on the urgent issues

### Recommendation

Use **Option B: Security + quality signal recovery**.

It addresses the most serious problems first while also improving the repo’s engineering signal in a controlled way. This is the best fit for the user goal: fix vulnerabilities quickly and improve the project score in the same round.

## Design

### Workstream 1: Auth Hardening

Primary files:

- `contexts/LiffContext.tsx`
- `services/auth.service.ts`
- `server/src/controllers/authController.ts`
- `server/src/services/authService.ts`

Design decisions:

- Guest login remains supported only for generated guest identifiers that match the app’s explicit guest-mode contract.
- If LIFF initialization succeeds but no ID token is available for a real LINE session, the frontend should fail securely and guide the user to retry or fix configuration instead of reclassifying the session as a guest.
- The backend must reject startup when `JWT_SECRET` is absent. A dangerous fallback string is no longer acceptable.
- Existing valid login and refresh flows should continue to work unchanged for correctly configured environments.

Expected outcome:

- Real users cannot obtain guest JWTs through authentication downgrade.
- Broken secure auth configuration is surfaced immediately instead of being masked.

### Workstream 2: Crash and Correctness Fixes

Primary files:

- `components/BudgetSettingsPage.tsx`
- Any component currently causing a real hooks lint error

Design decisions:

- Runtime crash prevention takes priority over cosmetic cleanup.
- Null handling should be explicit and local to the failure-prone component rather than hidden behind broad defensive patterns.
- Hooks fixes should preserve behavior while making call order unambiguously valid.

Expected outcome:

- The budget settings screen stays stable when its API layer returns `null` or empty data.
- The current frontend lint error is removed without introducing behavior changes.

### Workstream 3: Repo Signal Cleanup

Primary files:

- `eslint.config.js`
- A small set of active source files producing the most important warnings

Design decisions:

- Exclude local snapshot, backup, or scratch directories that are not tracked product code.
- Prefer fixing warnings in real application code over blanket rule suppression.
- Do not chase total warning elimination; only address the warnings that materially improve the score or protect correctness.

Expected outcome:

- Frontend lint once again reflects the quality of the real codebase.
- Local leftovers do not pollute project health signals.

### Workstream 4: Guardrail Verification

Primary files:

- Existing frontend and backend test files
- New focused tests where behavior changes warrant coverage

Design decisions:

- Every behavior change introduced by this round should have a direct verification path.
- Tests should document the intended secure behavior, not just current implementation details.
- Verification remains lightweight and targeted so this round stays fast.

Expected outcome:

- The fixes are protected against immediate regression.
- The repo has a clearer “green means good” baseline after this round.

## Acceptance Criteria

This round is complete when all of the following are true:

- A real LINE-authenticated session can no longer fall back to guest login just because LIFF did not return an ID token.
- Backend startup fails clearly when `JWT_SECRET` is missing.
- The known budget-page crash path is removed.
- The current frontend hooks lint error is fixed.
- Frontend lint is either fully passing or reduced to a small, intentional, explicitly understood set of residual warnings from the active codebase.
- Local snapshot directories such as `ＮＥＷsmartcapital/` no longer distort lint results.
- The most important new behavior is covered by tests.
- Frontend `typecheck`, `test`, and `build` still pass.
- Backend `test` and `build` still pass.

## Risks and Mitigations

### Risk: Secure failure changes current login behavior

Removing insecure fallback may cause some currently “working” but misconfigured environments to stop authenticating.

**Mitigation:** Make the failure explicit and user-readable so configuration issues can be fixed intentionally instead of silently bypassed.

### Risk: Lint cleanup expands too far

Once lint cleanup starts, it is easy to spill into broad stylistic refactors.

**Mitigation:** Limit fixes to correctness, signal quality, and the warnings most responsible for score drag.

### Risk: Authentication changes affect both frontend and backend

This work crosses the client/server boundary and can regress if only one side changes.

**Mitigation:** Verify both sides together and add targeted tests around the changed contract.

## Implementation Notes for the Next Phase

The implementation plan should break the work into small tasks in this order:

1. Auth hardening
2. Crash and hooks correctness fixes
3. Lint signal cleanup
4. Targeted tests and final verification

The implementation phase should run in an isolated worktree and keep this round narrowly scoped to risk reduction and score improvement.
