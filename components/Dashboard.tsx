
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Asset } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Activity, Wallet, TrendingUp, ReceiptText, FlaskConical } from 'lucide-react';
import { COLORS } from '../constants';

interface DashboardProps {
  assets: Asset[];
  isPrivacyMode: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ assets, isPrivacyMode }) => {
  const navigate = useNavigate();
  
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

  // Data for Pie Chart - 區分地區 + 類型
  const allocationData = useMemo(() => {
    const regionMap = new Map<string, number>();
    
    assets.forEach(asset => {
      const value = asset.quantity * asset.currentPrice;
      
      // 根據代碼自動分類地區
      let region = '其他';
      if (asset.symbol.endsWith('.TW') || asset.symbol.endsWith('.TWO')) {
        region = '🇹🇼 台股';
      } else if (asset.type === 'Crypto' || asset.symbol.includes('BTC') || asset.symbol.includes('ETH')) {
        region = '₿ 加密貨幣';
      } else if (asset.type === 'ETF') {
        // ETF 根據代碼判斷
        if (asset.symbol.endsWith('.TW')) {
          region = '🇹🇼 台股 ETF';
        } else {
          region = '🇺🇸 美股 ETF';
        }
      } else {
        region = '🇺🇸 美股';
      }
      
      regionMap.set(region, (regionMap.get(region) || 0) + value);
    });
    
    return Array.from(regionMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value); // 按金額排序
  }, [assets]);

  const formatCurrency = (val: number, currency: string = 'TWD') => {
    if (isPrivacyMode) return '••••••';
    
    // 根據幣別選擇格式
    if (currency === 'TWD') {
      return `NT$${val.toLocaleString('zh-TW', { maximumFractionDigits: 0 })}`;
    }
    
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD', 
      maximumFractionDigits: 0 
    }).format(val);
  };

  const formatPercent = (val: number) => {
    if (isPrivacyMode) return '••%';
    return `${val > 0 ? '+' : ''}${val.toFixed(2)}%`;
  };

  // 檢查是否為空狀態
  const isEmpty = assets.length === 0 || summary.totalValue === 0;

  return (
    <div className="space-y-8 animate-fade-in">
      {isEmpty ? (
        /* 空狀態：新用戶引導 */
        <div className="flex flex-col items-center justify-center pt-12 pb-20">
          <div className="w-32 h-32 bg-gradient-to-br from-morandi-blueLight to-morandi-clayLight rounded-full flex items-center justify-center mb-6 shadow-soft">
            <Wallet size={64} className="text-morandi-blue" />
          </div>
          
          <h2 className="text-3xl font-serif font-bold text-ink-900 mb-3">
            開始你的投資旅程
          </h2>
          <p className="text-ink-400 text-center mb-10 max-w-md text-lg">
            記錄你的第一筆持股<br/>
            追蹤資產成長，掌握財富密碼
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 mb-12">
            <button 
              onClick={() => navigate('/portfolio')}
              className="flex items-center gap-2 bg-morandi-blue text-white px-8 py-4 rounded-xl hover:bg-ink-900 transition-colors shadow-md font-bold text-lg"
            >
              <TrendingUp size={24} />
              新增持股
            </button>
            <button 
              onClick={() => navigate('/ledger')}
              className="flex items-center gap-2 bg-white text-ink-700 px-8 py-4 rounded-xl hover:bg-paper transition-colors border-2 border-stone-200 font-bold text-lg"
            >
              <ReceiptText size={24} />
              開始記帳
            </button>
          </div>
          
          {/* 功能介紹卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
            <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-paper">
              <div className="w-12 h-12 bg-morandi-blueLight rounded-xl flex items-center justify-center mb-4">
                <Wallet size={24} className="text-morandi-blue" />
              </div>
              <h3 className="font-serif font-bold text-ink-900 mb-2">資產追蹤</h3>
              <p className="text-sm text-ink-600">
                記錄台股、美股、加密貨幣，自動同步即時報價
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-paper">
              <div className="w-12 h-12 bg-morandi-sageLight rounded-xl flex items-center justify-center mb-4">
                <ReceiptText size={24} className="text-morandi-sage" />
              </div>
              <h3 className="font-serif font-bold text-ink-900 mb-2">收支手帳</h3>
              <p className="text-sm text-ink-600">
                簡單快速記帳，掌握每一筆收入與支出
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-paper">
              <div className="w-12 h-12 bg-morandi-clayLight rounded-xl flex items-center justify-center mb-4">
                <FlaskConical size={24} className="text-morandi-clay" />
              </div>
              <h3 className="font-serif font-bold text-ink-900 mb-2">策略實驗室</h3>
              <p className="text-sm text-ink-600">
                凱利公式、馬丁格爾，科學化投資決策
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
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
          
          {/* 快捷操作按鈕 */}
          <div className="grid grid-cols-3 gap-3 mt-6 pt-4 border-t border-stone-100">
            <button 
              onClick={() => navigate('/ledger')}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-morandi-blueLight/30 hover:bg-morandi-blueLight transition-all group"
            >
              <ReceiptText size={24} className="text-morandi-blue group-hover:scale-110 transition-transform" />
              <span className="text-xs font-serif font-medium text-ink-700">記一筆</span>
            </button>
            
            <button 
              onClick={() => navigate('/portfolio')}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-morandi-sageLight/30 hover:bg-morandi-sageLight transition-all group"
            >
              <TrendingUp size={24} className="text-morandi-sage group-hover:scale-110 transition-transform" />
              <span className="text-xs font-serif font-medium text-ink-700">買股票</span>
            </button>
            
            <button 
              onClick={() => navigate('/strategy')}
              className="flex flex-col items-center gap-2 p-4 rounded-xl bg-morandi-clayLight/30 hover:bg-morandi-clayLight transition-all group"
            >
              <FlaskConical size={24} className="text-morandi-clay group-hover:scale-110 transition-transform" />
              <span className="text-xs font-serif font-medium text-ink-700">策略</span>
            </button>
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
          <button 
            onClick={() => navigate('/ledger')}
            className="w-full mt-6 py-3 bg-morandi-blueLight hover:bg-morandi-blue text-sm font-medium text-morandi-blue hover:text-white rounded-xl transition-all font-serif flex items-center justify-center gap-2 group"
          >
            <ReceiptText size={16} className="group-hover:scale-110 transition-transform" />
            查看完整記帳
          </button>
        </div>
      </div>
      
      {/* 投資組合列表 */}
      {assets.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-serif font-bold text-ink-900 flex items-center gap-2">
              <TrendingUp size={20} className="text-morandi-blue" />
              我的持股
            </h3>
            <button 
              onClick={() => navigate('/portfolio')}
              className="text-sm text-morandi-blue hover:text-ink-900 font-medium transition-colors"
            >
              查看全部 →
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assets.map(asset => {
              const totalCost = asset.avgPrice * asset.quantity;
              const totalValue = asset.currentPrice * asset.quantity;
              const pl = totalValue - totalCost;
              const plPercent = (pl / totalCost) * 100;
              
              return (
                <div 
                  key={asset.id}
                  className="bg-white p-5 rounded-2xl border border-stone-100 shadow-paper hover:shadow-soft transition-all group cursor-pointer"
                  onClick={() => navigate('/portfolio')}
                >
                  {/* 標題列 */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-ink-900 font-serif text-lg">{asset.symbol}</h4>
                        {asset.symbol.endsWith('.TW') && (
                          <span className="text-xs bg-morandi-blueLight text-morandi-blue px-2 py-0.5 rounded-full">台股</span>
                        )}
                      </div>
                      <p className="text-xs text-ink-400 mt-0.5">{asset.name}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-serif-num font-bold text-ink-900 text-lg">
                        {formatCurrency(asset.currentPrice)}
                      </div>
                      <div className={`text-xs font-medium ${asset.change24h >= 0 ? 'text-morandi-sage' : 'text-morandi-rose'}`}>
                        {asset.change24h > 0 ? '+' : ''}{asset.change24h}%
                      </div>
                    </div>
                  </div>
                  
                  {/* 持股資訊 */}
                  <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-paper rounded-xl">
                    <div>
                      <div className="text-xs text-ink-400 mb-1">持有</div>
                      <div className="font-serif-num font-medium text-ink-900">{asset.quantity} 股</div>
                    </div>
                    <div>
                      <div className="text-xs text-ink-400 mb-1">市值</div>
                      <div className="font-serif-num font-medium text-ink-900">{formatCurrency(totalValue)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-ink-400 mb-1">成本</div>
                      <div className="font-serif-num text-sm text-ink-600">{formatCurrency(asset.avgPrice)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-ink-400 mb-1">損益</div>
                      <div className={`font-serif-num font-bold text-sm ${pl >= 0 ? 'text-morandi-sage' : 'text-morandi-rose'}`}>
                        {pl >= 0 ? '+' : ''}{formatCurrency(pl)} ({plPercent.toFixed(2)}%)
                      </div>
                    </div>
                  </div>
                  
                  {/* 操作按鈕 */}
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: 實作買入功能
                        alert('買入功能開發中');
                      }}
                      className="flex-1 bg-morandi-sageLight text-morandi-sage py-2 rounded-lg text-xs font-bold hover:bg-morandi-sage hover:text-white transition-colors"
                    >
                      買入
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: 實作賣出功能
                        alert('賣出功能開發中');
                      }}
                      className="flex-1 bg-morandi-roseLight text-morandi-rose py-2 rounded-lg text-xs font-bold hover:bg-morandi-rose hover:text-white transition-colors"
                    >
                      賣出
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
};

export default Dashboard;