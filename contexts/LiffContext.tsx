import React, { createContext, useContext, useEffect, useState } from 'react';
import liff from '@line/liff';
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
    const initializeLiff = async () => {
      const liffId = import.meta.env.VITE_LIFF_ID;

      // 如果沒有 LIFF ID，則跳過 LIFF 初始化（訪客模式）
      if (!liffId) {
        console.log('🔧 No LIFF_ID found, running in guest mode');
        setIsLiffReady(true);

        // 檢查 localStorage 中的 userId
        const storedUserId = localStorage.getItem('lineUserId');
        if (storedUserId) {
          console.log('✅ 從 localStorage 載入 userId:', storedUserId);
          setLineUserId(storedUserId);
          setDisplayName(localStorage.getItem('displayName') || '訪客用戶');
          setIsLoggedIn(true);

          // 🔐 使用已存在的訪客 ID 向後端登入並獲取 JWT
          guestLogin(storedUserId, localStorage.getItem('displayName') || '訪客用戶').then((authResult) => {
            if (authResult) {
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
          if (authResult) {
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
        await liff.init({ liffId });
        setIsLiffReady(true);

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
          // ⚠️ 無法取得 ID Token（LIFF scope 設定問題）
          // 使用降級方案：直接用 LINE User ID 進行訪客登入
          console.warn('⚠️ 無法取得 LINE ID Token，使用降級方案（訪客模式）');
          console.warn('💡 請檢查 LIFF App 設定中的 Scopes 是否包含 "openid"');

          const authResult = await guestLogin(profile.userId, profile.displayName);

          if (authResult) {
            setLineUserId(authResult.user.lineUserId);
            setDisplayName(authResult.user.displayName);
            setPictureUrl(profile.pictureUrl || null);
            setIsLoggedIn(true);

            localStorage.setItem('lineUserId', authResult.user.lineUserId);
            localStorage.setItem('displayName', authResult.user.displayName);

            startAutoRefresh();

            console.log('✅ 降級登入成功（訪客模式），JWT Token 已獲取');
          } else {
            console.error('❌ 降級登入失敗');
            setError('登入失敗，請重試');
          }
        }
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
