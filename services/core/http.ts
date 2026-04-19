// API 基礎 URL
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// Token 過期時清除所有 auth 狀態並重新載入
// 不 import auth.service 以避免循環依賴
function handleAuthExpired(): void {
  [
    'smartcapital_access_token',
    'smartcapital_refresh_token',
    'smartcapital_token_expiry',
    'authMode',
    'lineUserId',
    'displayName',
  ].forEach(key => localStorage.removeItem(key));
  window.location.reload();
}

function assertOk(response: Response, endpoint: string): void {
  if (response.status === 401) {
    handleAuthExpired();
    throw new ApiError(401, `Unauthorized: ${endpoint}`);
  }
  if (!response.ok) {
    throw new ApiError(response.status, `${response.status} ${response.statusText}: ${endpoint}`);
  }
}

// API 回應介面
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('smartcapital_access_token');
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export async function get<T>(endpoint: string): Promise<T | null> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: getAuthHeaders(),
  });
  assertOk(response, endpoint);
  const result: ApiResponse<T> = await response.json();
  return result.success ? (result.data ?? null) : null;
}

export async function post<T>(endpoint: string, body: unknown): Promise<T | null> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  assertOk(response, endpoint);
  const result: ApiResponse<T> = await response.json();
  return result.success ? (result.data ?? null) : null;
}

export async function patch<T>(endpoint: string, body: unknown): Promise<T | null> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  assertOk(response, endpoint);
  const result: ApiResponse<T> = await response.json();
  return result.success ? (result.data ?? null) : null;
}

export async function put<T>(endpoint: string, body: unknown): Promise<T | null> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  assertOk(response, endpoint);
  const result: ApiResponse<T> = await response.json();
  return result.success ? (result.data ?? null) : null;
}

export async function del(endpoint: string): Promise<boolean> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  assertOk(response, endpoint);
  const result: ApiResponse<void> = await response.json();
  return result.success;
}

export async function delWithQuery(endpoint: string, params: Record<string, string>): Promise<boolean> {
  const queryString = new URLSearchParams(params).toString();
  const response = await fetch(`${API_BASE_URL}${endpoint}?${queryString}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  assertOk(response, endpoint);
  const result: ApiResponse<void> = await response.json();
  return result.success;
}

export async function postBoolean(endpoint: string, body?: unknown): Promise<boolean> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  assertOk(response, endpoint);
  const result: ApiResponse<unknown> = await response.json();
  return result.success;
}
