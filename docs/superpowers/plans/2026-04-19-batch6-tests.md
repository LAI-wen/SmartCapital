# Batch 6: Frontend Test Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Increase frontend test coverage from 25 tests (3 files) to ~70+ tests covering the services layer and key auth flows.

**Architecture:** Unit tests for `services/` using Vitest + `vi.mock` on `services/core/http.ts`. No DOM tests unless a component has non-trivial logic. Test files live alongside the modules they test.

**Tech Stack:** Vitest, `@testing-library/react` (already installed), TypeScript

---

### How to mock HTTP in frontend tests

All service functions go through `services/core/http.ts` (`get`, `post`, `del`). Mock at that boundary:

```typescript
vi.mock('../core/http', () => ({
  get: vi.fn(),
  post: vi.fn(),
  del: vi.fn(),
}));

import { get, post } from '../core/http';

beforeEach(() => {
  vi.resetAllMocks();
});
```

---

### Task 1: Test `transaction.service.ts`

**Files:**
- Create: `services/transaction.service.test.ts`

- [ ] **Step 1: Write the test file**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./core/http', () => ({
  get: vi.fn(),
  post: vi.fn(),
  del: vi.fn(),
}));

import { get, post, del } from './core/http';
import { getTransactions, createTransaction, deleteTransaction, batchDeleteTransactions } from './transaction.service';

beforeEach(() => vi.resetAllMocks());

describe('getTransactions', () => {
  it('calls GET /api/transactions/:userId with correct limit', async () => {
    vi.mocked(get).mockResolvedValue([]);
    const result = await getTransactions(100);
    expect(get).toHaveBeenCalledWith(expect.stringContaining('limit=100'));
    expect(result).toEqual([]);
  });

  it('defaults to 50 transactions', async () => {
    vi.mocked(get).mockResolvedValue([]);
    await getTransactions();
    expect(get).toHaveBeenCalledWith(expect.stringContaining('limit=50'));
  });
});

describe('createTransaction', () => {
  it('calls POST with correct body', async () => {
    const mockTx = { id: 'tx1', type: 'expense', amount: 100, category: '飲食' };
    vi.mocked(post).mockResolvedValue(mockTx);

    const result = await createTransaction({ type: 'expense', amount: 100, category: '飲食' });
    expect(post).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ type: 'expense', amount: 100 }));
    expect(result).toEqual(mockTx);
  });
});

describe('deleteTransaction', () => {
  it('calls DELETE with transactionId', async () => {
    vi.mocked(del).mockResolvedValue(undefined);
    await deleteTransaction('tx123');
    expect(del).toHaveBeenCalledWith(expect.stringContaining('tx123'));
  });
});

describe('batchDeleteTransactions', () => {
  it('calls POST batch-delete with ids array', async () => {
    vi.mocked(post).mockResolvedValue({ deletedCount: 2 });
    const result = await batchDeleteTransactions(['tx1', 'tx2']);
    expect(post).toHaveBeenCalledWith(expect.stringContaining('batch-delete'), expect.objectContaining({ transactionIds: ['tx1', 'tx2'] }));
    expect(result).toEqual({ deletedCount: 2 });
  });
});
```

- [ ] **Step 2: Run the tests**

```bash
npm run test:run services/transaction.service.test.ts
```
Expected: 4 tests pass. If they fail because the service function signature differs, read `services/transaction.service.ts` and adjust the test to match the actual exported function names and parameters.

- [ ] **Step 3: Commit**

```bash
git add services/transaction.service.test.ts
git commit -m "test: add transaction service unit tests"
```

---

### Task 2: Test `account.service.ts`

**Files:**
- Create: `services/account.service.test.ts`

- [ ] **Step 1: Write the test file**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./core/http', () => ({
  get: vi.fn(),
  post: vi.fn(),
  del: vi.fn(),
  patch: vi.fn(),
}));

import { get, post, del, patch } from './core/http';
import { getAccounts, createAccount, deleteAccount, createTransfer, getTransfers } from './account.service';

beforeEach(() => vi.resetAllMocks());

describe('getAccounts', () => {
  it('returns accounts array', async () => {
    const mockAccounts = [{ id: 'acc1', name: '現金', balance: 1000 }];
    vi.mocked(get).mockResolvedValue(mockAccounts);
    const result = await getAccounts();
    expect(result).toEqual(mockAccounts);
  });
});

describe('createAccount', () => {
  it('posts with required fields', async () => {
    const newAcc = { id: 'acc2', name: '銀行', type: 'BANK', currency: 'TWD', balance: 0 };
    vi.mocked(post).mockResolvedValue(newAcc);
    const result = await createAccount({ name: '銀行', type: 'BANK', currency: 'TWD' });
    expect(post).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ name: '銀行', type: 'BANK' }));
    expect(result).toEqual(newAcc);
  });
});

describe('deleteAccount', () => {
  it('calls DELETE with accountId', async () => {
    vi.mocked(del).mockResolvedValue(undefined);
    await deleteAccount('acc1');
    expect(del).toHaveBeenCalledWith(expect.stringContaining('acc1'));
  });
});

describe('createTransfer', () => {
  it('calls POST with transfer details', async () => {
    vi.mocked(post).mockResolvedValue({ id: 'tr1' });
    await createTransfer({ fromAccountId: 'acc1', toAccountId: 'acc2', amount: 500 });
    expect(post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ fromAccountId: 'acc1', toAccountId: 'acc2', amount: 500 })
    );
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npm run test:run services/account.service.test.ts
```
Expected: 4 tests pass. Adjust test to match actual exported function signatures if needed.

- [ ] **Step 3: Commit**

```bash
git add services/account.service.test.ts
git commit -m "test: add account service unit tests"
```

---

### Task 3: Test `auth.service.ts` — token validity flow

**Files:**
- Create: `services/auth.service.test.ts`

- [ ] **Step 1: Write tests for `isAuthenticated` and `autoRefreshToken`**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('./core/http', () => ({
  post: vi.fn(),
}));

import { post } from './core/http';
import { isAuthenticated, autoRefreshToken } from './auth.service';

const TOKEN_KEY = 'authToken';
const EXPIRY_KEY = 'tokenExpiry';
const REFRESH_KEY = 'refreshToken';

beforeEach(() => {
  localStorage.clear();
  vi.resetAllMocks();
});

afterEach(() => {
  localStorage.clear();
});

describe('isAuthenticated', () => {
  it('returns false when no token in localStorage', () => {
    expect(isAuthenticated()).toBe(false);
  });

  it('returns false when token is expired', () => {
    localStorage.setItem(TOKEN_KEY, 'tok');
    localStorage.setItem(EXPIRY_KEY, String(Date.now() - 1000));
    expect(isAuthenticated()).toBe(false);
  });

  it('returns true when token is valid and not expired', () => {
    localStorage.setItem(TOKEN_KEY, 'tok');
    localStorage.setItem(EXPIRY_KEY, String(Date.now() + 60000));
    expect(isAuthenticated()).toBe(true);
  });
});

describe('autoRefreshToken', () => {
  it('calls refresh endpoint with stored refresh token', async () => {
    localStorage.setItem(REFRESH_KEY, 'refresh_tok');
    vi.mocked(post).mockResolvedValue({
      token: 'new_token',
      refreshToken: 'new_refresh',
      expiresIn: 3600,
    });

    await autoRefreshToken();
    expect(post).toHaveBeenCalledWith(expect.stringContaining('refresh'), expect.objectContaining({ refreshToken: 'refresh_tok' }));
  });

  it('does nothing when no refresh token stored', async () => {
    await autoRefreshToken();
    expect(post).not.toHaveBeenCalled();
  });
});
```

Note: The exact localStorage key names and the `post` call path depend on what's in `services/auth.service.ts`. Read lines 1–80 of that file to verify the keys used and adjust the test constants accordingly.

- [ ] **Step 2: Run tests**

```bash
npm run test:run services/auth.service.test.ts
```
Expected: 5 tests pass.

- [ ] **Step 3: Commit**

```bash
git add services/auth.service.test.ts
git commit -m "test: add auth service unit tests for token validity flow"
```

---

### Task 4: Verify full CI gate passes

- [ ] **Step 1: Run all frontend tests**

```bash
npm run test:run
```
Expected: all test files pass, test count now ≥ 35

- [ ] **Step 2: Run lint and build**

```bash
npm run lint -- --max-warnings 0 && npm run build
```
Expected: both pass

- [ ] **Step 3: Final commit if any cleanup needed**

```bash
git add -A
git commit -m "test: frontend service test suite complete"
```
