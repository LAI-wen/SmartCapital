import React, { useState, useEffect } from 'react';
import { X, Search, TrendingUp, TrendingDown, AlertCircle, CheckCircle2, DollarSign, Hash, Calendar } from 'lucide-react';
import { Asset } from '../types';

interface BuyStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingAsset?: Asset | null; // 如果是加碼，傳入現有資產
  onSuccess: (purchase: StockPurchase) => void;
}

interface StockPurchase {
  symbol: string;
  name: string;
  quantity: number;
  price: number;
  totalCost: number;
  date: string;
  type: 'buy' | 'sell';
}

interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

const BuyStockModal: React.FC<BuyStockModalProps> = ({ 
  isOpen, 
  onClose, 
  existingAsset, 
  onSuccess 
}) => {
  // Form State
  const [symbol, setSymbol] = useState(existingAsset?.symbol || '');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  // UI State
  const [isSearching, setIsSearching] = useState(false);
  const [stockQuote, setStockQuote] = useState<StockQuote | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // 如果是加碼，自動查詢股票資訊
  useEffect(() => {
    if (existingAsset) {
      setStockQuote({
        symbol: existingAsset.symbol,
        name: existingAsset.name,
        price: existingAsset.currentPrice,
        change: existingAsset.change24h,
        changePercent: existingAsset.change24h
      });
      setPrice(existingAsset.currentPrice.toString());
    }
  }, [existingAsset]);

  // 查詢股票報價
  const handleSearchStock = async () => {
    if (!symbol.trim()) return;
    
    setIsSearching(true);
    setError('');
    
    try {
      // TODO: 整合後端 API
      // const response = await fetch(`/api/stocks/quote/${symbol}`);
      // const data = await response.json();
      
      // Mock 資料（暫時）
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // 台股自動加 .TW
      const formattedSymbol = /^\d{4}$/.test(symbol) ? `${symbol}.TW` : symbol.toUpperCase();
      
      const mockQuote: StockQuote = {
        symbol: formattedSymbol,
        name: formattedSymbol.includes('.TW') ? '台灣股票' : 'US Stock',
        price: 150.00,
        change: 2.50,
        changePercent: 1.69
      };
      
      setStockQuote(mockQuote);
      setSymbol(formattedSymbol);
      setPrice(mockQuote.price.toString());
      
    } catch (err) {
      setError('查無此股票，請檢查代碼是否正確');
      setStockQuote(null);
    } finally {
      setIsSearching(false);
    }
  };

  // Enter 鍵觸發搜尋
  const handleSymbolKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearchStock();
    }
  };

  // 計算總成本
  const totalCost = quantity && price ? parseFloat(quantity) * parseFloat(price) : 0;

  // 驗證輸入
  const validateInput = (): boolean => {
    if (!stockQuote) {
      setError('請先搜尋股票');
      return false;
    }
    if (!quantity || parseFloat(quantity) <= 0) {
      setError('請輸入有效數量');
      return false;
    }
    if (!price || parseFloat(price) <= 0) {
      setError('請輸入有效價格');
      return false;
    }
    
    // 價格異常檢查（偏離市價 50% 以上）
    if (stockQuote && Math.abs(parseFloat(price) - stockQuote.price) / stockQuote.price > 0.5) {
      if (!confirm(`價格偏離市價 ${Math.abs(((parseFloat(price) - stockQuote.price) / stockQuote.price * 100)).toFixed(1)}%，確定要繼續嗎？`)) {
        return false;
      }
    }
    
    return true;
  };

  // 確認買入
  const handleConfirm = () => {
    setError('');
    
    if (!validateInput()) return;
    
    const purchase: StockPurchase = {
      symbol: stockQuote!.symbol,
      name: stockQuote!.name,
      quantity: parseFloat(quantity),
      price: parseFloat(price),
      totalCost,
      date,
      type: 'buy'
    };
    
    // 顯示成功提示
    setSuccess(true);
    
    // 延遲關閉，讓使用者看到成功訊息
    setTimeout(() => {
      onSuccess(purchase);
      handleClose();
    }, 800);
  };

  // 關閉並重置
  const handleClose = () => {
    setSymbol('');
    setQuantity('');
    setPrice('');
    setDate(new Date().toISOString().split('T')[0]);
    setStockQuote(null);
    setError('');
    setSuccess(false);
    onClose();
  };

  const formatCurrency = (val: number) => {
    // 台股用 NT$，美股用 $
    const currency = stockQuote?.symbol.includes('.TW') ? 'NT$' : '$';
    return `${currency}${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/40 backdrop-blur-sm animate-fade-in"
      onClick={handleClose}
    >
      <div 
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-morandi-blue to-morandi-blueLight p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-2">
              <h2 className="text-2xl font-serif font-bold">
                {existingAsset ? '加碼買入' : '買入股票'}
              </h2>
              <button 
                onClick={handleClose}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <p className="text-sm opacity-80">
              {existingAsset ? `追加 ${existingAsset.name} 持股` : '輸入股票代碼開始交易'}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          
          {/* 股票搜尋（新增持股時） */}
          {!existingAsset && (
            <div>
              <label className="block text-xs font-serif text-ink-500 mb-2 uppercase tracking-wider">
                股票代碼 Symbol
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" size={18} />
                  <input 
                    type="text"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                    onKeyPress={handleSymbolKeyPress}
                    placeholder="例如：AAPL 或 2330"
                    className="w-full bg-paper border border-stone-200 rounded-xl py-3 pl-10 pr-4 text-ink-900 focus:outline-none focus:border-morandi-blue font-serif-num"
                    disabled={isSearching}
                  />
                </div>
                <button
                  onClick={handleSearchStock}
                  disabled={isSearching || !symbol.trim()}
                  className="px-6 bg-morandi-blue text-white rounded-xl font-medium hover:bg-ink-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSearching ? '搜尋中...' : '查詢'}
                </button>
              </div>
            </div>
          )}

          {/* 股票資訊卡片 */}
          {stockQuote && (
            <div className="bg-paper border border-stone-200 rounded-xl p-4 animate-fade-in">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-lg text-ink-900 font-serif">{stockQuote.symbol}</h3>
                  <p className="text-sm text-ink-400">{stockQuote.name}</p>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-ink-900 font-serif-num">
                    {formatCurrency(stockQuote.price)}
                  </div>
                  <div className={`text-sm font-medium flex items-center gap-1 justify-end ${
                    stockQuote.changePercent >= 0 ? 'text-morandi-sage' : 'text-morandi-rose'
                  }`}>
                    {stockQuote.changePercent >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {stockQuote.changePercent >= 0 ? '+' : ''}{stockQuote.changePercent.toFixed(2)}%
                  </div>
                </div>
              </div>
              <div className="text-xs text-ink-400 bg-white px-3 py-2 rounded-lg">
                💡 以上為參考市價，請填入實際成交價格
              </div>
            </div>
          )}

          {/* 買入表單 */}
          <div className="space-y-4">
            {/* 數量 */}
            <div>
              <label className="block text-xs font-serif text-ink-500 mb-2 uppercase tracking-wider">
                買入數量 Quantity
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" size={18} />
                <input 
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="0"
                  className="w-full bg-paper border border-stone-200 rounded-xl py-3 pl-10 pr-16 text-ink-900 focus:outline-none focus:border-morandi-blue font-serif-num text-lg"
                  min="0"
                  step="1"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-400 text-sm">股</span>
              </div>
            </div>

            {/* 價格 */}
            <div>
              <label className="block text-xs font-serif text-ink-500 mb-2 uppercase tracking-wider">
                買入價格 Price
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" size={18} />
                <input 
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-paper border border-stone-200 rounded-xl py-3 pl-10 pr-4 text-ink-900 focus:outline-none focus:border-morandi-blue font-serif-num text-lg"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            {/* 日期 */}
            <div>
              <label className="block text-xs font-serif text-ink-500 mb-2 uppercase tracking-wider">
                買入日期 Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" size={18} />
                <input 
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-paper border border-stone-200 rounded-xl py-3 pl-10 pr-4 text-ink-900 focus:outline-none focus:border-morandi-blue font-serif"
                />
              </div>
            </div>
          </div>

          {/* 總成本預覽 */}
          {totalCost > 0 && (
            <div className="bg-morandi-blueLight/20 border border-morandi-blue/30 rounded-xl p-4 animate-fade-in">
              <div className="flex justify-between items-center">
                <span className="text-sm text-ink-600 font-medium">總成本</span>
                <span className="text-2xl font-bold text-morandi-blue font-serif-num">
                  {formatCurrency(totalCost)}
                </span>
              </div>
              <div className="text-xs text-ink-500 mt-2">
                = {quantity} 股 × {formatCurrency(parseFloat(price))}
              </div>
            </div>
          )}

          {/* 錯誤提示 */}
          {error && (
            <div className="bg-morandi-roseLight/20 border border-morandi-rose/30 rounded-xl p-4 flex items-start gap-3 animate-fade-in">
              <AlertCircle size={20} className="text-morandi-rose shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-morandi-rose text-sm">{error}</div>
              </div>
            </div>
          )}

          {/* 成功提示 */}
          {success && (
            <div className="bg-morandi-sageLight/20 border border-morandi-sage/30 rounded-xl p-4 flex items-start gap-3 animate-fade-in">
              <CheckCircle2 size={20} className="text-morandi-sage shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-morandi-sage text-sm">買入成功！</div>
              </div>
            </div>
          )}

          {/* 操作按鈕 */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleClose}
              className="flex-1 bg-white border-2 border-stone-200 text-ink-700 py-3 rounded-xl font-bold hover:bg-paper transition-all"
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              disabled={!stockQuote || !quantity || !price || success}
              className="flex-1 bg-morandi-blue text-white py-3 rounded-xl font-bold hover:bg-ink-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {success ? '處理中...' : '確認買入'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuyStockModal;
