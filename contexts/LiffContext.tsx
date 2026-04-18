import React, { createContext, useContext, useEffect, useState } from 'react';
import { lineLogin, guestLogin, startAutoRefresh } from '../services/auth.service';

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

    const initializeLiff = async () => {
      const liffId = import.meta.env.VITE_LIFF_ID;

      // 如果沒有 LIFF ID，則跳過 LIFF 初始化（訪客模式）
      if (!liffId) {
        console.log('🔧 No LIFF_ID found, running in guest mode');
        if (isMounted) {
          setIsLiffReady(true);
        }

        // 檢查 localStorage 中的 userId
        const storedUserId = localStorage.getItem('lineUserId');
        if (storedUserId) {
          console.log('✅ 從 localStorage 載入 userId:', storedUserId);
          if (isMounted) {
            setLineUserId(storedUserId);
            setDisplayName(localStorage.getItem('displayName') || '訪客用戶');
            setIsLoggedIn(true);
          }

          // 🔐 使用已存在的訪客 ID 向後端登入並獲取 JWT
          guestLogin(storedUserId, localStorage.getItem('displayName') || '訪客用戶').then((authResult) => {
            if (authResult && isMounted) {
              console.log('✅ 訪客 Token 已獲取');
              startAutoRefresh();
            }
          });
          return;
        }

        // 生成新的訪客 Mock ID
        const generateMockUserId = () => {
          const randomHex = Array.from({ length: 32 }, () =>
            Math.floor(Math.random() * 16).toString(16)
          ).join('');
          return `U${randomHex}`;
        };

        const mockUserId = generateMockUserId();
        console.log('🆕 生成新的訪客 ID:', mockUserId);

        // 🔐 向後端註冊並獲取 JWT Token
        guestLogin(mockUserId, '訪客用戶').then((authResult) => {
          if (authResult && isMounted) {
            setLineUserId(authResult.user.lineUserId);
            setDisplayName(authResult.user.displayName);
            setIsLoggedIn(true);
            localStorage.setItem('lineUserId', authResult.user.lineUserId);
            localStorage.setItem('displayName', authResult.user.displayName);

            // 啟動自動 Token 刷新
            startAutoRefresh();

            console.log('✅ 訪客登入成功，JWT Token 已獲取');
          } else {
            console.error('❌ 訪客登入失敗');
          }
        });
        return;
      }

      try {
        const { default: liff } = await import('@line/liff');

        await liff.init({ liffId });
        if (isMounted) {
          setIsLiffReady(true);
        }

        if (!liff.isLoggedIn()) {
          // 如果未登入，執行 LINE 登入
          liff.login();
          return;
        }

        // ✅ 已登入，從 LIFF 獲取最新的用戶資料
        const profile = await liff.getProfile();
        const idToken = liff.getIDToken(); // 🔑 取得 ID Token

        console.log('🔍 LIFF 登入資訊:', {
          userId: profile.userId,
          displayName: profile.displayName,
          pictureUrl: profile.pictureUrl,
          hasIdToken: !!idToken
        });

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
            setLineUserId(authResult.user.lineUserId);
            setDisplayName(authResult.user.displayName);
            setPictureUrl(authResult.user.pictureUrl || null);
            setIsLoggedIn(true);

            // 儲存到 localStorage
            localStorage.setItem('lineUserId', authResult.user.lineUserId);
            localStorage.setItem('displayName', authResult.user.displayName);

            // 啟動自動 Token 刷新
            startAutoRefresh();

            console.log('✅ LINE 登入成功，JWT Token 已獲取');
          } else {
            console.error('❌ 後端登入失敗');
            setError('後端認證失敗，請重試');
          }
        } else {
          // ID Token 取得失敗 — 安全失敗，不降級為訪客
          // 真正的 LINE 用戶不應透過 guest path 取得 JWT
          console.error('❌ 無法取得 LINE ID Token（請確認 LIFF Scopes 包含 openid）');
          if (isMounted) {
            setError('無法完成 LINE 身份驗證，請重新開啟應用程式或確認 LIFF 設定');
            setIsLiffReady(true);
          }
        }
      } catch (err) {
        console.error('❌ LIFF 初始化失敗', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'LIFF 初始化失敗');
          setIsLiffReady(true);
        }
      }
    };

    initializeLiff();

    return () => {
      isMounted = false;
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
