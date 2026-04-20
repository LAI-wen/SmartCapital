import React from 'react';
import { TrendingUp, Calendar } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { COLORS } from '../../constants';

interface AssetTrendPoint {
  month: string;
  netWorth: number;
}

interface AssetGrowthTabProps {
  totalNetWorth: number;
  assetTrendData: AssetTrendPoint[];
  formatCurrency: (val: number) => string;
}

const AssetGrowthTab: React.FC<AssetGrowthTabProps> = ({ totalNetWorth, assetTrendData, formatCurrency }) => {
  const growthPct = assetTrendData.length >= 2 && assetTrendData[0].netWorth > 0
    ? (((assetTrendData[assetTrendData.length - 1].netWorth - assetTrendData[0].netWorth) / assetTrendData[0].netWorth) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Net Worth Card */}
      <div className="bg-gradient-to-br from-morandi-blue to-ink-800 p-6 rounded-2xl text-white shadow-soft relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
        <h3 className="text-sm font-serif opacity-80 mb-1">目前淨資產</h3>
        <div className="text-4xl font-serif-num font-bold tracking-tight mb-4">{formatCurrency(totalNetWorth)}</div>
        <div className="flex items-center gap-4 text-sm">
          <div className="bg-white/20 px-3 py-1 rounded-lg backdrop-blur-md flex items-center gap-1">
            <TrendingUp size={14} /> {growthPct}%
          </div>
          <div className="bg-white/20 px-3 py-1 rounded-lg backdrop-blur-md flex items-center gap-1">
            <Calendar size={14} /> {new Date().getFullYear()}年
          </div>
        </div>
      </div>

      {/* Trend Area Chart */}
      <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-paper">
        <h3 className="font-bold text-ink-900 font-serif mb-6">資產累積趨勢</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={assetTrendData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.brand} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS.brand} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E6E2D6" />
              <XAxis dataKey="month" stroke="#78716C" fontSize={12} axisLine={false} tickLine={false} dy={10} />
              <YAxis stroke="#78716C" fontSize={12} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 10000}w`} domain={['dataMin - 100000', 'auto']} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null;
                  const val = payload[0].value as number;
                  return (
                    <div className="bg-white rounded-xl shadow-lg border border-stone-100 p-3 text-xs font-serif">
                      <div className="font-bold text-ink-900 mb-1">{label}</div>
                      <div className="text-morandi-blue font-serif-num font-bold text-sm">${val.toLocaleString()}</div>
                    </div>
                  );
                }}
              />
              <Area type="monotone" dataKey="netWorth" stroke={COLORS.brand} strokeWidth={3} fillOpacity={1} fill="url(#colorNetWorth)" name="淨資產" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default AssetGrowthTab;
