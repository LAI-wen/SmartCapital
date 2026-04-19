
import React, { Suspense, lazy, useEffect, useState } from 'react';
import { HashRouter, Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ReceiptText, Menu, Settings, ChevronRight, TrendingUp, Calculator, HelpCircle, Wallet } from 'lucide-react';
import WelcomePage from './components/WelcomePage';
import OnboardingModal from './components/OnboardingModal';
import ErrorToast, { showApiError } from './components/ErrorToast';
import { ApiError } from './services/core/http';
import { Asset, Account, InvestmentScope } from './types';
import { getAccounts, getAssets as fetchAssets, createAccount, getUser } from './services/api';
import { isAuthenticated, autoRefreshToken } from './services/auth.service';
import { useLiff } from './contexts/LiffContext';
import './i18n/config'; // Initialize i18n
import { useTranslation } from 'react-i18next';

const DashboardPage = lazy(() => import('./components/Dashboard'));
const StrategyLabPage = lazy(() => import('./components/StrategyLab'));
const LedgerPage = lazy(() => import('./components/Ledger'));
const MorePage = lazy(() => import('./components/MorePage'));
const NotificationsPage = lazy(() => import('./components/NotificationsPage'));
const AnalyticsPage = lazy(() => import('./components/AnalyticsPage'));
const SettingsPage = lazy(() => import('./components/SettingsPage'));
const HelpPage = lazy(() => import('./components/HelpPage'));
const AccountManagementPage = lazy(() => import('./components/AccountManagementPage'));
const PriceAlertsPage = lazy(() => import('./components/PriceAlertsPage'));
const BudgetSettingsPage = lazy(() => import('./components/BudgetSettingsPage'));

const PageLoader: React.FC = () => (
  <div className="flex min-h-[40vh] items-center justify-center">
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-morandi-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-ink-400 font-serif">載入頁面中...</p>
    </div>
  </div>
);

const AppContent: React.FC = () => {
  const { t } = useTranslation();
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // 🔐 整合 LIFF 登入
  const liffContext = useLiff();
  const { isLoggedIn, isLiffReady, lineUserId, displayName, error: liffError } = liffContext;

  // 🎭 認證狀態管理
  const [authMode, setAuthMode] = useState<'guest' | 'authenticated'>('guest');
  const [showWelcome, setShowWelcome] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Assets & Accounts State (Lifted for Logic) - 必須在所有條件判斷之前宣告
  const [assets, setAssets] = useState<Asset[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [isLoadingAssets, setIsLoadingAssets] = useState(true);
  
  // Investment Scope (Onboarding/Settings State)
  const [investmentScope, setInvestmentScope] = useState<InvestmentScope>({
    tw: true,
    us: true,    // Default true, user can toggle in Settings
    crypto: true // Default true
  });

  useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
      if (event.reason instanceof ApiError) {
        event.preventDefault();
        showApiError(event.reason.status, event.reason.message);
      }
    };
    window.addEventListener('unhandledrejection', handler);
    return () => window.removeEventListener('unhandledrejection', handler);
  }, []);

  // 檢查認證狀態並決定是否顯示歡迎頁
  useEffect(() => {
    const storedAuthMode = localStorage.getItem('authMode') as 'guest' | 'authenticated' | null;

    if (storedAuthMode === 'guest') {
      setAuthMode('guest');
      setShowWelcome(false);
      return;
    }

    if (storedAuthMode === 'authenticated') {
      if (isAuthenticated()) {
        // Token 有效，直接進入
        setAuthMode('authenticated');
        setShowWelcome(false);
        return;
      }
      // Token 過期，等 LIFF ready 後嘗試 refresh
      if (!isLiffReady) return;
      autoRefreshToken().then(() => {
        if (isAuthenticated()) {
          setAuthMode('authenticated');
          setShowWelcome(false);
        } else {
          // Refresh 失敗，清除過期狀態，回到歡迎頁
          ['authMode', 'lineUserId', 'displayName'].forEach(k => localStorage.removeItem(k));
          setAuthMode('guest');
          setShowWelcome(true);
        }
      });
      return;
    }

    // 沒有任何 auth 記錄，依賴 LIFF 狀態
    if (!isLiffReady) return;
    if (isLoggedIn) {
      setAuthMode('authenticated');
      setShowWelcome(false);
    } else {
      setShowWelcome(true);
    }
  }, [isLiffReady, isLoggedIn]);

  // 🔥 Load accounts and assets from API on mount (等認證完成後才載入)
  useEffect(() => {
    const loadData = async () => {
      if (!isLiffReady || showWelcome) {
        // 如果還沒準備好，先設為不載入，避免卡在載入畫面
        setIsLoadingAccounts(false);
        setIsLoadingAssets(false);
        return;
      }

      // 🎯 載入用戶設定（投資範圍）
      try {
        const user = await getUser();
        if (user) {
          setInvestmentScope({
            tw: user.enableTWStock,
            us: user.enableUSStock,
            crypto: user.enableCrypto
          });
        }
      } catch (error) {
        console.error('❌ 載入用戶設定失敗:', error);
      }

      // 載入帳戶
      setIsLoadingAccounts(true);
      try {
        const fetchedAccounts = await getAccounts();
        setAccounts(fetchedAccounts);

        // 🎯 首次登入自動創建預設現金帳戶
        if (fetchedAccounts.length === 0 && !localStorage.getItem('defaultAccountCreated')) {
          try {
            const defaultAccount = await createAccount({
              name: '現金',
              type: 'CASH',
              currency: 'TWD',
              balance: 0,
              isDefault: true,
              isSub: false
            });

            if (defaultAccount) {
              setAccounts([defaultAccount]);
              localStorage.setItem('defaultAccountCreated', 'true');
            }
          } catch (error) {
            console.error('❌ 創建預設帳戶失敗:', error);
          }
        }
      } catch (error) {
        console.error('❌ 載入帳戶失敗:', error);
      } finally {
        setIsLoadingAccounts(false);
      }

      // 載入資產
      setIsLoadingAssets(true);
      try {
        const fetchedAssets = await fetchAssets();
        setAssets(fetchedAssets);
      } catch (error) {
        console.error('❌ 載入資產失敗:', error);
      } finally {
        setIsLoadingAssets(false);
      }
    };

    loadData();
  }, [isLiffReady, showWelcome, lineUserId, authMode]);

  // 處理登入相關的函數
  const handleLineLogin = () => {
    // LIFF 會自動觸發登入，不需額外處理
    localStorage.setItem('authMode', 'authenticated');
    setAuthMode('authenticated');
    setShowWelcome(false);
  };

  const handleGuestMode = () => {
    localStorage.setItem('authMode', 'guest');
    setAuthMode('guest');
    setShowWelcome(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('authMode');
    localStorage.removeItem('lineUserId');
    localStorage.removeItem('displayName');
    localStorage.removeItem('onboardingCompleted');
    localStorage.removeItem('defaultAccountCreated');
    setAuthMode('guest');
    setShowWelcome(true);
    setShowOnboarding(false);
    setAccounts([]);
    setAssets([]);
    navigate('/');
  };

  const handleOnboardingComplete = (newAccount: Account) => {
    localStorage.setItem('onboardingCompleted', 'true');
    setAccounts([newAccount]);
    setShowOnboarding(false);
  };

  const handleOnboardingSkip = () => {
    localStorage.setItem('onboardingCompleted', 'true');
    setShowOnboarding(false);
  };

  // ⚠️ LIFF 初始化中，顯示載入畫面
  if (!isLiffReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-paper">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-morandi-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-ink-400 font-serif">正在初始化...</p>
        </div>
      </div>
    );
  }

  // 🎉 顯示歡迎頁
  if (showWelcome) {
    return <WelcomePage onLineLogin={handleLineLogin} onGuestMode={handleGuestMode} />;
  }

  // 📊 載入資料中
  if (isLoadingAccounts || isLoadingAssets) {
    return (
      <div className="flex h-screen items-center justify-center bg-paper">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-morandi-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-ink-400 font-serif">載入資料中...</p>
        </div>
      </div>
    );
  }

  // ⚠️ LIFF 初始化失敗
  if (liffError) {
    return (
      <div className="flex h-screen items-center justify-center bg-paper">
        <div className="text-center max-w-md p-8">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-ink-900 mb-2">初始化失敗</h2>
          <p className="text-ink-400 mb-4">{liffError}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-6 py-2 bg-morandi-blue text-white rounded-lg hover:bg-opacity-90 transition"
          >
            重新載入
          </button>
        </div>
      </div>
    );
  }

  const togglePrivacy = () => setIsPrivacyMode(!isPrivacyMode);

  const handleAssetUpdate = (newAssets: Asset[]) => {
    setAssets(newAssets);
  };
  
  const handleAccountUpdate = (newAccounts: Account[]) => {
    setAccounts(newAccounts);
  };

  // Helper to determine page title
  const getPageTitle = (pathname: string) => {
    switch (pathname) {
      case '/': return '主頁';
      case '/strategy': return '財富目標試算';
      case '/ledger': return '收支手帳';
      case '/notifications': return '通知中心';
      case '/more': return '功能選單';
      case '/analytics': return '本月回顧';
      case '/settings': return '系統設定';
      case '/help': return '使用指南';
      case '/account-management': return '帳戶管理';
      case '/price-alerts': return '價格警示';
      case '/budget-settings': return '預算設定';
      default: return 'MiniWallet';
    }
  };

  return (
    <>
    <div className="flex h-screen bg-paper text-ink-900 overflow-hidden font-sans selection:bg-morandi-clay selection:text-white">

      {/* 🎉 Onboarding Modal */}
      {showOnboarding && (
        <OnboardingModal
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingSkip}
        />
      )}

      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-stone-200 z-30 shadow-soft">
        <div className="p-8 flex items-center gap-3">
           <div className="w-10 h-10 bg-morandi-blue text-white rounded-lg flex items-center justify-center font-serif text-xl font-bold shadow-md">M</div>
           <h1 className="text-xl font-serif font-bold text-ink-900 tracking-wide">
             MiniWallet
           </h1>
        </div>
        
        <nav className="flex-1 px-6 space-y-3 mt-4 overflow-y-auto">
          <NavLink to="/" className={({ isActive }) => `flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all font-serif ${isActive ? 'bg-morandi-blue text-white shadow-md' : 'text-ink-400 hover:bg-morandi-blueLight hover:text-morandi-blue'}`}>
            <LayoutDashboard size={18} />
            <span className="font-medium tracking-wide">主頁 (Home)</span>
          </NavLink>
          <NavLink to="/ledger" className={({ isActive }) => `flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all font-serif ${isActive ? 'bg-morandi-blue text-white shadow-md' : 'text-ink-400 hover:bg-morandi-blueLight hover:text-morandi-blue'}`}>
            <ReceiptText size={18} />
            <span className="font-medium tracking-wide">記帳 (Ledger)</span>
          </NavLink>
          <NavLink to="/analytics" className={({ isActive }) => `flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all font-serif ${isActive ? 'bg-morandi-blue text-white shadow-md' : 'text-ink-400 hover:bg-morandi-blueLight hover:text-morandi-blue'}`}>
            <TrendingUp size={18} />
            <span className="font-medium tracking-wide">回顧 (Review)</span>
          </NavLink>

          <div className="pt-4 mt-4 border-t border-stone-100">
            <NavLink to="/strategy" className={({ isActive }) => `flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all font-serif ${isActive ? 'bg-morandi-blue text-white shadow-md' : 'text-ink-400 hover:bg-morandi-blueLight hover:text-morandi-blue'}`}>
              <Calculator size={18} />
              <span className="font-medium tracking-wide">財富試算</span>
            </NavLink>
            <NavLink to="/account-management" className={({ isActive }) => `flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all font-serif ${isActive ? 'bg-morandi-blue text-white shadow-md' : 'text-ink-400 hover:bg-morandi-blueLight hover:text-morandi-blue'}`}>
              <Wallet size={18} />
              <span className="font-medium tracking-wide">帳戶 (Accounts)</span>
            </NavLink>
            <NavLink to="/settings" className={({ isActive }) => `flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all font-serif ${isActive ? 'bg-morandi-blue text-white shadow-md' : 'text-ink-400 hover:bg-morandi-blueLight hover:text-morandi-blue'}`}>
              <Settings size={18} />
              <span className="font-medium tracking-wide">設定 (Settings)</span>
            </NavLink>
            <NavLink to="/help" className={({ isActive }) => `flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all font-serif ${isActive ? 'bg-morandi-blue text-white shadow-md' : 'text-ink-400 hover:bg-morandi-blueLight hover:text-morandi-blue'}`}>
              <HelpCircle size={18} />
              <span className="font-medium tracking-wide">幫助 (Help)</span>
            </NavLink>
          </div>
        </nav>

        <div className="p-6">
           <div
             onClick={() => navigate('/settings')}
             className="flex items-center gap-3 p-4 rounded-xl bg-paper border border-stone-200 shadow-sm cursor-pointer hover:border-morandi-blue transition-colors"
            >
             <div className="w-10 h-10 rounded-full bg-morandi-clay flex items-center justify-center text-white font-serif font-bold">
               {displayName ? displayName[0].toUpperCase() : 'M'}
             </div>
             <div>
               <div className="text-sm font-bold font-serif text-ink-900">
                 {displayName || 'MiniWallet'}
               </div>
               <div className="text-xs text-ink-400">
                 {isLoggedIn ? 'LINE 用戶' : '訪客模式'}
               </div>
             </div>
             <Settings size={16} className="ml-auto text-ink-400" />
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-paper">
        {/* Header */}
        <header className="h-16 md:h-20 flex items-center justify-between px-4 md:px-10 border-b border-stone-200/50 bg-paper/80 backdrop-blur-md sticky top-0 z-20">
          <div className="font-serif font-bold text-xl text-ink-900 flex items-center gap-2">
            {(location.pathname !== '/' && location.pathname !== '/ledger' && location.pathname !== '/notifications' && location.pathname !== '/more') && (
              <button onClick={() => navigate(-1)} className="md:hidden p-1 -ml-2 text-ink-400">
                <ChevronRight className="rotate-180" size={24} />
              </button>
            )}
            {getPageTitle(location.pathname)}
          </div>

          {/* Privacy Toggle (Always visible) */}
          <button onClick={togglePrivacy} className="p-2 text-ink-400 hover:text-morandi-blue transition-colors rounded-full hover:bg-white border border-transparent hover:border-stone-200 flex items-center gap-2">
             <span className="text-xs font-serif hidden md:block">{isPrivacyMode ? '隱私模式開啟' : '顯示金額'}</span>
             {isPrivacyMode ? <div className="w-5 h-5 rounded-full bg-morandi-blue flex items-center justify-center text-white text-[10px]">P</div> : <div className="w-5 h-5 rounded-full border border-stone-300"></div>}
          </button>
        </header>

        {/* Scrollable Content Area */}
        <div id="main-scroll-container" className="flex-1 overflow-y-auto scroll-smooth bg-paper">
          <div className="max-w-5xl mx-auto h-full pb-24 md:pb-10 p-4 md:p-8">
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route 
                  path="/" 
                  element={
                    <DashboardPage
                      assets={assets} 
                      accounts={accounts} 
                      onAssetUpdate={handleAssetUpdate} 
                      onAccountUpdate={handleAccountUpdate}
                      isPrivacyMode={isPrivacyMode}
                      investmentScope={investmentScope}
                    />
                  } 
                />
                <Route
                  path="/ledger"
                  element={
                    <LedgerPage
                      accounts={accounts}
                      isPrivacyMode={isPrivacyMode}
                      onAccountsUpdate={async () => {
                        const fetchedAccounts = await getAccounts();
                        setAccounts(fetchedAccounts);
                      }}
                    />
                  }
                />
                <Route path="/strategy" element={<StrategyLabPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/more" element={<MorePage onLogout={handleLogout} authMode={authMode} />} />
                <Route
                  path="/analytics"
                  element={
                    <AnalyticsPage
                      isPrivacyMode={isPrivacyMode}
                      investmentScope={investmentScope}
                    />
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <SettingsPage
                      isPrivacyMode={isPrivacyMode}
                      togglePrivacy={togglePrivacy}
                      investmentScope={investmentScope}
                      setInvestmentScope={setInvestmentScope}
                      onLogout={handleLogout}
                      authMode={authMode}
                      displayName={displayName || 'MiniWallet'}
                    />
                  } 
                />
                <Route path="/help" element={<HelpPage />} />
                <Route
                  path="/account-management"
                  element={
                    <AccountManagementPage
                      onAccountsUpdate={async () => {
                        const fetchedAccounts = await getAccounts();
                        setAccounts(fetchedAccounts);
                      }}
                    />
                  }
                />
                <Route
                  path="/price-alerts"
                  element={
                    <PriceAlertsPage
                      assets={assets}
                      investmentScope={investmentScope}
                    />
                  }
                />
                <Route path="/budget-settings" element={<BudgetSettingsPage />} />
              </Routes>
            </Suspense>
          </div>
        </div>

        {/* Bottom Nav (Mobile) */}
        <nav className="md:hidden bg-white/95 backdrop-blur-md border-t border-stone-200 h-20 fixed bottom-0 left-0 right-0 z-30 flex justify-around items-center px-2 pb-2 shadow-[0_-5px_15px_rgba(0,0,0,0.02)]">
          <NavLink to="/" className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full gap-1 ${isActive ? 'text-morandi-blue' : 'text-ink-300'}`}>
            {({ isActive }) => (
              <>
                <LayoutDashboard size={24} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-medium font-serif">{t('nav.dashboard')}</span>
              </>
            )}
          </NavLink>
          <NavLink to="/ledger" className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full gap-1 ${isActive ? 'text-morandi-blue' : 'text-ink-300'}`}>
            {({ isActive }) => (
              <>
                <ReceiptText size={24} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-medium font-serif">{t('nav.ledger')}</span>
              </>
            )}
          </NavLink>
          <NavLink to="/analytics" className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full gap-1 ${isActive ? 'text-morandi-blue' : 'text-ink-300'}`}>
            {({ isActive }) => (
              <>
                <TrendingUp size={24} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-medium font-serif">{t('nav.analytics')}</span>
              </>
            )}
          </NavLink>
          <NavLink to="/more" className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full gap-1 ${isActive ? 'text-morandi-blue' : 'text-ink-300'}`}>
            {({ isActive }) => (
              <>
                <Menu size={24} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-medium font-serif">{t('nav.more')}</span>
              </>
            )}
          </NavLink>
        </nav>
      </main>
    </div>
    <ErrorToast />
    </>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
};

export default App;
