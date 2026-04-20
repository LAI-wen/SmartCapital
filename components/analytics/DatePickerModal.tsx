import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DatePickerModalProps {
  pickerYear: number;
  pickerMonth: number;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
  onCancel: () => void;
  onApply: () => void;
}

const DatePickerModal: React.FC<DatePickerModalProps> = ({
  pickerYear,
  pickerMonth,
  onYearChange,
  onMonthChange,
  onCancel,
  onApply,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 backdrop-blur-sm animate-fade-in">
    <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full mx-4 animate-slide-up">
      <div className="p-6">
        <h3 className="text-xl font-bold text-ink-900 font-serif mb-6 text-center">選擇月份</h3>

        {/* Year Selector */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-ink-400 uppercase tracking-widest mb-3">年份</label>
          <div className="flex items-center gap-3">
            <button onClick={() => onYearChange(pickerYear - 1)} className="p-2 hover:bg-stone-100 rounded-lg transition-colors">
              <ChevronLeft size={20} className="text-ink-600" />
            </button>
            <div className="flex-1 text-center">
              <span className="text-3xl font-bold font-serif-num text-ink-900">{pickerYear}</span>
            </div>
            <button onClick={() => onYearChange(pickerYear + 1)} className="p-2 hover:bg-stone-100 rounded-lg transition-colors">
              <ChevronRight size={20} className="text-ink-600" />
            </button>
          </div>
        </div>

        {/* Month Selector */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-ink-400 uppercase tracking-widest mb-3">月份</label>
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
              <button
                key={month}
                onClick={() => onMonthChange(month)}
                className={`py-3 rounded-xl text-sm font-bold font-serif transition-all ${
                  pickerMonth === month ? 'bg-morandi-blue text-white shadow-md' : 'bg-stone-50 text-ink-600 hover:bg-stone-100'
                }`}
              >
                {month}月
              </button>
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 rounded-xl border border-stone-200 text-ink-600 font-bold hover:bg-stone-50 transition-all">
            取消
          </button>
          <button onClick={onApply} className="flex-1 py-3 rounded-xl bg-morandi-blue text-white font-bold hover:bg-opacity-90 transition-all shadow-md">
            確定
          </button>
        </div>
      </div>
    </div>
  </div>
);

export default DatePickerModal;
