/**
 * HTTP Client - 統一的 API 請求封裝
 * 提供錯誤處理、日誌記錄、JWT Token 自動附加等共用功能
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
 * 取得 Authorization Headers
 * 自動從 localStorage 讀取 Token 並附加到請求
 */
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('smartcapital_access_token');

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * 通用的 GET 請求封裝
 */
export async function get<T>(endpoint: string): Promise<T | null> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: getAuthHeaders(),
    });
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
      headers: getAuthHeaders(),
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
      headers: getAuthHeaders(),
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
      headers: getAuthHeaders(),
    });
    const result: ApiResponse<void> = await response.json();
    return result.success;
  } catch (error) {
    console.error(`DELETE ${endpoint} failed:`, error);
    return false;
  }
}

/**
 * DELETE 請求封裝（帶 query parameter）
 * 用於需要在 URL 中傳遞參數的 DELETE 請求
 */
export async function delWithQuery(endpoint: string, params: Record<string, string>): Promise<boolean> {
  try {
    const queryString = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}${endpoint}?${queryString}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: getAuthHeaders(),
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
      headers: getAuthHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    const result: ApiResponse<unknown> = await response.json();
    return result.success;
  } catch (error) {
    console.error(`POST ${endpoint} failed:`, error);
    return false;
  }
}
