import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

type ViewMode = 'day' | 'week' | 'month' | 'year' | 'calendar';

interface AnalyticsSummaryBarProps {
  income: number;
  expense: number;
  incomeChange: number;
  expenseChange: number;
  viewMode: ViewMode;
  formatCurrency: (val: number) => string;
}

const AnalyticsSummaryBar: React.FC<AnalyticsSummaryBarProps> = ({
  income,
  expense,
  incomeChange,
  expenseChange,
  viewMode,
  formatCurrency,
}) => {
  const periodLabel = viewMode === 'day' ? '本日' : viewMode === 'week' ? '本週' : viewMode === 'month' ? '本月' : viewMode === 'year' ? '本年' : '本月';

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-morandi-sageLight/40 p-5 rounded-2xl border border-morandi-sage/20">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 bg-morandi-sage text-white rounded-lg"><TrendingUp size={16} /></div>
          <span className="text-xs font-bold font-serif text-morandi-sage">
            {periodLabel}收入
          </span>
        </div>
        <div className="text-2xl font-serif-num font-bold text-ink-900">{formatCurrency(income)}</div>
        <div className="text-xs text-ink-400 mt-1 font-serif">
          較上期 {incomeChange >= 0 ? '+' : ''}{incomeChange.toFixed(1)}%
        </div>
      </div>
      <div className="bg-morandi-roseLight/40 p-5 rounded-2xl border border-morandi-rose/20">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 bg-morandi-rose text-white rounded-lg"><TrendingDown size={16} /></div>
          <span className="text-xs font-bold font-serif text-morandi-rose">
            {periodLabel}支出
          </span>
        </div>
        <div className="text-2xl font-serif-num font-bold text-ink-900">{formatCurrency(expense)}</div>
        <div className="text-xs text-ink-400 mt-1 font-serif">
          較上期 {expenseChange >= 0 ? '+' : ''}{expenseChange.toFixed(1)}%
        </div>
      </div>
    </div>
  );
};

export default AnalyticsSummaryBar;
