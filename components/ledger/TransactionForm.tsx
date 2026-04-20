import React from 'react';
import { TransactionType, Account } from '../../types';
import { TRANSACTION_CATEGORIES } from '../../constants';
import {
  Tag,
  Trash2, X, Calendar as CalendarIcon,
  ArrowUpRight, ArrowDownRight, Wallet, Check
} from 'lucide-react';
import { getCategoryIcon } from './categoryIcon';

interface TransactionFormProps {
  isOpen: boolean;
  editingId: string | null;
  accounts: Account[];
  formType: TransactionType;
  formAmount: string;
  formCategory: string;
  formDate: string;
  formNote: string;
  formAccountId: string;
  onClose: () => void;
  onDelete: () => void;
  onSave: () => void;
  setFormType: (t: TransactionType) => void;
  setFormAmount: (v: string) => void;
  setFormCategory: (v: string) => void;
  setFormDate: (v: string) => void;
  setFormNote: (v: string) => void;
  setFormAccountId: (v: string) => void;
}

const TransactionForm: React.FC<TransactionFormProps> = ({
  isOpen,
  editingId,
  accounts,
  formType,
  formAmount,
  formCategory,
  formDate,
  formNote,
  formAccountId,
  onClose,
  onDelete,
  onSave,
  setFormType,
  setFormAmount,
  setFormCategory,
  setFormDate,
  setFormNote,
  setFormAccountId,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-ink-900/60 backdrop-blur-sm animate-fade-in p-0 md:p-4">
      <div className="bg-white w-full max-w-md rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-stone-100 flex justify-between items-center bg-white shrink-0">
          <h3 className="font-bold text-ink-900 text-lg font-serif">
            {editingId ? '編輯紀錄' : '新增紀錄'}
          </h3>
          <div className="flex gap-2">
            {editingId && (
              <button onClick={onDelete} className="p-2 text-morandi-rose hover:bg-morandi-roseLight rounded-full transition-colors">
                <Trash2 size={20} />
              </button>
            )}
            <button onClick={onClose} className="p-2 text-ink-400 hover:bg-stone-100 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto">
          {/* Type Switcher */}
          <div className="grid grid-cols-2 gap-1 bg-stone-100 p-1.5 rounded-2xl mb-8">
            <button
              onClick={() => { setFormType('expense'); if (!editingId) setFormCategory(TRANSACTION_CATEGORIES.expense[0]); }}
              className={`py-3 rounded-xl text-sm font-bold font-serif transition-all flex items-center justify-center gap-2 ${formType === 'expense' ? 'bg-white text-morandi-rose shadow-sm' : 'text-ink-400'}`}
            >
              <ArrowDownRight size={16} /> 支出
            </button>
            <button
              onClick={() => { setFormType('income'); if (!editingId) setFormCategory(TRANSACTION_CATEGORIES.income[0]); }}
              className={`py-3 rounded-xl text-sm font-bold font-serif transition-all flex items-center justify-center gap-2 ${formType === 'income' ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-400'}`}
            >
              <ArrowUpRight size={16} /> 收入
            </button>
          </div>

          {/* Amount Input */}
          <div className="mb-8 text-center relative">
            <label className="block text-xs font-bold text-ink-400 uppercase tracking-widest mb-2">金額</label>
            <div className="flex items-center justify-center text-5xl font-serif-num font-bold text-ink-900">
              <span className="text-3xl text-stone-300 font-light mr-1">$</span>
              <input
                type="number"
                value={formAmount}
                onChange={e => setFormAmount(e.target.value)}
                placeholder="0"
                className="w-48 text-center bg-transparent focus:outline-none placeholder-stone-200 caret-morandi-blue"
                autoFocus={!editingId}
              />
            </div>
          </div>

          {/* Account Selection */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-ink-400 uppercase tracking-widest mb-2">帳戶 (Account)</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-ink-400 pointer-events-none">
                <Wallet size={18} />
              </div>
              <select
                value={formAccountId || ''}
                onChange={e => {
                  setFormAccountId(e.target.value);
                }}
                className="w-full bg-white border border-stone-200 pl-10 pr-4 py-3 rounded-xl text-sm font-bold text-ink-900 focus:outline-none focus:border-morandi-blue appearance-none"
              >
                {accounts.length === 0 && (
                  <option value="">請先建立帳戶</option>
                )}
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name} ({acc.currency})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Category Grid */}
          <div className="mb-8">
            <label className="block text-xs font-bold text-ink-400 uppercase tracking-widest mb-3">分類</label>
            <div className="grid grid-cols-4 gap-3">
              {TRANSACTION_CATEGORIES[formType].map(c => (
                <button
                  key={c}
                  onClick={() => setFormCategory(c)}
                  className={`flex flex-col items-center justify-center gap-2 py-3 rounded-xl border transition-all active:scale-95 ${formCategory === c ? 'bg-ink-50 border-ink-900 text-ink-900 ring-1 ring-ink-900' : 'bg-white border-stone-100 text-ink-400 hover:border-stone-300'}`}
                >
                  <div className={`${formCategory === c ? 'text-ink-900' : 'text-ink-300'}`}>{getCategoryIcon(c)}</div>
                  <span className="text-[10px] font-medium">{c}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Extra Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 bg-stone-50 p-1 rounded-xl border border-stone-100 focus-within:border-morandi-blue transition-colors">
              <div className="p-3 text-ink-400"><CalendarIcon size={18} /></div>
              <input
                type="date"
                value={formDate}
                onChange={e => setFormDate(e.target.value)}
                className="flex-1 bg-transparent py-2 text-sm font-bold text-ink-900 outline-none font-serif-num"
              />
            </div>
            <div className="flex items-center gap-3 bg-stone-50 p-1 rounded-xl border border-stone-100 focus-within:border-morandi-blue transition-colors">
              <div className="p-3 text-ink-400"><Tag size={18} /></div>
              <input
                type="text"
                value={formNote}
                onChange={e => setFormNote(e.target.value)}
                placeholder="寫點備註..."
                className="flex-1 bg-transparent py-2 text-sm text-ink-900 outline-none"
              />
            </div>
          </div>

          <button onClick={onSave} className="w-full mt-8 py-4 bg-ink-900 text-white rounded-2xl font-bold shadow-lg shadow-ink-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
            <Check size={20} /> {editingId ? '儲存變更' : '完成記帳'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionForm;
