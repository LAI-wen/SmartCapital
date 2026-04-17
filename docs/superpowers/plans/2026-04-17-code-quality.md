# Code Quality Round 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add ESLint (TypeScript + React hooks), Vitest frontend tests for `price.service.ts`, and fix the noisy axios mock in the backend test suite — all without changing production logic.

**Architecture:** Three independent commits. ESLint is pure config. Frontend tests use Vitest with `happy-dom`, mocking `fetch` via `vi.stubGlobal`. Backend fix wires a proper `axios.get` mock so tests exercise the real code path instead of falling back to hardcoded rates.

**Tech Stack:** ESLint 9 flat config, `@typescript-eslint`, `eslint-plugin-react-hooks`, Vitest, `happy-dom`

---

## File Structure

| File | Action |
|---|---|
| `eslint.config.js` | Create — ESLint 9 flat config |
| `package.json` | Modify — add `lint`, `test`, `test:run` scripts; devDeps |
| `tsconfig.json` | Modify — add `vitest/globals` type; add `vitest.config.ts` to include |
| `vitest.config.ts` | Create — Vitest config extending Vite config |
| `services/price.service.ts` | Modify — export `clearPriceCache()` for test isolation |
| `services/price.service.test.ts` | Create — 6 tests for cache, parsers, fallback |
| `server/src/services/exchangeRateService.test.ts` | Modify — add global axios mock setup |

---

## Task 1: ESLint

**Files:**
- Create: `eslint.config.js`
- Modify: `package.json`

- [ ] **Step 1: Install ESLint devDependencies**

```bash
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin "eslint-plugin-react-hooks@^5"
```

Expected: packages added to `node_modules`, no errors.

- [ ] **Step 2: Create `eslint.config.js`**

```js
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'server/**',
      'backup_20251124/**',
      '.worktrees/**',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'react-hooks': reactHooks,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'no-console': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
    },
  },
];
```

- [ ] **Step 3: Add lint script to `package.json`**

In the `"scripts"` block, add:

```json
"lint": "eslint ."
```

- [ ] **Step 4: Run lint and check for errors**

```bash
npm run lint 2>&1 | grep -E "error|warning" | head -20
```

Expected: warnings only (lines containing `warning`). If any line says `error`, proceed to Step 5. If only warnings (or no output), skip to Step 6.

- [ ] **Step 5: (Only if Step 4 shows errors) Downgrade blocking rules**

For each rule that produced `error` output, add an override in `eslint.config.js` to change it to `'warn'`. Common offenders:

- `@typescript-eslint/no-require-imports` → add `'@typescript-eslint/no-require-imports': 'warn'`
- `@typescript-eslint/ban-types` → add `'@typescript-eslint/ban-types': 'warn'`
- Any other rule showing `error` → add `'<rule-name>': 'warn'`

Re-run after each addition until `npm run lint` produces exit code 0.

- [ ] **Step 6: Verify lint exits 0**

```bash
npm run lint; echo "Exit: $?"
```

Expected: `Exit: 0` (warnings are fine, errors are not).

- [ ] **Step 7: Commit**

```bash
git add eslint.config.js package.json package-lock.json
git commit -m "chore: add ESLint with TypeScript and React hooks rules"
```

---

## Task 2: Vitest Infrastructure

**Files:**
- Create: `vitest.config.ts`
- Modify: `tsconfig.json`
- Modify: `services/price.service.ts`
- Modify: `package.json`

- [ ] **Step 1: Install Vitest devDependencies**

```bash
npm install -D vitest happy-dom
```

Expected: packages added to `node_modules`, no errors.

- [ ] **Step 2: Create `vitest.config.ts`**

This extends the Vite config so `import.meta.env` works in tests. `env.VITE_FINNHUB_API_KEY` injects a test key for Finnhub fetches.

```ts
import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(viteConfig, defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    env: {
      VITE_FINNHUB_API_KEY: 'test-key',
    },
  },
}));
```

- [ ] **Step 3: Update `tsconfig.json`**

Add `"vitest/globals"` to the `types` array and `"vitest.config.ts"` to the `include` array.

Current `types`:
```json
"types": ["node", "vite/client"]
```

New `types`:
```json
"types": ["node", "vite/client", "vitest/globals"]
```

Current `include` (last few entries):
```json
"src/**/*.ts",
"src/**/*.tsx",
"vite.config.ts"
```

New (add after `vite.config.ts`):
```json
"src/**/*.ts",
"src/**/*.tsx",
"vite.config.ts",
"vitest.config.ts"
```

- [ ] **Step 4: Add test scripts to `package.json`**

In the `"scripts"` block, add:

```json
"test": "vitest",
"test:run": "vitest run"
```

- [ ] **Step 5: Export `clearPriceCache` from `services/price.service.ts`**

The module-level `priceCache` Map must be resettable between tests. Add this function at the very end of `services/price.service.ts` (after the closing `}` of `fetchLivePrices`):

```ts
export function clearPriceCache(): void {
  priceCache.clear();
}
```

- [ ] **Step 6: Verify the test runner starts with zero tests**

```bash
npm run test:run 2>&1 | tail -5
```

Expected output (or similar):
```
Test Files  0 passed (0)
     Tests  0 passed (0)
```

Exit code 0. If the runner crashes or shows a config error, fix before proceeding.

---

## Task 3: Frontend Price Service Tests

**Files:**
- Create: `services/price.service.test.ts`

Context: `fetchLivePrices(assets)` routes by `asset.currency === 'TWD'` → TWSE, `asset.type === 'Crypto'` → CoinGecko, else → Finnhub. The `Promise.allSettled([fetchTWSE, fetchCoinGecko, fetchFinnhub])` fires all three in parallel, so `mockResolvedValueOnce` calls are consumed in TWSE → CoinGecko → Finnhub order.

- [ ] **Step 1: Create the test file with imports and the asset fixture helper**

Create `services/price.service.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchLivePrices, clearPriceCache } from './price.service';
import type { Asset } from '../types';

type AssetStub = Pick<Asset, 'symbol' | 'currency' | 'type' | 'currentPrice'>;

const a = (stub: AssetStub): Asset => ({
  id: 'test',
  name: 'Test',
  quantity: 1,
  avgPrice: 0,
  change24h: 0,
  history: [],
  ...stub,
});

beforeEach(() => {
  clearPriceCache();
  vi.restoreAllMocks();
});
```

- [ ] **Step 2: Add Test 1 — cache hit**

Append to `services/price.service.test.ts`:

```ts
describe('cache', () => {
  it('returns cached price without re-fetching within TTL', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ msgArray: [{ c: '2330', z: '950' }] }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const asset = a({ symbol: '2330', currency: 'TWD', type: 'Stock', currentPrice: 900 });
    await fetchLivePrices([asset]);
    await fetchLivePrices([asset]);

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
```

- [ ] **Step 3: Add Test 2 — cache expiry**

Append to the `describe('cache', ...)` block:

```ts
  it('re-fetches after TTL expires', async () => {
    vi.useFakeTimers();
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ msgArray: [{ c: '2330', z: '950' }] }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const asset = a({ symbol: '2330', currency: 'TWD', type: 'Stock', currentPrice: 900 });
    await fetchLivePrices([asset]);
    vi.advanceTimersByTime(61_000);
    await fetchLivePrices([asset]);

    expect(mockFetch).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});
```

- [ ] **Step 4: Run Tests 1-2 and verify both pass**

```bash
npm run test:run 2>&1 | tail -8
```

Expected:
```
✓ services/price.service.test.ts (2 tests)
Test Files  1 passed (1)
     Tests  2 passed (2)
```

If tests fail, check that `clearPriceCache` was exported correctly in Step 5 of Task 2.

- [ ] **Step 5: Add Test 3 — TWSE parser**

Append to `services/price.service.test.ts`:

```ts
describe('TWSE', () => {
  it('parses price from msgArray', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ msgArray: [{ c: '2330', z: '950' }] }),
    }));

    const { prices } = await fetchLivePrices([
      a({ symbol: '2330', currency: 'TWD', type: 'Stock', currentPrice: 0 }),
    ]);

    expect(prices.get('2330')).toBe(950);
  });
});
```

- [ ] **Step 6: Add Test 4 — CoinGecko parser**

Append to `services/price.service.test.ts`:

```ts
describe('CoinGecko', () => {
  it('parses BTC price from response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ bitcoin: { usd: 65000 } }),
    }));

    const { prices } = await fetchLivePrices([
      a({ symbol: 'BTC', currency: 'USD', type: 'Crypto', currentPrice: 0 }),
    ]);

    expect(prices.get('BTC')).toBe(65000);
  });
});
```

- [ ] **Step 7: Run Tests 1-4 and verify all pass**

```bash
npm run test:run 2>&1 | tail -8
```

Expected:
```
✓ services/price.service.test.ts (4 tests)
Test Files  1 passed (1)
     Tests  4 passed (4)
```

- [ ] **Step 8: Add Test 5 — Finnhub fallback on HTTP error**

Append to `services/price.service.test.ts`:

```ts
describe('Finnhub', () => {
  it('falls back to currentPrice when response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429 }));

    const asset = a({ symbol: 'AAPL', currency: 'USD', type: 'Stock', currentPrice: 175 });
    const { prices, anyFailed } = await fetchLivePrices([asset]);

    expect(anyFailed).toBe(true);
    expect(prices.get('AAPL')).toBe(175);
  });
});
```

- [ ] **Step 9: Add Test 6 — mixed assets integration**

`fetch` is called in TWSE → CoinGecko → Finnhub order by `Promise.allSettled`. Use `mockResolvedValueOnce` in that order.

Append to `services/price.service.test.ts`:

```ts
describe('fetchLivePrices', () => {
  it('returns prices for mixed TW, Crypto, and US assets', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ msgArray: [{ c: '2330', z: '900' }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ bitcoin: { usd: 60000 } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ c: 180 }),
      }),
    );

    const assets = [
      a({ symbol: '2330', currency: 'TWD', type: 'Stock', currentPrice: 0 }),
      a({ symbol: 'BTC', currency: 'USD', type: 'Crypto', currentPrice: 0 }),
      a({ symbol: 'AAPL', currency: 'USD', type: 'Stock', currentPrice: 0 }),
    ];
    const { prices, anyFailed } = await fetchLivePrices(assets);

    expect(prices.get('2330')).toBe(900);
    expect(prices.get('BTC')).toBe(60000);
    expect(prices.get('AAPL')).toBe(180);
    expect(anyFailed).toBe(false);
  });
});
```

- [ ] **Step 10: Run all 6 tests and verify they all pass**

```bash
npm run test:run 2>&1 | tail -8
```

Expected:
```
✓ services/price.service.test.ts (6 tests)
Test Files  1 passed (1)
     Tests  6 passed (6)
```

If Test 6 fails with wrong price values, the `mockResolvedValueOnce` order may not match the actual `fetch` call order. Debug by adding `console.log` to each fetcher function to observe call order, then reorder the mocks accordingly.

- [ ] **Step 11: Verify typecheck still passes**

```bash
npm run typecheck
```

Expected: no output (exit 0).

- [ ] **Step 12: Commit**

```bash
git add vitest.config.ts tsconfig.json services/price.service.ts services/price.service.test.ts package.json package-lock.json
git commit -m "test: add Vitest frontend tests for price.service"
```

---

## Task 4: Backend Axios Mock Fix

**Files:**
- Modify: `server/src/services/exchangeRateService.test.ts`

Context: `vi.mock('axios')` at line 10 auto-mocks `axios`, but never configures a return value. When `getExchangeRates()` calls `axios.get(url)`, it gets `undefined`. Accessing `undefined.data.rates` throws, the service logs `❌ Failed to fetch` and falls back to hardcoded rates. Fix: add a global `beforeEach` that wires `mockResolvedValue` before every test.

- [ ] **Step 1: Add `import axios from 'axios'` to the test file**

Current line 7 in `server/src/services/exchangeRateService.test.ts`:
```ts
import { getExchangeRate, convertCurrency, getCurrencySymbol, clearCache } from './exchangeRateService.js';
```

Insert after it (new line 8):
```ts
import axios from 'axios';
```

- [ ] **Step 2: Add a top-level `beforeEach` to wire the axios mock**

After the `vi.mock('axios');` line (currently line 10), add a new top-level `beforeEach` block. This runs before every test in the file:

```ts
beforeEach(() => {
  vi.mocked(axios.get).mockResolvedValue({
    data: {
      rates: { TWD: 31.5, USD: 1, EUR: 0.92, JPY: 150, GBP: 0.79 },
    },
  });
});
```

The full top of the file should now look like:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getExchangeRate, convertCurrency, getCurrencySymbol, clearCache } from './exchangeRateService.js';
import axios from 'axios';

// Mock axios
vi.mock('axios');

beforeEach(() => {
  vi.mocked(axios.get).mockResolvedValue({
    data: {
      rates: { TWD: 31.5, USD: 1, EUR: 0.92, JPY: 150, GBP: 0.79 },
    },
  });
});
```

- [ ] **Step 3: Run the backend tests and verify no console noise**

```bash
cd server && npm run test:run 2>&1
```

Expected:
- No `❌ Failed to fetch exchange rates` lines
- No `⚠️ Using default exchange rates as fallback` lines
- All tests still pass: `Tests  67 passed` (or more, since previously-skipped API paths now run)
- Exit code 0

If you see `TypeError: vi.mocked is not a function`, add `import { vi } from 'vitest'` to the imports (it may already be there via `globals: true`).

- [ ] **Step 4: Return to repo root and commit**

```bash
cd ..
git add server/src/services/exchangeRateService.test.ts
git commit -m "fix: wire axios mock in exchangeRateService tests"
```

---

## Post-Implementation Verification

```bash
# ESLint — no errors
npm run lint; echo "Exit: $?"

# Frontend tests — 6 passing
npm run test:run

# Backend tests — no console noise
cd server && npm run test:run 2>&1 | grep -E "Tests|Failed|fallback"

# Typecheck + build still pass
cd .. && npm run typecheck && npm run build 2>&1 | tail -3
```

All commands should exit 0. The `grep` for backend should show only `Tests  67 passed` (or higher) with no `Failed` or `fallback` lines.
