
import React, { useState } from 'react';
import { HashRouter, Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ReceiptText, Bell, Menu, Settings, ChevronRight, TrendingUp, Calculator, HelpCircle } from 'lucide-react';
import Dashboard from './components/Dashboard';
import StrategyLab from './components/StrategyLab';
import Ledger from './components/Ledger';
import MorePage from './components/MorePage';
import NotificationsPage from './components/NotificationsPage';
import AnalyticsPage from './components/AnalyticsPage';
import SettingsPage from './components/SettingsPage';
import HelpPage from './components/HelpPage';
import { MOCK_ASSETS, MOCK_NOTIFICATIONS, MOCK_ACCOUNTS } from './constants';
import { Notification, Asset, Account, InvestmentScope } from './types';

const AppContent: React.FC = () => {
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Assets & Accounts State (Lifted for Logic)
  const [assets, setAssets] = useState<Asset[]>(MOCK_ASSETS);
  const [accounts, setAccounts] = useState<Account[]>(MOCK_ACCOUNTS);
  
  // Investment Scope (Onboarding/Settings State)
  const [investmentScope, setInvestmentScope] = useState<InvestmentScope>({
    tw: true,
    us: true,    // Default true, user can toggle in Settings
    crypto: true // Default true
  });

  // Notification State
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const unreadCount = notifications.filter(n => !n.read).length;

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
      case '/': return '資產主頁';
      case '/strategy': return '策略實驗室';
      case '/ledger': return '收支手帳';
      case '/notifications': return '通知中心';
      case '/more': return '功能選單';
      case '/analytics': return '數據分析';
      case '/settings': return '系統設定';
      case '/help': return '使用指南';
      default: return '智投手帳';
    }
  };

  return (
    <div className="flex h-screen bg-paper text-ink-900 overflow-hidden font-sans selection:bg-morandi-clay selection:text-white">
      
      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-stone-200 z-30 shadow-soft">
        <div className="p-8 flex items-center gap-3">
           <div className="w-10 h-10 bg-morandi-blue text-white rounded-lg flex items-center justify-center font-serif text-xl font-bold shadow-md">智</div>
           <h1 className="text-xl font-serif font-bold text-ink-900 tracking-wide">
             智投手帳
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
             <span className="font-medium tracking-wide">分析 (Analytics)</span>
          </NavLink>
          <NavLink to="/strategy" className={({ isActive }) => `flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all font-serif ${isActive ? 'bg-morandi-blue text-white shadow-md' : 'text-ink-400 hover:bg-morandi-blueLight hover:text-morandi-blue'}`}>
             <Calculator size={18} />
             <span className="font-medium tracking-wide">策略 (Strategy)</span>
          </NavLink>
          <NavLink to="/notifications" className={({ isActive }) => `flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all font-serif ${isActive ? 'bg-morandi-blue text-white shadow-md' : 'text-ink-400 hover:bg-morandi-blueLight hover:text-morandi-blue'}`}>
            <Bell size={18} />
            <span className="font-medium tracking-wide">通知 (Alerts)</span>
            {unreadCount > 0 && <span className="ml-auto bg-morandi-rose text-white text-xs px-2 py-0.5 rounded-full">{unreadCount}</span>}
          </NavLink>

          <div className="pt-4 mt-4 border-t border-stone-100">
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
             <div className="w-10 h-10 rounded-full bg-morandi-clay flex items-center justify-center text-white font-serif font-bold">A</div>
             <div>
               <div className="text-sm font-bold font-serif text-ink-900">Alex's Journal</div>
               <div className="text-xs text-ink-400">Pro Member</div>
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
            <Routes>
              <Route 
                path="/" 
                element={
                  <Dashboard 
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
                  <Ledger 
                    accounts={accounts}
                    isPrivacyMode={isPrivacyMode} 
                  />
                } 
              />
              <Route path="/strategy" element={<StrategyLab />} />
              <Route path="/notifications" element={<NotificationsPage notifications={notifications} setNotifications={setNotifications} />} />
              <Route path="/more" element={<MorePage />} />
              <Route path="/analytics" element={<AnalyticsPage isPrivacyMode={isPrivacyMode} />} />
              <Route 
                path="/settings" 
                element={
                  <SettingsPage 
                    isPrivacyMode={isPrivacyMode} 
                    togglePrivacy={togglePrivacy} 
                    investmentScope={investmentScope}
                    setInvestmentScope={setInvestmentScope}
                  />
                } 
              />
              <Route path="/help" element={<HelpPage />} />
            </Routes>
          </div>
        </div>

        {/* Bottom Nav (Mobile) */}
        <nav className="md:hidden bg-white/95 backdrop-blur-md border-t border-stone-200 h-20 fixed bottom-0 left-0 right-0 z-30 flex justify-around items-center px-2 pb-2 shadow-[0_-5px_15px_rgba(0,0,0,0.02)]">
          <NavLink to="/" className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full gap-1 ${isActive ? 'text-morandi-blue' : 'text-ink-300'}`}>
            {({ isActive }) => (
              <>
                <LayoutDashboard size={24} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-medium font-serif">主頁</span>
              </>
            )}
          </NavLink>
          <NavLink to="/ledger" className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full gap-1 ${isActive ? 'text-morandi-blue' : 'text-ink-300'}`}>
            {({ isActive }) => (
              <>
                <ReceiptText size={24} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-medium font-serif">記帳</span>
              </>
            )}
          </NavLink>
          <NavLink to="/notifications" className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full gap-1 ${isActive ? 'text-morandi-blue' : 'text-ink-300'} relative`}>
            {({ isActive }) => (
              <>
                <div className="relative">
                  <Bell size={24} strokeWidth={isActive ? 2.5 : 2} />
                  {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-morandi-rose rounded-full border-2 border-white"></span>}
                </div>
                <span className="text-[10px] font-medium font-serif">通知</span>
              </>
            )}
          </NavLink>
           <NavLink to="/more" className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full gap-1 ${isActive ? 'text-morandi-blue' : 'text-ink-300'}`}>
            {({ isActive }) => (
              <>
                <Menu size={24} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-medium font-serif">更多</span>
              </>
            )}
          </NavLink>
        </nav>
      </main>
    </div>
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
