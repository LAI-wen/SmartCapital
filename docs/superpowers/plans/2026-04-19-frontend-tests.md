# Frontend Tests Round 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 18 new frontend tests covering `exchangeRateService` pure functions and `CurrencyAmount` component rendering, bringing the total from 6 to 24 tests.

**Architecture:** Two new test files (`services/exchangeRateService.test.ts` and `components/CurrencyAmount.test.tsx`) plus `@testing-library/react` devDependency. All tests run in the existing Vitest + happy-dom environment with no config changes required.

**Tech Stack:** Vitest 4.x, happy-dom, @testing-library/react, TypeScript

---

## File Structure

| File | Action |
|------|--------|
| `package.json` | Modify — add `@testing-library/react` devDependency |
| `package-lock.json` | Auto-updated by npm install |
| `services/exchangeRateService.test.ts` | Create — 14 tests for pure functions and fetch-backed functions |
| `components/CurrencyAmount.test.tsx` | Create — 4 tests for conditional rendering branches |

---

## Task 1: Install @testing-library/react

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the dependency**

```bash
npm install --save-dev @testing-library/react
```

Expected: exits 0. `package.json` now has `"@testing-library/react"` under `devDependencies`.

- [ ] **Step 2: Verify existing tests still pass**

```bash
npm run test:run
```

Expected: `6 passed`, 0 failures.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "test: install @testing-library/react"
```

---

## Task 2: exchangeRateService tests

**Files:**
- Create: `services/exchangeRateService.test.ts`

Context on the source file (`services/exchangeRateService.ts`):
- `getCurrencySymbol(currency)` — pure lookup map, returns `currency` itself for unknown codes
- `formatCurrencyAmount(amount, currency)` — pure: returns `${getCurrencySymbol(currency)}${amount.toLocaleString()}`
- `getExchangeRate(from, to)` — returns `1.0` early if `from === to`; otherwise calls `getExchangeRates('USD')` which fetches `${VITE_API_URL}/api/exchange-rates?base=USD` and returns `result.data.rates`; then applies USD→X, X→USD, or X→Y logic
- `convertCurrency(amount, from, to)` — returns `amount` early if `from === to`; otherwise fetches `${VITE_API_URL}/api/exchange-rates/convert?from=...` and returns `result.data.convertedAmount`; falls back to `amount` on error

Mock strategy: `vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: async () => ({...}) }))`. Always clean up with `vi.unstubAllGlobals()` in `afterEach`.

Use amounts under 1000 in all tests to avoid `toLocaleString()` locale differences across environments.

- [ ] **Step 1: Create `services/exchangeRateService.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getCurrencySymbol,
  formatCurrencyAmount,
  getExchangeRate,
  convertCurrency,
} from './exchangeRateService';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getCurrencySymbol', () => {
  it('returns NT$ for TWD', () => {
    expect(getCurrencySymbol('TWD')).toBe('NT$');
  });

  it('returns $ for USD', () => {
    expect(getCurrencySymbol('USD')).toBe('$');
  });

  it('returns ¥ for JPY', () => {
    expect(getCurrencySymbol('JPY')).toBe('¥');
  });

  it('returns the code itself for unknown currencies', () => {
    expect(getCurrencySymbol('XYZ')).toBe('XYZ');
  });
});

describe('formatCurrencyAmount', () => {
  it('formats USD amount with $ symbol', () => {
    expect(formatCurrencyAmount(50, 'USD')).toBe('$50');
  });

  it('formats TWD amount with NT$ symbol', () => {
    expect(formatCurrencyAmount(50, 'TWD')).toBe('NT$50');
  });

  it('formats zero correctly', () => {
    expect(formatCurrencyAmount(0, 'TWD')).toBe('NT$0');
  });
});

describe('getExchangeRate', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: async () => ({
        success: true,
        data: { rates: { TWD: 31.5, JPY: 150 } },
      }),
    }));
  });

  it('returns 1.0 for same currency without calling fetch', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    expect(await getExchangeRate('TWD', 'TWD')).toBe(1.0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns rate for USD to TWD', async () => {
    expect(await getExchangeRate('USD', 'TWD')).toBe(31.5);
  });

  it('returns reciprocal for TWD to USD', async () => {
    expect(await getExchangeRate('TWD', 'USD')).toBeCloseTo(1 / 31.5);
  });

  it('returns cross rate for TWD to JPY via USD', async () => {
    expect(await getExchangeRate('TWD', 'JPY')).toBeCloseTo(150 / 31.5);
  });
});

describe('convertCurrency', () => {
  it('returns amount without calling fetch when from === to', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    expect(await convertCurrency(100, 'TWD', 'TWD')).toBe(100);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns convertedAmount from API on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: async () => ({
        success: true,
        data: { convertedAmount: 315 },
      }),
    }));
    expect(await convertCurrency(10, 'USD', 'TWD')).toBe(315);
  });

  it('returns original amount when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));
    expect(await convertCurrency(100, 'USD', 'TWD')).toBe(100);
  });
});
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
npm run test:run
```

Expected: `20 passed` (6 existing + 14 new), 0 failures.

Troubleshooting if a test fails:
- `getCurrencySymbol` wrong value: check `services/exchangeRateService.ts` symbols map at line ~115
- `formatCurrencyAmount` mismatch: the function calls `toLocaleString()` — if a comma appears (e.g. `$1,000`), use a smaller number
- `getExchangeRate` wrong rate: the fetch mock must return `{ success: true, data: { rates: { TWD: 31.5, JPY: 150 } } }` — confirm the shape matches what `getExchangeRates` reads
- `convertCurrency` wrong value: confirm mock returns `{ success: true, data: { convertedAmount: 315 } }`

- [ ] **Step 3: Commit**

```bash
git add services/exchangeRateService.test.ts
git commit -m "test: add exchangeRateService tests"
```

---

## Task 3: CurrencyAmount component tests

**Files:**
- Create: `components/CurrencyAmount.test.tsx`

Context on the source file (`components/CurrencyAmount.tsx`):

The default export `CurrencyAmount` has three rendering branches:
1. No `originalCurrency` OR `originalCurrency === currency` → single `<span>{symbol}{amount.toLocaleString()}</span>`
2. `originalCurrency !== currency` + `showOriginal=true` (default) → original span + `→` span + converted span; if `exchangeRate` is provided, also renders `<span>(@{exchangeRate.toFixed(2)})</span>`
3. `originalCurrency !== currency` + `showOriginal=false` → only the converted span, no `→`

Use `render` and `screen` from `@testing-library/react`. No `@testing-library/jest-dom` needed — use `.toBeTruthy()` for presence and `.toBeNull()` for absence (`queryByText` returns `null` when not found).

Use amounts under 1000 to avoid `toLocaleString()` locale issues.

- [ ] **Step 1: Create `components/CurrencyAmount.test.tsx`**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CurrencyAmount from './CurrencyAmount';

describe('CurrencyAmount', () => {
  it('renders symbol and amount when no originalCurrency', () => {
    render(<CurrencyAmount amount={50} currency="USD" />);
    expect(screen.getByText('$50')).toBeTruthy();
  });

  it('renders symbol and amount when originalCurrency equals currency', () => {
    render(<CurrencyAmount amount={50} currency="TWD" originalCurrency="TWD" />);
    expect(screen.getByText('NT$50')).toBeTruthy();
  });

  it('shows original, arrow, converted, and rate when showOriginal=true', () => {
    render(
      <CurrencyAmount
        amount={315}
        currency="TWD"
        originalCurrency="USD"
        originalAmount={10}
        exchangeRate={31.5}
        showOriginal={true}
      />
    );
    expect(screen.getByText('$10')).toBeTruthy();
    expect(screen.getByText('→')).toBeTruthy();
    expect(screen.getByText('NT$315')).toBeTruthy();
    expect(screen.getByText('(@31.50)')).toBeTruthy();
  });

  it('shows only converted amount when showOriginal=false', () => {
    render(
      <CurrencyAmount
        amount={315}
        currency="TWD"
        originalCurrency="USD"
        originalAmount={10}
        showOriginal={false}
      />
    );
    expect(screen.queryByText('→')).toBeNull();
    expect(screen.getByText('NT$315')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run all tests**

```bash
npm run test:run
```

Expected: `24 passed` (6 existing + 14 service + 4 component), 0 failures.

Troubleshooting if a test fails:
- `getByText('$50')` not found: run `screen.debug()` inside the test to see rendered HTML; text might have surrounding whitespace — switch to `screen.getByText(/\$50/)` regex
- `getByText('(@31.50)')` not found: check `CurrencyAmount.tsx` for the exact string format around `exchangeRate.toFixed(2)`
- React import error: `@testing-library/react` requires React to be importable — should work since React 19 is already installed

- [ ] **Step 3: Run typecheck and lint**

```bash
npm run typecheck && npm run lint
```

Expected: no errors, exits 0.

- [ ] **Step 4: Commit**

```bash
git add components/CurrencyAmount.test.tsx
git commit -m "test: add CurrencyAmount component rendering tests"
```

---

## Post-Implementation Verification

```bash
npm run test:run
# Expected: 24 passed, 0 failures

npm run typecheck
# Expected: exits 0

npm run lint
# Expected: no errors
```
