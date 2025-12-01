/**
 * Authentication Middleware
 * 驗證 JWT Token 並附加用戶資訊到 Request
 */

import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../services/authService.js';

// 擴展 Express Request 類型
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * JWT Token 驗證中間件
 * 從 Authorization Header 提取並驗證 Token
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  try {
    // 從 Header 提取 Token
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: No token provided'
      });
    }

    // 驗證 Token
    const payload = verifyToken(token);

    if (!payload) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Invalid or expired token'
      });
    }

    // 確保是 Access Token（不是 Refresh Token）
    if (payload.type !== 'access') {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Invalid token type'
      });
    }

    // 附加用戶資訊到 Request
    req.user = payload;

    next();
  } catch (error) {
    console.error('❌ Auth Middleware Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during authentication'
    });
  }
}

/**
 * 可選的 Token 驗證中間件
 * 如果有 Token 則驗證，沒有則跳過
 */
export function optionalAuthenticateToken(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : null;

    if (token) {
      const payload = verifyToken(token);
      if (payload && payload.type === 'access') {
        req.user = payload;
      }
    }

    next();
  } catch (error) {
    console.error('❌ Optional Auth Middleware Error:', error);
    next();
  }
}

/**
 * 檢查用戶權限（資源擁有者驗證）
 * 用於保護需要擁有者權限的端點
 */
export function requireOwnership(resourceUserIdGetter: (req: Request) => string) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized: Authentication required'
        });
      }

      const resourceUserId = resourceUserIdGetter(req);

      if (req.user.lineUserId !== resourceUserId) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: You do not have permission to access this resource'
        });
      }

      next();
    } catch (error) {
      console.error('❌ Ownership Check Error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error during permission check'
      });
    }
  };
}
