
import React, { useState, useEffect } from 'react';
import {
  ChevronRight, Globe, Lock, Bell,
  LogOut, ShieldCheck
} from 'lucide-react';
import { InvestmentScope } from '../types';
import { useTranslation } from 'react-i18next';
import { updateInvestmentScope } from '../services/api';

interface SettingsPageProps {
  isPrivacyMode: boolean;
  togglePrivacy: () => void;
  investmentScope: InvestmentScope;
  setInvestmentScope: (scope: InvestmentScope) => void;
  onLogout: () => void;
  authMode: 'guest' | 'authenticated';
  displayName: string;
}

const SettingsPage: React.FC<SettingsPageProps> = ({
  isPrivacyMode,
  togglePrivacy,
  investmentScope,
  setInvestmentScope,
  onLogout,
  authMode,
}) => {
  const { t, i18n } = useTranslation();
  const [language, setLanguage] = useState(i18n.language || 'zh-TW');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // 語言切換處理
  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    i18n.changeLanguage(newLang);
    localStorage.setItem('language', newLang);
  };

  // 同步 i18n 語言到 state
  useEffect(() => {
    setLanguage(i18n.language);
  }, [i18n.language]);

  const toggleScope = async (key: keyof InvestmentScope) => {
    const newScope = {
      ...investmentScope,
      [key]: !investmentScope[key]
    };

    // 立即更新 UI
    setInvestmentScope(newScope);

    // 保存到後端
    try {
      await updateInvestmentScope(newScope.tw, newScope.us, newScope.crypto);
    } catch (error) {
      console.error('❌ 保存投資範圍設定失敗:', error);
      // 如果失敗，回復原狀態
      setInvestmentScope(investmentScope);
    }
  };

  const SettingSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className="mb-6">
       <h3 className="text-xs font-serif font-bold text-ink-400 uppercase tracking-widest mb-3 ml-1">{title}</h3>
       <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
         {children}
       </div>
    </div>
  );

  const SettingItem = ({
    icon: Icon, label, value, onClick, isToggle = false, toggleValue = false, onToggle
  }: { icon: React.ElementType; label: string; value?: string; onClick?: () => void; isToggle?: boolean; toggleValue?: boolean; onToggle?: () => void }) => (
    <div 
      onClick={!isToggle ? onClick : undefined}
      className="flex items-center justify-between p-4 border-b border-stone-50 last:border-0 cursor-pointer hover:bg-stone-50 transition-colors"
    >
       <div className="flex items-center gap-3">
          <div className="text-ink-400"><Icon size={20} /></div>
          <span className="text-sm font-bold text-ink-900 font-serif">{label}</span>
       </div>
       
       {isToggle ? (
         <div 
           onClick={(e) => { e.stopPropagation(); if (onToggle) onToggle(); }}
           className={`w-11 h-6 rounded-full relative transition-colors duration-200 ${toggleValue ? 'bg-morandi-blue' : 'bg-stone-200'}`}
         >
           <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${toggleValue ? 'left-6' : 'left-1'}`}></div>
         </div>
       ) : (
         <div className="flex items-center gap-2">
            {value && <span className="text-xs text-ink-400 font-serif">{value}</span>}
            <ChevronRight size={16} className="text-stone-300" />
         </div>
       )}
    </div>
  );

  return (
    <div className="animate-fade-in pb-20">
      
      {/* Onboarding / Market Scope Settings */}
      <div className="mb-6">
        <h3 className="text-xs font-serif font-bold text-ink-400 uppercase tracking-widest mb-3 ml-1">投資市場設定 (Onboarding)</h3>
        <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm">
           <p className="text-xs text-ink-400 font-serif mb-4">選擇您關注的市場，我們會為您客製化儀表板。</p>
           <div className="space-y-3">
              <div onClick={() => toggleScope('tw')} className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-100 cursor-pointer">
                 <div className="flex items-center gap-3">
                    <span className="text-lg">🇹🇼</span>
                    <span className="font-bold text-ink-900 font-serif">台股市場</span>
                 </div>
                 <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${investmentScope.tw ? 'bg-morandi-sage border-morandi-sage' : 'border-stone-300'}`}>
                    {investmentScope.tw && <div className="w-2 h-2 bg-white rounded-full"></div>}
                 </div>
              </div>
              <div onClick={() => toggleScope('us')} className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-100 cursor-pointer">
                 <div className="flex items-center gap-3">
                    <span className="text-lg">🇺🇸</span>
                    <span className="font-bold text-ink-900 font-serif">美股 / 海外</span>
                 </div>
                 <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${investmentScope.us ? 'bg-morandi-blue border-morandi-blue' : 'border-stone-300'}`}>
                    {investmentScope.us && <div className="w-2 h-2 bg-white rounded-full"></div>}
                 </div>
              </div>
              <div onClick={() => toggleScope('crypto')} className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-100 cursor-pointer">
                 <div className="flex items-center gap-3">
                    <span className="text-lg">₿</span>
                    <span className="font-bold text-ink-900 font-serif">加密貨幣</span>
                 </div>
                 <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${investmentScope.crypto ? 'bg-morandi-clay border-morandi-clay' : 'border-stone-300'}`}>
                    {investmentScope.crypto && <div className="w-2 h-2 bg-white rounded-full"></div>}
                 </div>
              </div>
           </div>
        </div>
      </div>

      <SettingSection title={t('settings.language')}>
         <SettingItem
           icon={Globe}
           label={t('settings.language')}
           value={language === 'zh-TW' ? '繁體中文' : 'English'}
           onClick={() => handleLanguageChange(language === 'zh-TW' ? 'en-US' : 'zh-TW')}
         />
      </SettingSection>

      <SettingSection title="隱私與安全">
         <SettingItem 
           icon={Lock} 
           label="隱藏金額模式" 
           isToggle 
           toggleValue={isPrivacyMode}
           onToggle={togglePrivacy}
         />
         <SettingItem 
           icon={Bell} 
           label="推播通知" 
           isToggle 
           toggleValue={notificationsEnabled}
           onToggle={() => setNotificationsEnabled(!notificationsEnabled)}
         />
      </SettingSection>

      <SettingSection title="帳戶">
         <SettingItem 
           icon={ShieldCheck} 
           label="資料備份" 
           value="已開啟 (每日)" 
           onClick={() => {}}
         />
         <SettingItem
           icon={LogOut}
           label={authMode === 'guest' ? '退出訪客模式' : '登出帳號'}
           onClick={() => {
             if (confirm(authMode === 'guest' ? '確定要退出訪客模式？' : '確定要登出嗎？')) {
               onLogout();
             }
           }}
         />
      </SettingSection>

    </div>
  );
};

export default SettingsPage;
