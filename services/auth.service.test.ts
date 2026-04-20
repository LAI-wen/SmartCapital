import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('./core/http', () => ({
  post: vi.fn(),
  get: vi.fn(),
}));

import { post } from './core/http';
import {
  isAuthenticated,
  autoRefreshToken,
  getAccessToken,
  getRefreshToken,
  isTokenExpired,
  clearTokens,
  refreshAccessToken,
} from './auth.service';

// Actual key names used in auth.service.ts
const ACCESS_TOKEN_KEY = 'smartcapital_access_token';
const REFRESH_TOKEN_KEY = 'smartcapital_refresh_token';
const TOKEN_EXPIRY_KEY = 'smartcapital_token_expiry';

beforeEach(() => {
  localStorage.clear();
  vi.resetAllMocks();
});

afterEach(() => {
  localStorage.clear();
});

describe('isAuthenticated', () => {
  it('returns false when no token in localStorage', () => {
    expect(isAuthenticated()).toBe(false);
  });

  it('returns false when token is expired', () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, 'tok');
    localStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() - 1000));
    expect(isAuthenticated()).toBe(false);
  });

  it('returns true when token is valid and not expired', () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, 'tok');
    localStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() + 60000));
    expect(isAuthenticated()).toBe(true);
  });

  it('returns false when token exists but no expiry set', () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, 'tok');
    // No expiry key — isTokenExpired returns true
    expect(isAuthenticated()).toBe(false);
  });
});

describe('isTokenExpired', () => {
  it('returns true when no expiry stored', () => {
    expect(isTokenExpired()).toBe(true);
  });

  it('returns true when expiry is in the past', () => {
    localStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() - 5000));
    expect(isTokenExpired()).toBe(true);
  });

  it('returns false when expiry is in the future', () => {
    localStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() + 60000));
    expect(isTokenExpired()).toBe(false);
  });
});

describe('getAccessToken', () => {
  it('returns null when no token stored', () => {
    expect(getAccessToken()).toBeNull();
  });

  it('returns stored token', () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, 'my_token');
    expect(getAccessToken()).toBe('my_token');
  });
});

describe('getRefreshToken', () => {
  it('returns null when no refresh token stored', () => {
    expect(getRefreshToken()).toBeNull();
  });

  it('returns stored refresh token', () => {
    localStorage.setItem(REFRESH_TOKEN_KEY, 'my_refresh_token');
    expect(getRefreshToken()).toBe('my_refresh_token');
  });
});

describe('clearTokens', () => {
  it('removes all token keys from localStorage', () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, 'a');
    localStorage.setItem(REFRESH_TOKEN_KEY, 'b');
    localStorage.setItem(TOKEN_EXPIRY_KEY, '12345');
    clearTokens();
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(TOKEN_EXPIRY_KEY)).toBeNull();
  });
});

describe('refreshAccessToken', () => {
  it('calls refresh endpoint with stored refresh token', async () => {
    localStorage.setItem(REFRESH_TOKEN_KEY, 'refresh_tok');
    vi.mocked(post).mockResolvedValue({ accessToken: 'new_token', expiresIn: 3600 });
    const result = await refreshAccessToken();
    expect(post).toHaveBeenCalledWith(
      expect.stringContaining('refresh'),
      expect.objectContaining({ refreshToken: 'refresh_tok' })
    );
    expect(result).toBe(true);
  });

  it('returns false when no refresh token stored', async () => {
    const result = await refreshAccessToken();
    expect(post).not.toHaveBeenCalled();
    expect(result).toBe(false);
  });

  it('stores new access token after successful refresh', async () => {
    localStorage.setItem(REFRESH_TOKEN_KEY, 'refresh_tok');
    vi.mocked(post).mockResolvedValue({ accessToken: 'new_access', expiresIn: 3600 });
    await refreshAccessToken();
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBe('new_access');
  });

  it('returns false when POST returns null', async () => {
    localStorage.setItem(REFRESH_TOKEN_KEY, 'refresh_tok');
    vi.mocked(post).mockResolvedValue(null);
    const result = await refreshAccessToken();
    expect(result).toBe(false);
  });
});

describe('autoRefreshToken', () => {
  it('does nothing when no expiry time stored', async () => {
    await autoRefreshToken();
    expect(post).not.toHaveBeenCalled();
  });

  it('does nothing when token has more than 5 minutes remaining', async () => {
    // 10 minutes in the future — should NOT refresh
    localStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() + 10 * 60 * 1000));
    await autoRefreshToken();
    expect(post).not.toHaveBeenCalled();
  });

  it('calls refresh when token expires within 5 minutes', async () => {
    // 2 minutes until expiry — within the 5-minute threshold
    localStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() + 2 * 60 * 1000));
    localStorage.setItem(REFRESH_TOKEN_KEY, 'refresh_tok');
    vi.mocked(post).mockResolvedValue({ accessToken: 'new_token', expiresIn: 3600 });
    await autoRefreshToken();
    expect(post).toHaveBeenCalledWith(
      expect.stringContaining('refresh'),
      expect.objectContaining({ refreshToken: 'refresh_tok' })
    );
  });

  it('does not refresh when token is already expired', async () => {
    // Already expired — timeUntilExpiry is negative, condition `> 0` is false
    localStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() - 1000));
    localStorage.setItem(REFRESH_TOKEN_KEY, 'refresh_tok');
    await autoRefreshToken();
    expect(post).not.toHaveBeenCalled();
  });
});
