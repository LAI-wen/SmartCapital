import React, { createContext, useContext, useEffect, useState } from 'react';
import liff from '@line/liff';

interface LiffContextType {
  isLoggedIn: boolean;
  isLiffReady: boolean;
  lineUserId: string | null;
  displayName: string | null;
  pictureUrl: string | null;
  error: string | null;
}

const LiffContext = createContext<LiffContextType>({
  isLoggedIn: false,
  isLiffReady: false,
  lineUserId: null,
  displayName: null,
  pictureUrl: null,
  error: null,
});

export const useLiff = () => useContext(LiffContext);

interface LiffProviderProps {
  children: React.ReactNode;
}

export const LiffProvider: React.FC<LiffProviderProps> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLiffReady, setIsLiffReady] = useState(false);
  const [lineUserId, setLineUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [pictureUrl, setPictureUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeLiff = async () => {
      const liffId = import.meta.env.VITE_LIFF_ID;

      // 如果沒有 LIFF ID，則跳過 LIFF 初始化（本地開發模式）
      if (!liffId) {
        console.log('🔧 No LIFF_ID found, running in development mode');
        setIsLiffReady(true);
        
        // 檢查 localStorage 中的 userId
        const storedUserId = localStorage.getItem('lineUserId');
        if (storedUserId) {
          console.log('✅ 從 localStorage 載入 userId:', storedUserId);
          setLineUserId(storedUserId);
          setIsLoggedIn(true);
          return;
        }
        
        // 檢查 URL 參數中的 userId（開發模式）
        const params = new URLSearchParams(window.location.search);
        const userIdFromUrl = params.get('userId');
        if (userIdFromUrl) {
          console.log('✅ 從 URL 載入 userId:', userIdFromUrl);
          setLineUserId(userIdFromUrl);
          setIsLoggedIn(true);
          localStorage.setItem('lineUserId', userIdFromUrl);
          return;
        }
        
        // 如果都沒有，使用 Mock ID（本地測試）
        const mockUserId = 'Ucb528757211bf9eef17f7f0a391dd56e';
        console.log('⚠️ 使用 Mock User ID:', mockUserId);
        setLineUserId(mockUserId);
        setIsLoggedIn(true);
        localStorage.setItem('lineUserId', mockUserId);
        return;
      }

      try {
        await liff.init({ liffId });
        setIsLiffReady(true);

        if (!liff.isLoggedIn()) {
          // 如果未登入，執行 LINE 登入
          liff.login();
          return;
        }

        // ✅ 已登入，從 LIFF 獲取最新的用戶資料（不信任 localStorage）
        const profile = await liff.getProfile();

        console.log('🔍 LIFF 登入資訊:', {
          userId: profile.userId,
          displayName: profile.displayName,
          pictureUrl: profile.pictureUrl,
          statusMessage: profile.statusMessage
        });

        // 🔍 檢查是否與 localStorage 中的用戶不同
        const storedUserId = localStorage.getItem('lineUserId');
        const storedDisplayName = localStorage.getItem('displayName');

        console.log('📦 localStorage 資訊:', {
          storedUserId,
          storedDisplayName,
          isSameUser: storedUserId === profile.userId
        });

        if (storedUserId && storedUserId !== profile.userId) {
          console.warn('⚠️ 檢測到不同用戶登入！');
          console.warn('   舊用戶:', storedUserId, storedDisplayName);
          console.warn('   新用戶:', profile.userId, profile.displayName);
          console.warn('   🧹 清除舊用戶的所有資料...');
          // 清除舊用戶的所有資料
          localStorage.clear();
        }

        setLineUserId(profile.userId);
        setDisplayName(profile.displayName);
        setPictureUrl(profile.pictureUrl || null);
        setIsLoggedIn(true);

        // 儲存到 localStorage 供 API 使用
        localStorage.setItem('lineUserId', profile.userId);
        localStorage.setItem('displayName', profile.displayName);

        console.log('✅ LIFF 初始化成功 - 當前用戶:', {
          userId: profile.userId,
          displayName: profile.displayName,
        });
      } catch (err) {
        console.error('❌ LIFF 初始化失敗', err);
        setError(err instanceof Error ? err.message : 'LIFF 初始化失敗');
        setIsLiffReady(true);
      }
    };

    initializeLiff();
  }, []);

  return (
    <LiffContext.Provider
      value={{
        isLoggedIn,
        isLiffReady,
        lineUserId,
        displayName,
        pictureUrl,
        error,
      }}
    >
      {children}
    </LiffContext.Provider>
  );
};
