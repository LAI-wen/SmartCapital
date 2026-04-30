import React, { createContext, useContext, useEffect, useState } from 'react';
import { lineLogin, guestLogin, startAutoRefresh } from '../services/auth.service';
import { ensureGuestUserId, getStoredUserId } from '../services/user.service';

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
    let isMounted = true;
    let refreshInterval: ReturnType<typeof setInterval> | null = null;
    const guestDisplayName = '訪客用戶';

    const storeIdentity = (userId: string, name: string, authMode: 'guest' | 'authenticated') => {
      localStorage.setItem('lineUserId', userId);
      localStorage.setItem('displayName', name);
      localStorage.setItem('authMode', authMode);
    };

    const applyIdentity = (
      userId: string,
      name: string,
      authMode: 'guest' | 'authenticated',
      nextPictureUrl: string | null = null
    ) => {
      if (!isMounted) return;
      setLineUserId(userId);
      setDisplayName(name);
      setPictureUrl(nextPictureUrl);
      setIsLoggedIn(true);
      setError(null);
      storeIdentity(userId, name, authMode);
    };

    const restartAutoRefresh = () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
      refreshInterval = startAutoRefresh();
    };

    const initializeGuestSession = async (userId: string, name: string) => {
      const authResult = await guestLogin(userId, name);
      if (authResult) {
        applyIdentity(authResult.user.lineUserId, authResult.user.displayName, 'guest');
        restartAutoRefresh();
        return true;
      }

      console.error('❌ 訪客登入失敗');
      if (isMounted) {
        setIsLoggedIn(false);
        setLineUserId(null);
        setDisplayName(null);
        setPictureUrl(null);
        setError('訪客模式初始化失敗，請稍後再試');
      }
      return false;
    };

    const initializeLiff = async () => {
      const liffId = import.meta.env.VITE_LIFF_ID;

      // 如果沒有 LIFF ID，則跳過 LIFF 初始化（訪客模式）
      if (!liffId) {
        const guestUserId = getStoredUserId() ?? ensureGuestUserId();
        const guestName = localStorage.getItem('displayName') || guestDisplayName;
        await initializeGuestSession(guestUserId, guestName);
        if (isMounted) {
          setIsLiffReady(true);
        }
        return;
      }

      try {
        const { default: liff } = await import('@line/liff');

        await liff.init({ liffId });

        if (!liff.isLoggedIn()) {
          // 如果未登入，執行 LINE 登入
          liff.login();
          return;
        }

        // ✅ 已登入，從 LIFF 獲取最新的用戶資料
        const profile = await liff.getProfile();
        const idToken = liff.getIDToken(); // 🔑 取得 ID Token

        // 🔍 檢查是否與 localStorage 中的用戶不同
        const storedUserId = localStorage.getItem('lineUserId');

        if (storedUserId && storedUserId !== profile.userId) {
          console.warn('⚠️ 檢測到不同用戶登入，清除舊資料...');
          localStorage.clear();
        }

        // 🔐 使用 LINE ID Token 向後端登入並獲取 JWT
        if (idToken) {
          const authResult = await lineLogin(
            idToken,
            profile.userId,
            profile.displayName,
            profile.pictureUrl || undefined
          );

          if (authResult) {
            if (!isMounted) {
              return;
            }

            // 登入成功，設置用戶資訊
            applyIdentity(
              authResult.user.lineUserId,
              authResult.user.displayName,
              'authenticated',
              authResult.user.pictureUrl || null
            );

            // 啟動自動 Token 刷新
            restartAutoRefresh();
          } else {
            console.error('❌ 後端登入失敗');
            if (isMounted) {
              setIsLoggedIn(false);
              setLineUserId(null);
              setDisplayName(null);
              setPictureUrl(null);
              setError('後端認證失敗，請重試');
            }
          }
        } else {
          // ID Token 取得失敗 — 安全失敗，不降級為訪客
          // 真正的 LINE 用戶不應透過 guest path 取得 JWT
          console.error('❌ 無法取得 LINE ID Token（請確認 LIFF Scopes 包含 openid）');
          if (isMounted) {
            setIsLoggedIn(false);
            setLineUserId(null);
            setDisplayName(null);
            setPictureUrl(null);
            setError('無法完成 LINE 身份驗證，請重新開啟應用程式或確認 LIFF 設定');
          }
        }
      } catch (err) {
        console.error('❌ LIFF 初始化失敗', err);
        if (isMounted) {
          setIsLoggedIn(false);
          setLineUserId(null);
          setDisplayName(null);
          setPictureUrl(null);
          setError(err instanceof Error ? err.message : 'LIFF 初始化失敗');
        }
      } finally {
        if (isMounted) {
          setIsLiffReady(true);
        }
      }
    };

    initializeLiff();

    return () => {
      isMounted = false;
      if (refreshInterval) clearInterval(refreshInterval);
    };
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
