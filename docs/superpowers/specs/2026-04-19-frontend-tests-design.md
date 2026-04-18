# Frontend Tests — Round 1 Design

**Date:** 2026-04-19
**Scope:** Add meaningful frontend tests for `exchangeRateService` pure functions and `CurrencyAmount` component rendering logic
**Out of scope:** API wrapper services (transaction, asset, budget — no logic beyond HTTP calls), Dashboard/Ledger/Analytics component tests

---

## Problem

The frontend has only 6 tests, all in `services/price.service.test.ts`. No tests exist for other service logic or any component. Adding tests for real boundary conditions improves regression safety and demonstrates engineering maturity in CI.

---

## New Test Files

### `services/exchangeRateService.test.ts` (~14 tests)

Tests pure functions and fetch-backed functions in `services/exchangeRateService.ts`.

#### `getCurrencySymbol`

| Input | Expected output |
|-------|----------------|
| `'TWD'` | `'NT$'` |
| `'USD'` | `'$'` |
| `'JPY'` | `'¥'` |
| `'XYZ'` (unknown) | `'XYZ'` (returns code as-is) |

#### `formatCurrencyAmount`

| Input | Expected output |
|-------|----------------|
| `(1000, 'TWD')` | `'NT$1,000'` |
| `(50, 'USD')` | `'$50'` |
| `(0, 'TWD')` | `'NT$0'` |

#### `getExchangeRate`

Mocks `fetch` to return `{ success: true, data: { rates: { TWD: 31.5, JPY: 150 } } }`.

| Call | Expected |
|------|----------|
| `getExchangeRate('USD', 'USD')` | `1.0` (no fetch, same-currency short-circuit) |
| `getExchangeRate('USD', 'TWD')` | `31.5` |
| `getExchangeRate('TWD', 'USD')` | `1 / 31.5 ≈ 0.0317` |
| `getExchangeRate('TWD', 'JPY')` | `150 / 31.5 ≈ 4.76` (cross via USD) |

#### `convertCurrency`

| Scenario | Expected |
|----------|---------|
| `from === to` | returns `amount` without calling `fetch` |
| API success | returns `convertedAmount` from response |
| API failure (network error) | returns original `amount` (fallback) |

---

### `components/CurrencyAmount.test.tsx` (~4 tests)

Tests the conditional rendering branches in the `CurrencyAmount` component.

**New dependency:** `@testing-library/react` (devDependency)

| Scenario | Props | Expected DOM |
|----------|-------|-------------|
| Same currency | `amount=1000 currency="TWD"` | renders `NT$1,000` |
| No originalCurrency | `amount=500 currency="USD"` | renders `$500` |
| Cross-currency, `showOriginal=true` | `amount=1000 currency="TWD" originalCurrency="USD" originalAmount=32 exchangeRate=31.5` | shows `$32`, `→`, `NT$1,000`, `(@31.50)` |
| Cross-currency, `showOriginal=false` | same as above but `showOriginal=false` | shows only `NT$1,000`, no `→` |

---

## Dependencies

| Package | Type | Reason |
|---------|------|--------|
| `@testing-library/react` | devDependency | Render components in happy-dom for assertion |

No changes to `vitest.config.ts` — existing `happy-dom` environment already supports React component rendering with `@testing-library/react`.

---

## Completion Criteria

- `npm run test:run` passes all 24 tests (6 existing + 14 service + 4 component)
- No new `any` types in test files
- `npm run typecheck` still passes
- `npm run lint` still passes
