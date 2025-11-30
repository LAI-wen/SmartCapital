/**
 * 繁體中文翻譯
 */

export default {
  common: {
    confirm: '確認',
    cancel: '取消',
    save: '儲存',
    delete: '刪除',
    edit: '編輯',
    add: '新增',
    search: '搜尋',
    loading: '載入中...',
    error: '錯誤',
    success: '成功',
    close: '關閉',
    back: '返回',
    next: '下一步',
  },

  nav: {
    dashboard: '總覽',
    ledger: '記帳',
    analytics: '分析',
    strategy: '策略',
    notifications: '通知',
    settings: '設定',
    help: '幫助',
    more: '更多',
  },

  dashboard: {
    title: '資產總覽',
    totalAssets: '總資產',
    cash: '現金',
    investments: '投資',
    dayChange: '今日漲跌',
    allocation: '資產配置',
    topMovers: '漲跌排行',
    exchangeRateNote: '以 1 USD ≈ {{rate}} TWD 計算',
    loadingRate: '載入中...',

    // 資產類型
    taiwanStock: '台股',
    usStock: '美股/海外',
    crypto: '加密貨幣',
    allAssets: '全部資產',

    // 操作
    buyStock: '買入',
    sellStock: '賣出',
    importStock: '導入持股',

    // 空狀態
    noAssets: '尚無資產',
    addFirstAsset: '新增你的第一筆資產',
  },

  ledger: {
    title: '記帳本',
    quickAdd: '快速記帳',
    monthlyView: '月檢視',
    yearlyView: '年檢視',

    // 統計
    income: '收入',
    expense: '支出',
    balance: '結餘',

    // 分類
    categories: {
      food: '飲食',
      transport: '交通',
      housing: '居住',
      entertainment: '娛樂',
      shopping: '購物',
      medical: '醫療',
      other: '其他',
      salary: '薪資',
      bonus: '獎金',
      dividend: '股息',
      investment: '投資獲利',
      partTime: '兼職',
    },

    // 表單
    amount: '金額',
    category: '分類',
    date: '日期',
    note: '備註',
    account: '帳戶',
    addTransaction: '新增交易',
    editTransaction: '編輯交易',

    // 提示
    notePlaceholder: '寫點備註...',
    selectCategory: '選擇分類',
    selectAccount: '選擇帳戶',
    insufficientBalance: '帳戶餘額不足！',
  },

  analytics: {
    title: '分析',
    trend: '收支趨勢',
    categoryBreakdown: '分類別支出',
    assetGrowth: '資產成長',

    // 時間範圍
    daily: '日',
    weekly: '週',
    monthly: '月',
    yearly: '年',

    // 指標
    irr: '內部報酬率',
    sharpe: '夏普比率',
    mdd: '最大回撤',
  },

  strategy: {
    title: '策略實驗室',
    compound: '複利計算',
    kelly: '凱利公式',
    martingale: '馬丁格爾',
    pyramid: '金字塔加碼',
    grid: '網格交易',
    valueAverage: '價值平均法',

    // 參數
    principal: '初始本金',
    monthlyInvest: '每月投入',
    returnRate: '年化報酬率',
    years: '年期',
    winRate: '勝率',
    odds: '賠率',
    calculate: '計算',
    result: '結果',
  },

  settings: {
    title: '設定',

    // 語言與貨幣
    languageAndCurrency: '語言與貨幣',
    language: '語言',
    displayCurrency: '顯示貨幣',

    // 投資範圍
    investmentScope: '投資範圍',
    taiwanMarket: '台股',
    overseasMarket: '美股/海外',
    cryptoMarket: '加密貨幣',

    // 隱私
    privacy: '隱私',
    privacyMode: '隱私模式',
    privacyModeDesc: '隱藏金額顯示',

    // 通知
    notifications: '通知',
    pushNotifications: '推播通知',
    pushNotificationsDesc: '接收價格警示與提醒',

    // 帳戶
    account: '帳戶',
    logout: '登出',

    // 資料
    data: '資料管理',
    backup: '備份資料',
    export: '匯出資料',
  },

  account: {
    title: '帳戶管理',
    addAccount: '新增帳戶',
    editAccount: '編輯帳戶',
    deleteAccount: '刪除帳戶',

    // 帳戶類型
    types: {
      cash: '現金',
      bank: '銀行帳戶',
      brokerage: '證券帳戶',
      exchange: '交易所帳戶',
    },

    // 欄位
    accountName: '帳戶名稱',
    accountType: '帳戶類型',
    currency: '幣別',
    balance: '餘額',
    isDefault: '預設帳戶',
    isSubBrokerage: '複委託帳戶',

    // 提示
    namePlaceholder: '例如：台新銀行',
    deleteConfirm: '確定要刪除此帳戶嗎？',
  },

  priceAlerts: {
    title: '價格警示',
    addAlert: '新增警示',
    editAlert: '編輯警示',

    // 警示類型
    types: {
      dailyChange: '日漲跌',
      profitLoss: '損益比例',
      stopProfit: '停利',
      stopLoss: '停損',
      targetPrice: '目標價',
    },

    // 狀態
    enabled: '啟用',
    disabled: '停用',
    triggered: '已觸發',

    // 欄位
    stock: '股票',
    alertType: '警示類型',
    threshold: '觸發條件',
    status: '狀態',
    lastTriggered: '最後觸發',
  },

  buyStockModal: {
    buy: '買入',
    sell: '賣出',
    import: '導入持股',

    // 步驟
    searchStock: '搜尋股票',
    enterDetails: '輸入詳情',

    // 欄位
    symbol: '股票代碼',
    stockName: '股票名稱',
    quantity: '數量',
    price: '價格',
    date: '日期',
    account: '帳戶',

    // 計算
    totalCost: '總成本',
    currentHolding: '目前持股',
    availableBalance: '可用餘額',

    // 提示
    searchPlaceholder: '輸入股票代碼或名稱',
    noResults: '查無結果',
    insufficientFunds: '餘額不足',
    insufficientShares: '持股不足',

    // 複委託
    subBrokerageNote: '複委託換匯提醒',
    exchangeRate: '參考匯率',
    estimatedTWD: '預估台幣扣款',
  },

  help: {
    title: '幫助中心',
    faq: '常見問題',
    tutorials: '教學影片',
    contactSupport: '聯絡客服',

    // FAQ
    faqItems: {
      howToAddAccount: '如何新增帳戶？',
      howToBuyStock: '如何買入股票？',
      howToSetAlert: '如何設定價格警示？',
      whatIsSubBrokerage: '什麼是複委託？',
    },
  },

  notifications: {
    title: '通知',
    markAllRead: '全部標為已讀',
    noNotifications: '沒有通知',

    // 通知類型
    priceAlert: '價格警示',
    systemNotice: '系統通知',
    reminder: '提醒',
  },

  errors: {
    generic: '發生錯誤，請稍後再試',
    networkError: '網路連線錯誤',
    invalidInput: '輸入格式不正確',
    unauthorized: '未授權，請重新登入',
    notFound: '找不到資料',
    serverError: '伺服器錯誤',
  },
};
