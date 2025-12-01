/**
 * Services Index - 統一導出所有服務
 * 提供向後兼容的 API，同時支援新的模組化結構
 */

// HTTP Core
export * from './core/http';

// User Service
export {
  type User,
  type Settings,
  type Portfolio,
  setUserId,
  getUserId,
  getUser,
  getPortfolio,
  getSettings,
} from './user.service';

// Asset Service
export {
  type Asset,
  getAssets,
  upsertAsset,
  importAsset,
  reduceAsset,
} from './asset.service';

// Transaction Service
export {
  type Transaction,
  type BatchDeleteResult,
  getTransactions,
  createTransaction,
  deleteTransaction,
  batchDeleteTransactions,
} from './transaction.service';

// Account Service
export {
  type Account,
  type Transfer,
  type CreateAccountInput,
  type UpdateAccountInput,
  type CreateTransferInput,
  getAccounts,
  createAccount,
  updateAccount,
  updateAccountBalance,
  deleteAccount,
  createTransfer,
  getTransfers,
} from './account.service';

// Stock Service
export {
  type StockSearchResult,
  searchStocks,
} from './stock.service';

// Price Alert Service
export {
  type AlertType,
  type AlertDirection,
  type PriceAlert,
  type CreatePriceAlertInput,
  getPriceAlerts,
  createPriceAlert,
  updatePriceAlert,
  deletePriceAlert,
  createDefaultAlerts,
} from './priceAlert.service';

// Notification Service
export {
  type Notification,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from './notification.service';

// Exchange Rate Service (existing)
export * from './exchangeRateService';
