import { z } from 'zod';
import { ENV } from '../config/env';
import { supabase } from '../lib/supabase';

export class ApiError extends Error {
  statusCode: number;
  data?: any;

  constructor(message: string, statusCode: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.data = data;
  }
}

interface FetchOptions extends RequestInit {
  schema?: z.ZodType<any, any>;
  skipAuth?: boolean;
}

let onUnauthorizedCallback: (() => void) | null = null;

export const setOnUnauthorizedCallback = (cb: () => void) => {
  onUnauthorizedCallback = cb;
};

/**
 * Centralized API client executing HTTP requests to the NestJS backend.
 * Injects Supabase JWT access token automatically into Authorization: Bearer <token>.
 * Validates responses against provided Zod schema.
 */
export async function apiFetch<T = any>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { schema, skipAuth = false, headers = {}, ...fetchOptions } = options;

  const url = `${ENV.API_BASE_URL.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
  };

  if (!skipAuth) {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) {
        requestHeaders['Authorization'] = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn('[ApiClient] Failed to retrieve session for Bearer token:', e);
    }
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...fetchOptions,
      headers: requestHeaders,
    });
  } catch (netError: any) {
    throw new ApiError(
      netError?.message || 'Network connection error. Check your internet connection.',
      0
    );
  }

  // Handle 401 Unauthorized
  if (response.status === 401) {
    if (onUnauthorizedCallback) {
      onUnauthorizedCallback();
    }
    throw new ApiError('Session expired. Please log in again.', 401);
  }

  // Parse JSON response body
  let responseBody: any = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      responseBody = await response.json();
    } catch {
      responseBody = null;
    }
  } else {
    responseBody = await response.text();
  }

  // Handle 4xx / 5xx HTTP Errors
  if (!response.ok) {
    const errorMsg =
      (responseBody && (responseBody.message || responseBody.error)) ||
      `Server responded with status ${response.status}`;
    throw new ApiError(
      Array.isArray(errorMsg) ? errorMsg.join(', ') : String(errorMsg),
      response.status,
      responseBody
    );
  }

  // Validate with Zod schema if provided
  if (schema) {
    const parsed = schema.safeParse(responseBody);
    if (!parsed.success) {
      console.error(
        `[ApiClient] Schema validation error on ${endpoint}:`,
        parsed.error.format()
      );
      throw new ApiError(
        `Invalid server response format: ${parsed.error.issues[0]?.message || 'schema mismatch'}`,
        response.status,
        parsed.error
      );
    }
    return parsed.data as T;
  }

  return responseBody as T;
}

export const apiClient = {
  get: <T = any>(endpoint: string, options?: FetchOptions) =>
    apiFetch<T>(endpoint, { ...options, method: 'GET' }),

  post: <T = any>(endpoint: string, body?: any, options?: FetchOptions) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T = any>(endpoint: string, body?: any, options?: FetchOptions) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T = any>(endpoint: string, body?: any, options?: FetchOptions) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T = any>(endpoint: string, options?: FetchOptions) =>
    apiFetch<T>(endpoint, { ...options, method: 'DELETE' }),
};
