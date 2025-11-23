
import React, { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, CartesianGrid
} from 'recharts';
import { COLORS } from '../constants';
import { TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react';

interface AnalyticsPageProps {
  isPrivacyMode: boolean;
}

const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ isPrivacyMode }) => {
  const [activeTab, setActiveTab] = useState<'income_expense' | 'asset'>('income_expense');

  // Mock Data
  const monthlyData = [
    { month: '5月', income: 45000, expense: 32000 },
    { month: '6月', income: 48000, expense: 35000 },
    { month: '7月', income: 47000, expense: 42000 },
    { month: '8月', income: 52000, expense: 38000 },
    { month: '9月', income: 50000, expense: 28000 },
    { month: '10月', income: 55000, expense: 31000 },
  ];

  const assetTrendData = [
    { month: '5月', netWorth: 1050000 },
    { month: '6月', netWorth: 1080000 },
    { month: '7月', netWorth: 1060000 },
    { month: '8月', netWorth: 1120000 },
    { month: '9月', netWorth: 1150000 },
    { month: '10月', netWorth: 1234567 },
  ];

  const expenseCategoryData = [
    { name: '飲食', value: 12000 },
    { name: '居住', value: 15000 },
    { name: '交通', value: 3000 },
    { name: '娛樂', value: 5000 },
    { name: '其他', value: 2000 },
  ];

  const formatCurrency = (val: number) => {
    if (isPrivacyMode) return '••••••';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="animate-fade-in pb-20 space-y-6">
      
      {/* Tab Switcher */}
      <div className="flex p-1 bg-stone-100 rounded-xl mb-4">
        <button 
          onClick={() => setActiveTab('income_expense')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-bold font-serif transition-all ${activeTab === 'income_expense' ? 'bg-white shadow text-ink-900' : 'text-ink-400'}`}
        >
          收支分析
        </button>
        <button 
          onClick={() => setActiveTab('asset')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-bold font-serif transition-all ${activeTab === 'asset' ? 'bg-white shadow text-ink-900' : 'text-ink-400'}`}
        >
          資產成長
        </button>
      </div>

      {activeTab === 'income_expense' && (
        <div className="space-y-6 animate-slide-up">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-morandi-sageLight/40 p-5 rounded-2xl border border-morandi-sage/20">
               <div className="flex items-center gap-2 mb-2">
                 <div className="p-1.5 bg-morandi-sage text-white rounded-lg"><TrendingUp size={16} /></div>
                 <span className="text-xs font-bold font-serif text-morandi-sage">本月收入</span>
               </div>
               <div className="text-2xl font-serif-num font-bold text-ink-900">{formatCurrency(55000)}</div>
               <div className="text-xs text-ink-400 mt-1 font-serif">較上月 +10%</div>
            </div>
            <div className="bg-morandi-roseLight/40 p-5 rounded-2xl border border-morandi-rose/20">
               <div className="flex items-center gap-2 mb-2">
                 <div className="p-1.5 bg-morandi-rose text-white rounded-lg"><TrendingDown size={16} /></div>
                 <span className="text-xs font-bold font-serif text-morandi-rose">本月支出</span>
               </div>
               <div className="text-2xl font-serif-num font-bold text-ink-900">{formatCurrency(31000)}</div>
               <div className="text-xs text-ink-400 mt-1 font-serif">較上月 -5%</div>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-paper">
             <div className="flex items-center justify-between mb-6">
               <h3 className="font-bold text-ink-900 font-serif">近半年收支趨勢</h3>
               <button className="text-xs text-ink-400 border border-stone-200 px-2 py-1 rounded font-serif">最近 6 個月</button>
             </div>
             <div className="h-64">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={monthlyData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E6E2D6" />
                    <XAxis dataKey="month" stroke="#78716C" fontSize={12} axisLine={false} tickLine={false} dy={10} />
                    <YAxis stroke="#78716C" fontSize={12} axisLine={false} tickLine={false} tickFormatter={(val) => `${val/1000}k`} />
                    <Tooltip 
                      cursor={{ fill: '#F5F5F4' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="income" fill={COLORS.profit} radius={[4, 4, 0, 0]} name="收入" />
                    <Bar dataKey="expense" fill={COLORS.loss} radius={[4, 4, 0, 0]} name="支出" />
                 </BarChart>
               </ResponsiveContainer>
             </div>
          </div>

          {/* Category Pie */}
          <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-paper">
             <h3 className="font-bold text-ink-900 font-serif mb-6">本月支出類別</h3>
             <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="w-48 h-48 relative">
                   <ResponsiveContainer width="100%" height="100%">
                     <PieChart>
                        <Pie data={expenseCategoryData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                          {expenseCategoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS.chart[index % COLORS.chart.length]} stroke="none" />
                          ))}
                        </Pie>
                     </PieChart>
                   </ResponsiveContainer>
                   <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-xs text-ink-400 font-serif">總支出</span>
                      <span className="text-lg font-bold font-serif-num text-ink-900">{formatCurrency(31000)}</span>
                   </div>
                </div>
                <div className="flex-1 w-full space-y-3">
                   {expenseCategoryData.map((item, idx) => (
                     <div key={item.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                           <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.chart[idx % COLORS.chart.length] }}></div>
                           <span className="text-ink-600 font-serif">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                           <span className="font-serif-num font-bold text-ink-900">{formatCurrency(item.value)}</span>
                           <span className="text-xs text-ink-400 w-8 text-right">{((item.value / 31000) * 100).toFixed(0)}%</span>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        </div>
      )}

      {activeTab === 'asset' && (
        <div className="space-y-6 animate-slide-up">
           {/* Net Worth Card */}
           <div className="bg-gradient-to-br from-morandi-blue to-ink-800 p-6 rounded-2xl text-white shadow-soft relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
               <h3 className="text-sm font-serif opacity-80 mb-1">目前淨資產</h3>
               <div className="text-4xl font-serif-num font-bold tracking-tight mb-4">
                 {formatCurrency(1234567)}
               </div>
               <div className="flex items-center gap-4 text-sm">
                  <div className="bg-white/20 px-3 py-1 rounded-lg backdrop-blur-md flex items-center gap-1">
                     <TrendingUp size={14} /> 總報酬 +18.5%
                  </div>
                  <div className="bg-white/20 px-3 py-1 rounded-lg backdrop-blur-md flex items-center gap-1">
                     <Calendar size={14} /> 2023年
                  </div>
               </div>
           </div>

           {/* Trend Area Chart */}
           <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-paper">
             <div className="flex items-center justify-between mb-6">
               <h3 className="font-bold text-ink-900 font-serif">資產累積趨勢</h3>
             </div>
             <div className="h-64">
               <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={assetTrendData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.brand} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={COLORS.brand} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E6E2D6" />
                    <XAxis dataKey="month" stroke="#78716C" fontSize={12} axisLine={false} tickLine={false} dy={10} />
                    <YAxis stroke="#78716C" fontSize={12} axisLine={false} tickLine={false} tickFormatter={(val) => `${val/10000}w`} domain={['dataMin - 100000', 'auto']} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Area type="monotone" dataKey="netWorth" stroke={COLORS.brand} strokeWidth={3} fillOpacity={1} fill="url(#colorNetWorth)" name="淨資產" />
                 </AreaChart>
               </ResponsiveContainer>
             </div>
           </div>
           
           {/* ROI Analysis Mockup */}
           <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-paper">
              <h3 className="font-bold text-ink-900 font-serif mb-4">投資回報分析</h3>
              <div className="space-y-4">
                 <div className="flex justify-between items-center p-3 bg-stone-50 rounded-xl">
                    <span className="text-sm text-ink-500 font-serif">年化報酬率 (IRR)</span>
                    <span className="font-serif-num font-bold text-morandi-sage text-lg">12.4%</span>
                 </div>
                 <div className="flex justify-between items-center p-3 bg-stone-50 rounded-xl">
                    <span className="text-sm text-ink-500 font-serif">夏普比率 (Sharpe)</span>
                    <span className="font-serif-num font-bold text-ink-900 text-lg">1.85</span>
                 </div>
                 <div className="flex justify-between items-center p-3 bg-stone-50 rounded-xl">
                    <span className="text-sm text-ink-500 font-serif">最大回撤 (MDD)</span>
                    <span className="font-serif-num font-bold text-morandi-rose text-lg">-15.2%</span>
                 </div>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default AnalyticsPage;
