

import React, { useState, useRef, useEffect } from 'react';
import { HashRouter, Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, PieChart, FlaskConical, Plus, Eye, EyeOff, Settings, Bell, ReceiptText, PenTool, Check, Trash2, X, Info, AlertCircle, CheckCircle2 } from 'lucide-react';
import Dashboard from './components/Dashboard';
import Portfolio from './components/Portfolio';
import StrategyLab from './components/StrategyLab';
import Ledger from './components/Ledger';
import LineBotData from './components/LineBotData';
import { MOCK_ASSETS, MOCK_NOTIFICATIONS } from './constants';
import { Notification } from './types';
import { LiffProvider, useLiff } from './contexts/LiffContext';
import { useUserData } from './hooks/useUserData';
import * as api from './services/api';

const AppContent: React.FC = () => {
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // LIFF 和用戶資料
  const { isLoggedIn, displayName, pictureUrl } = useLiff();
  const { portfolio, transactions, isLoading } = useUserData();

  // Notification State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  const togglePrivacy = () => setIsPrivacyMode(!isPrivacyMode);

  // 決定使用真實資料還是 Mock 資料
  const assets = (isLoggedIn && portfolio) ? portfolio.assets : MOCK_ASSETS;

  // Fetch notifications from API
  useEffect(() => {
    const fetchNotifications = async () => {
      if (isLoggedIn) {
        try {
          const notifs = await api.getNotifications(20);
          // 始終使用 API 返回的數據，即使是空數組
          setNotifications(notifs);
        } catch (error) {
          console.error('Failed to fetch notifications:', error);
          // 只在 API 失敗時使用 Mock 資料
          setNotifications(MOCK_NOTIFICATIONS);
        }
      } else {
        // Demo 模式使用 Mock 資料
        setNotifications(MOCK_NOTIFICATIONS);
      }
    };
    
    fetchNotifications();
  }, [isLoggedIn]);

  // Close notifications when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllAsRead = async () => {
    if (isLoggedIn) {
      const success = await api.markAllNotificationsAsRead(api.getUserId());
      if (success) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      }
    } else {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }
  };

  const deleteNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleNotificationClick = async (id: string) => {
    if (isLoggedIn) {
      const success = await api.markNotificationAsRead(id);
      if (success) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      }
    } else {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    }
  };

  // Helper to determine page title
  const getPageTitle = (pathname: string) => {
    switch (pathname) {
      case '/': return '資產概覽';
      case '/portfolio': return '投資組合';
      case '/strategy': return '策略實驗室';
      case '/ledger': return '收支手帳';
      default: return '智投手帳';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'alert': return <AlertCircle size={18} className="text-morandi-rose" />;
      case 'success': return <CheckCircle2 size={18} className="text-morandi-sage" />;
      default: return <Info size={18} className="text-morandi-blue" />;
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
        
        <nav className="flex-1 px-6 space-y-3 mt-4">
          <NavLink to="/" className={({ isActive }) => `flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all font-serif ${isActive ? 'bg-morandi-blue text-white shadow-md' : 'text-ink-400 hover:bg-morandi-blueLight hover:text-morandi-blue'}`}>
            <LayoutDashboard size={18} />
            <span className="font-medium tracking-wide">概覽 (Overview)</span>
          </NavLink>
          <NavLink to="/portfolio" className={({ isActive }) => `flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all font-serif ${isActive ? 'bg-morandi-blue text-white shadow-md' : 'text-ink-400 hover:bg-morandi-blueLight hover:text-morandi-blue'}`}>
            <PieChart size={18} />
            <span className="font-medium tracking-wide">投資 (Portfolio)</span>
          </NavLink>
          <NavLink to="/ledger" className={({ isActive }) => `flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all font-serif ${isActive ? 'bg-morandi-blue text-white shadow-md' : 'text-ink-400 hover:bg-morandi-blueLight hover:text-morandi-blue'}`}>
            <ReceiptText size={18} />
            <span className="font-medium tracking-wide">記帳 (Ledger)</span>
          </NavLink>
          <NavLink to="/strategy" className={({ isActive }) => `flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all font-serif ${isActive ? 'bg-morandi-blue text-white shadow-md' : 'text-ink-400 hover:bg-morandi-blueLight hover:text-morandi-blue'}`}>
            <FlaskConical size={18} />
            <span className="font-medium tracking-wide">實驗室 (Lab)</span>
          </NavLink>
        </nav>

        <div className="p-6">
           <div className="flex items-center gap-3 p-4 rounded-xl bg-paper border border-stone-200 shadow-sm">
             {pictureUrl ? (
               <img src={pictureUrl} alt="Profile" className="w-10 h-10 rounded-full" />
             ) : (
               <div className="w-10 h-10 rounded-full bg-morandi-clay flex items-center justify-center text-white font-serif font-bold">
                 {displayName ? displayName[0].toUpperCase() : 'U'}
               </div>
             )}
             <div>
               <div className="text-sm font-bold font-serif text-ink-900">
                 {displayName || (isLoggedIn ? '載入中...' : 'Guest')}
               </div>
               <div className="text-xs text-ink-400">{isLoggedIn ? 'LINE User' : 'Demo Mode'}</div>
             </div>
             <Settings size={16} className="ml-auto text-ink-400 cursor-pointer hover:text-morandi-blue" />
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-paper">
        {/* Header */}
        <header className="h-20 flex items-center justify-between px-6 md:px-10 border-b border-stone-200/50 bg-paper/80 backdrop-blur-md sticky top-0 z-30">
          <div className="md:hidden font-serif font-bold text-xl text-ink-900">
            {getPageTitle(location.pathname)}
          </div>
          <div className="hidden md:block">
            <h2 className="text-2xl font-serif font-bold text-ink-900">{getPageTitle(location.pathname)}</h2>
            <p className="text-xs text-ink-400 font-sans mt-1">Today is a good day to compound.</p>
          </div>

          <div className="flex items-center gap-3">
             <button onClick={togglePrivacy} className="p-2.5 text-ink-400 hover:text-morandi-blue transition-colors rounded-full hover:bg-white border border-transparent hover:border-stone-200">
               {isPrivacyMode ? <EyeOff size={20} /> : <Eye size={20} />}
             </button>
             
             {/* Notification Bell with Dropdown */}
             <div className="relative" ref={notificationRef}>
               <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={`p-2.5 transition-colors rounded-full border border-transparent hover:border-stone-200 relative ${showNotifications ? 'bg-white text-morandi-blue shadow-sm' : 'text-ink-400 hover:text-morandi-blue hover:bg-white'}`}
               >
                 <Bell size={20} />
                 {unreadCount > 0 && (
                   <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-morandi-rose rounded-full border-2 border-paper"></span>
                 )}
               </button>

               {/* Dropdown Panel */}
               {showNotifications && (
                 <div className="absolute right-0 top-full mt-2 w-80 md:w-96 bg-white rounded-2xl shadow-xl border border-stone-100 z-[100] overflow-hidden animate-fade-in origin-top-right">
                    <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-paper/50">
                       <h3 className="font-serif font-bold text-ink-900">通知中心</h3>
                       {unreadCount > 0 && (
                         <button 
                           onClick={markAllAsRead} 
                           className="text-xs text-morandi-blue hover:text-ink-900 font-medium flex items-center gap-1 transition-colors"
                         >
                           <Check size={14} /> 全部已讀
                         </button>
                       )}
                    </div>
                    
                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                       {notifications.length === 0 ? (
                         <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                            <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mb-3">
                               <Bell size={24} className="text-stone-300" />
                            </div>
                            <p className="text-ink-900 font-serif font-medium">目前沒有新通知</p>
                            <p className="text-ink-400 text-xs mt-1">好好享受寧靜的片刻吧！</p>
                         </div>
                       ) : (
                         <div>
                            {notifications.map(notification => (
                              <div 
                                key={notification.id} 
                                onClick={() => handleNotificationClick(notification.id)}
                                className={`p-4 border-b border-stone-50 hover:bg-paper/50 transition-colors cursor-pointer group relative ${!notification.read ? 'bg-morandi-blueLight/10' : ''}`}
                              >
                                 <div className="flex gap-3">
                                    <div className={`mt-0.5 shrink-0 ${!notification.read ? 'opacity-100' : 'opacity-50'}`}>
                                       {getNotificationIcon(notification.type)}
                                    </div>
                                    <div className="flex-1">
                                       <div className="flex justify-between items-start mb-1">
                                          <h4 className={`text-sm font-bold font-serif ${!notification.read ? 'text-ink-900' : 'text-ink-500'}`}>
                                            {notification.title}
                                          </h4>
                                          <span className="text-[10px] text-ink-300 whitespace-nowrap ml-2">{notification.time}</span>
                                       </div>
                                       <p className={`text-xs leading-relaxed ${!notification.read ? 'text-ink-600' : 'text-ink-400 line-through decoration-stone-300'}`}>
                                         {notification.message}
                                       </p>
                                    </div>
                                 </div>
                                 {/* Delete Button (appears on hover) */}
                                 <button 
                                   onClick={(e) => deleteNotification(notification.id, e)}
                                   className="absolute right-2 bottom-2 p-1.5 text-stone-300 hover:text-morandi-rose hover:bg-morandi-roseLight rounded-full opacity-0 group-hover:opacity-100 transition-all"
                                   title="刪除"
                                 >
                                    <Trash2 size={14} />
                                 </button>
                              </div>
                            ))}
                         </div>
                       )}
                    </div>
                 </div>
               )}
             </div>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div id="main-scroll-container" className="flex-1 overflow-y-auto p-4 md:p-10 scroll-smooth">
          <div className="max-w-6xl mx-auto h-full pb-20 md:pb-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-morandi-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-ink-400">載入資料中...</p>
                </div>
              </div>
            ) : (
              <Routes>
                <Route path="/" element={<Dashboard assets={assets} isPrivacyMode={isPrivacyMode} />} />
                <Route path="/portfolio" element={<Portfolio assets={assets} isPrivacyMode={isPrivacyMode} />} />
                <Route path="/ledger" element={<Ledger isPrivacyMode={isPrivacyMode} transactions={transactions} />} />
                <Route path="/strategy" element={<StrategyLab />} />
                <Route path="/linebot" element={<LineBotData />} />
              </Routes>
            )}
          </div>
        </div>

        {/* Floating Action Button (Mobile) - 只在非記帳頁面顯示 */}
        {location.pathname !== '/ledger' && (
          <div className="md:hidden fixed bottom-24 right-4 z-40">
            <button
              onClick={() => navigate('/ledger')}
              className="w-14 h-14 bg-morandi-blue rounded-full shadow-soft flex items-center justify-center text-white active:scale-95 transition-transform border-4 border-paper"
            >
              <Plus size={24} />
            </button>
          </div>
        )}

        {/* Bottom Nav (Mobile) */}
        <nav className="md:hidden bg-white border-t border-stone-200 h-20 fixed bottom-0 left-0 right-0 z-30 flex justify-around items-center px-4 pb-2 shadow-[0_-5px_15px_rgba(0,0,0,0.02)]">
          <NavLink to="/" className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full gap-1 ${isActive ? 'text-morandi-blue' : 'text-ink-300'}`}>
            {({ isActive }) => (
              <>
                <LayoutDashboard size={22} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-medium font-serif">概覽</span>
              </>
            )}
          </NavLink>
          <NavLink to="/portfolio" className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full gap-1 ${isActive ? 'text-morandi-blue' : 'text-ink-300'}`}>
            {({ isActive }) => (
              <>
                <PieChart size={22} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-medium font-serif">資產</span>
              </>
            )}
          </NavLink>
          <NavLink to="/ledger" className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full gap-1 ${isActive ? 'text-morandi-blue' : 'text-ink-300'}`}>
            {({ isActive }) => (
              <>
                <ReceiptText size={22} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-medium font-serif">手帳</span>
              </>
            )}
          </NavLink>
          <NavLink to="/strategy" className={({ isActive }) => `flex flex-col items-center justify-center w-full h-full gap-1 ${isActive ? 'text-morandi-blue' : 'text-ink-300'}`}>
            {({ isActive }) => (
              <>
                <FlaskConical size={22} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-medium font-serif">策略</span>
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
      <LiffProvider>
        <AppContent />
      </LiffProvider>
    </HashRouter>
  );
};

export default App;