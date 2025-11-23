
import React, { useMemo, useState } from 'react';
import { Asset, Account, InvestmentScope } from '../types';
import { MOCK_EXCHANGE_RATE } from '../constants';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Wallet, TrendingUp, TrendingDown, Search, Activity, ReceiptText, Briefcase, ChevronRight, Landmark, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StockDetailModal from './StockDetailModal';
import BuyStockModal, { StockTransaction } from './BuyStockModal';

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
  const [filter, setFilter] = useState<'All' | 'Stock' | 'Crypto' | 'Cash'>('All');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  
  // Buy/Sell Modal State
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [buyModalMode, setBuyModalMode] = useState<'buy' | 'sell'>('buy');
  const [transactionAsset, setTransactionAsset] = useState<Asset | null>(null);

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

  // Calculate Totals based on Filtered Assets and Scope
  const summary = useMemo(() => {
    // 1. Calculate Investments (Assets)
    let investValue = 0;
    let investDayChange = 0;

    scopeFilteredAssets.forEach(asset => {
      // Normalize to TWD (Base Currency for Dashboard Total) or USD based on preference.
      // Let's assume Base Currency is TWD for display if TW scope is active, or USD if only US.
      // For simplicity in this demo, we normalize everything to TWD if TW is active, else USD.
      // Actually, let's just stick to TWD as base for now since it's "SmartCapital TW".
      
      let valueTWD = 0;
      let changeTWD = 0;
      
      const assetValue = asset.quantity * asset.currentPrice;
      const prevPrice = asset.currentPrice / (1 + asset.change24h / 100);
      const prevValue = asset.quantity * prevPrice;
      const assetChange = assetValue - prevValue;

      if (asset.currency === 'USD') {
        valueTWD = assetValue * MOCK_EXCHANGE_RATE;
        changeTWD = assetChange * MOCK_EXCHANGE_RATE;
      } else {
        valueTWD = assetValue;
        changeTWD = assetChange;
      }

      investValue += valueTWD;
      investDayChange += changeTWD;
    });

    // 2. Calculate Cash (Accounts)
    let cashValueTWD = 0;
    accounts.forEach(acc => {
      // Filter accounts by scope too? Ideally yes, but cash is usually global.
      // We will just sum all cash.
      if (acc.currency === 'USD') cashValueTWD += acc.balance * MOCK_EXCHANGE_RATE;
      else cashValueTWD += acc.balance;
    });

    const totalValue = investValue + cashValueTWD;

    return {
      totalValue, // In TWD
      investValue, // In TWD
      cashValueTWD,
      investDayChange, // In TWD
      dayChangePercent: investValue > 0 ? (investDayChange / investValue) * 100 : 0
    };
  }, [scopeFilteredAssets, accounts, investmentScope]);

  // Filtered List Logic (Search + Type Filter)
  const displayAssets = useMemo(() => {
    return scopeFilteredAssets.filter(asset => {
      const matchesFilter = filter === 'All' || asset.type === filter;
      const matchesSearch = asset.symbol.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            asset.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [scopeFilteredAssets, filter, searchTerm]);

  // Data for Allocation Pie Chart
  const allocationData = useMemo(() => {
    const groups = {
      'TW': { name: '台股', value: 0, color: '#A8B9A5' }, // morandi-sage
      'US': { name: '美股', value: 0, color: '#8FA5B5' }, // morandi-blue
      'Crypto': { name: '加密貨幣', value: 0, color: '#B8A293' }, // morandi-clay
      'Cash': { name: '現金', value: 0, color: '#C8D5E0' }, // morandi-blueLight
    };

    // Add Investments
    scopeFilteredAssets.forEach(asset => {
      let valueTWD = asset.quantity * asset.currentPrice;
      if (asset.currency === 'USD') valueTWD *= MOCK_EXCHANGE_RATE;

      if (asset.type === 'Crypto') {
        groups['Crypto'].value += valueTWD;
      } else if (asset.currency === 'TWD') {
        groups['TW'].value += valueTWD;
      } else {
        groups['US'].value += valueTWD;
      }
    });

    // Add Accounts to "Cash"
    accounts.forEach(acc => {
      if (acc.currency === 'USD') groups['Cash'].value += acc.balance * MOCK_EXCHANGE_RATE;
      else groups['Cash'].value += acc.balance;
    });

    return Object.values(groups).filter(g => g.value > 0);
  }, [scopeFilteredAssets, accounts]);

  // Data for Top Movers
  const topMovers = useMemo(() => {
    return [...scopeFilteredAssets]
      .filter(a => a.type !== 'Cash' && a.quantity > 0)
      .sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h))
      .slice(0, 3);
  }, [scopeFilteredAssets]);

  const formatCurrency = (val: number, currency: string = 'TWD', minimumFractionDigits = 0) => {
    if (isPrivacyMode) return '••••••';
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: currency, 
      minimumFractionDigits, 
      maximumFractionDigits: 0 
    }).format(val);
  };

  const formatPercent = (val: number) => {
    if (isPrivacyMode) return '••%';
    return `${val > 0 ? '+' : ''}${val.toFixed(2)}%`;
  };

  const getProfitLoss = (asset: Asset) => {
    const totalCost = asset.avgPrice * asset.quantity;
    const totalValue = asset.currentPrice * asset.quantity;
    const pl = totalValue - totalCost;
    const plPercent = totalCost > 0 ? (pl / totalCost) * 100 : 0;
    return { pl, plPercent };
  };

  // --- Handlers ---
  
  const handleOpenBuyNew = () => {
    setTransactionAsset(null);
    setBuyModalMode('buy');
    setIsBuyModalOpen(true);
  };

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

    // 1. Handle Money Movement
    if (accountId) {
      const accIndex = updatedAccounts.findIndex(a => a.id === accountId);
      if (accIndex >= 0) {
        const acc = updatedAccounts[accIndex];
        
        // Exchange Logic
        let deductionAmount = totalTxnAmountAssetCurrency;
        if (txn.currency === 'USD' && acc.currency === 'TWD') {
          deductionAmount = totalTxnAmountAssetCurrency * MOCK_EXCHANGE_RATE;
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
    } else {
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

  const filterLabels: Record<string, string> = {
    'All': '全部',
    'Stock': '股票',
    'Crypto': '加密',
    'Cash': '現金'
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      
      {/* 1. Hero Card - Total Assets (Split View) */}
      <div className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-soft border border-stone-100 group transition-all hover:shadow-lg">
        <div className="absolute top-0 right-0 w-64 h-64 bg-morandi-sand/50 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col gap-6">
          {/* Top: Net Worth */}
          <div className="flex flex-col md:flex-row justify-between md:items-end gap-2">
            <div>
              <div className="flex items-center gap-2 mb-2">
                 <h2 className="text-ink-400 font-serif text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                   <Wallet size={14} className="text-morandi-blue" /> 總淨資產 (TWD)
                 </h2>
              </div>
              <div className="text-4xl md:text-5xl font-serif-num font-medium text-ink-900 tracking-tight flex items-baseline gap-3">
                {formatCurrency(summary.totalValue)}
                <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold font-serif-num ${summary.investDayChange >= 0 ? 'text-morandi-sage' : 'text-morandi-rose'}`}>
                       {summary.investDayChange >= 0 ? '+' : ''}{formatCurrency(summary.investDayChange)}
                    </span>
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${summary.investDayChange >= 0 ? 'bg-morandi-sageLight text-morandi-sage' : 'bg-morandi-roseLight text-morandi-rose'}`}>
                       {formatPercent(summary.dayChangePercent)}
                    </span>
                </div>
              </div>
              {/* Scope/Rate Warning */}
              {(investmentScope.us || investmentScope.crypto) && (
                <div className="mt-2 flex items-center gap-1 text-[10px] text-ink-400 font-serif">
                   <Info size={10} /> 以 1 USD ≈ {MOCK_EXCHANGE_RATE} TWD 計算
                </div>
              )}
            </div>
          </div>

          {/* Bottom: Split (Cash vs Invest) */}
          <div className="grid grid-cols-2 gap-4 border-t border-stone-100 pt-4">
             <div className="flex items-start gap-3">
                <div className="p-2 bg-stone-50 rounded-lg text-ink-400">
                   <Landmark size={18} />
                </div>
                <div>
                   <div className="text-xs text-ink-400 font-serif mb-0.5">現金/存款</div>
                   <div className="text-lg font-bold font-serif-num text-ink-900">{formatCurrency(summary.cashValueTWD)}</div>
                </div>
             </div>
             <div className="flex items-start gap-3">
                <div className="p-2 bg-stone-50 rounded-lg text-ink-400">
                   <TrendingUp size={18} />
                </div>
                <div>
                   <div className="text-xs text-ink-400 font-serif mb-0.5">投資部位</div>
                   <div className="text-lg font-bold font-serif-num text-ink-900">{formatCurrency(summary.investValue)}</div>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* 2. Quick Actions */}
      <div className="grid grid-cols-3 gap-3">
         <button 
           onClick={() => navigate('/ledger')} 
           className="flex flex-col items-center justify-center gap-2 bg-white p-4 rounded-xl shadow-sm border border-stone-100 active:scale-95 transition-all hover:border-morandi-blue/30"
         >
            <div className="w-10 h-10 rounded-full bg-morandi-blueLight flex items-center justify-center text-morandi-blue">
               <ReceiptText size={20} />
            </div>
            <span className="text-xs font-bold text-ink-900 font-serif">記一筆</span>
         </button>
         <button 
           onClick={handleOpenBuyNew}
           className="flex flex-col items-center justify-center gap-2 bg-white p-4 rounded-xl shadow-sm border border-stone-100 active:scale-95 transition-all hover:border-morandi-blue/30"
         >
            <div className="w-10 h-10 rounded-full bg-morandi-sageLight flex items-center justify-center text-morandi-sage">
               <Briefcase size={20} />
            </div>
            <span className="text-xs font-bold text-ink-900 font-serif">買股票</span>
         </button>
         <button 
           onClick={() => navigate('/strategy')} 
           className="flex flex-col items-center justify-center gap-2 bg-white p-4 rounded-xl shadow-sm border border-stone-100 active:scale-95 transition-all hover:border-morandi-blue/30"
         >
            <div className="w-10 h-10 rounded-full bg-morandi-sand flex items-center justify-center text-ink-700">
               <Activity size={20} />
            </div>
            <span className="text-xs font-bold text-ink-900 font-serif">策略</span>
         </button>
      </div>

      {/* 3. Mid Section: Allocation & Top Movers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Asset Allocation */}
        <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm flex flex-col">
          <h3 className="text-sm font-bold font-serif text-ink-900 mb-4 flex items-center gap-2">
             <Activity size={16} className="text-ink-400"/> 資產配置
          </h3>
          <div className="flex-1 flex flex-row items-center gap-4">
            <div className="w-32 h-32 relative shrink-0">
               <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={allocationData} 
                      innerRadius={40} 
                      outerRadius={60} 
                      paddingAngle={5} 
                      dataKey="value"
                      stroke="none"
                    >
                      {allocationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                       contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', padding: '8px 12px' }}
                       formatter={(value: number) => formatCurrency(value)}
                       itemStyle={{ color: '#4A4A4A', fontSize: '12px', fontWeight: 'bold' }}
                    />
                  </PieChart>
               </ResponsiveContainer>
               {/* Center Text */}
               <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-[10px] text-ink-400 font-serif">分布</span>
               </div>
            </div>
            
            <div className="flex-1 space-y-2 overflow-y-auto max-h-32 custom-scrollbar pr-2">
               {allocationData.map((item) => (
                 <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                       <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                       <span className="text-ink-800 font-serif">{item.name}</span>
                    </div>
                    <span className="font-serif-num font-bold text-ink-900">
                      {((item.value / summary.totalValue) * 100).toFixed(0)}%
                    </span>
                 </div>
               ))}
            </div>
          </div>
        </div>

        {/* Top Movers */}
        <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm flex flex-col">
           <div className="flex justify-between items-center mb-4">
             <h3 className="text-sm font-bold font-serif text-ink-900 flex items-center gap-2">
                <TrendingUp size={16} className="text-ink-400"/> 今日動態
             </h3>
             <span className="text-[10px] bg-stone-100 text-ink-400 px-2 py-0.5 rounded-full font-serif">Top 3</span>
           </div>
           
           <div className="space-y-3">
              {topMovers.map(asset => (
                <div 
                  key={asset.id} 
                  onClick={() => setSelectedAsset(asset)}
                  className="flex items-center justify-between cursor-pointer group"
                >
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-stone-50 flex items-center justify-center text-[10px] font-bold text-ink-700 font-serif border border-stone-100 group-hover:border-morandi-blue/50 transition-colors">
                        {asset.symbol.substring(0, 2)}
                      </div>
                      <div>
                         <div className="text-xs font-bold text-ink-900 font-serif group-hover:text-morandi-blue transition-colors">{asset.symbol}</div>
                         <div className="text-[10px] text-ink-400 font-serif-num">
                            {asset.currency === 'USD' ? '$' : 'NT$'}{asset.currentPrice}
                         </div>
                      </div>
                   </div>
                   <div className={`text-xs font-bold font-serif-num px-2 py-1 rounded-md ${
                     asset.change24h >= 0 
                       ? 'text-morandi-sage bg-morandi-sageLight' 
                       : 'text-morandi-rose bg-morandi-roseLight'
                   }`}>
                      {asset.change24h > 0 ? '+' : ''}{asset.change24h}%
                   </div>
                </div>
              ))}
              {topMovers.length === 0 && (
                <div className="text-center py-4 text-xs text-ink-400 font-serif">
                   暫無波動數據
                </div>
              )}
           </div>
        </div>
      </div>

      {/* 4. Holdings Section */}
      <div className="bg-transparent space-y-4">
        <div className="flex items-center justify-between sticky top-0 bg-paper/95 backdrop-blur-sm z-10 py-2">
            <h3 className="text-lg font-bold font-serif text-ink-900">我的持股</h3>
            <div className="flex gap-2">
               {['All', 'Stock', 'Crypto'].map(f => (
                 <button 
                    key={f}
                    onClick={() => setFilter(f as any)}
                    className={`px-3 py-1 text-xs rounded-full font-serif transition-all ${filter === f ? 'bg-ink-800 text-white' : 'bg-stone-100 text-ink-400'}`}
                 >
                    {filterLabels[f] || f}
                 </button>
               ))}
            </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-ink-400" size={16} />
          <input 
            type="text" 
            placeholder="搜尋代號或名稱..." 
            className="w-full bg-white border border-stone-200 text-ink-900 pl-10 pr-4 py-3 rounded-xl text-sm focus:outline-none focus:border-morandi-blue focus:ring-1 focus:ring-morandi-blue/20 transition-all font-serif shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* List */}
        <div className="grid grid-cols-1 gap-4">
          {displayAssets.length > 0 ? displayAssets.map(asset => {
            const { pl, plPercent } = getProfitLoss(asset);
            const isProfit = pl >= 0;
            const isTW = asset.currency === 'TWD';
            const isUS = asset.currency === 'USD';

            return (
              <div 
                key={asset.id} 
                onClick={() => setSelectedAsset(asset)}
                className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm hover:shadow-soft transition-all group cursor-pointer active:scale-[0.98]"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-lg bg-stone-50 border border-stone-100 flex items-center justify-center text-sm font-bold text-morandi-blue font-serif shrink-0">
                        {asset.symbol.substring(0, 2)}
                      </div>
                      {/* Region Badge */}
                      <div className={`absolute -bottom-1 -right-1 px-1.5 py-0.5 text-[8px] font-bold rounded text-white font-serif ${isTW ? 'bg-morandi-sage' : 'bg-morandi-blue'}`}>
                          {isTW ? 'TW' : 'US'}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-ink-900 font-serif leading-tight text-lg">{asset.symbol}</h4>
                      <p className="text-xs text-ink-400 font-serif">{asset.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-serif-num text-base font-bold flex items-center justify-end gap-1 ${isProfit ? 'text-morandi-sage' : 'text-morandi-rose'}`}>
                      {isProfit ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}
                      {formatCurrency(pl, asset.currency)}
                    </div>
                    <div className={`text-xs font-medium ${isProfit ? 'text-green-700/60' : 'text-red-700/60'}`}>
                      {plPercent.toFixed(2)}%
                    </div>
                  </div>
                </div>

                {/* Actions & Price */}
                <div className="flex items-center justify-between pt-3 border-t border-stone-50 min-h-[36px]">
                   <div className="text-xs text-ink-400 font-serif">
                      現價 <span className="text-ink-900 font-serif-num font-bold ml-1">{formatCurrency(asset.currentPrice, asset.currency)}</span>
                      <span className="mx-2 text-stone-300">|</span>
                      持有 <span className="text-ink-900 font-serif-num font-bold ml-1">{asset.quantity}</span>
                   </div>
                   
                   {/* Desktop Hover Actions - Hidden on mobile to keep list clean */}
                   <div className="hidden md:flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleTransaction(asset, 'buy'); }}
                        className="px-3 py-1.5 bg-morandi-sageLight text-morandi-sage text-xs font-bold rounded-lg hover:bg-morandi-sage hover:text-white transition-colors"
                      >
                        買入
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleTransaction(asset, 'sell'); }}
                        className="px-3 py-1.5 bg-morandi-roseLight text-morandi-rose text-xs font-bold rounded-lg hover:bg-morandi-rose hover:text-white transition-colors"
                      >
                        賣出
                      </button>
                   </div>
                </div>
              </div>
            );
          }) : (
             <div className="text-center py-10 opacity-50">
               <p className="font-serif text-ink-400">沒有符合搜尋的持股</p>
               <button onClick={handleOpenBuyNew} className="text-morandi-blue text-sm font-bold mt-2 hover:underline">新增第一筆持股</button>
             </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      <StockDetailModal 
        asset={selectedAsset} 
        isOpen={!!selectedAsset} 
        onClose={() => setSelectedAsset(null)} 
        isPrivacyMode={isPrivacyMode}
        onBuy={() => selectedAsset && handleTransaction(selectedAsset, 'buy')}
        onSell={() => selectedAsset && handleTransaction(selectedAsset, 'sell')}
      />

      {/* Buy/Sell Transaction Modal */}
      <BuyStockModal 
        isOpen={isBuyModalOpen}
        onClose={() => setIsBuyModalOpen(false)}
        mode={buyModalMode}
        existingAsset={transactionAsset}
        onConfirm={confirmTransaction}
        accounts={accounts} // Pass accounts for selection
      />
    </div>
  );
};

export default Dashboard;
