/**
 * Authentication Service - 前端認證服務
 * 處理 Token 管理、LINE 登入、訪客登入
 */

import { post, get } from './core/http';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface User {
  lineUserId: string;
  displayName: string;
  pictureUrl?: string;
  bankroll: number;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// Token 儲存 Key
const ACCESS_TOKEN_KEY = 'smartcapital_access_token';
const REFRESH_TOKEN_KEY = 'smartcapital_refresh_token';
const TOKEN_EXPIRY_KEY = 'smartcapital_token_expiry';

/**
 * LINE 登入
 * @param idToken - LINE LIFF ID Token
 * @param lineUserId - LINE User ID
 * @param displayName - 用戶顯示名稱
 * @param pictureUrl - 用戶頭像 URL
 */
export async function lineLogin(
  idToken: string,
  lineUserId: string,
  displayName: string,
  pictureUrl?: string
): Promise<LoginResponse | null> {
  try {
    const response = await post<LoginResponse>('/api/auth/line-login', {
      idToken,
      lineUserId,
      displayName,
      pictureUrl
    });

    if (response) {
      saveTokens(response.accessToken, response.refreshToken, response.expiresIn);
      console.log('✅ LINE 登入成功:', lineUserId);
    }

    return response;
  } catch (error) {
    console.error('❌ LINE 登入失敗:', error);
    return null;
  }
}

/**
 * 訪客登入
 * @param mockUserId - Mock User ID
 * @param displayName - 顯示名稱
 */
export async function guestLogin(
  mockUserId: string,
  displayName?: string
): Promise<LoginResponse | null> {
  try {
    const response = await post<LoginResponse>('/api/auth/guest-login', {
      mockUserId,
      displayName: displayName || '訪客用戶'
    });

    if (response) {
      saveTokens(response.accessToken, response.refreshToken, response.expiresIn);
      console.log('✅ 訪客登入成功:', mockUserId);
    }

    return response;
  } catch (error) {
    console.error('❌ 訪客登入失敗:', error);
    return null;
  }
}

/**
 * 刷新 Access Token
 */
export async function refreshAccessToken(): Promise<boolean> {
  try {
    const refreshToken = getRefreshToken();

    if (!refreshToken) {
      console.log('⚠️ 無 Refresh Token');
      return false;
    }

    const response = await post<{ accessToken: string; expiresIn: number }>(
      '/api/auth/refresh',
      { refreshToken }
    );

    if (response) {
      // 只更新 Access Token，保留 Refresh Token
      localStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken);
      const expiryTime = Date.now() + response.expiresIn * 1000;
      localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
      console.log('✅ Token 刷新成功');
      return true;
    }

    return false;
  } catch (error) {
    console.error('❌ Token 刷新失敗:', error);
    return false;
  }
}

/**
 * 驗證當前 Token 是否有效
 */
export async function verifyToken(): Promise<boolean> {
  try {
    const token = getAccessToken();

    if (!token) {
      return false;
    }

    const response = await get<{ valid: boolean }>('/api/auth/verify');
    return response?.valid || false;
  } catch (error) {
    console.error('❌ Token 驗證失敗:', error);
    return false;
  }
}

/**
 * 登出
 */
export async function logout(): Promise<void> {
  try {
    await post('/api/auth/logout', {});
    clearTokens();
    console.log('✅ 登出成功');
  } catch (error) {
    console.error('❌ 登出失敗:', error);
    // 即使後端失敗也清除本地 Token
    clearTokens();
  }
}

/**
 * 儲存 Token 到 localStorage
 */
function saveTokens(accessToken: string, refreshToken: string, expiresIn: number): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);

  // 計算過期時間（當前時間 + expiresIn 秒）
  const expiryTime = Date.now() + expiresIn * 1000;
  localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
}

/**
 * 清除所有 Token
 */
export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
}

/**
 * 取得 Access Token
 */
export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

/**
 * 取得 Refresh Token
 */
export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * 檢查 Token 是否過期
 */
export function isTokenExpired(): boolean {
  const expiryTime = localStorage.getItem(TOKEN_EXPIRY_KEY);

  if (!expiryTime) {
    return true;
  }

  return Date.now() > parseInt(expiryTime, 10);
}

/**
 * 檢查是否已登入（有有效 Token）
 */
export function isAuthenticated(): boolean {
  const token = getAccessToken();
  return token !== null && !isTokenExpired();
}

/**
 * 自動刷新 Token（如果快過期）
 * 在 Token 過期前 5 分鐘自動刷新
 */
export async function autoRefreshToken(): Promise<void> {
  const expiryTime = localStorage.getItem(TOKEN_EXPIRY_KEY);

  if (!expiryTime) {
    return;
  }

  const timeUntilExpiry = parseInt(expiryTime, 10) - Date.now();
  const fiveMinutes = 5 * 60 * 1000;

  // 如果在過期前 5 分鐘內，自動刷新
  if (timeUntilExpiry < fiveMinutes && timeUntilExpiry > 0) {
    console.log('⏰ Token 即將過期，自動刷新...');
    await refreshAccessToken();
  }
}

/**
 * 初始化自動 Token 刷新
 * 每分鐘檢查一次
 */
export function startAutoRefresh(): void {
  // 立即檢查一次
  autoRefreshToken();

  // 每分鐘檢查一次
  setInterval(() => {
    autoRefreshToken();
  }, 60 * 1000); // 1 分鐘
}
