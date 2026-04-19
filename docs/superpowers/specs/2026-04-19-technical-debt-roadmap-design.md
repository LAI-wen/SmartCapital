# Technical Debt Roadmap Design

**Goal:** Systematically resolve all known correctness issues, deprecated code, and structural debt in the MiniWallet codebase across 6 sequential batches.

**Architecture:** Each batch is independently shippable and leaves the codebase in a cleaner, passing state. No batch depends on a later batch to compile or pass tests.

**Tech Stack:** React + TypeScript + Vite (frontend), Node.js + Express + Prisma (backend), Vitest (tests), GitHub Actions CI

---

## Batch 1 — Correctness & Dead Code (~30 min)

Three independent fixes that remove misinformation and delete completed compatibility shims.

### 1a. Guest mode copy fix
- **File:** `components/WelcomePage.tsx:136`
- **Change:** Replace `訪客模式使用示範資料，不會儲存您的操作` with `以訪客身份登入，資料不與 LINE 帳號綁定`
- **Rationale:** Server creates a real DB user; the current text is factually wrong. Implementation stays unchanged.

### 1b. README branding + deployment
- **File:** `README.md`
- **Changes:**
  - Replace all occurrences of `SmartCapital` product name with `MiniWallet` (keep repo/GitHub references as-is)
  - Update deployment section: remove Render references, document Fly.io (`server/fly.toml`, app `smartcapital-linebot`, region `nrt`)

### 1c. Remove `services/api.ts` compat layer imports
- **Files:** `App.tsx:10`, `components/SettingsPage.tsx:9`
- **Change:** Update both import lines to use domain-specific services:
  - `App.tsx`: import `getAccounts`, `getAssets`, `createAccount`, `getUser` from `./services` (barrel index)
  - `SettingsPage.tsx`: import `updateInvestmentScope` from `../services`
- **After:** `services/api.ts` has zero callers outside itself; delete the file
- **Verify:** `npm run typecheck && npm run test:run && npm run build` all pass

---

## Batch 2 — Tailwind CDN → Proper Install (~1 hr)

Remove runtime CDN dependency; Tailwind becomes a build-time tool with full purge/tree-shaking.

### Approach
Use `@tailwindcss/vite` plugin (Tailwind v4 native Vite integration, no PostCSS config needed).

### Steps
1. `npm install -D tailwindcss @tailwindcss/vite`
2. Add `@tailwindcss/vite` to `vite.config.ts` plugins array
3. Create `src/index.css` (or update existing) with `@import "tailwindcss"`
4. Import the CSS in `main.tsx` (if not already)
5. Remove `<script src="https://cdn.tailwindcss.com">` and `tailwind.config` inline block from `index.html`
6. Verify: `npm run build` produces same visual output, bundle size drops (no 300kb CDN runtime)

### Risk
Tailwind v4 uses different config syntax from v3. The inline `tailwind.config` block in `index.html` sets custom theme values — must migrate these into CSS `@theme` block or `vite.config.ts`.

---

## Batch 3 — Split `webhookController.ts` (~2 hr)

1468-line file mixes intent parsing, conversation state, DB writes, and LINE reply formatting.

### Target structure
```
server/src/controllers/webhook/
  index.ts          ← thin entry (exported WebhookController class stays)
  intentRouter.ts   ← maps parsed intent → handler function
  handlers/
    transactionHandler.ts   ← 記帳 intents
    assetHandler.ts         ← 資產 intents
    alertHandler.ts         ← 警示 intents
    queryHandler.ts         ← 查詢/報告 intents
  replyBuilder.ts   ← LINE Flex Message construction helpers
```

### Constraint
`index.ts` imports `WebhookController` by class name — the export interface must not change.

### Verify
`npm run test:run` (server) passes; manual LINE Bot smoke test not required for CI gate.

---

## Batch 4 — Split Large Frontend Components (~2 hr)

Target files: `Ledger.tsx` (938 lines), `AnalyticsPage.tsx` (898 lines).

### Ledger.tsx
Split into:
- `Ledger.tsx` — container: state, data fetching, handlers
- `components/ledger/TransactionList.tsx` — pure list rendering
- `components/ledger/TransactionForm.tsx` — add/edit form
- `components/ledger/TransactionFilters.tsx` — filter bar

### AnalyticsPage.tsx
Split into:
- `AnalyticsPage.tsx` — container: state, data aggregation
- `components/analytics/SummaryCards.tsx` — top stat cards
- `components/analytics/CategoryChart.tsx` — pie/bar chart section
- `components/analytics/DayPanel.tsx` — calendar day detail panel

### Constraint
Route paths in `App.tsx` reference component names — imports update but route strings stay unchanged.

### Verify
`npm run typecheck && npm run build` pass; visual regression check in browser.

---

## Batch 5 — Zod Request Validation (~2 hr)

Replace manual `if (!field)` guards in backend controllers with Zod schemas at API boundaries.

### Scope
Controllers to validate: `transactionController.ts`, `accountController.ts`, `alertController.ts`, `budgetController.ts`, `userController.ts`, `authController.ts`

### Approach
1. `npm install zod` in `server/`
2. Create `server/src/middleware/validate.ts` — Express middleware that takes a Zod schema, calls `schema.safeParse(req.body)`, returns 400 with Zod error messages on failure
3. Define schemas in `server/src/schemas/` (one file per domain)
4. Replace manual validation in each controller with `validate(schema)` middleware on the route in `index.ts`
5. Remove now-redundant manual `if (!field)` blocks from controllers

### Verify
Existing controller tests still pass (validation tested via middleware unit tests, not controller tests).

---

## Batch 6 — Frontend Test Coverage (ongoing)

Current state: 25 tests across 3 files, no component tests.

### Priority targets
1. `services/` — unit tests for `transaction.service.ts`, `account.service.ts`, `auth.service.ts`
2. `components/WelcomePage.tsx` — auth flow branching
3. `App.tsx` auth init — token-validity-first flow

### Approach
Use Vitest + `@testing-library/react` (already installed). Mock `services/core/http.ts` at module boundary.

### Gate
No hard completion target — add tests alongside each Batch 3–5 change that touches the relevant code.

---

## Out of Scope

- `App.tsx` structural split (auth + routing + data loading) — deferred; fixing imports in Batch 1 first, then reassess
- `StrategyLab.tsx` (668 lines) — deferred; less frequently touched
- LINE Bot E2E tests — requires external infra, not in scope
