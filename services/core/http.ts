// API 基礎 URL
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

type AuthExpiredListener = () => void;

const authExpiredListeners = new Set<AuthExpiredListener>();

export function subscribeToAuthExpired(listener: AuthExpiredListener): () => void {
  authExpiredListeners.add(listener);
  return () => {
    authExpiredListeners.delete(listener);
  };
}

function notifyAuthExpired(): void {
  authExpiredListeners.forEach(listener => {
    try {
      listener();
    } catch (error) {
      console.error('❌ Auth expired listener failed:', error);
    }
  });
}

async function handleAuthExpired(): Promise<void> {
  const { clearAuthState } = await import('../auth.service');
  clearAuthState();
  notifyAuthExpired();
}

async function assertOk(response: Response, endpoint: string): Promise<void> {
  if (response.status === 401) {
    await handleAuthExpired();
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
  await assertOk(response, endpoint);
  const result: ApiResponse<T> = await response.json();
  return result.success ? (result.data ?? null) : null;
}

export async function post<T>(endpoint: string, body: unknown): Promise<T | null> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  await assertOk(response, endpoint);
  const result: ApiResponse<T> = await response.json();
  return result.success ? (result.data ?? null) : null;
}

export async function patch<T>(endpoint: string, body: unknown): Promise<T | null> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  await assertOk(response, endpoint);
  const result: ApiResponse<T> = await response.json();
  return result.success ? (result.data ?? null) : null;
}

export async function put<T>(endpoint: string, body: unknown): Promise<T | null> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  await assertOk(response, endpoint);
  const result: ApiResponse<T> = await response.json();
  return result.success ? (result.data ?? null) : null;
}

export async function del(endpoint: string): Promise<boolean> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  await assertOk(response, endpoint);
  const result: ApiResponse<void> = await response.json();
  return result.success;
}

export async function delWithQuery(endpoint: string, params: Record<string, string>): Promise<boolean> {
  const queryString = new URLSearchParams(params).toString();
  const response = await fetch(`${API_BASE_URL}${endpoint}?${queryString}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  await assertOk(response, endpoint);
  const result: ApiResponse<void> = await response.json();
  return result.success;
}

export async function postBoolean(endpoint: string, body?: unknown): Promise<boolean> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  await assertOk(response, endpoint);
  const result: ApiResponse<unknown> = await response.json();
  return result.success;
}
