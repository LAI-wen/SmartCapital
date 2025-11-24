import React, { useState } from 'react';
import { ArrowRight, CheckCircle, Smartphone, TrendingUp, Shield, Zap } from 'lucide-react';

interface WelcomePageProps {
  onLineLogin: () => void;
  onGuestMode: () => void;
}

const WelcomePage: React.FC<WelcomePageProps> = ({ onLineLogin, onGuestMode }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleLineLogin = () => {
    setIsLoading(true);
    // LIFF 會自動處理登入流程
    onLineLogin();
  };

  const handleGuestMode = () => {
    console.log('🎭 進入訪客模式');
    onGuestMode();
  };

  return (
    <div className="min-h-screen w-full flex bg-paper relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-morandi-blueLight/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-morandi-sageLight/20 rounded-full blur-3xl pointer-events-none" />

      {/* Left Column (Desktop - Brand) */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-16 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-morandi-blue text-white rounded-lg flex items-center justify-center font-serif text-xl font-bold shadow-md">智</div>
          <span className="text-xl font-serif font-bold text-ink-900 tracking-wide">SmartCapital</span>
        </div>

        <div className="mb-20">
          <h1 className="text-6xl font-serif font-bold text-ink-900 mb-6 leading-tight">
            讓資產管理<br />
            <span className="text-morandi-blue italic">優雅</span> 且 <span className="text-morandi-sage italic">清晰</span>
          </h1>
          <p className="text-xl text-ink-500 font-serif leading-relaxed max-w-md">
            不僅僅是記帳。我們結合凱利公式與現代投資組合理論，為您打造專業的個人財富儀表板。
          </p>

          <div className="mt-10 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-morandi-blueLight flex items-center justify-center">
                <TrendingUp size={20} className="text-morandi-blue" />
              </div>
              <div>
                <div className="text-sm font-bold text-ink-900">多市場資產追蹤</div>
                <div className="text-xs text-ink-400">台股、美股、加密貨幣一目了然</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-morandi-sageLight flex items-center justify-center">
                <Zap size={20} className="text-morandi-sage" />
              </div>
              <div>
                <div className="text-sm font-bold text-ink-900">進階策略實驗室</div>
                <div className="text-xs text-ink-400">凱利公式、馬丁格爾計算工具</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-morandi-blueLight flex items-center justify-center">
                <Shield size={20} className="text-morandi-blue" />
              </div>
              <div>
                <div className="text-sm font-bold text-ink-900">安全的資料保護</div>
                <div className="text-xs text-ink-400">透過 LINE 登入，無需額外註冊</div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-sm text-ink-400 font-serif">
          © 2024 SmartCapital Inc. All rights reserved.
        </div>
      </div>

      {/* Right Column (Welcome Actions) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-md bg-white/80 backdrop-blur-xl p-8 md:p-10 rounded-3xl shadow-soft border border-stone-100 animate-slide-up">

          {/* Mobile Header */}
          <div className="lg:hidden flex flex-col items-center justify-center mb-8">
            <div className="w-16 h-16 bg-morandi-blue text-white rounded-2xl flex items-center justify-center font-serif text-3xl font-bold shadow-lg mb-4">智</div>
            <span className="text-2xl font-serif font-bold text-ink-900 tracking-wide">智投手帳</span>
            <p className="text-sm text-ink-400 mt-2 font-serif">SmartCapital</p>
          </div>

          <div className="text-center mb-8 lg:mb-12">
            <h2 className="text-3xl font-serif font-bold text-ink-900 mb-3">歡迎使用</h2>
            <p className="text-ink-500 text-base font-serif leading-relaxed">
              透過 LINE 登入，輕鬆管理你的投資組合
            </p>
          </div>

          {/* LINE Login Button */}
          <button
            onClick={handleLineLogin}
            disabled={isLoading}
            className="w-full bg-[#06C755] hover:bg-[#05B04A] text-white font-bold py-4 rounded-xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-3 mb-4 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <Smartphone size={20} />
                使用 LINE 登入
                <ArrowRight size={18} />
              </>
            )}
          </button>

          <div className="flex items-center gap-2 mb-4 px-4 py-3 bg-morandi-blueLight/30 rounded-xl">
            <CheckCircle size={16} className="text-morandi-blue shrink-0" />
            <span className="text-xs text-ink-700 font-serif">快速、安全，無需註冊新帳號</span>
          </div>

          <div className="my-8 flex items-center gap-4">
            <div className="h-px bg-stone-200 flex-1"></div>
            <span className="text-xs text-ink-300 font-serif">或</span>
            <div className="h-px bg-stone-200 flex-1"></div>
          </div>

          {/* Guest Mode Button */}
          <button
            onClick={handleGuestMode}
            className="w-full bg-white border-2 border-stone-200 hover:border-morandi-blue text-ink-900 font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 hover:bg-stone-50"
          >
            先體驗訪客模式
          </button>

          <div className="mt-6 text-center">
            <p className="text-xs text-ink-400 font-serif leading-relaxed">
              訪客模式使用示範資料，不會儲存您的操作
            </p>
          </div>

          {/* Features List (Mobile) */}
          <div className="lg:hidden mt-10 space-y-3 pt-6 border-t border-stone-200">
            <div className="flex items-center gap-2">
              <CheckCircle size={14} className="text-morandi-sage shrink-0" />
              <span className="text-xs text-ink-600 font-serif">多市場資產追蹤</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle size={14} className="text-morandi-sage shrink-0" />
              <span className="text-xs text-ink-600 font-serif">進階策略實驗室</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle size={14} className="text-morandi-sage shrink-0" />
              <span className="text-xs text-ink-600 font-serif">LINE Bot 即時通知</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default WelcomePage;
