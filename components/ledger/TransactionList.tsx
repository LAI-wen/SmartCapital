import React from 'react';
import { Transaction } from '../../types';
import {
  Coffee, ShoppingBag, Home, Bus, HeartPulse, Briefcase,
  TrendingUp, Gift, Tag, Calendar as CalendarIcon,
  CheckSquare, Square
} from 'lucide-react';
import { format } from 'date-fns';

const getCategoryIcon = (category: string) => {
  if (category.includes('飲食')) return <Coffee size={18} />;
  if (category.includes('購物')) return <ShoppingBag size={18} />;
  if (category.includes('居住')) return <Home size={18} />;
  if (category.includes('交通')) return <Bus size={18} />;
  if (category.includes('醫')) return <HeartPulse size={18} />;
  if (category.includes('薪')) return <Briefcase size={18} />;
  if (category.includes('資')) return <TrendingUp size={18} />;
  if (category.includes('娛樂')) return <Gift size={18} />;
  return <Tag size={18} />;
};

const getChineseWeekDay = (dateStr: string) => {
  const date = new Date(dateStr);
  const days = ['日', '一', '二', '三', '四', '五', '六'];
  return days[date.getDay()];
};

interface TransactionListProps {
  groupedTransactions: Record<string, Transaction[]>;
  isSelectMode: boolean;
  selectedIds: Set<string>;
  accounts: { id: string; name: string }[];
  isPrivacyMode: boolean;
  formatCurrency: (val: number) => string;
  onOpenModal: (t: Transaction) => void;
  onToggleSelect: (id: string) => void;
}

const TransactionList: React.FC<TransactionListProps> = ({
  groupedTransactions,
  isSelectMode,
  selectedIds,
  accounts,
  isPrivacyMode: _isPrivacyMode,
  formatCurrency,
  onOpenModal,
  onToggleSelect,
}) => {
  const getAccountName = (id: string) => {
    const acc = accounts.find(a => a.id === id);
    return acc ? acc.name : '未知帳戶';
  };

  return (
    <div className="space-y-4">
      {Object.keys(groupedTransactions).length === 0 ? (
        <div className="text-center py-10 opacity-40">
          <div className="w-16 h-16 bg-stone-200 rounded-full mx-auto mb-3 flex items-center justify-center">
            <CalendarIcon className="text-stone-400" />
          </div>
          <p className="font-serif text-sm">本期間無交易紀錄</p>
        </div>
      ) : (
        Object.keys(groupedTransactions).map(dateKey => (
          <div key={dateKey} className="animate-fade-in-up">
            <div className="flex items-center gap-2 mb-2 px-1">
              <span className="text-sm font-bold font-serif text-ink-900">
                {format(new Date(dateKey), 'dd')} 日
              </span>
              <span className="text-xs text-ink-400 font-serif">
                週{getChineseWeekDay(dateKey)}
              </span>
              <div className="h-px bg-stone-100 flex-1 ml-2"></div>
            </div>

            <div className="space-y-2">
              {groupedTransactions[dateKey].map(t => (
                <div
                  key={t.id}
                  onClick={() => isSelectMode ? onToggleSelect(t.id) : onOpenModal(t)}
                  className={`group bg-white p-4 rounded-xl border shadow-sm flex items-center justify-between active:scale-[0.99] transition-all cursor-pointer ${
                    isSelectMode && selectedIds.has(t.id)
                      ? 'border-morandi-blue bg-morandi-blueLight/10'
                      : 'border-stone-100 hover:border-morandi-blue/30'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {isSelectMode && (
                      <div className="shrink-0">
                        {selectedIds.has(t.id) ? (
                          <CheckSquare size={20} className="text-morandi-blue" />
                        ) : (
                          <Square size={20} className="text-stone-300" />
                        )}
                      </div>
                    )}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white shadow-sm transition-transform group-hover:scale-105 ${t.type === 'income' ? 'bg-ink-800' : 'bg-morandi-rose'}`}>
                      {getCategoryIcon(t.category)}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-ink-900 font-serif">
                        {t.category}{t.subcategory ? ` · ${t.subcategory}` : ''}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-ink-300 font-serif bg-stone-100 px-1.5 rounded">{getAccountName(t.accountId)}</span>
                        <span className="text-xs text-ink-400 truncate max-w-[80px] md:max-w-[150px]">{t.note || '無備註'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-serif-num font-bold text-base ${t.type === 'income' ? 'text-ink-900' : 'text-morandi-rose'}`}>
                      {t.type === 'income' ? '+' : ''}{formatCurrency(t.amount)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default TransactionList;
