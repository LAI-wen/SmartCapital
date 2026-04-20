import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { COLORS } from '../../constants';

interface MonthlyDataPoint {
  month: string;
  income: number;
  expense: number;
}

interface MonthlyBarChartProps {
  monthlyData: MonthlyDataPoint[];
}

const MonthlyBarChart: React.FC<MonthlyBarChartProps> = ({ monthlyData }) => (
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
          <YAxis stroke="#78716C" fontSize={12} axisLine={false} tickLine={false} tickFormatter={(val) => `${val / 1000}k`} />
          <Tooltip
            cursor={{ fill: '#F5F5F4' }}
            content={({ active, payload, label }) => {
              if (!active || !payload || !payload.length) return null;
              const income = (payload.find(p => p.dataKey === 'income')?.value as number) ?? 0;
              const expense = (payload.find(p => p.dataKey === 'expense')?.value as number) ?? 0;
              return (
                <div className="bg-white rounded-xl shadow-lg border border-stone-100 p-3 text-xs font-serif min-w-[120px]">
                  <div className="font-bold text-ink-900 mb-2">{label}</div>
                  <div className="flex justify-between gap-4 text-morandi-sage mb-1">
                    <span>收入</span><span className="font-serif-num font-bold">${income.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between gap-4 text-morandi-rose">
                    <span>支出</span><span className="font-serif-num font-bold">${expense.toLocaleString()}</span>
                  </div>
                  {income - expense !== 0 && (
                    <div className={`flex justify-between gap-4 mt-2 pt-2 border-t border-stone-100 font-bold ${income >= expense ? 'text-morandi-sage' : 'text-morandi-rose'}`}>
                      <span>結餘</span><span className="font-serif-num">${Math.abs(income - expense).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              );
            }}
          />
          <Bar dataKey="income" fill={COLORS.profit} radius={[4, 4, 0, 0]} name="收入" />
          <Bar dataKey="expense" fill={COLORS.loss} radius={[4, 4, 0, 0]} name="支出" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
);

export default MonthlyBarChart;
