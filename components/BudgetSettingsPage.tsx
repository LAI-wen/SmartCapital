import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { getBudgets, removeBudget, setBudget, type Budget } from '../services';

const BUDGET_CATEGORIES = ['飲食', '交通', '居住', '娛樂', '購物', '醫療', '其他', '總計'];

const BudgetSettingsPage: React.FC = () => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('飲食');
  const [amountInput, setAmountInput] = useState('');

  useEffect(() => {
    const loadBudgets = async () => {
      setIsLoading(true);
      try {
        const data = await getBudgets();
        setBudgets(data ?? []);
        const existingBudget = data.find(budget => budget.category === selectedCategory);
        setAmountInput(existingBudget ? String(existingBudget.amount) : '');
      } finally {
        setIsLoading(false);
      }
    };

    loadBudgets();
  }, []);

  const handleSelectCategory = (category: string) => {
    setSelectedCategory(category);
    const existingBudget = budgets.find(budget => budget.category === category);
    setAmountInput(existingBudget ? String(existingBudget.amount) : '');
  };

  const handleSave = async () => {
    const amount = parseFloat(amountInput);
    if (!selectedCategory || Number.isNaN(amount) || amount <= 0) return;

    const savedBudget = await setBudget(selectedCategory, amount);
    if (!savedBudget) return;

    setBudgets(prev => {
      const nextBudgets = prev.filter(budget => budget.category !== selectedCategory);
      return [...nextBudgets, savedBudget].sort((a, b) => a.category.localeCompare(b.category));
    });
    setAmountInput('');
  };

  const handleRemove = async (category: string) => {
    await removeBudget(category);
    setBudgets(prev => prev.filter(budget => budget.category !== category));

    if (selectedCategory === category) {
      setAmountInput('');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-morandi-blue border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto pb-20 space-y-6 animate-fade-in">
      <div className="space-y-3">
        <h2 className="font-bold font-serif text-ink-900">新增 / 修改預算</h2>

        <div>
          <label className="text-xs text-ink-400 font-serif mb-1.5 block">分類</label>
          <div className="flex flex-wrap gap-2">
            {BUDGET_CATEGORIES.map(category => (
              <button
                key={category}
                onClick={() => handleSelectCategory(category)}
                className={`px-3 py-1.5 rounded-xl text-xs font-serif border transition-all ${
                  selectedCategory === category
                    ? 'bg-ink-900 text-white border-ink-900'
                    : 'bg-white text-ink-500 border-stone-200 hover:border-ink-400'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-ink-400 font-serif mb-1.5 block">月預算金額（元）</label>
          <input
            type="number"
            placeholder="例：5000"
            value={amountInput}
            onChange={event => setAmountInput(event.target.value)}
            className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm font-serif-num focus:outline-none focus:border-morandi-blue"
          />
        </div>

        <button
          onClick={handleSave}
          className="w-full bg-ink-900 text-white rounded-xl py-3 text-sm font-serif font-bold hover:bg-ink-700 transition-colors"
        >
          儲存預算
        </button>
      </div>

      {budgets.length > 0 ? (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-50">
            <h3 className="text-xs font-bold font-serif text-ink-400">已設定的預算</h3>
          </div>
          <div className="divide-y divide-stone-50">
            {budgets.map(budget => (
              <div key={budget.category} className="flex items-center justify-between px-4 py-3 group">
                <div>
                  <span className="text-sm font-bold text-ink-700 font-serif">{budget.category}</span>
                  <span className="text-xs text-ink-400 font-serif-num ml-2">${budget.amount.toLocaleString()} / 月</span>
                </div>
                <button
                  onClick={() => handleRemove(budget.category)}
                  className="text-stone-300 hover:text-morandi-rose transition-colors p-1"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-center text-sm text-ink-400 font-serif py-4">尚未設定任何預算</p>
      )}
    </div>
  );
};

export default BudgetSettingsPage;
