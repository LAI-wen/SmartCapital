import React from 'react';
import { ChevronLeft, ChevronRight, Tag, X, CheckSquare, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import QuickInput from './QuickInputWidget';

type ViewMode = 'month' | 'year';

interface LedgerHeaderProps {
  currentDate: Date;
  viewMode: ViewMode;
  selectedCategory: string;
  isSelectMode: boolean;
  selectedCount: number;
  filteredCount: number;
  quickAmount: string;
  onPrev: () => void;
  onNext: () => void;
  onToggleMode: () => void;
  onClearCategory: () => void;
  onToggleSelectMode: () => void;
  onSelectAll: () => void;
  onBatchDelete: () => void;
  onQuickAmountChange: (v: string) => void;
  onQuickKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

const LedgerHeader: React.FC<LedgerHeaderProps> = ({
  currentDate,
  viewMode,
  selectedCategory,
  isSelectMode,
  selectedCount,
  filteredCount,
  quickAmount,
  onPrev,
  onNext,
  onToggleMode,
  onClearCategory,
  onToggleSelectMode,
  onSelectAll,
  onBatchDelete,
  onQuickAmountChange,
  onQuickKeyDown,
}) => (
  <div className="sticky top-0 z-40 bg-paper/95 backdrop-blur-md transition-shadow shadow-sm">
    {/* Desktop Quick Input (Top) */}
    <QuickInput value={quickAmount} onChange={onQuickAmountChange} onKeyDown={onQuickKeyDown} />

    {/* Date Nav */}
    <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
      <button onClick={onPrev} className="p-2 rounded-full hover:bg-stone-100 text-ink-400 hover:text-ink-900 transition-colors">
        <ChevronLeft size={20} />
      </button>
      <button
        onClick={onToggleMode}
        className="px-4 py-1.5 rounded-lg hover:bg-stone-100 transition-colors flex flex-col items-center"
      >
        <span className="text-base font-bold font-serif text-ink-900 tracking-wide">
          {viewMode === 'month' ? format(currentDate, 'yyyy年 MM月') : format(currentDate, 'yyyy年')}
        </span>
        <span className="text-[10px] text-ink-400 font-serif -mt-0.5">
          {viewMode === 'month' ? '切換年檢視' : '切換月檢視'}
        </span>
      </button>
      <button onClick={onNext} className="p-2 rounded-full hover:bg-stone-100 text-ink-400 hover:text-ink-900 transition-colors">
        <ChevronRight size={20} />
      </button>
    </div>

    {selectedCategory !== 'All' && (
      <div className="flex items-center justify-between px-4 py-2 bg-morandi-blueLight/20 border-b border-morandi-blue/10">
        <div className="flex items-center gap-2 text-xs font-serif text-morandi-blue">
          <Tag size={14} />
          <span>分類篩選：{selectedCategory}</span>
        </div>
        <button
          onClick={onClearCategory}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-ink-500 hover:bg-white hover:text-ink-900 transition-colors"
        >
          <X size={14} />
          <span>清除</span>
        </button>
      </div>
    )}

    {/* 批次刪除工具欄 */}
    <div className="flex items-center justify-between px-4 py-2 bg-stone-50 border-b border-stone-100">
      {!isSelectMode ? (
        <button
          onClick={onToggleSelectMode}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-ink-600 hover:bg-white hover:text-morandi-rose transition-colors"
        >
          <CheckSquare size={16} />
          <span>批次刪除</span>
        </button>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <button
              onClick={onSelectAll}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs text-ink-600 hover:bg-white transition-colors"
            >
              全選 ({filteredCount})
            </button>
            <span className="text-xs text-ink-400">已選 {selectedCount} 筆</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onBatchDelete}
              disabled={selectedCount === 0}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm bg-morandi-rose text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-morandi-rose/90 transition-colors"
            >
              <Trash2 size={14} />
              <span>刪除</span>
            </button>
            <button
              onClick={onToggleSelectMode}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-ink-600 hover:bg-white transition-colors"
            >
              <X size={14} />
              <span>取消</span>
            </button>
          </div>
        </>
      )}
    </div>
  </div>
);

export default LedgerHeader;
