/**
 * HTTP Client - 統一的 API 請求封裝
 * 提供錯誤處理、日誌記錄等共用功能
 */

// API 基礎 URL
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// API 回應介面
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * 通用的 GET 請求封裝
 */
export async function get<T>(endpoint: string): Promise<T | null> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`);
    const result: ApiResponse<T> = await response.json();
    return result.success ? (result.data ?? null) : null;
  } catch (error) {
    console.error(`GET ${endpoint} failed:`, error);
    return null;
  }
}

/**
 * 通用的 POST 請求封裝
 */
export async function post<T>(endpoint: string, body: unknown): Promise<T | null> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const result: ApiResponse<T> = await response.json();
    return result.success ? (result.data ?? null) : null;
  } catch (error) {
    console.error(`POST ${endpoint} failed:`, error);
    return null;
  }
}

/**
 * 通用的 PATCH 請求封裝
 */
export async function patch<T>(endpoint: string, body: unknown): Promise<T | null> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const result: ApiResponse<T> = await response.json();
    return result.success ? (result.data ?? null) : null;
  } catch (error) {
    console.error(`PATCH ${endpoint} failed:`, error);
    return null;
  }
}

/**
 * 通用的 DELETE 請求封裝
 */
export async function del(endpoint: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
    });
    const result: ApiResponse<void> = await response.json();
    return result.success;
  } catch (error) {
    console.error(`DELETE ${endpoint} failed:`, error);
    return false;
  }
}

/**
 * 帶有特定返回值的 POST 請求（用於返回布林值的操作）
 */
export async function postBoolean(endpoint: string, body?: unknown): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const result: ApiResponse<unknown> = await response.json();
    return result.success;
  } catch (error) {
    console.error(`POST ${endpoint} failed:`, error);
    return false;
  }
}
