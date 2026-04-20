import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { ArrowRight } from 'lucide-react';
import { COLORS } from '../../constants';

type ViewMode = 'day' | 'week' | 'month' | 'year' | 'calendar';

interface CategoryDataPoint {
  name: string;
  value: number;
}

interface CategoryBreakdownProps {
  viewMode: ViewMode;
  expenseCategoryData: CategoryDataPoint[];
  totalExpense: number;
  prevPeriodCategoryMap: Record<string, number>;
  formatCurrency: (val: number) => string;
  monthParam: string;
  onNavigateToCategory: (category: string, month: string) => void;
}

const periodLabel = (mode: ViewMode) =>
  mode === 'day' ? '本日' : mode === 'week' ? '本週' : mode === 'month' ? '本月' : mode === 'year' ? '本年' : '本月';

const CategoryBreakdown: React.FC<CategoryBreakdownProps> = ({
  viewMode,
  expenseCategoryData,
  totalExpense,
  prevPeriodCategoryMap,
  formatCurrency,
  monthParam,
  onNavigateToCategory,
}) => (
  <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-paper">
    <h3 className="font-bold text-ink-900 font-serif mb-6">{periodLabel(viewMode)}支出類別</h3>
    <div className="flex flex-col md:flex-row items-center gap-6">
      <div className="w-48 h-48 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={expenseCategoryData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
              {expenseCategoryData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS.chart[index % COLORS.chart.length]} stroke="none" />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xs text-ink-400 font-serif">總支出</span>
          <span className="text-lg font-bold font-serif-num text-ink-900">{formatCurrency(totalExpense)}</span>
        </div>
      </div>
      <div className="flex-1 w-full space-y-4">
        {expenseCategoryData.length === 0 ? (
          <div className="text-center text-sm text-ink-400 font-serif py-4">{periodLabel(viewMode)}尚無支出記錄</div>
        ) : (
          [...expenseCategoryData].sort((a, b) => b.value - a.value).map((item, idx) => {
            const pct = totalExpense > 0 ? (item.value / totalExpense) * 100 : 0;
            const prev = prevPeriodCategoryMap[item.name] || 0;
            const change = prev > 0 ? ((item.value - prev) / prev) * 100 : null;
            const color = COLORS.chart[idx % COLORS.chart.length];
            return (
              <div key={item.name}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-ink-700 font-serif">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-serif-num font-bold text-ink-900">{formatCurrency(item.value)}</span>
                    <span className="text-[10px] text-ink-300 w-6 text-right">{pct.toFixed(0)}%</span>
                    {change !== null && (
                      <span className={`text-[10px] font-bold w-10 text-right ${change > 0 ? 'text-morandi-rose' : 'text-morandi-sage'}`}>
                        {change > 0 ? '↑' : '↓'}{Math.abs(change).toFixed(0)}%
                      </span>
                    )}
                    <button
                      onClick={() => onNavigateToCategory(item.name, monthParam)}
                      className="p-1 hover:bg-stone-100 rounded text-ink-300 hover:text-morandi-blue transition-colors"
                      title={`在帳本中查看${item.name}`}
                    >
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
                <div className="h-1 bg-stone-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  </div>
);

export default CategoryBreakdown;
