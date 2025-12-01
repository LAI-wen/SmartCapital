/**
 * @deprecated
 *
 * ⚠️ This file is DEPRECATED and will be removed in a future version.
 *
 * All API functions have been moved to domain-specific service modules for better organization:
 *
 * - User & Settings → `./user.service.ts`
 * - Assets → `./asset.service.ts`
 * - Transactions → `./transaction.service.ts`
 * - Accounts & Transfers → `./account.service.ts`
 * - Stock Search → `./stock.service.ts`
 * - Price Alerts → `./priceAlert.service.ts`
 * - Notifications → `./notification.service.ts`
 *
 * **Migration Guide:**
 *
 * Instead of:
 * ```typescript
 * import { getUser, getAssets } from '../services/api';
 * ```
 *
 * Use:
 * ```typescript
 * import { getUser, getAssets } from '../services';
 * ```
 *
 * All exports are re-exported from `./index.ts` for backward compatibility.
 */

// Re-export all services for backward compatibility
export * from './user.service';
export * from './asset.service';
export * from './transaction.service';
export * from './account.service';
export * from './stock.service';
export * from './priceAlert.service';
export * from './notification.service';
export * from './core/http';
