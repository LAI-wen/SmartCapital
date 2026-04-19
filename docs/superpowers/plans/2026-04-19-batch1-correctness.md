# Batch 1: Correctness & Dead Code Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove three pieces of misinformation — guest mode copy, README branding/deployment, and the deprecated `services/api.ts` compat layer.

**Architecture:** Three independent changes. Each is a direct edit with no new files. After all three, `services/api.ts` has zero callers and is deleted.

**Tech Stack:** React + TypeScript (frontend), Markdown (README)

---

### Task 1: Fix guest mode copy

**Files:**
- Modify: `components/WelcomePage.tsx:136`

- [ ] **Step 1: Edit the misleading copy**

In `components/WelcomePage.tsx`, find line 136 and replace:
```tsx
              訪客模式使用示範資料，不會儲存您的操作
```
With:
```tsx
              以訪客身份登入，資料不與 LINE 帳號綁定
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add components/WelcomePage.tsx
git commit -m "fix: correct guest mode copy to reflect actual behavior"
```

---

### Task 2: Fix README branding and deployment info

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace product name**

In `README.md`, replace every instance of `SmartCapital` used as the **product/app name** with `MiniWallet`. Keep `SmartCapital` where it refers to the GitHub repo name (e.g. in the CI badge URL and repo links — those are structural, not branding).

Lines to check: 1, 3, 5, 27 (run `grep -n "SmartCapital" README.md` to get the full list first).

- [ ] **Step 2: Fix deployment section**

Find the deployment section (around lines 78 and 112) and replace Render references with Fly.io:

```markdown
## 部署

- **前端：** Vercel
- **後端：** Fly.io（東京節點 `nrt`，app: `smartcapital-linebot`，設定檔: `server/fly.toml`）
```

Remove any remaining mention of "Render" from the deployment section.

- [ ] **Step 3: Verify the file looks right**

Run: `grep -n "Render\|SmartCapital" README.md`
Expected: zero matches (or only matches inside GitHub repo URLs where the repo is named SmartCapital)

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: update branding to MiniWallet and deployment to Fly.io"
```

---

### Task 3: Remove `services/api.ts` compat layer

**Files:**
- Modify: `App.tsx:10`
- Modify: `components/SettingsPage.tsx:9`
- Delete: `services/api.ts`

- [ ] **Step 1: Fix import in App.tsx**

In `App.tsx`, replace line 10:
```tsx
import { getAccounts, getAssets as fetchAssets, createAccount, getUser } from './services/api';
```
With:
```tsx
import { getAccounts, getAssets as fetchAssets, createAccount, getUser } from './services';
```

- [ ] **Step 2: Fix import in SettingsPage.tsx**

In `components/SettingsPage.tsx`, replace line 9:
```tsx
import { updateInvestmentScope } from '../services/api';
```
With:
```tsx
import { updateInvestmentScope } from '../services';
```

- [ ] **Step 3: Verify no remaining callers**

Run: `grep -rn "from.*services/api" . --include="*.ts" --include="*.tsx" | grep -v "node_modules" | grep -v "services/api.ts:"`
Expected: no output

- [ ] **Step 4: Verify typecheck still passes**

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 5: Delete the compat file**

```bash
rm services/api.ts
```

- [ ] **Step 6: Verify build still passes**

Run: `npm run typecheck && npm run test:run && npm run build`
Expected: all pass, `✓ built in X.XXs` at the end

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: remove deprecated services/api.ts compat layer"
```
