import React from 'react';
import { Zap } from 'lucide-react';

interface QuickInputProps {
  mobile?: boolean;
  value: string;
  onChange: (v: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

const QuickInputWidget: React.FC<QuickInputProps> = ({ mobile = false, value, onChange, onKeyDown }) => (
  <div className={`${mobile ? 'fixed bottom-20 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-stone-200 md:hidden z-30' : 'hidden md:block pt-4 pb-2 px-4'}`}>
    <div className={`relative group max-w-xl mx-auto ${mobile ? 'shadow-lg rounded-2xl' : ''}`}>
      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
        <Zap className="text-morandi-blue group-focus-within:text-ink-900 transition-colors" size={20} />
      </div>
      <input
        type="number"
        placeholder="輸入金額按 Enter..."
        className={`w-full bg-white border border-stone-200 text-ink-900 pl-12 pr-4 rounded-2xl text-lg font-serif-num focus:outline-none focus:border-morandi-blue focus:ring-4 focus:ring-morandi-blue/10 transition-all placeholder-ink-300 shadow-sm
          ${mobile ? 'py-4' : 'py-3.5'}
        `}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
      />
    </div>
  </div>
);

export default QuickInputWidget;
