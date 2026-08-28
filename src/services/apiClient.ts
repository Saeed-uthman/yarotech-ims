/**
 * API Client — shared fetch wrapper for all backend communication.
 * Handles JWT auth, snake_case ↔ camelCase conversion, error mapping,
 * and automatic token refresh on 401.
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';
const TOKEN_KEY = 'stitch_pharmacy_auth_token';
const REFRESH_TOKEN_KEY = 'stitch_pharmacy_refresh_token';

export interface BackendPaginationMeta {
  current_page?: number;
  per_page?: number;
  total?: number;
  total_pages?: number;
}

// ==========================================
// snake_case ↔ camelCase Conversion
// ==========================================

function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function convertKeys(obj: any, converter: (key: string) => string): any {
  if (Array.isArray(obj)) {
    return obj.map((item) => convertKeys(item, converter));
  }
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [converter(key), convertKeys(value, converter)])
    );
  }
  return obj;
}

export function toSnakeCaseKeys(obj: any): any {
  return convertKeys(obj, toSnakeCase);
}

export function toCamelCaseKeys(obj: any): any {
  return convertKeys(obj, toCamelCase);
}

export function resolveApiAssetUrl(value?: string | null): string {
  if (!value || value.startsWith('data:') || /^https?:\/\//i.test(value)) return value || '';
  try {
    return new URL(value, new URL(API_BASE_URL).origin).toString();
  } catch {
    return value;
  }
}

export function mapPaginationMeta(meta?: BackendPaginationMeta | null) {
  return {
    currentPage: Number(meta?.current_page || 1),
    perPage: Number(meta?.per_page || 15),
    total: Number(meta?.total || 0),
    lastPage: Number(meta?.total_pages || 1),
  };
}

// ==========================================
// Token Management
// ==========================================

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(access: string, refresh?: string): void {
  localStorage.setItem(TOKEN_KEY, access);
  if (refresh) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  }
}

export function clearTokens(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function createIdempotencyKey(scope: string): string {
  const randomPart = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${scope}:${randomPart}`;
}

// ==========================================
// Backend Response Types
// ==========================================

interface BackendErrorResponse {
  success: false;
  error?: string;
  message?: string;
  errors?: Record<string, string[]> | string;
}

// ==========================================
// Core Fetch Wrapper
// ==========================================

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: any;
  skipAuth?: boolean;
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { skipAuth = false, body, headers: customHeaders, ...rest } = options;

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...((customHeaders as Record<string, string>) || {}),
  };

  if (!skipAuth) {
    const token = getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const config: RequestInit = {
    ...rest,
    headers,
  };

  if (body !== undefined) {
    config.body = isFormData ? body : JSON.stringify(toSnakeCaseKeys(body));
  }

  let response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  // Handle 401 — attempt token refresh
  if (response.status === 401 && !skipAuth) {
    const refreshed = await attemptTokenRefresh();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${getAccessToken()}`;
      response = await fetch(`${API_BASE_URL}${endpoint}`, { ...config, headers });
    } else {
      clearTokens();
      throw new ApiError('Session expired. Please log in again.', 401);
    }
  }

  // Parse response
  const contentType = response.headers.get('content-type');
  const isJson = contentType?.includes('application/json');
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    const errorMessage = data?.message || data?.detail || `Request failed (${response.status})`;
    const errors = data?.errors || null;
    const apiError = new ApiError(errorMessage, response.status, errors, data?.error);
    throw apiError;
  }

  return data as T;
}

// ==========================================
// Token Refresh
// ==========================================

let refreshPromise: Promise<boolean> | null = null;

async function attemptTokenRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const refreshToken = getRefreshToken();
      if (!refreshToken) return false;

      const response = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: refreshToken }),
      });

      if (!response.ok) return false;

      const data = await response.json();
      const newAccess = data.access || data.data?.access;
      const newRefresh = data.refresh || data.data?.refresh;
      if (newAccess) {
        setTokens(newAccess, newRefresh);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// ==========================================
// Error Class
// ==========================================

export class ApiError extends Error {
  status: number;
  code: string;
  errors: Record<string, string[]> | string | null;

  constructor(message: string, status: number, errors?: Record<string, string[]> | string | null, code = 'REQUEST_FAILED') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.errors = errors || null;
  }
}

// ==========================================
// Convenience Methods
// ==========================================

export const api = {
  get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const query = params
      ? '?' + new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== null && v !== '')
            .map(([k, v]) => [k, String(v)])
        ).toString()
      : '';
    return apiRequest<T>(`${endpoint}${query}`);
  },

  post<T>(endpoint: string, body?: any, idempotencyKey?: string): Promise<T> {
    return apiRequest<T>(endpoint, {
      method: 'POST',
      body,
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
    });
  },

  put<T>(endpoint: string, body?: any): Promise<T> {
    return apiRequest<T>(endpoint, { method: 'PUT', body });
  },

  patch<T>(endpoint: string, body?: any): Promise<T> {
    return apiRequest<T>(endpoint, { method: 'PATCH', body });
  },

  patchForm<T>(endpoint: string, body: FormData): Promise<T> {
    return apiRequest<T>(endpoint, { method: 'PATCH', body });
  },

  delete<T>(endpoint: string): Promise<T> {
    return apiRequest<T>(endpoint, { method: 'DELETE' });
  },
};
