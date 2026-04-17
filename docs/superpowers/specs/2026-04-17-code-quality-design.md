# Code Quality — Round 2 Design

**Date:** 2026-04-17
**Scope:** ESLint (frontend), Vitest frontend service tests, backend axios mock fix
**Out of scope:** Component rendering tests, CI/CD, backend ESLint, coverage thresholds

---

## Problem

`smartcapital` has no linting and no frontend tests. The backend test suite passes but with noisy console output caused by an incomplete axios mock. All three issues reduce trust in code quality when the repo is reviewed publicly.

---

## Commit Strategy

Three independent commits:

1. `chore: add ESLint with TypeScript and React hooks rules`
2. `test: add Vitest frontend tests for price.service`
3. `fix: wire axios mock in exchangeRateService tests`

---

## Part 1 — ESLint (Frontend)

### New files

| File | Action |
|---|---|
| `eslint.config.js` | Create — flat config (ESLint 9) |
| `package.json` | Modify — add `lint` script, add devDeps |

### Dependencies (devDependencies)

```
eslint
@typescript-eslint/eslint-plugin
@typescript-eslint/parser
eslint-plugin-react-hooks
```

### `eslint.config.js` content

```js
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  {
    files: ['**/*.ts', '**/*.tsx'],
    ignores: ['dist/**', 'node_modules/**', 'server/**', 'backup_20251124/**'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'react-hooks': reactHooks,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'no-console': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
];
```

### `package.json` script addition

```json
"lint": "eslint ."
```

### Completion criteria

- `npm run lint` exits 0 (or with only warnings — no errors)
- If `recommended` rules produce errors on existing code, downgrade blocking rules to `warn` to keep the pipeline green without rewriting the codebase

---

## Part 2 — Frontend Vitest Tests

### New files

| File | Action |
|---|---|
| `vitest.config.ts` | Create — root-level Vitest config |
| `services/price.service.ts` | Modify — export `clearPriceCache()` for test isolation |
| `services/price.service.test.ts` | Create — 6 test cases |
| `package.json` | Modify — add `test` and `test:run` scripts, add devDeps |

### Dependencies (devDependencies)

```
vitest
happy-dom
```

### `vitest.config.ts` content

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    // inject VITE_ env for price.service.ts; if define doesn't propagate,
    // fallback: add vi.stubEnv('VITE_FINNHUB_API_KEY', 'test-key') in beforeEach
    define: {
      'import.meta.env.VITE_FINNHUB_API_KEY': JSON.stringify('test-key'),
    },
  },
});
```

### `package.json` script additions

```json
"test": "vitest",
"test:run": "vitest run"
```

### Asset test fixture

`Asset` has required fields (`id`, `name`, `quantity`, `avgPrice`, `change24h`, `history`). Use this helper at the top of the test file:

```ts
import type { Asset } from '../types';

const a = (overrides: Pick<Asset, 'symbol' | 'currency' | 'type' | 'currentPrice'>): Asset => ({
  id: 'test', name: 'Test', quantity: 1, avgPrice: 0,
  change24h: 0, history: [],
  ...overrides,
});
```

`fetchLivePrices` routes by: `currency === 'TWD'` → TWSE, `type === 'Crypto'` → CoinGecko, else → Finnhub.

### Test cases — `services/price.service.test.ts`

Each test calls `vi.stubGlobal('fetch', ...)` and clears the module-level price cache with a `beforeEach` that re-imports the module (or exports a `clearPriceCache` from `price.service.ts`).

**Test 1: Cache hit**
Call `fetchLivePrices` twice with the same TW asset. `fetch` is called only once.

```ts
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

**Test 2: Cache expiry**
After advancing time by 61 seconds, `fetch` is called again.

```ts
it('re-fetches after TTL expires', async () => {
  vi.useFakeTimers();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ msgArray: [{ c: '2330', z: '950' }] }),
  }));

  const asset = a({ symbol: '2330', currency: 'TWD', type: 'Stock', currentPrice: 900 });
  await fetchLivePrices([asset]);
  vi.advanceTimersByTime(61_000);
  await fetchLivePrices([asset]);

  expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
  vi.useRealTimers();
});
```

**Test 3: TWSE parse**
Mock returns `{ msgArray: [{ c: '2330', z: '950' }] }`. Expect `prices.get('2330') === 950`.

```ts
it('parses TWSE price from msgArray', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ msgArray: [{ c: '2330', z: '950' }] }),
  }));

  const { prices } = await fetchLivePrices([
    a({ symbol: '2330', currency: 'TWD', type: 'Stock', currentPrice: 0 }),
  ]);
  expect(prices.get('2330')).toBe(950);
});
```

**Test 4: CoinGecko parse**
Mock returns `{ bitcoin: { usd: 65000 } }`. Expect `prices.get('BTC') === 65000`.

```ts
it('parses CoinGecko price for BTC', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ bitcoin: { usd: 65000 } }),
  }));

  const { prices } = await fetchLivePrices([
    a({ symbol: 'BTC', currency: 'USD', type: 'Crypto', currentPrice: 0 }),
  ]);
  expect(prices.get('BTC')).toBe(65000);
});
```

**Test 5: Finnhub fallback on HTTP error**
Mock returns `{ ok: false, status: 429 }`. Expect `anyFailed === true` and `prices.get('AAPL') === 175`.

```ts
it('falls back to currentPrice when Finnhub returns non-ok', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429 }));

  const asset = a({ symbol: 'AAPL', currency: 'USD', type: 'Stock', currentPrice: 175 });
  const { prices, anyFailed } = await fetchLivePrices([asset]);

  expect(anyFailed).toBe(true);
  expect(prices.get('AAPL')).toBe(175);
});
```

**Test 6: fetchLivePrices mixed assets**
One TW + one Crypto + one US asset. `fetch` is called three times (TWSE, CoinGecko, Finnhub) in that order via `Promise.allSettled`. Expect all three symbols in the prices map.

```ts
it('returns prices for mixed TW, CRYPTO, and US assets', async () => {
  vi.stubGlobal('fetch', vi.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ msgArray: [{ c: '2330', z: '900' }] }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ bitcoin: { usd: 60000 } }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ c: 180 }) })
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
```

### Completion criteria

- `npm run test:run` exits 0
- All 6 tests pass
- No real network calls made during tests

---

## Part 3 — Backend Axios Mock Fix

### File modified

| File | Action |
|---|---|
| `server/src/services/exchangeRateService.test.ts` | Modify — add `mockResolvedValue` setup |

### Fix

In the `describe('多種貨幣對')` block, add a `beforeEach` that sets up `axios.get` to return a valid response before each test:

```ts
import axios from 'axios';

// inside describe('多種貨幣對', ...)
beforeEach(() => {
  vi.mocked(axios.get).mockResolvedValue({
    data: {
      rates: { TWD: 31.5, USD: 1, EUR: 0.92, JPY: 150, GBP: 0.79 }
    }
  });
});
```

Same fix applied to any other `describe` block that calls multi-currency conversion and currently relies on the fallback path.

### Completion criteria

- `cd server && npm run test:run` exits 0
- No `❌ Failed to fetch exchange rates` in test output
- All 67 tests still pass (or more, if previously-skipped paths now execute)

---

## Completion Criteria (all three)

```bash
npm run lint          # no errors (warnings ok)
npm run test:run      # 6 frontend tests pass
cd server && npm run test:run  # 67+ tests pass, no console noise
npm run typecheck     # still passes
npm run build         # still passes
```
