/**
 * Authentication Service
 * 處理 JWT Token 生成與 LINE ID Token 驗證
 */

import jwt from 'jsonwebtoken';
import axios from 'axios';

// JWT Secret - 生產環境應使用環境變數
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d'; // Token 有效期 7 天
const REFRESH_TOKEN_EXPIRES_IN = '30d'; // Refresh Token 有效期 30 天

// LINE ID Token 驗證端點
const LINE_TOKEN_VERIFY_URL = 'https://api.line.me/oauth2/v2.1/verify';

export interface JwtPayload {
  userId: string;
  lineUserId: string;
  displayName: string;
  type: 'access' | 'refresh';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * 驗證 LINE ID Token 的真實性
 * @param idToken - LINE LIFF 提供的 ID Token
 * @returns 驗證後的用戶資訊
 */
export async function verifyLineIdToken(idToken: string): Promise<{
  userId: string;
  displayName: string;
  pictureUrl?: string;
} | null> {
  try {
    // 方法 1: 使用 LINE 官方驗證 API
    const response = await axios.post(LINE_TOKEN_VERIFY_URL, null, {
      params: {
        id_token: idToken,
        client_id: process.env.LINE_CHANNEL_ID || ''
      }
    });

    if (response.data && response.data.sub) {
      return {
        userId: response.data.sub,
        displayName: response.data.name || 'LINE User',
        pictureUrl: response.data.picture
      };
    }

    return null;
  } catch (error) {
    console.error('❌ LINE ID Token 驗證失敗:', error);
    return null;
  }
}

/**
 * 生成 JWT Access Token
 * @param lineUserId - LINE User ID
 * @param displayName - 用戶顯示名稱
 * @returns JWT Token
 */
export function generateAccessToken(lineUserId: string, displayName: string): string {
  const payload: JwtPayload = {
    userId: lineUserId,
    lineUserId,
    displayName,
    type: 'access'
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'smartcapital-api',
    audience: 'smartcapital-client'
  });
}

/**
 * 生成 JWT Refresh Token
 * @param lineUserId - LINE User ID
 * @param displayName - 用戶顯示名稱
 * @returns Refresh Token
 */
export function generateRefreshToken(lineUserId: string, displayName: string): string {
  const payload: JwtPayload = {
    userId: lineUserId,
    lineUserId,
    displayName,
    type: 'refresh'
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    issuer: 'smartcapital-api',
    audience: 'smartcapital-client'
  });
}

/**
 * 生成完整的 Auth Token 組合
 * @param lineUserId - LINE User ID
 * @param displayName - 用戶顯示名稱
 * @returns Access Token + Refresh Token
 */
export function generateAuthTokens(lineUserId: string, displayName: string): AuthTokens {
  return {
    accessToken: generateAccessToken(lineUserId, displayName),
    refreshToken: generateRefreshToken(lineUserId, displayName),
    expiresIn: 7 * 24 * 60 * 60 // 7 days in seconds
  };
}

/**
 * 驗證 JWT Token
 * @param token - JWT Token
 * @returns 解析後的 Payload
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'smartcapital-api',
      audience: 'smartcapital-client'
    }) as JwtPayload;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.log('⏰ Token 已過期');
    } else if (error instanceof jwt.JsonWebTokenError) {
      console.log('❌ Token 無效');
    } else {
      console.error('❌ Token 驗證錯誤:', error);
    }
    return null;
  }
}

/**
 * 刷新 Access Token（使用 Refresh Token）
 * @param refreshToken - Refresh Token
 * @returns 新的 Access Token
 */
export function refreshAccessToken(refreshToken: string): string | null {
  try {
    const payload = verifyToken(refreshToken);

    if (!payload || payload.type !== 'refresh') {
      return null;
    }

    // 生成新的 Access Token
    return generateAccessToken(payload.lineUserId, payload.displayName);
  } catch (error) {
    console.error('❌ Token 刷新失敗:', error);
    return null;
  }
}

/**
 * 為訪客生成臨時 Token（無 LINE 驗證）
 * @param mockUserId - 訪客 Mock ID
 * @returns Auth Tokens
 */
export function generateGuestTokens(mockUserId: string): AuthTokens {
  return generateAuthTokens(mockUserId, '訪客用戶');
}
