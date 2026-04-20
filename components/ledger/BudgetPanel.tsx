import React from 'react';
import { X } from 'lucide-react';
import type { Budget } from '../../services';

interface BudgetPanelProps {
  budgets: Budget[];
  monthlyExpenseByCategory: Record<string, number>;
  onNavigateToBudgetSettings: () => void;
  onRemoveBudget: (category: string) => void;
}

const BudgetPanel: React.FC<BudgetPanelProps> = ({
  budgets,
  monthlyExpenseByCategory,
  onNavigateToBudgetSettings,
  onRemoveBudget,
}) => {
  if (budgets.length === 0) {
    return (
      <button
        onClick={onNavigateToBudgetSettings}
        className="w-full py-3 rounded-2xl border border-dashed border-stone-200 text-xs text-ink-300 font-serif hover:border-morandi-blue hover:text-morandi-blue transition-colors"
      >
        + 設定月預算
      </button>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-50">
        <h3 className="text-xs font-bold font-serif text-ink-400">本月預算</h3>
        <button
          onClick={onNavigateToBudgetSettings}
          className="text-[10px] text-morandi-blue font-serif hover:underline"
        >
          前往設定
        </button>
      </div>
      <div className="divide-y divide-stone-50">
        {budgets.map(b => {
          const spent = monthlyExpenseByCategory[b.category] || 0;
          const pct = Math.min((spent / b.amount) * 100, 100);
          const over = spent > b.amount;
          const warn = pct >= 90;
          const barColor = over ? 'bg-morandi-rose' : warn ? 'bg-amber-400' : 'bg-morandi-green';
          return (
            <div key={b.category} className="px-4 py-3 group">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs font-bold text-ink-700 font-serif">{b.category}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-serif-num font-bold ${over ? 'text-morandi-rose' : 'text-ink-500'}`}>
                    ${spent.toFixed(0)} <span className="text-ink-300 font-normal">/ ${b.amount.toLocaleString()}</span>
                  </span>
                  <button
                    onClick={() => onRemoveBudget(b.category)}
                    className="opacity-0 group-hover:opacity-100 text-stone-300 hover:text-morandi-rose transition-all"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
              <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${barColor}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BudgetPanel;
