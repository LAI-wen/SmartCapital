import { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import { Account, Stock } from '../types';
import { MOCK_ACCOUNTS, MOCK_EXCHANGE_RATE } from '../constants';

interface BuyStockModalProps {
  stock: Stock;
  onClose: () => void;
  onConfirm: (details: {
    accountId: string;
    quantity: number;
    price: number;
    totalCost: number;
  }) => void;
  availableAccounts?: Account[]; // 可從外部傳入（用於實際場景）
}

export default function BuyStockModalV2({ 
  stock, 
  onClose, 
  onConfirm,
  availableAccounts = MOCK_ACCOUNTS 
}: BuyStockModalProps) {
  const [quantity, setQuantity] = useState<number>(10);
  const [price, setPrice] = useState<string>(stock.price.toString());
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  // 🎯 1. 篩選可用帳戶邏輯（支援複委託）
  const filteredAccounts = useMemo(() => {
    return availableAccounts.filter(acc => {
      // 台股 → 只能用 TWD 帳戶
      if (stock.currency === 'TWD') {
        return acc.currency === 'TWD' && acc.type === 'BROKERAGE';
      }
      
      // 美股 → 可以用 USD 帳戶 OR TWD 帳戶（視為複委託）
      if (stock.currency === 'USD') {
        return (acc.currency === 'USD' || acc.currency === 'TWD') 
               && acc.type === 'BROKERAGE';
      }
      
      // 加密貨幣 → 只允許 Exchange
      if (stock.currency === 'USDT') {
        return acc.type === 'EXCHANGE';
      }
      
      return false;
    });
  }, [stock.currency, availableAccounts]);

  // 預設選取第一個可用帳戶（優先同幣別）
  if (!selectedAccountId && filteredAccounts.length > 0) {
    const sameCurrency = filteredAccounts.find(a => a.currency === stock.currency);
    setSelectedAccountId(sameCurrency?.id || filteredAccounts[0].id);
  }

  const selectedAccount = filteredAccounts.find(a => a.id === selectedAccountId);

  // 🎯 2. 計算成本邏輯（考慮匯率）
  const rawCost = useMemo(() => {
    if (!quantity || !price) return 0;
    return parseFloat(price) * quantity;
  }, [quantity, price]);

  // 判斷是否需要換匯（複委託場景）
  const isExchangeNeeded = stock.currency === 'USD' && selectedAccount?.currency === 'TWD';

  // 最終扣款金額（如果是複委託，乘上匯率）
  const finalDeduction = useMemo(() => {
    if (isExchangeNeeded) {
      return rawCost * MOCK_EXCHANGE_RATE;
    }
    return rawCost;
  }, [rawCost, isExchangeNeeded]);

  // 🎯 3. 購買力檢查
  const currentBalance = selectedAccount?.balance || 0;
  const isInsufficientFunds = finalDeduction > currentBalance;
  const shortfall = Math.abs(currentBalance - finalDeduction);

  // 價格偏離警告
  const priceDeviation = Math.abs(parseFloat(price) - stock.price) / stock.price;
  const showPriceWarning = priceDeviation > 0.1; // 超過 10% 警告

  const handleConfirm = () => {
    if (isInsufficientFunds || !selectedAccount) return;
    
    onConfirm({
      accountId: selectedAccountId,
      quantity,
      price: parseFloat(price),
      totalCost: finalDeduction
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-6 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {stock.currency === 'TWD' && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                  🇹🇼 台股
                </span>
              )}
              {stock.currency === 'USD' && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                  🇺🇸 美股
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-ink-900">{stock.name}</h2>
            <p className="text-sm text-ink-400">{stock.symbol}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 當前報價 */}
        <div className="bg-gradient-to-br from-morandi-blue to-morandi-blueLight rounded-xl p-4 text-white">
          <div className="text-sm opacity-90 mb-1">當前報價</div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">
              {stock.currency === 'USD' ? '$' : stock.currency === 'TWD' ? 'NT$' : ''} 
              {stock.price.toLocaleString()}
            </span>
            <span className={`text-sm ${stock.change >= 0 ? 'text-green-200' : 'text-red-200'}`}>
              {stock.change >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* 🏦 扣款帳戶選擇 (核心功能) */}
        <div>
          <label className="text-sm text-ink-400 block mb-2">🏦 扣款帳戶</label>
          <select
            value={selectedAccountId}
            onChange={e => setSelectedAccountId(e.target.value)}
            className="w-full bg-stone-50 rounded-xl p-3 outline-none focus:ring-2 ring-morandi-blueLight transition-all"
          >
            {filteredAccounts.map(acc => (
              <option key={acc.id} value={acc.id}>
                {acc.type === 'BROKERAGE' ? '📈' : '🏦'} {acc.name} 
                {' '}({acc.currency}{' '}
                {acc.currency === 'USD' ? '$' : acc.currency === 'TWD' ? 'NT$' : ''}
                {acc.balance.toLocaleString()})
                {acc.isSub ? ' 複委託' : ''}
              </option>
            ))}
          </select>
          
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-ink-400">💰 可用餘額</span>
            <span className="font-semibold text-ink-900">
              {selectedAccount?.currency === 'USD' ? '$' : 'NT$'}
              {currentBalance.toLocaleString()}
            </span>
          </div>
          
          {/* 餘額不足提示 */}
          {isInsufficientFunds && (
            <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm font-medium">⚠️ 餘額不足</p>
              <p className="text-red-500 text-xs mt-1">
                差額：{selectedAccount?.currency === 'USD' ? '$' : 'NT$'}
                {shortfall.toLocaleString()}
              </p>
            </div>
          )}
        </div>

        {/* 輸入區 */}
        <div className="space-y-4">
          {/* 買入數量 */}
          <div>
            <label className="text-sm text-ink-400 block mb-2">買入數量</label>
            <div className="relative">
              <input 
                type="number" 
                value={quantity}
                onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                className="w-full bg-stone-50 rounded-xl p-3 pr-12 text-lg outline-none focus:ring-2 ring-morandi-blueLight"
                min="1"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-400">
                股
              </span>
            </div>
          </div>

          {/* 買入價格 */}
          <div>
            <label className="text-sm text-ink-400 block mb-2">買入價格</label>
            <div className="relative">
              <input 
                type="number" 
                value={price}
                onChange={e => setPrice(e.target.value)}
                className="w-full bg-stone-50 rounded-xl p-3 text-lg outline-none focus:ring-2 ring-morandi-blueLight"
                step="0.01"
              />
              {showPriceWarning && (
                <p className="text-yellow-600 text-xs mt-1">
                  ⚠️ 價格偏離市價超過 10%
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 💰 摘要資訊 */}
        <div className="bg-stone-50 rounded-xl p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-ink-400">
              預估成本 ({stock.currency})
            </span>
            <span className="font-medium">
              {stock.currency === 'USD' ? '$' : stock.currency === 'TWD' ? 'NT$' : ''}
              {rawCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
          </div>
          
          {/* 🇹🇼 複委託提示區塊 */}
          {isExchangeNeeded && (
            <>
              <div className="border-t border-stone-200 pt-2"></div>
              <div className="bg-blue-50 rounded-lg p-3 space-y-1">
                <div className="flex items-center gap-2 text-blue-700 font-medium text-xs mb-2">
                  <span>💱</span>
                  <span>複委託換匯提醒</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-ink-400">參考匯率</span>
                  <span className="text-ink-900">
                    1 USD ≈ {MOCK_EXCHANGE_RATE} TWD
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-ink-400">預估台幣扣款</span>
                  <span className="text-blue-700 font-semibold">
                    NT$ {finalDeduction.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <p className="text-[10px] text-ink-400 mt-2">
                  ℹ️ 實際成交匯率以券商為準
                </p>
              </div>
            </>
          )}
          
          <div className="border-t border-stone-200 pt-2 flex justify-between font-bold text-ink-900">
            <span>預計扣款</span>
            <span className="text-lg">
              {selectedAccount?.currency === 'USD' ? '$' : 'NT$'} 
              {finalDeduction.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* 按鈕 */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <button 
            onClick={onClose}
            className="py-3 rounded-xl text-ink-400 hover:bg-stone-100 font-medium transition-colors"
          >
            取消
          </button>
          <button 
            disabled={isInsufficientFunds || !selectedAccount}
            onClick={handleConfirm}
            className={`py-3 rounded-xl text-white font-medium transition-all
              ${isInsufficientFunds || !selectedAccount
                ? 'bg-gray-300 cursor-not-allowed' 
                : 'bg-morandi-blue hover:opacity-90 active:scale-95'}
            `}
          >
            確認買入
          </button>
        </div>

      </div>
    </div>
  );
}
