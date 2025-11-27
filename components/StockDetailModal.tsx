
import React, { useMemo } from 'react';
import { Asset } from '../types';
import { X, TrendingUp, TrendingDown, MoreHorizontal, Briefcase, DollarSign, PieChart, Activity, Calendar } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts';
import { COLORS } from '../constants';
import { format } from 'date-fns';

interface StockDetailModalProps {
  asset: Asset | null;
  isOpen: boolean;
  onClose: () => void;
  isPrivacyMode: boolean;
  onBuy?: () => void;
  onSell?: () => void;
}

const StockDetailModal: React.FC<StockDetailModalProps> = ({ asset, isOpen, onClose, isPrivacyMode, onBuy, onSell }) => {
  if (!isOpen || !asset) return null;

  // --- Helpers ---
  const formatCurrency = (val: number, isTotal = false) => {
    if (isPrivacyMode) return '••••••';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: asset?.currency || 'USD',
      minimumFractionDigits: isTotal ? 0 : 2,
      maximumFractionDigits: 2
    }).format(val);
  };

  const getProfitLoss = (a: Asset) => {
    const totalCost = a.avgPrice * a.quantity;
    const totalValue = a.currentPrice * a.quantity;
    const pl = totalValue - totalCost;
    const plPercent = totalCost > 0 ? (pl / totalCost) * 100 : 0;
    return { pl, plPercent, totalCost, totalValue };
  };

  const { pl, plPercent, totalCost, totalValue } = getProfitLoss(asset);
  const isProfit = pl >= 0;
  const isTWStock = asset.symbol.endsWith('.TW');

  // Create smooth chart data with mocked dates
  const chartData = useMemo(() => {
    if (!asset || !asset.history || asset.history.length === 0) {
      return [];
    }
    const today = new Date();
    return asset.history.map((val, idx) => {
      // Assuming history is chronological (oldest to newest)
      // We simulate dates backwards from today
      const date = new Date(today);
      date.setDate(today.getDate() - (asset.history.length - 1 - idx));

      return {
        dateStr: format(date, 'MM/dd'),
        fullDate: format(date, 'yyyy-MM-dd'),
        price: val
      };
    });
  }, [asset]);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-ink-900/40 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-paper w-full max-w-lg md:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden animate-slide-up max-h-[95vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* === Header: Gradient & Title === */}
        <div className="relative bg-gradient-to-br from-morandi-blue to-ink-800 p-6 text-white shrink-0">
          {/* Close Button */}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors backdrop-blur-md"
          >
            <X size={20} className="text-white" />
          </button>

          <div className="flex items-start justify-between mt-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {isTWStock && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/20 text-white border border-white/10 backdrop-blur-md">
                    台股
                  </span>
                )}
                <span className="text-sm font-serif opacity-80 tracking-wider">{asset.type === 'Crypto' ? 'CRYPTO' : 'STOCK'}</span>
              </div>
              <h2 className="text-3xl font-serif font-bold tracking-tight mb-1">{asset.symbol}</h2>
              <p className="text-sm opacity-80 font-serif">{asset.name}</p>
            </div>
            
            <div className="text-right mt-2">
              <div className="text-3xl font-serif-num font-bold">
                {formatCurrency(asset.currentPrice)}
              </div>
              <div className={`flex items-center justify-end gap-1 text-sm font-medium ${asset.change24h >= 0 ? 'text-morandi-sageLight' : 'text-morandi-roseLight'}`}>
                {asset.change24h >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                {asset.change24h > 0 ? '+' : ''}{asset.change24h}%
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto custom-scrollbar flex-1 bg-white">
          <div className="p-6">
            
            {/* === Section 1: Key Metrics (Big Cards) === */}
            <div className="grid grid-cols-2 gap-4 mb-6">
               {/* Market Value */}
               <div className="col-span-1 bg-white p-5 rounded-2xl border border-stone-100 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-morandi-blue/10 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-morandi-blue/20 transition-colors"></div>
                  <div className="relative z-10">
                    <p className="text-xs text-ink-400 font-serif mb-2 flex items-center gap-1">
                       <PieChart size={14} /> 當前市值
                    </p>
                    <div className="text-2xl font-serif-num font-bold text-ink-900 tracking-tight">
                       {formatCurrency(totalValue, true)}
                    </div>
                  </div>
               </div>

               {/* Total P/L */}
               <div className={`col-span-1 p-5 rounded-2xl border shadow-sm relative overflow-hidden ${isProfit ? 'bg-morandi-sageLight/20 border-morandi-sage/20' : 'bg-morandi-roseLight/20 border-morandi-rose/20'}`}>
                  <p className={`text-xs font-serif mb-2 flex items-center gap-1 ${isProfit ? 'text-morandi-sage' : 'text-morandi-rose'}`}>
                     <DollarSign size={14} /> 總損益
                  </p>
                  <div className={`text-2xl font-serif-num font-bold ${isProfit ? 'text-morandi-sage' : 'text-morandi-rose'}`}>
                     {isProfit ? '+' : ''}{formatCurrency(pl, true)}
                  </div>
                  <div className={`text-xs font-bold mt-1 ${isProfit ? 'text-green-700/60' : 'text-red-700/60'}`}>
                     回報率 {plPercent.toFixed(2)}%
                  </div>
               </div>
            </div>

            {/* === Section 2: Secondary Metrics (Compact Row) === */}
            <div className="flex gap-4 mb-8">
               <div className="flex-1 bg-stone-50 p-3 rounded-xl border border-stone-100 flex items-center justify-between">
                  <span className="text-xs text-ink-400 font-serif flex items-center gap-1"><Briefcase size={12}/> 持有數量</span>
                  <span className="text-sm font-bold font-serif-num text-ink-900">
                    {isPrivacyMode ? '•••' : asset.quantity.toLocaleString()} 
                    <span className="text-[10px] text-ink-400 font-normal ml-1">股</span>
                  </span>
               </div>
               <div className="flex-1 bg-stone-50 p-3 rounded-xl border border-stone-100 flex items-center justify-between">
                  <span className="text-xs text-ink-400 font-serif flex items-center gap-1"><Activity size={12}/> 平均成本</span>
                  <span className="text-sm font-bold font-serif-num text-ink-900">{formatCurrency(asset.avgPrice)}</span>
               </div>
            </div>

            {/* === Section 3: Chart with Date Axis & Reference Line === */}
            <div>
              <h3 className="text-sm font-bold font-serif text-ink-900 mb-4 flex items-center gap-2">
                <Calendar size={16} className="text-ink-400"/> 價格走勢
              </h3>
              <div className="h-64 w-full bg-white rounded-2xl border border-stone-100 p-4 shadow-sm relative">
                {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={asset.change24h >= 0 ? COLORS.profit : COLORS.loss} stopOpacity={0.2}/>
                        <stop offset="95%" stopColor={asset.change24h >= 0 ? COLORS.profit : COLORS.loss} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E6E2D6" opacity={0.5} />
                    
                    <XAxis 
                      dataKey="dateStr" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: '#78716C', fontFamily: 'Lora' }} 
                      dy={10}
                      interval="preserveStartEnd"
                    />
                    
                    <YAxis 
                      domain={['auto', 'auto']} 
                      hide 
                    />
                    
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white p-3 rounded-xl shadow-xl border border-stone-100 animate-fade-in-up">
                               <div className="text-xs text-ink-400 font-serif mb-1">{data.fullDate}</div>
                               <div className="font-serif-num font-bold text-ink-900 text-lg flex items-center gap-2">
                                  {formatCurrency(payload[0].value as number)}
                               </div>
                               <div className="text-[10px] text-stone-400 font-serif">
                                  收盤價
                               </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    
                    <ReferenceLine 
                      y={asset.avgPrice} 
                      stroke="#9CA3AF" 
                      strokeDasharray="3 3" 
                      label={{ 
                        value: 'Avg Cost', 
                        position: 'insideRight', 
                        fill: '#9CA3AF', 
                        fontSize: 10,
                        offset: 10
                      }} 
                    />
                    
                    <Area
                      type="monotone"
                      dataKey="price"
                      stroke={asset.change24h >= 0 ? COLORS.profit : COLORS.loss}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorPrice)"
                      animationDuration={1000}
                    />
                  </AreaChart>
                </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-sm text-ink-400 font-serif">暫無歷史數據</p>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-center text-stone-300 mt-2 font-serif">
                虛線表示您的平均持有成本 ({formatCurrency(asset.avgPrice)})
              </p>
            </div>
          </div>
        </div>

        {/* === Footer Actions === */}
        <div className="p-6 bg-white border-t border-stone-100 mt-auto shrink-0 safe-area-bottom">
          <div className="flex gap-3">
             <button 
               onClick={onBuy}
               className="flex-1 bg-morandi-sage text-white py-3.5 rounded-xl font-bold shadow-lg shadow-morandi-sage/20 active:scale-95 transition-all hover:bg-morandi-sage/90 font-serif flex items-center justify-center gap-2"
             >
                <TrendingUp size={18} /> 加碼買入
             </button>
             <button 
               onClick={onSell}
               className="flex-1 bg-morandi-rose text-white py-3.5 rounded-xl font-bold shadow-lg shadow-morandi-rose/20 active:scale-95 transition-all hover:bg-morandi-rose/90 font-serif flex items-center justify-center gap-2"
             >
                <TrendingDown size={18} /> 賣出/停損
             </button>
             <button className="px-4 bg-stone-50 border border-stone-200 text-ink-500 rounded-xl hover:bg-stone-100 transition-colors">
                <MoreHorizontal size={20} />
             </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default StockDetailModal;
