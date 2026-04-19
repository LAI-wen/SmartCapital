import React from 'react';

interface LedgerSummaryCardsProps {
  income: number;
  expense: number;
  balance: number;
  formatCurrency: (val: number) => string;
}

const LedgerSummaryCards: React.FC<LedgerSummaryCardsProps> = ({ income, expense, balance, formatCurrency }) => (
  <div className="grid grid-cols-3 gap-3">
    <div className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm flex flex-col items-center justify-center">
      <span className="text-[10px] font-bold text-ink-400 uppercase tracking-widest mb-1">收入</span>
      <span className="text-ink-900 font-bold font-serif-num text-lg">{formatCurrency(income)}</span>
    </div>
    <div className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm flex flex-col items-center justify-center">
      <span className="text-[10px] font-bold text-morandi-rose uppercase tracking-widest mb-1">支出</span>
      <span className="text-morandi-rose font-bold font-serif-num text-lg">{formatCurrency(expense)}</span>
    </div>
    <div className="bg-morandi-blueLight/20 p-4 rounded-2xl border border-morandi-blue/20 flex flex-col items-center justify-center">
      <span className="text-[10px] font-bold text-morandi-blue uppercase tracking-widest mb-1">結餘</span>
      <span className="text-morandi-blue font-bold font-serif-num text-lg">{formatCurrency(balance)}</span>
    </div>
  </div>
);

export default LedgerSummaryCards;
