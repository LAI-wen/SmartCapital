/**
 * Application Configuration Constants
 * 應用程式配置常數 - 集中管理所有 magic numbers
 */

// ============================================================
// Analytics & Chart Configuration
// ============================================================

/** 分析頁面顯示的熱門標的數量 */
export const TOP_MOVERS_COUNT = 3;

/** 分析頁面歷史數據回溯月份數 */
export const ANALYTICS_MONTHS_LOOKBACK = 6;

/** 資產趨勢圖顯示的月份數 */
export const ASSET_TREND_MONTHS = 6;

/** 日曆視圖顯示的過去月份數 */
export const CALENDAR_HISTORY_MONTHS = 5;

// ============================================================
// Stock Trading Configuration
// ============================================================

/** 買入/賣出價格偏離警示閾值（百分比） */
export const PRICE_DEVIATION_WARNING_PERCENT = 10;

/** 最小交易數量 */
export const MIN_TRADE_QUANTITY = 1;

/** 最大交易數量 */
export const MAX_TRADE_QUANTITY = 1_000_000;

// ============================================================
// Currency & Exchange Rate
// ============================================================

/** 預設匯率 (USD to TWD) */
export const DEFAULT_EXCHANGE_RATE = 31.0;

/** 匯率更新間隔（毫秒） */
export const EXCHANGE_RATE_UPDATE_INTERVAL = 300_000; // 5 分鐘

/** 匯率 API 快取時間（毫秒） */
export const EXCHANGE_RATE_CACHE_DURATION = 900_000; // 15 分鐘

// ============================================================
// Account & Transaction Limits
// ============================================================

/** 最大帳戶數量 */
export const MAX_ACCOUNTS = 20;

/** 交易記錄預設查詢筆數 */
export const DEFAULT_TRANSACTION_LIMIT = 50;

/** 轉帳記錄預設查詢筆數 */
export const DEFAULT_TRANSFER_LIMIT = 20;

/** 通知預設查詢筆數 */
export const DEFAULT_NOTIFICATION_LIMIT = 20;

// ============================================================
// Asset Value Thresholds
// ============================================================

/** 大額資產閾值（用於警示或特殊處理） */
export const LARGE_ASSET_THRESHOLD = 1_000_000;

/** 小額資產閾值（低於此金額可能不顯示） */
export const SMALL_ASSET_THRESHOLD = 1;

// ============================================================
// Price Alert Defaults
// ============================================================

/** 預設價格警示：日內漲跌幅閾值（%） */
export const DEFAULT_DAILY_CHANGE_THRESHOLD = 5;

/** 預設價格警示：停利閾值（%） */
export const DEFAULT_PROFIT_THRESHOLD = 10;

/** 預設價格警示：停損閾值（%） */
export const DEFAULT_LOSS_THRESHOLD = 10;

// ============================================================
// UI Configuration
// ============================================================

/** 列表每頁顯示筆數 */
export const ITEMS_PER_PAGE = 20;

/** 搜尋結果最大顯示數量 */
export const MAX_SEARCH_RESULTS = 10;

/** 持倉列表預設顯示筆數 */
export const DEFAULT_HOLDINGS_DISPLAY = 10;

// ============================================================
// Date & Time
// ============================================================

/** 日期格式 */
export const DATE_FORMAT = 'yyyy-MM-dd';

/** 日期時間格式 */
export const DATETIME_FORMAT = 'yyyy-MM-dd HH:mm:ss';

/** 顯示用日期格式 */
export const DISPLAY_DATE_FORMAT = 'yyyy/MM/dd';

/** 顯示用時間格式 */
export const DISPLAY_TIME_FORMAT = 'HH:mm';

// ============================================================
// API Configuration
// ============================================================

/** API 請求超時時間（毫秒） */
export const API_TIMEOUT = 30_000; // 30 秒

/** API 重試次數 */
export const API_RETRY_COUNT = 3;

/** API 重試延遲（毫秒） */
export const API_RETRY_DELAY = 1_000; // 1 秒
