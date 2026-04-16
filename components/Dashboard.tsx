
import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { Asset, Account, InvestmentScope } from '../types';
import { MOCK_EXCHANGE_RATE } from '../constants';
import { Wallet, TrendingUp, TrendingDown, Briefcase, ChevronRight, Info, Coffee, ShoppingBag, Home, Bus, HeartPulse, Gift, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { StockTransaction } from './BuyStockModal';
import { useExchangeRates } from '../services/exchangeRateService';
import { format, parseISO, isSameDay, subDays } from 'date-fns';
import { getTransactions, getBudgets, fetchLivePrices } from '../services';
import type { Transaction } from '../services/transaction.service';
import type { Budget } from '../services/budget.service';

const StockDetailModal = lazy(() => import('./StockDetailModal'));
const BuyStockModal = lazy(() => import('./BuyStockModal'));

interface DashboardProps {
  assets: Asset[];
  accounts: Account[];
  onAssetUpdate: (assets: Asset[]) => void;
  onAccountUpdate: (accounts: Account[]) => void;
  isPrivacyMode: boolean;
  investmentScope: InvestmentScope; // New Prop
}

const Dashboard: React.FC<DashboardProps> = ({ assets, accounts, onAssetUpdate, onAccountUpdate, isPrivacyMode, investmentScope }) => {
  const navigate = useNavigate();

  // Get real-time exchange rates
  const { rates } = useExchangeRates('USD');
  const exchangeRate = rates.TWD || MOCK_EXCHANGE_RATE; // Fallback to mock if API fails

  // Modal State
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  // Buy/Sell/Import Modal State
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [buyModalMode, setBuyModalMode] = useState<'buy' | 'sell'>('buy');
  const [transactionAsset, setTransactionAsset] = useState<Asset | null>(null);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [liveprices, setLiveprices] = useState<Map<string, number>>(new Map());
  const [pricesLoading, setPricesLoading] = useState(true);
  const [pricesFailed, setPricesFailed] = useState(false);
  const [isHoldingsExpanded, setIsHoldingsExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [txs, bdgs] = await Promise.all([
          getTransactions(30),
          getBudgets(),
        ]);
        if (!cancelled) {
          setTransactions(txs);
          setBudgets(bdgs);
        }
      } catch {
        // sections dependent on this show empty/zero states
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!assets.length) {
      setPricesLoading(false);
      return;
    }
    let cancelled = false;
    const loadPrices = async () => {
      setPricesLoading(true);
      try {
        const result = await fetchLivePrices(assets);
        if (!cancelled) {
          setLiveprices(result.prices);
          setPricesFailed(result.anyFailed);
        }
      } catch {
        if (!cancelled) setPricesFailed(true);
      } finally {
        if (!cancelled) setPricesLoading(false);
      }
    };
    loadPrices();
    const interval = setInterval(loadPrices, 60_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [assets]);

  // Filter Assets based on Scope FIRST
  const scopeFilteredAssets = useMemo(() => {
    return assets.filter(asset => {
      const isTW = asset.currency === 'TWD';
      const isCrypto = asset.type === 'Crypto';
      const isUS = !isTW && !isCrypto;

      if (isTW && !investmentScope.tw) return false;
      if (isUS && !investmentScope.us) return false;
      if (isCrypto && !investmentScope.crypto) return false;
      return true;
    });
  }, [assets, investmentScope]);

  // Calculate Cash (Accounts)
  const cashValueTWD = useMemo(() => {
    return accounts.reduce((sum, acc) =>
      acc.currency === 'USD' ? sum + acc.balance * exchangeRate : sum + acc.balance
    , 0);
  }, [accounts, exchangeRate]);

  const monthlyStats = useMemo(() => {
    const prefix = format(new Date(), 'yyyy-MM');
    const monthTxs = transactions.filter(t => t.date.startsWith(prefix));
    const income = monthTxs
      .filter(t => t.type === 'income')
      .reduce((s, t) => s + t.amount, 0);
    const expense = monthTxs
      .filter(t => t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0);
    const net = income - expense;

    const catMap = new Map<string, number>();
    for (const t of monthTxs.filter(t => t.type === 'expense')) {
      catMap.set(t.category, (catMap.get(t.category) ?? 0) + t.amount);
    }
    const topCategories = [...catMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([category, amount]) => ({
        category,
        amount,
        pct: expense > 0 ? (amount / expense) * 100 : 0,
      }));

    return { income, expense, net, topCategories };
  }, [transactions]);

  const budgetAlerts = useMemo(() => {
    const prefix = format(new Date(), 'yyyy-MM');
    const monthExpenses = transactions.filter(
      t => t.type === 'expense' && t.date.startsWith(prefix)
    );
    return budgets
      .map(b => {
        const spent = monthExpenses
          .filter(t => t.category === b.category)
          .reduce((s, t) => s + t.amount, 0);
        return { ...b, spent, pct: b.amount > 0 ? spent / b.amount : 0 };
      })
      .filter(b => b.pct >= 0.80)
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 3);
  }, [budgets, transactions]);

  const recentTransactions = useMemo(
    () => [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3),
    [transactions]
  );

  const investSummary = useMemo(() => {
    let totalValue = 0;
    let totalCost = 0;
    for (const asset of scopeFilteredAssets) {
      const livePrice = liveprices.get(asset.symbol) ?? asset.currentPrice;
      const value = asset.quantity * livePrice;
      const cost = asset.quantity * asset.avgPrice;
      const rate = asset.currency === 'USD' ? exchangeRate : 1;
      totalValue += value * rate;
      totalCost += cost * rate;
    }
    const pnl = totalValue - totalCost;
    const pnlPct = totalCost > 0 ? (pnl / totalCost) * 100 : 0;
    return { totalValue, pnl, pnlPct, count: scopeFilteredAssets.length };
  }, [scopeFilteredAssets, liveprices, exchangeRate]);

  const formatCurrency = (val: number, currency: string = 'TWD', minimumFractionDigits = 0) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits,
      maximumFractionDigits: 0
    }).format(val);
  };

  const getCategoryIcon = (category: string) => {
    if (category.includes('飲食')) return <Coffee size={16} />;
    if (category.includes('購物')) return <ShoppingBag size={16} />;
    if (category.includes('居住')) return <Home size={16} />;
    if (category.includes('交通')) return <Bus size={16} />;
    if (category.includes('醫')) return <HeartPulse size={16} />;
    if (category.includes('薪')) return <Briefcase size={16} />;
    if (category.includes('資')) return <TrendingUp size={16} />;
    if (category.includes('娛樂')) return <Gift size={16} />;
    return <Tag size={16} />;
  };

  const formatRelativeDate = (dateStr: string): string => {
    const date = parseISO(dateStr);
    const today = new Date();
    if (isSameDay(date, today)) return '今天';
    if (isSameDay(date, subDays(today, 1))) return '昨天';
    return format(date, 'M/d');
  };

  // --- Handlers ---
  
  const handleTransaction = (asset: Asset, mode: 'buy' | 'sell') => {
    setSelectedAsset(null); // Close detail modal
    setTransactionAsset(asset);
    setBuyModalMode(mode);
    setIsBuyModalOpen(true);
  };

  const confirmTransaction = (txn: StockTransaction, accountId?: string) => {
    let updatedAssets = [...assets];
    let updatedAccounts = [...accounts];
    const existingIndex = updatedAssets.findIndex(a => a.symbol === txn.symbol);

    // Calculate Total Cost in Asset Currency
    const totalTxnAmountAssetCurrency = txn.price * txn.quantity;

    // 1. Handle Money Movement (導入模式不處理現金流動)
    if (txn.type !== 'import' && accountId) {
      const accIndex = updatedAccounts.findIndex(a => a.id === accountId);
      if (accIndex >= 0) {
        const acc = updatedAccounts[accIndex];

        // Exchange Logic
        let deductionAmount = totalTxnAmountAssetCurrency;
        if (txn.currency === 'USD' && acc.currency === 'TWD') {
          deductionAmount = totalTxnAmountAssetCurrency * exchangeRate;
        }
        // (Assuming no reverse case TWD stock with USD account for now to keep simple)

        if (txn.type === 'buy') {
           updatedAccounts[accIndex] = { ...acc, balance: acc.balance - deductionAmount };
        } else {
           updatedAccounts[accIndex] = { ...acc, balance: acc.balance + deductionAmount };
        }
      }
    }

    // 2. Handle Asset Movement
    if (txn.type === 'buy') {
      if (existingIndex >= 0) {
        // Update existing
        const asset = updatedAssets[existingIndex];
        const totalCost = (asset.avgPrice * asset.quantity) + (txn.price * txn.quantity);
        const totalQty = asset.quantity + txn.quantity;
        updatedAssets[existingIndex] = {
          ...asset,
          quantity: totalQty,
          avgPrice: totalCost / totalQty
        };
      } else {
        // Create new
        updatedAssets.push({
          id: Date.now().toString(),
          symbol: txn.symbol,
          name: txn.name,
          type: txn.currency === 'TWD' ? 'Stock' : 'Stock', // Simplified logic
          quantity: txn.quantity,
          avgPrice: txn.price,
          currentPrice: txn.price,
          currency: txn.currency,
          change24h: 0,
          history: [txn.price * 0.95, txn.price]
        });
      }
    } else if (txn.type === 'sell') {
      // Sell
      if (existingIndex >= 0) {
        const asset = updatedAssets[existingIndex];
        const remainingQty = asset.quantity - txn.quantity;
        if (remainingQty <= 0) {
          // Remove asset if sold out
          updatedAssets = updatedAssets.filter((_, i) => i !== existingIndex);
        } else {
          updatedAssets[existingIndex] = {
            ...asset,
            quantity: remainingQty
            // Avg price doesn't change on sell
          };
        }
      }
    }

    onAssetUpdate(updatedAssets);
    onAccountUpdate(updatedAccounts);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      
      {/* Section 1: Hero Card */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-xs text-ink-400 font-serif mb-1">現金 / 存款</p>
            <div className="text-3xl font-bold font-serif-num text-ink-900">
              {isPrivacyMode ? '•••••' : formatCurrency(cashValueTWD)}
            </div>
          </div>
          <div className="p-2 bg-stone-50 rounded-xl">
            <Wallet size={20} className="text-ink-400" />
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2">
          {monthlyStats.net >= 0
            ? <TrendingUp size={14} className="text-morandi-sage" />
            : <TrendingDown size={14} className="text-morandi-rose" />}
          <span className={`text-sm font-bold font-serif-num ${
            monthlyStats.net >= 0 ? 'text-morandi-sage' : 'text-morandi-rose'
          }`}>
            {isPrivacyMode ? '••' : formatCurrency(Math.abs(monthlyStats.net))}
          </span>
          <span className="text-xs text-ink-400 font-serif">本月結餘</span>
        </div>
        <div className="flex gap-4 mt-2">
          <span className="text-xs text-ink-400 font-serif">
            收入{' '}
            <span className="text-ink-700 font-serif-num font-bold">
              {isPrivacyMode ? '••' : formatCurrency(monthlyStats.income)}
            </span>
          </span>
          <span className="text-xs text-ink-400 font-serif">
            支出{' '}
            <span className="text-ink-700 font-serif-num font-bold">
              {isPrivacyMode ? '••' : formatCurrency(monthlyStats.expense)}
            </span>
          </span>
        </div>
      </div>

      {/* Section 2: 本月收支摘要 */}
      <button
        onClick={() => navigate('/analytics')}
        className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100 w-full text-left active:scale-[0.99] transition-all"
      >
        <h3 className="text-sm font-bold font-serif text-ink-900 mb-3 flex items-center justify-between">
          本月收支摘要
          <ChevronRight size={16} className="text-ink-400" />
        </h3>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: '收入', value: monthlyStats.income, color: 'text-ink-900' },
            { label: '支出', value: monthlyStats.expense, color: 'text-morandi-rose' },
            {
              label: '結餘',
              value: monthlyStats.net,
              color: monthlyStats.net >= 0 ? 'text-morandi-sage' : 'text-morandi-rose',
            },
          ].map(chip => (
            <div key={chip.label} className="bg-stone-50 rounded-xl p-3 text-center">
              <div className={`text-sm font-bold font-serif-num ${chip.color}`}>
                {isPrivacyMode ? '••' : formatCurrency(chip.label === '結餘' ? Math.abs(chip.value) : chip.value)}
              </div>
              <div className="text-[10px] text-ink-400 font-serif mt-0.5">{chip.label}</div>
            </div>
          ))}
        </div>
        {monthlyStats.topCategories.length > 0 && (
          <div className="space-y-1.5">
            {monthlyStats.topCategories.map(cat => (
              <div key={cat.category} className="flex items-center justify-between text-xs">
                <span className="text-ink-700 font-serif">{cat.category}</span>
                <div className="flex items-center gap-2">
                  <span className="text-ink-400 font-serif-num">{cat.pct.toFixed(0)}%</span>
                  <span className="font-bold font-serif-num text-morandi-rose">
                    {isPrivacyMode ? '••' : formatCurrency(cat.amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </button>

      {/* Section 3: 預算警示 */}
      {budgets.length > 0 && (
        <button
          onClick={() => navigate('/budget-settings')}
          className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100 w-full text-left active:scale-[0.99] transition-all"
        >
          <h3 className="text-sm font-bold font-serif text-ink-900 mb-3 flex items-center justify-between">
            預算警示
            <ChevronRight size={16} className="text-ink-400" />
          </h3>
          {budgetAlerts.length === 0 ? (
            <p className="text-xs text-morandi-sage font-serif">本月預算正常 ✓</p>
          ) : (
            <div className="space-y-3">
              {budgetAlerts.map(b => (
                <div key={b.id}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-serif text-ink-700">{b.category}</span>
                    <span className="font-serif-num text-ink-500">
                      {isPrivacyMode ? '••' : formatCurrency(b.spent)}{' '}
                      /{' '}
                      {isPrivacyMode ? '••' : formatCurrency(b.amount)}
                    </span>
                  </div>
                  <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        b.pct >= 1 ? 'bg-morandi-rose' : 'bg-amber-400'
                      }`}
                      style={{ width: `${Math.min(b.pct * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </button>
      )}

      {/* Section 4: 最近交易 */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold font-serif text-ink-900">最近交易</h3>
          <button
            onClick={() => navigate('/ledger')}
            className="text-xs text-morandi-blue font-serif hover:underline"
          >
            更多交易 →
          </button>
        </div>
        {recentTransactions.length === 0 ? (
          <p className="text-xs text-ink-400 font-serif text-center py-4">尚無交易記錄</p>
        ) : (
          <div className="space-y-3">
            {recentTransactions.map(t => (
              <div key={t.id} className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white ${
                    t.type === 'income' ? 'bg-ink-800' : 'bg-morandi-rose'
                  }`}
                >
                  {getCategoryIcon(t.category)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-ink-900 font-serif">
                    {t.category}{t.subcategory ? ` · ${t.subcategory}` : ''}
                  </div>
                  <div className="text-[10px] text-ink-400 truncate">
                    {t.note || '無備註'}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div
                    className={`text-sm font-bold font-serif-num ${
                      t.type === 'income' ? 'text-ink-900' : 'text-morandi-rose'
                    }`}
                  >
                    {t.type === 'income' ? '+' : ''}
                    {isPrivacyMode ? '••' : formatCurrency(t.amount)}
                  </div>
                  <div className="text-[10px] text-ink-400 font-serif">
                    {formatRelativeDate(t.date)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 5: 投資摘要 */}
      {scopeFilteredAssets.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold font-serif text-ink-900 flex items-center gap-2">
              <TrendingUp size={16} className="text-ink-400" />
              投資摘要
            </h3>
            <button
              onClick={() => setIsHoldingsExpanded(e => !e)}
              className="text-xs text-morandi-blue font-serif hover:underline flex items-center gap-1"
            >
              持有 {investSummary.count} 檔
              <ChevronRight
                size={12}
                className={`transition-transform ${isHoldingsExpanded ? 'rotate-90' : ''}`}
              />
            </button>
          </div>

          {pricesLoading ? (
            <div className="space-y-2">
              <div className="h-8 bg-stone-50 rounded-xl animate-pulse" />
              <div className="h-4 bg-stone-50 rounded-xl animate-pulse w-1/2" />
            </div>
          ) : (
            <>
              <div className="text-2xl font-bold font-serif-num text-ink-900 mb-1">
                {isPrivacyMode ? '•••••' : formatCurrency(investSummary.totalValue)}
              </div>
              <div
                className={`text-sm font-serif-num flex items-center gap-1 ${
                  investSummary.pnl >= 0 ? 'text-morandi-sage' : 'text-morandi-rose'
                }`}
              >
                {investSummary.pnl >= 0
                  ? <TrendingUp size={14} />
                  : <TrendingDown size={14} />}
                {isPrivacyMode ? '••' : formatCurrency(Math.abs(investSummary.pnl))}
                <span className="text-xs">
                  ({investSummary.pnl >= 0 ? '+' : ''}
                  {isPrivacyMode ? '••' : investSummary.pnlPct.toFixed(2)}%)
                </span>
                <span className="text-xs text-ink-400 font-serif ml-1">未實現損益</span>
              </div>
              {pricesFailed && (
                <p className="text-[10px] text-amber-600 mt-1 font-serif">
                  ⚠ 價格可能未即時
                </p>
              )}
              {(investmentScope.us || investmentScope.crypto) && (
                <div className="mt-1 flex items-center gap-1 text-[10px] text-ink-400 font-serif">
                  <Info size={10} /> 以 1 USD ≈ {exchangeRate.toFixed(0)} TWD 計算
                </div>
              )}
            </>
          )}

          {/* Expandable holdings list */}
          {isHoldingsExpanded && (
            <div className="mt-4 border-t border-stone-100 pt-4 space-y-2">
              {scopeFilteredAssets.map(asset => {
                const livePrice = liveprices.get(asset.symbol) ?? asset.currentPrice;
                const rate = asset.currency === 'USD' ? exchangeRate : 1;
                const value = asset.quantity * livePrice * rate;
                const cost = asset.quantity * asset.avgPrice * rate;
                const pnl = value - cost;
                return (
                  <div
                    key={asset.id}
                    onClick={() => setSelectedAsset(asset)}
                    className="flex items-center justify-between cursor-pointer hover:bg-stone-50 rounded-xl p-2 -mx-2 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-stone-50 border border-stone-100 flex items-center justify-center text-xs font-bold text-morandi-blue font-serif shrink-0">
                        {asset.symbol.substring(0, 2)}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-ink-900 font-serif">
                          {asset.symbol}
                        </div>
                        <div className="text-[10px] text-ink-400 font-serif-num">
                          {isPrivacyMode ? '••' : formatCurrency(livePrice, asset.currency)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold font-serif-num text-ink-900">
                        {isPrivacyMode ? '••' : formatCurrency(value)}
                      </div>
                      <div
                        className={`text-[10px] font-serif-num ${
                          pnl >= 0 ? 'text-morandi-sage' : 'text-morandi-rose'
                        }`}
                      >
                        {pnl >= 0 ? '+' : '-'}
                        {isPrivacyMode ? '••' : formatCurrency(Math.abs(pnl))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Section 6: 訂閱摘要（預留）*/}
      {/* Reserved for subscription tracking — to be implemented in a future spec */}

      {/* Detail Modal */}
      {selectedAsset && (
        <Suspense fallback={null}>
          <StockDetailModal 
            asset={selectedAsset} 
            isOpen={!!selectedAsset} 
            onClose={() => setSelectedAsset(null)} 
            isPrivacyMode={isPrivacyMode}
            onBuy={() => selectedAsset && handleTransaction(selectedAsset, 'buy')}
            onSell={() => selectedAsset && handleTransaction(selectedAsset, 'sell')}
          />
        </Suspense>
      )}

      {/* Buy/Sell Transaction Modal */}
      {isBuyModalOpen && (
        <Suspense fallback={null}>
          <BuyStockModal 
            isOpen={isBuyModalOpen}
            onClose={() => setIsBuyModalOpen(false)}
            mode={buyModalMode}
            existingAsset={transactionAsset}
            onConfirm={confirmTransaction}
            accounts={accounts} // Pass accounts for selection
          />
        </Suspense>
      )}
    </div>
  );
};

export default Dashboard;
