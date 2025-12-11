
import React, { useState } from 'react';
import { Asset } from '../types';
import { Search, TrendingUp, TrendingDown, MoreHorizontal } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { COLORS } from '../constants';

interface PortfolioProps {
  assets: Asset[];
  isPrivacyMode: boolean;
}

const Portfolio: React.FC<PortfolioProps> = ({ assets, isPrivacyMode }) => {
  const [filter, setFilter] = useState<'All' | 'Stock' | 'Crypto' | 'Cash'>('All');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAssets = assets.filter(asset => {
    const matchesFilter = filter === 'All' || asset.type === filter;
    const matchesSearch = asset.symbol.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          asset.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const formatCurrency = (val: number) => {
    if (isPrivacyMode) return '••••••';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(val);
  };

  const getProfitLoss = (asset: Asset) => {
    const totalCost = asset.avgPrice * asset.quantity;
    const totalValue = asset.currentPrice * asset.quantity;
    const pl = totalValue - totalCost;
    const plPercent = (pl / totalCost) * 100;
    return { pl, plPercent };
  };

  const filterLabels: Record<string, string> = {
    'All': '全部',
    'Stock': '股票',
    'Crypto': '加密貨幣',
    'Cash': '現金'
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0 h-full flex flex-col">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-5 rounded-2xl shadow-paper border border-stone-100 sticky top-0 z-10">
        <div className="flex gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {['All', 'Stock', 'Crypto', 'Cash'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-5 py-2 rounded-lg text-sm font-serif transition-all whitespace-nowrap ${
                filter === f 
                  ? 'bg-morandi-blue text-white shadow-md' 
                  : 'bg-paper text-ink-400 hover:bg-stone-200'
              }`}
            >
              {filterLabels[f]}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-ink-300" size={16} />
          <input 
            type="text" 
            placeholder="搜尋代號..." 
            className="w-full bg-paper border border-stone-200 text-ink-900 pl-10 pr-4 py-2.5 rounded-lg text-sm focus:outline-none focus:border-morandi-blue focus:ring-1 focus:ring-morandi-blue/20 transition-all font-serif"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Asset List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredAssets.map(asset => {
          const { pl, plPercent } = getProfitLoss(asset);
          const isProfit = pl >= 0;

          return (
            <div key={asset.id} className="bg-white p-6 rounded-2xl border border-stone-100 shadow-paper hover:shadow-soft transition-all group">
              <div className="flex items-center justify-between">
                
                {/* Left: Identity */}
                <div className="flex items-center gap-4 w-1/3 sm:w-1/4">
                  <div className="w-12 h-12 rounded-xl bg-paper border border-stone-100 flex items-center justify-center text-sm font-bold text-morandi-blue font-serif shrink-0">
                    {asset.symbol.substring(0, 2)}
                  </div>
                  <div className="overflow-hidden">
                    <h4 className="font-bold text-ink-900 truncate font-serif text-lg">{asset.symbol}</h4>
                    <p className="text-xs text-ink-400 truncate font-serif">{asset.name}</p>
                  </div>
                </div>

                {/* Middle: Sparkline (Hidden on tiny screens) */}
                <div className="hidden sm:block w-1/4 h-12 opacity-80">
                   <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={asset.history.map((v, i) => ({ v, i }))}>
                      <Line 
                        type="monotone" 
                        dataKey="v" 
                        stroke={asset.change24h >= 0 ? COLORS.profit : COLORS.loss} 
                        strokeWidth={2} 
                        dot={false} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Right: Data */}
                <div className="flex items-center justify-end gap-4 sm:gap-6 w-1/2 pr-2">
                  <div className="text-right hidden sm:block min-w-[100px]">
                    <div className="font-serif-num text-ink-900 text-sm font-medium">
                      {formatCurrency(asset.currentPrice)}
                    </div>
                    <div className="text-xs text-ink-400">
                       Vol: {isPrivacyMode ? '•••' : asset.quantity}
                    </div>
                  </div>

                  <div className="text-right min-w-[80px] sm:min-w-[100px]">
                    <div className={`font-serif-num text-base sm:text-lg font-bold flex items-center justify-end gap-1 ${isProfit ? 'text-morandi-sage' : 'text-morandi-rose'}`}>
                      {isProfit ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}
                      <span className="ml-1">{formatCurrency(pl)}</span>
                    </div>
                    <div className={`text-xs font-medium ${isProfit ? 'text-green-700/60' : 'text-red-700/60'}`}>
                      {plPercent.toFixed(2)}%
                    </div>
                  </div>

                   <button className="text-ink-300 hover:text-morandi-blue p-2 rounded-full hover:bg-paper transition-colors shrink-0">
                      <MoreHorizontal size={18} />
                   </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Portfolio;