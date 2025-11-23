
import React, { useMemo } from 'react';
import { Asset } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Activity, Wallet, TrendingUp } from 'lucide-react';
import { COLORS } from '../constants';

interface DashboardProps {
  assets: Asset[];
  isPrivacyMode: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ assets, isPrivacyMode }) => {
  // Calculate Totals
  const summary = useMemo(() => {
    let totalValue = 0;
    let totalCost = 0;
    let dayChangeValue = 0;

    assets.forEach(asset => {
      const value = asset.quantity * asset.currentPrice;
      const cost = asset.quantity * asset.avgPrice;
      totalValue += value;
      totalCost += cost;
      
      const prevPrice = asset.currentPrice / (1 + asset.change24h / 100);
      const prevValue = asset.quantity * prevPrice;
      dayChangeValue += (value - prevValue);
    });

    return {
      totalValue,
      dayChangeValue,
      dayChangePercent: totalValue > 0 ? (dayChangeValue / (totalValue - dayChangeValue)) * 100 : 0
    };
  }, [assets]);

  // Data for Pie Chart
  const allocationData = useMemo(() => {
    const typeMap = new Map<string, number>();
    assets.forEach(asset => {
      const value = asset.quantity * asset.currentPrice;
      typeMap.set(asset.type, (typeMap.get(asset.type) || 0) + value);
    });
    
    // Map English types to Chinese for display
    const typeNames: Record<string, string> = {
      'Stock': '股票',
      'Crypto': '加密貨幣',
      'Cash': '現金',
      'ETF': 'ETF'
    };

    return Array.from(typeMap).map(([name, value]) => ({ 
      name: typeNames[name] || name, 
      value 
    }));
  }, [assets]);

  const formatCurrency = (val: number) => {
    if (isPrivacyMode) return '••••••';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  };

  const formatPercent = (val: number) => {
    if (isPrivacyMode) return '••%';
    return `${val > 0 ? '+' : ''}${val.toFixed(2)}%`;
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero Card - Clean Journal Style */}
      <div className="relative overflow-hidden rounded-2xl bg-white p-8 shadow-soft border border-stone-100">
        <div className="absolute top-0 right-0 w-64 h-64 bg-morandi-sand/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
        
        <div className="relative z-10">
          <h2 className="text-ink-400 font-serif text-sm font-medium mb-3 flex items-center gap-2 tracking-widest uppercase">
            <Wallet size={16} className="text-morandi-blue" /> Net Worth
          </h2>
          <div className="text-5xl font-serif-num font-medium text-ink-900 mb-4 tracking-tight">
            {formatCurrency(summary.totalValue)}
          </div>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${summary.dayChangeValue >= 0 ? 'bg-morandi-sageLight text-morandi-sage' : 'bg-morandi-roseLight text-morandi-rose'}`}>
              {summary.dayChangeValue >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
              <span className="font-serif-num">{formatCurrency(Math.abs(summary.dayChangeValue))}</span>
              <span className="ml-1 font-bold">({formatPercent(summary.dayChangePercent)})</span>
            </div>
            <span className="text-ink-400 text-sm font-serif italic">今日損益變動</span>
          </div>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Allocation Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-paper border border-stone-100">
          <h3 className="text-lg font-serif font-bold text-ink-900 mb-6 flex items-center gap-2 border-b border-stone-100 pb-3">
            <Activity size={18} className="text-morandi-clay" /> 資產配置
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={allocationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {allocationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS.chart[index % COLORS.chart.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderColor: '#E6E2D6', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontFamily: 'Lora' }}
                  itemStyle={{ color: '#44403C' }}
                  formatter={(value: number) => isPrivacyMode ? '••••' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            {allocationData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2 text-xs font-medium text-ink-400">
                <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: COLORS.chart[index % COLORS.chart.length] }}></div>
                {entry.name}
              </div>
            ))}
          </div>
        </div>

        {/* Top Movers */}
        <div className="bg-white rounded-2xl p-6 shadow-paper border border-stone-100 flex flex-col">
          <h3 className="text-lg font-serif font-bold text-ink-900 mb-6 flex items-center gap-2 border-b border-stone-100 pb-3">
            <TrendingUp size={18} className="text-morandi-clay" /> 今日動態
          </h3>
          <div className="space-y-3 flex-1">
             {[...assets].sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h)).slice(0, 3).map(asset => (
               <div key={asset.id} className="flex items-center justify-between p-4 rounded-xl bg-paper border border-transparent hover:border-morandi-blueLight transition-all group">
                 <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center font-bold font-serif text-morandi-blue text-lg border border-stone-100">
                     {asset.symbol.substring(0, 1)}
                   </div>
                   <div>
                     <div className="font-bold text-ink-900 font-serif">{asset.symbol}</div>
                     <div className="text-xs text-ink-400">{asset.name}</div>
                   </div>
                 </div>
                 <div className="text-right">
                   <div className="font-serif-num text-ink-900 font-medium">{formatCurrency(asset.currentPrice)}</div>
                   <div className={`font-serif-num text-sm ${asset.change24h >= 0 ? 'text-morandi-sage' : 'text-morandi-rose'}`}>
                     {asset.change24h > 0 ? '+' : ''}{asset.change24h}%
                   </div>
                 </div>
               </div>
             ))}
          </div>
          <button className="w-full mt-6 py-3 bg-stone-50 hover:bg-stone-100 text-sm font-medium text-ink-400 rounded-xl transition-colors font-serif">
            查看更多市場數據
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;