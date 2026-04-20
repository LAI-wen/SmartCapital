import React from 'react';
import { Transaction } from '../../types';
import { X as XIcon } from 'lucide-react';
import {
  isSameDay,
  isSameMonth,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  getDate,
  parseISO,
} from 'date-fns';

interface CalendarViewProps {
  currentDate: Date;
  dayTotalsMap: Record<string, { income: number; expense: number }>;
  selectedDay: string | null;
  selectedDayTransactions: Transaction[];
  isPrivacyMode: boolean;
  formatCurrency: (val: number) => string;
  onSelectDay: (day: string | null) => void;
  onNavigateToLedger: (category: string, month: string) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({
  currentDate,
  dayTotalsMap,
  selectedDay,
  selectedDayTransactions,
  isPrivacyMode,
  formatCurrency,
  onSelectDay,
  onNavigateToLedger,
}) => {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <>
      <div className="bg-white rounded-2xl shadow-paper border border-stone-100 p-2 animate-fade-in">
        {/* Week Headers */}
        <div className="grid grid-cols-7 mb-2">
          {weekDays.map(d => (
            <div key={d} className="text-center text-[10px] text-ink-400 font-serif font-bold uppercase tracking-wider py-2">
              {d}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map(day => {
            const isCurrentMonth = isSameMonth(day, monthStart);
            const isToday = isSameDay(day, new Date());
            const dateKey = format(day, 'yyyy-MM-dd');
            const isSelected = dateKey === selectedDay;

            // Look up pre-computed day totals
            const dayTotals = dayTotalsMap[dateKey];
            const dayIncome = dayTotals?.income ?? 0;
            const dayExpense = dayTotals?.expense ?? 0;

            return (
              <div
                key={day.toString()}
                onClick={() => {
                  onSelectDay(selectedDay === dateKey ? null : dateKey);
                }}
                className={`
                  aspect-[4/5] md:aspect-square rounded-xl p-1 md:p-2 border transition-all cursor-pointer relative flex flex-col justify-between
                  ${isCurrentMonth ? 'bg-white hover:border-morandi-blue/50' : 'bg-stone-50/50 text-ink-300 border-transparent'}
                  ${isSelected ? 'ring-2 ring-morandi-blue bg-morandi-blue/5' : isToday ? 'ring-1 ring-morandi-blue ring-offset-2' : 'border-stone-50'}
                `}
              >
                <div className={`text-xs font-serif-num font-bold text-center ${isToday ? 'text-morandi-blue' : isCurrentMonth ? 'text-ink-900' : 'text-ink-300'}`}>
                  {getDate(day)}
                </div>

                {/* Dots / Indicators */}
                <div className="flex flex-col gap-0.5 items-center justify-end h-full pb-1">
                  {dayIncome > 0 && (
                    <div className="flex items-center gap-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-morandi-sage"></div>
                      <span className="text-[8px] font-serif-num text-morandi-sage hidden md:block">+{dayIncome >= 1000 ? (dayIncome/1000).toFixed(1) + 'k' : dayIncome}</span>
                    </div>
                  )}
                  {dayExpense > 0 && (
                    <div className="flex items-center gap-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-morandi-rose"></div>
                      <span className="text-[8px] font-serif-num text-morandi-rose hidden md:block">-{dayExpense >= 1000 ? (dayExpense/1000).toFixed(1) + 'k' : dayExpense}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedDay && (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-paper p-4 animate-fade-in mt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold font-serif text-ink-900 text-sm">
              {selectedDay.replace(/-/g, '/')} 的交易
            </h4>
            <button
              onClick={() => onSelectDay(null)}
              className="p-1 hover:bg-stone-100 rounded-lg text-ink-400 transition-colors"
            >
              <XIcon size={16} />
            </button>
          </div>
          {selectedDayTransactions.length === 0 ? (
            <p className="text-sm text-ink-400 font-serif text-center py-4">這天沒有記錄</p>
          ) : (
            <div className="space-y-2">
              {selectedDayTransactions.map(t => (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-stone-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs shrink-0 ${t.type === 'income' ? 'bg-morandi-sage' : t.type === 'expense' ? 'bg-morandi-rose' : 'bg-stone-400'}`}>
                      {t.category.slice(0, 1)}
                    </div>
                    <div>
                      <div className="text-sm font-serif text-ink-900">{t.category}{t.subcategory ? ` · ${t.subcategory}` : ''}</div>
                      <div className="text-xs text-ink-400 font-serif">{t.note || '無備註'}{t.date.length > 10 ? ` · ${t.date.slice(11, 16)}` : ''}</div>
                    </div>
                  </div>
                  <div
                    className={`font-serif-num font-bold text-sm ${t.type === 'income' ? 'text-morandi-sage' : t.type === 'expense' ? 'text-morandi-rose' : 'text-ink-400'} cursor-pointer hover:underline`}
                    onClick={() => onNavigateToLedger(t.category, format(parseISO(t.date), 'yyyy-MM'))}
                  >
                    {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''}{isPrivacyMode ? '••••' : formatCurrency(t.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default CalendarView;
