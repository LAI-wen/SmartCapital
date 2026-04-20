/**
 * Authentication Controller
 * 處理登入、Token 刷新等認證相關端點
 */

import { Request, Response } from 'express';
import {
  verifyLineIdToken,
  generateAuthTokens,
  generateGuestTokens,
  refreshAccessToken,
  verifyToken
} from '../services/authService.js';
import { prisma } from '../services/databaseService.js';

/**
 * LINE 登入端點
 * 接收 LINE ID Token，驗證後返回 JWT
 */
export async function lineLogin(req: Request, res: Response) {
  try {
    const { idToken, lineUserId, displayName, pictureUrl } = req.body;

    // 驗證 LINE ID Token
    const verified = await verifyLineIdToken(idToken);

    if (!verified) {
      return res.status(401).json({
        success: false,
        error: 'Invalid LINE ID Token'
      });
    }

    // 確認 LINE User ID 一致
    if (verified.userId !== lineUserId) {
      return res.status(401).json({
        success: false,
        error: 'LINE User ID mismatch'
      });
    }

    // 確保用戶存在於資料庫
    let user = await prisma.user.findUnique({
      where: { lineUserId }
    });

    if (!user) {
      // 創建新用戶
      user = await prisma.user.create({
        data: {
          lineUserId,
          displayName: displayName || verified.displayName,
          bankroll: 10000 // 預設初始資金
        }
      });
      console.log('🆕 創建新用戶:', lineUserId);
    } else {
      // 更新用戶資訊
      user = await prisma.user.update({
        where: { lineUserId },
        data: {
          displayName: displayName || verified.displayName
        }
      });
    }

    // 生成 JWT Token
    const tokens = generateAuthTokens(lineUserId, user.displayName || displayName);

    res.json({
      success: true,
      data: {
        user: {
          lineUserId: user.lineUserId,
          displayName: user.displayName || displayName,
          pictureUrl: pictureUrl || verified.pictureUrl, // 前端使用，不存資料庫
          bankroll: user.bankroll
        },
        ...tokens
      }
    });

    console.log('✅ LINE 登入成功:', lineUserId);
  } catch (error) {
    console.error('❌ LINE 登入失敗:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during LINE login'
    });
  }
}

/**
 * 訪客登入端點
 * 為訪客生成臨時 Token（無需 LINE 驗證）
 */
export async function guestLogin(req: Request, res: Response) {
  try {
    const { mockUserId, displayName } = req.body;

    // 確保訪客用戶存在於資料庫
    let user = await prisma.user.findUnique({
      where: { lineUserId: mockUserId }
    });

    if (!user) {
      // 創建新訪客用戶
      user = await prisma.user.create({
        data: {
          lineUserId: mockUserId,
          displayName: displayName || '訪客用戶',
          bankroll: 10000
        }
      });
      console.log('🆕 創建新訪客:', mockUserId);
    }

    // 生成訪客 Token
    const tokens = generateGuestTokens(mockUserId);

    res.json({
      success: true,
      data: {
        user: {
          lineUserId: user.lineUserId,
          displayName: user.displayName,
          bankroll: user.bankroll
        },
        ...tokens
      }
    });

    console.log('✅ 訪客登入成功:', mockUserId);
  } catch (error) {
    console.error('❌ 訪客登入失敗:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during guest login'
    });
  }
}

/**
 * Token 刷新端點
 * 使用 Refresh Token 獲取新的 Access Token
 */
export async function refreshToken(req: Request, res: Response) {
  try {
    const { refreshToken: token } = req.body;

    // 驗證 Refresh Token
    const payload = verifyToken(token);

    if (!payload || payload.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired refresh token'
      });
    }

    // 生成新的 Access Token
    const newAccessToken = refreshAccessToken(token);

    if (!newAccessToken) {
      return res.status(401).json({
        success: false,
        error: 'Failed to refresh access token'
      });
    }

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        expiresIn: 7 * 24 * 60 * 60 // 7 days
      }
    });

    console.log('✅ Token 刷新成功:', payload.lineUserId);
  } catch (error) {
    console.error('❌ Token 刷新失敗:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during token refresh'
    });
  }
}

/**
 * 驗證 Token 端點
 * 檢查當前 Token 是否有效
 */
export async function verifyTokenEndpoint(req: Request, res: Response) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }

    const payload = verifyToken(token);

    if (!payload) {
      return res.status(401).json({
        success: false,
        valid: false,
        error: 'Invalid or expired token'
      });
    }

    res.json({
      success: true,
      valid: true,
      data: {
        lineUserId: payload.lineUserId,
        displayName: payload.displayName,
        type: payload.type
      }
    });
  } catch (error) {
    console.error('❌ Token 驗證失敗:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during token verification'
    });
  }
}

/**
 * 登出端點
 * 目前為無狀態設計，客戶端刪除 Token 即可
 */
export async function logout(_req: Request, res: Response) {
  try {
    // 未來可以實現 Token 黑名單機制
    res.json({
      success: true,
      message: 'Logged out successfully. Please remove tokens from client.'
    });
  } catch (error) {
    console.error('❌ 登出失敗:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during logout'
    });
  }
}
