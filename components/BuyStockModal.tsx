
import React, { useState, useEffect, useMemo } from 'react';
import { Asset, Account, Currency } from '../types';
import { MOCK_EXCHANGE_RATE } from '../constants';
import { X, Search, PlusCircle, MinusCircle, Wallet, AlertCircle, Loader2, Package } from 'lucide-react';
import { createTransaction, upsertAsset, reduceAsset, importAsset, searchStocks, type StockSearchResult } from '../services';
import { useExchangeRates } from '../services/exchangeRateService';

interface BuyStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'buy' | 'sell' | 'import'; // 新增 import 模式
  existingAsset?: Asset | null;
  onConfirm: (transaction: StockTransaction, accountId?: string) => void;
  accounts: Account[];
}

export interface StockTransaction {
  symbol: string;
  name: string;
  price: number;
  quantity: number;
  date: string;
  type: 'buy' | 'sell' | 'import'; // 新增 import 類型
  currency: Currency; // Added currency to transaction
}

const BuyStockModal: React.FC<BuyStockModalProps> = ({ isOpen, onClose, mode, existingAsset, onConfirm, accounts }) => {
  const [step, setStep] = useState<'search' | 'form'>('search');

  // Get real-time exchange rates
  const { rates, loading: ratesLoading } = useExchangeRates('USD');
  const exchangeRate = rates.TWD || MOCK_EXCHANGE_RATE; // Fallback to mock if API fails

  // Form State
  const [selectedStock, setSelectedStock] = useState<{ symbol: string; name: string; price: number; currency: Currency } | null>(null);
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');

  // Account State
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  // Search State
  const [searchResults, setSearchResults] = useState<StockSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // 1. Filter Available Accounts logic
  const availableAccounts = useMemo(() => {
    if (!selectedStock) return [];

    // 賣出時：可以選擇任何帳戶作為入帳帳戶
    if (mode === 'sell') return accounts;

    // 買入/導入時：需要根據股票貨幣篩選
    return accounts.filter(acc => {
      // 1. If stock is TWD, can only use TWD accounts
      if (selectedStock.currency === 'TWD') return acc.currency === 'TWD';
      // 2. If stock is USD, can use USD OR TWD accounts (Sub-brokerage)
      if (selectedStock.currency === 'USD') return true;
      return false;
    });
  }, [accounts, selectedStock, mode]);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      if (existingAsset) {
        setSelectedStock({
          symbol: existingAsset.symbol,
          name: existingAsset.name,
          price: existingAsset.currentPrice,
          currency: existingAsset.currency
        });
        setPrice(existingAsset.currentPrice.toString());
        setStep('form');
      } else {
        setStep('search');
        setSelectedStock(null);
        setSearchTerm('');
        setSearchResults([]);
        setPrice('');
      }
      setQuantity('');
      setDate(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen, existingAsset, accounts.length]);

  // Real-time stock search with debounce
  useEffect(() => {
    if (step !== 'search' || !searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchStocks(searchTerm);
        setSearchResults(results);
      } catch (error) {
        console.error('搜尋失敗:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [searchTerm, step]);

  // Auto-select account when availableAccounts changes
  useEffect(() => {
    if (step === 'form' && availableAccounts.length > 0) {
      // Try to find an account with matching currency first
      const sameCurrencyAcc = availableAccounts.find(a => a.currency === selectedStock?.currency && a.type === 'BROKERAGE');
      if (sameCurrencyAcc) {
        setSelectedAccountId(sameCurrencyAcc.id);
      } else {
        // Fallback to first available (e.g., TWD Bank for US Stock)
        setSelectedAccountId(availableAccounts[0].id);
      }
    }
  }, [availableAccounts, step, selectedStock]);

  if (!isOpen) return null;

  const handleSearchSelect = (stock: StockSearchResult) => {
    setSelectedStock({
      symbol: stock.symbol,
      name: stock.name,
      price: stock.price,
      currency: stock.currency
    });
    setPrice(stock.price.toString());
    setStep('form');
  };

  const handleSubmit = async () => {
    if (!selectedStock || !quantity || !price) return;

    // Import 模式不需要選擇帳戶
    if (mode !== 'import' && !selectedAccountId) return;

    try {
      const qty = parseFloat(quantity);
      const priceNum = parseFloat(price);

      if (mode === 'import') {
        // 🎯 導入模式：不建立交易記錄，不扣款，直接建立資產持倉
        await importAsset(
          selectedStock.symbol,
          selectedStock.name,
          'Stock', // Default type
          qty,
          priceNum,
          selectedStock.currency
        );

        // 3. Call parent callback for optimistic UI update (不需要 accountId)
        onConfirm({
          symbol: selectedStock.symbol,
          name: selectedStock.name,
          price: priceNum,
          quantity: qty,
          date,
          type: 'import',
          currency: selectedStock.currency
        });
      } else {
        // 💰 買入/賣出模式：建立交易記錄並扣款
        // 1. Create transaction record
        await createTransaction(
          mode === 'buy' ? 'expense' : 'income',
          finalCost,
          'investment',
          date,
          `${mode === 'buy' ? '買入' : '賣出'} ${selectedStock.symbol} ${quantity}股 @ ${selectedStock.currency === 'TWD' ? 'NT$' : '$'}${price}`,
          selectedAccountId
        );

        // 2. Update asset holdings in database
        if (mode === 'buy') {
          // Buy: upsert asset
          await upsertAsset(
            selectedStock.symbol,
            selectedStock.name,
            'Stock', // Default type
            qty,
            priceNum,
            selectedStock.currency
          );
        } else {
          // Sell: reduce asset
          await reduceAsset(
            selectedStock.symbol,
            qty
          );
        }

        // 3. Call parent callback for optimistic UI update
        onConfirm({
          symbol: selectedStock.symbol,
          name: selectedStock.name,
          price: priceNum,
          quantity: qty,
          date,
          type: mode,
          currency: selectedStock.currency
        }, selectedAccountId);
      }

      onClose();
    } catch (error) {
      console.error('Failed to create transaction:', error);
      alert('交易失敗，請稍後再試');
    }
  };

  const isBuy = mode === 'buy';
  const isImport = mode === 'import';

  // Calculations
  const selectedAccount = accounts.find(a => a.id === selectedAccountId);
  const rawCost = (parseFloat(quantity) || 0) * (parseFloat(price) || 0); // Cost in Asset Currency

  // Exchange Rate Logic
  const isExchangeNeeded = isBuy && selectedStock?.currency === 'USD' && selectedAccount?.currency === 'TWD';
  const finalCost = isExchangeNeeded ? rawCost * exchangeRate : rawCost;

  // Buying Power Check (導入模式不檢查餘額)
  const buyingPower = selectedAccount ? selectedAccount.balance : 0;
  const isInsufficientFunds = !isImport && isBuy && selectedAccount && finalCost > buyingPower;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-ink-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-paper w-full max-w-md md:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
        
        {/* === Header === */}
        <div className={`p-6 text-white shrink-0 relative transition-colors duration-300 ${
          isImport ? 'bg-gradient-to-br from-morandi-clay to-amber-900' :
          isBuy ? 'bg-gradient-to-br from-morandi-blue to-ink-800' :
          'bg-gradient-to-br from-morandi-rose to-red-900'
        }`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors backdrop-blur-md"
          >
            <X size={20} className="text-white" />
          </button>

          <h2 className="text-2xl font-serif font-bold tracking-tight mb-1">
            {isImport ? '導入持股成本' : isBuy ? (existingAsset ? '加碼買入' : '新增持股') : '賣出持股'}
          </h2>
          <p className="text-sm opacity-80 font-serif">
            {isImport ? '記錄你已經持有的股票，不會扣除現金餘額。' : isBuy ? '紀錄你的投資，讓資產成長看得見。' : '獲利了結或停損，紀錄交易歷程。'}
          </p>
        </div>

        {/* === Content === */}
        <div className="p-6 overflow-y-auto custom-scrollbar">

          {/* No Accounts Warning */}
          {accounts.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-yellow-600 shrink-0 mt-0.5" size={20} />
                <div>
                  <h4 className="font-bold text-yellow-900 text-sm mb-1">⚠️ 尚未建立帳戶</h4>
                  <p className="text-xs text-yellow-700 leading-relaxed mb-2">
                    請先建立證券帳戶才能進行股票交易。
                  </p>
                  <button
                    onClick={() => {
                      onClose();
                      // Navigate to account management (you can implement this)
                      alert('請到「更多」→「帳戶管理」建立帳戶');
                    }}
                    className="text-xs bg-yellow-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-yellow-700 transition"
                  >
                    前往建立帳戶
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 1: Search (Only for New Buy) */}
          {step === 'search' && (
            <div className="space-y-4">
               <div className="relative">
                 <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-ink-300" size={20} />
                 <input 
                   type="text" 
                   placeholder="搜尋代碼 (如: AAPL, 2330)" 
                   className="w-full bg-white border border-stone-200 pl-12 pr-4 py-4 rounded-xl text-lg focus:outline-none focus:border-morandi-blue focus:ring-1 focus:ring-morandi-blue/20 transition-all font-serif"
                   value={searchTerm}
                   onChange={e => setSearchTerm(e.target.value)}
                   autoFocus
                 />
               </div>
               
               <div className="mt-2">
                 <h3 className="text-xs font-bold text-ink-400 uppercase tracking-widest mb-3">搜尋結果</h3>
                 <div className="space-y-2 h-[400px] overflow-y-auto">
                    {isSearching ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 text-morandi-blue animate-spin mb-2" />
                        <p className="text-sm text-ink-400 font-serif">搜尋中...</p>
                      </div>
                    ) : searchResults.length > 0 ? (
                      searchResults.map(stock => (
                        <div
                          key={stock.symbol}
                          onClick={() => handleSearchSelect(stock)}
                          className="flex items-center justify-between p-4 bg-white border border-stone-100 rounded-xl hover:border-morandi-blue hover:shadow-sm cursor-pointer transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-stone-50 flex items-center justify-center text-xs font-bold text-morandi-blue font-serif">
                              {stock.symbol.substring(0, 2)}
                            </div>
                            <div>
                              <div className="font-bold text-ink-900 font-serif">{stock.symbol}</div>
                              <div className="text-xs text-ink-400 font-serif">{stock.name}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-serif-num font-bold text-ink-900">
                              {stock.currency === 'USD' ? '$' : 'NT$'}{stock.price.toFixed(2)}
                            </div>
                            <div className={`text-xs font-serif ${stock.changePercent >= 0 ? 'text-morandi-sage' : 'text-morandi-rose'}`}>
                              {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-ink-300 text-sm font-serif">
                        {searchTerm ? '查無此股票，請嘗試其他關鍵字' : '輸入股票代碼或名稱開始搜尋'}
                        {searchTerm && (
                          <p className="text-xs text-ink-400 mt-2">
                            試試：AAPL, 2330, 台積電
                          </p>
                        )}
                      </div>
                    )}
                 </div>
               </div>
            </div>
          )}

          {/* STEP 2: Form */}
          {step === 'form' && selectedStock && (
             <div className="space-y-6 animate-fade-in">
                
                {/* Stock Info Card */}
                <div className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-100">
                   <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-sm font-bold text-ink-900 font-serif">
                         {selectedStock.symbol.substring(0, 2)}
                      </div>
                      <div>
                         <div className="font-bold text-lg text-ink-900 font-serif">{selectedStock.symbol}</div>
                         <div className="text-xs text-ink-400 font-serif">{selectedStock.name}</div>
                      </div>
                   </div>
                   {!existingAsset && (
                     <button onClick={() => setStep('search')} className="text-xs text-morandi-blue underline font-serif">更換</button>
                   )}
                </div>

                {/* Input Fields Row */}
                <div className="grid grid-cols-2 gap-4">
                   <div className="col-span-2">
                      <label className="block text-xs font-bold text-ink-400 uppercase tracking-widest mb-2">
                        交易價格 ({selectedStock.currency})
                      </label>
                      <div className="relative">
                         <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-ink-400 font-serif">
                             {selectedStock.currency === 'USD' ? '$' : 'NT$'}
                         </span>
                         <input 
                           type="number" 
                           value={price}
                           onChange={e => setPrice(e.target.value)}
                           className="w-full bg-white border border-stone-200 pl-10 pr-4 py-3 rounded-xl text-lg font-serif-num focus:outline-none focus:border-morandi-blue transition-all"
                           placeholder="0.00"
                         />
                      </div>
                   </div>

                   <div>
                      <label className="block text-xs font-bold text-ink-400 uppercase tracking-widest mb-2">
                        數量 (股)
                      </label>
                      <input 
                        type="number" 
                        value={quantity}
                        onChange={e => setQuantity(e.target.value)}
                        className="w-full bg-white border border-stone-200 px-4 py-3 rounded-xl text-lg font-serif-num focus:outline-none focus:border-morandi-blue transition-all"
                        placeholder="0"
                        autoFocus
                      />
                   </div>

                   <div>
                      <label className="block text-xs font-bold text-ink-400 uppercase tracking-widest mb-2">
                        日期
                      </label>
                      <input 
                        type="date" 
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="w-full bg-white border border-stone-200 px-4 py-3 rounded-xl text-sm font-serif-num focus:outline-none focus:border-morandi-blue transition-all h-[52px]"
                      />
                   </div>
                </div>

                {/* Account Selection (Source of Funds) - 導入模式不顯示 */}
                {!isImport && (
                  <div>
                    <label className="block text-xs font-bold text-ink-400 uppercase tracking-widest mb-2">
                      {isBuy ? '扣款帳戶' : '入帳帳戶'}
                    </label>
                    <div className="relative">
                       <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-ink-400 pointer-events-none">
                          <Wallet size={18} />
                       </div>
                       <select
                         value={selectedAccountId}
                         onChange={(e) => setSelectedAccountId(e.target.value)}
                         className="w-full bg-white border border-stone-200 pl-10 pr-4 py-3 rounded-xl text-sm font-bold text-ink-900 focus:outline-none focus:border-morandi-blue appearance-none"
                       >
                         {availableAccounts.map(acc => (
                            <option key={acc.id} value={acc.id}>
                               {acc.type === 'BROKERAGE' ? '📈' : '🏦'} {acc.name} ({acc.currency}){acc.isSub ? ' 複委託' : ''}
                            </option>
                         ))}
                       </select>
                    </div>
                  </div>
                )}

                {/* Summary / Calculation Box */}
                <div className="bg-stone-50 border border-stone-100 p-5 rounded-2xl shadow-sm space-y-3">
                   {/* 導入模式提示 */}
                   {isImport && (
                     <div className="bg-amber-50/50 rounded-lg p-3 space-y-2">
                       <div className="flex items-center gap-2 text-amber-700 font-medium text-xs mb-1">
                          <Package size={14} />
                          <span>導入持股模式</span>
                       </div>
                       <p className="text-[10px] text-ink-400 leading-relaxed">
                          此操作僅記錄您的持倉成本，<strong>不會扣除現金餘額</strong>。適合用於記錄您已經持有的股票。
                       </p>
                     </div>
                   )}

                   {/* Raw Cost */}
                   <div className="flex justify-between items-center text-sm">
                      <span className="text-ink-400 font-serif">
                        {isImport ? '持倉成本' : '預估成本'} ({selectedStock.currency})
                      </span>
                      <span className="font-serif-num font-bold text-ink-900">
                        {selectedStock.currency === 'USD' ? '$' : 'NT$'}{rawCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                   </div>

                   {/* Exchange Rate Info (Sub-brokerage) - 買入模式才顯示 */}
                   {!isImport && isExchangeNeeded && (
                     <div className="py-3 border-t border-dashed border-stone-200">
                        <div className="bg-blue-50/50 rounded-lg p-3 space-y-2">
                          <div className="flex items-center gap-2 text-blue-700 font-medium text-xs mb-1">
                             <span>💱</span>
                             <span>複委託換匯提醒</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                             <span className="text-ink-400">參考匯率</span>
                             <span className="text-ink-900 font-semibold">1 USD ≈ {exchangeRate.toFixed(2)} TWD{ratesLoading && ' (載入中...)'}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                             <span className="text-ink-400">預估台幣扣款</span>
                             <span className="text-blue-700 font-bold">NT$ {finalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                          </div>
                          <p className="text-[10px] text-ink-400 mt-2">
                             ℹ️ 實際成交匯率以券商為準
                          </p>
                        </div>
                     </div>
                   )}

                   {/* Final Deduction - 買入/賣出模式才顯示 */}
                   {!isImport && (
                     <>
                       <div className="flex justify-between items-center pt-2 border-t border-stone-200">
                          <span className="text-sm font-bold text-ink-900 font-serif">預計扣款</span>
                          <div className="text-right">
                             <div className="font-serif-num font-bold text-xl text-ink-900">
                               {selectedAccount?.currency === 'USD' ? '$' : 'NT$'} {finalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                             </div>
                             {isBuy && selectedAccount && (
                               <div className={`text-xs mt-1 font-serif-num ${isInsufficientFunds ? 'text-morandi-rose font-bold' : 'text-ink-400'}`}>
                                  餘額: {selectedAccount?.currency === 'USD' ? '$' : 'NT$'}{buyingPower.toLocaleString()}
                               </div>
                             )}
                          </div>
                       </div>

                       {isInsufficientFunds && (
                          <div className="bg-morandi-roseLight/30 text-morandi-rose px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2">
                             <AlertCircle size={14} /> 餘額不足，無法交易
                          </div>
                       )}
                     </>
                   )}
                </div>

                {/* Confirm Button */}
                <button
                  onClick={handleSubmit}
                  disabled={!quantity || !price || isInsufficientFunds}
                  className={`w-full py-4 rounded-xl font-bold shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-white
                    ${(!quantity || !price || isInsufficientFunds) ? 'bg-stone-300 cursor-not-allowed' :
                      isImport ? 'bg-morandi-clay shadow-morandi-clay/20' :
                      isBuy ? 'bg-morandi-blue shadow-morandi-blue/20' :
                      'bg-morandi-rose shadow-morandi-rose/20'}
                  `}
                >
                  {isImport ? <Package size={20} /> : isBuy ? <PlusCircle size={20} /> : <MinusCircle size={20} />}
                  {isImport ? '確認導入' : isBuy ? '確認買入' : '確認賣出'}
                </button>
             </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default BuyStockModal;
