import React, { useState } from 'react';
import { X, Wallet, ArrowRight, Building2, Coins, Landmark } from 'lucide-react';
import { createAccount as apiCreateAccount } from '../services/api';
import { Account } from '../types';

interface OnboardingModalProps {
  onComplete: (account: Account) => void;
  onSkip: () => void;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ onComplete, onSkip }) => {
  const [step, setStep] = useState(1);
  const [accountName, setAccountName] = useState('');
  const [accountType, setAccountType] = useState<'CASH' | 'BANK' | 'BROKERAGE' | 'EXCHANGE'>('BANK');
  const [currency, setCurrency] = useState<'TWD' | 'USD'>('TWD');
  const [initialBalance, setInitialBalance] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!accountName) {
      alert('請輸入帳戶名稱');
      return;
    }

    setIsCreating(true);
    try {
      const newAccount = await apiCreateAccount({
        name: accountName,
        type: accountType,
        currency: currency,
        balance: parseFloat(initialBalance) || 0,
        isDefault: true,
        isSub: false
      });

      if (newAccount) {
        console.log('✅ 首個帳戶創建成功');
        onComplete(newAccount);
      } else {
        alert('創建帳戶失敗，請重試');
      }
    } catch (error) {
      console.error('❌ 創建帳戶失敗:', error);
      alert('創建帳戶失敗，請重試');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/70 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-slide-up max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="bg-gradient-to-r from-morandi-blue to-morandi-sage p-6 text-white relative">
          <button
            onClick={onSkip}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition"
          >
            <X size={20} />
          </button>
          <div className="text-center">
            <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Wallet size={32} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold font-serif mb-2">歡迎來到 SmartCapital！</h2>
            <p className="text-white/90 text-sm font-serif">讓我們建立你的第一個帳戶</p>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-ink-900 font-serif mb-4">為什麼需要建立帳戶？</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-morandi-blueLight/20 rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-morandi-blue flex items-center justify-center shrink-0 text-white text-sm font-bold">1</div>
                    <div>
                      <div className="text-sm font-bold text-ink-900">管理你的資金池</div>
                      <div className="text-xs text-ink-500 mt-1">分別追蹤現金、銀行、證券戶等不同帳戶的餘額</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-morandi-sageLight/20 rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-morandi-sage flex items-center justify-center shrink-0 text-white text-sm font-bold">2</div>
                    <div>
                      <div className="text-sm font-bold text-ink-900">記錄每筆收支</div>
                      <div className="text-xs text-ink-500 mt-1">每筆交易都會關聯到對應的帳戶，清楚掌握資金流向</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-morandi-blueLight/20 rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-morandi-blue flex items-center justify-center shrink-0 text-white text-sm font-bold">3</div>
                    <div>
                      <div className="text-sm font-bold text-ink-900">跨幣別管理</div>
                      <div className="text-xs text-ink-500 mt-1">支援台幣（TWD）和美元（USD），輕鬆管理跨境資產</div>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full bg-ink-900 text-white py-4 rounded-xl font-bold hover:bg-ink-800 transition flex items-center justify-center gap-2"
              >
                開始建立 <ArrowRight size={20} />
              </button>

              <button
                onClick={onSkip}
                className="w-full text-sm text-ink-400 hover:text-ink-900 transition font-serif"
              >
                稍後再說
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="bg-morandi-blueLight/30 p-4 rounded-xl">
                <h3 className="text-lg font-bold text-ink-900 font-serif mb-2">📝 建立你的第一個帳戶</h3>
                <p className="text-xs text-ink-600 font-serif leading-relaxed">
                  帳戶是用來追蹤你的資金流向。例如：銀行帳戶、錢包、證券戶等。<br/>
                  <span className="text-morandi-blue font-bold mt-1 inline-block">💡 每筆交易都會關聯到一個帳戶</span>，幫助你清楚掌握資金分布。
                </p>
              </div>

              {/* 帳戶名稱 */}
              <div>
                <label className="block text-xs font-bold text-ink-400 uppercase tracking-widest mb-2">帳戶名稱</label>
                <input
                  type="text"
                  value={accountName}
                  onChange={e => setAccountName(e.target.value)}
                  placeholder="例如：台新銀行、現金"
                  className="w-full bg-paper border border-stone-200 px-4 py-3 rounded-xl text-sm font-bold text-ink-900 focus:outline-none focus:border-morandi-blue focus:ring-4 focus:ring-morandi-blue/10 transition"
                  autoFocus
                />
              </div>

              {/* 帳戶類型 */}
              <div>
                <label className="block text-xs font-bold text-ink-400 uppercase tracking-widest mb-2">帳戶類型</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'BANK', label: '銀行帳戶', icon: <Building2 size={18} /> },
                    { value: 'CASH', label: '現金', icon: <Wallet size={18} /> },
                    { value: 'BROKERAGE', label: '證券戶', icon: <Landmark size={18} /> },
                    { value: 'EXCHANGE', label: '交易所', icon: <Coins size={18} /> }
                  ].map(type => (
                    <button
                      key={type.value}
                      onClick={() => setAccountType(type.value as any)}
                      className={`flex items-center justify-center gap-2 py-3 rounded-xl border transition ${
                        accountType === type.value
                          ? 'bg-ink-50 border-ink-900 text-ink-900 shadow-sm'
                          : 'bg-white border-stone-200 text-ink-400 hover:border-stone-300'
                      }`}
                    >
                      {type.icon}
                      <span className="text-xs font-bold">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 幣別 */}
              <div>
                <label className="block text-xs font-bold text-ink-400 uppercase tracking-widest mb-2">幣別</label>
                <div className="grid grid-cols-2 gap-3">
                  {['TWD', 'USD'].map(curr => (
                    <button
                      key={curr}
                      onClick={() => setCurrency(curr as any)}
                      className={`py-3 rounded-xl border transition text-sm font-bold ${
                        currency === curr
                          ? 'bg-ink-50 border-ink-900 text-ink-900'
                          : 'bg-white border-stone-200 text-ink-400 hover:border-stone-300'
                      }`}
                    >
                      {curr === 'TWD' ? '新台幣 (TWD)' : '美元 (USD)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* 初始餘額 */}
              <div>
                <label className="block text-xs font-bold text-ink-400 uppercase tracking-widest mb-2">初始餘額（選填）</label>
                <input
                  type="number"
                  value={initialBalance}
                  onChange={e => setInitialBalance(e.target.value)}
                  placeholder="0"
                  className="w-full bg-paper border border-stone-200 px-4 py-3 rounded-xl text-sm font-bold text-ink-900 focus:outline-none focus:border-morandi-blue focus:ring-4 focus:ring-morandi-blue/10 transition"
                />
                <p className="text-xs text-ink-400 mt-2 font-serif">可以稍後在記帳時調整餘額</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 bg-stone-100 text-ink-900 py-4 rounded-xl font-bold hover:bg-stone-200 transition"
                >
                  上一步
                </button>
                <button
                  onClick={handleCreate}
                  disabled={isCreating || !accountName}
                  className="flex-1 bg-morandi-blue text-white py-4 rounded-xl font-bold hover:bg-opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isCreating ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    '完成建立'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default OnboardingModal;
