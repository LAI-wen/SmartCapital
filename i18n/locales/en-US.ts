/**
 * English Translation
 */

export default {
  common: {
    confirm: 'Confirm',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    search: 'Search',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    close: 'Close',
    back: 'Back',
    next: 'Next',
  },

  nav: {
    dashboard: 'Dashboard',
    ledger: 'Ledger',
    analytics: 'Analytics',
    strategy: 'Strategy',
    notifications: 'Notifications',
    settings: 'Settings',
    help: 'Help',
    more: 'More',
  },

  dashboard: {
    title: 'Portfolio Overview',
    totalAssets: 'Total Assets',
    cash: 'Cash',
    investments: 'Investments',
    dayChange: 'Today\'s Change',
    allocation: 'Asset Allocation',
    topMovers: 'Top Movers',
    exchangeRateNote: 'Calculated at 1 USD ≈ {{rate}} TWD',
    loadingRate: 'Loading...',

    // Asset types
    taiwanStock: 'Taiwan Stocks',
    usStock: 'US/Overseas',
    crypto: 'Crypto',
    allAssets: 'All Assets',

    // Actions
    buyStock: 'Buy',
    sellStock: 'Sell',
    importStock: 'Import Holdings',

    // Empty state
    noAssets: 'No assets yet',
    addFirstAsset: 'Add your first asset',
  },

  ledger: {
    title: 'Ledger',
    quickAdd: 'Quick Add',
    monthlyView: 'Monthly',
    yearlyView: 'Yearly',

    // Statistics
    income: 'Income',
    expense: 'Expense',
    balance: 'Balance',

    // Categories
    categories: {
      food: 'Food',
      transport: 'Transport',
      housing: 'Housing',
      entertainment: 'Entertainment',
      shopping: 'Shopping',
      medical: 'Medical',
      other: 'Other',
      salary: 'Salary',
      bonus: 'Bonus',
      dividend: 'Dividend',
      investment: 'Investment Gain',
      partTime: 'Part-time',
    },

    // Form
    amount: 'Amount',
    category: 'Category',
    date: 'Date',
    note: 'Note',
    account: 'Account',
    addTransaction: 'Add Transaction',
    editTransaction: 'Edit Transaction',

    // Hints
    notePlaceholder: 'Add a note...',
    selectCategory: 'Select category',
    selectAccount: 'Select account',
    insufficientBalance: 'Insufficient balance!',
  },

  analytics: {
    title: 'Analytics',
    trend: 'Income & Expense Trend',
    categoryBreakdown: 'Expense by Category',
    assetGrowth: 'Asset Growth',

    // Time range
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    yearly: 'Yearly',

    // Metrics
    irr: 'IRR',
    sharpe: 'Sharpe Ratio',
    mdd: 'Max Drawdown',
  },

  strategy: {
    title: 'Strategy Lab',
    compound: 'Compound Interest',
    kelly: 'Kelly Criterion',
    martingale: 'Martingale',
    pyramid: 'Pyramid',
    grid: 'Grid Trading',
    valueAverage: 'Value Averaging',

    // Parameters
    principal: 'Initial Principal',
    monthlyInvest: 'Monthly Investment',
    returnRate: 'Annual Return',
    years: 'Years',
    winRate: 'Win Rate',
    odds: 'Odds',
    calculate: 'Calculate',
    result: 'Result',
  },

  settings: {
    title: 'Settings',

    // Language & Currency
    languageAndCurrency: 'Language & Currency',
    language: 'Language',
    displayCurrency: 'Display Currency',

    // Investment scope
    investmentScope: 'Investment Scope',
    taiwanMarket: 'Taiwan Market',
    overseasMarket: 'US/Overseas',
    cryptoMarket: 'Crypto',

    // Privacy
    privacy: 'Privacy',
    privacyMode: 'Privacy Mode',
    privacyModeDesc: 'Hide amounts',

    // Notifications
    notifications: 'Notifications',
    pushNotifications: 'Push Notifications',
    pushNotificationsDesc: 'Receive price alerts and reminders',

    // Account
    account: 'Account',
    logout: 'Logout',

    // Data
    data: 'Data Management',
    backup: 'Backup Data',
    export: 'Export Data',
  },

  account: {
    title: 'Account Management',
    addAccount: 'Add Account',
    editAccount: 'Edit Account',
    deleteAccount: 'Delete Account',

    // Account types
    types: {
      cash: 'Cash',
      bank: 'Bank Account',
      brokerage: 'Brokerage Account',
      exchange: 'Exchange Account',
    },

    // Fields
    accountName: 'Account Name',
    accountType: 'Account Type',
    currency: 'Currency',
    balance: 'Balance',
    isDefault: 'Default Account',
    isSubBrokerage: 'Sub-brokerage',

    // Hints
    namePlaceholder: 'e.g., Chase Bank',
    deleteConfirm: 'Are you sure you want to delete this account?',
  },

  priceAlerts: {
    title: 'Price Alerts',
    addAlert: 'Add Alert',
    editAlert: 'Edit Alert',

    // Alert types
    types: {
      dailyChange: 'Daily Change',
      profitLoss: 'P&L %',
      stopProfit: 'Take Profit',
      stopLoss: 'Stop Loss',
      targetPrice: 'Target Price',
    },

    // Status
    enabled: 'Enabled',
    disabled: 'Disabled',
    triggered: 'Triggered',

    // Fields
    stock: 'Stock',
    alertType: 'Alert Type',
    threshold: 'Threshold',
    status: 'Status',
    lastTriggered: 'Last Triggered',
  },

  buyStockModal: {
    buy: 'Buy',
    sell: 'Sell',
    import: 'Import Holdings',

    // Steps
    searchStock: 'Search Stock',
    enterDetails: 'Enter Details',

    // Fields
    symbol: 'Symbol',
    stockName: 'Stock Name',
    quantity: 'Quantity',
    price: 'Price',
    date: 'Date',
    account: 'Account',

    // Calculations
    totalCost: 'Total Cost',
    currentHolding: 'Current Holding',
    availableBalance: 'Available Balance',

    // Hints
    searchPlaceholder: 'Enter symbol or name',
    noResults: 'No results',
    insufficientFunds: 'Insufficient funds',
    insufficientShares: 'Insufficient shares',

    // Sub-brokerage
    subBrokerageNote: 'FX Conversion Note',
    exchangeRate: 'Exchange Rate',
    estimatedTWD: 'Estimated TWD',
  },

  help: {
    title: 'Help Center',
    faq: 'FAQ',
    tutorials: 'Tutorials',
    contactSupport: 'Contact Support',

    // FAQ
    faqItems: {
      howToAddAccount: 'How to add an account?',
      howToBuyStock: 'How to buy stocks?',
      howToSetAlert: 'How to set price alerts?',
      whatIsSubBrokerage: 'What is sub-brokerage?',
    },
  },

  notifications: {
    title: 'Notifications',
    markAllRead: 'Mark all as read',
    noNotifications: 'No notifications',

    // Notification types
    priceAlert: 'Price Alert',
    systemNotice: 'System Notice',
    reminder: 'Reminder',
  },

  errors: {
    generic: 'An error occurred, please try again',
    networkError: 'Network connection error',
    invalidInput: 'Invalid input format',
    unauthorized: 'Unauthorized, please login again',
    notFound: 'Data not found',
    serverError: 'Server error',
  },
};
