import axios from 'axios';

// Base URL comes from the Vercel environment variable VITE_API_URL
// which defaults to: https://api.smartbizcoach.com.ng
let BASE_URL = import.meta.env.VITE_API_URL || 'https://api.smartbizcoach.com.ng';
// Normalize trailing slashes and strip redundant /api suffix
BASE_URL = BASE_URL.replace(/\/api\/?$/, '');

// Direct Render production fallback for bulletproof global availability & ISP DNS resilience
const FALLBACK_API_ORIGIN = 'https://smartbiz-coach.onrender.com';

const api = axios.create({
  baseURL: `${BASE_URL}/api/`,
  // Generous 180-second (3-minute) default timeout so heavy AI generation,
  // Photo Studio background removal, 4K rendering, Business Plans, and OCR
  // never time out prematurely. Fast POS/Cashbook routes pass their own short timeouts.
  timeout: 180000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const GET_CACHE_PREFIX = 'sb_api_cache_v2:';

const safeStorageGet = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeStorageSet = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore storage quota or private browsing errors
  }
};

const safeStorageRemove = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore storage errors
  }
};

const clearApiGetCache = (): void => {
  try {
    const keys = Object.keys(localStorage);
    for (const k of keys) {
      if (k.startsWith(GET_CACHE_PREFIX)) {
        localStorage.removeItem(k);
      }
    }
  } catch {
    // Ignore storage errors
  }
};

const hashScopeToken = (token: string): string => {
  let h = 2166136261;
  for (let i = 0; i < token.length; i++) {
    h ^= token.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
};

const getCacheUserScope = (): string => {
  const activeUserId = safeStorageGet('sb_active_user_id');
  if (activeUserId) {
    return `u:${activeUserId}`;
  }
  const token = safeStorageGet('sb_auth_token');
  if (token) {
    return `t:${hashScopeToken(token)}`;
  }
  return 'anon';
};

const normalizeCacheUrl = (rawUrl?: string): string => {
  let url = rawUrl || '';
  if (url.startsWith('/api/')) url = url.substring(5);
  else if (url.startsWith('api/')) url = url.substring(4);
  else if (url.startsWith('/')) url = url.substring(1);
  return url;
};

const buildCacheKey = (config?: any): string => {
  const url = normalizeCacheUrl(config?.url);
  const scope = getCacheUserScope();
  const params = config?.params;
  if (!params || typeof params !== 'object') {
    return `${GET_CACHE_PREFIX}${scope}:${url}`;
  }
  try {
    const sorted = Object.keys(params).sort().map((k) => `${k}=${JSON.stringify(params[k])}`).join('&');
    return sorted ? `${GET_CACHE_PREFIX}${scope}:${url}?${sorted}` : `${GET_CACHE_PREFIX}${scope}:${url}`;
  } catch {
    return `${GET_CACHE_PREFIX}${scope}:${url}`;
  }
};

const isPublicCacheableGet = (url?: string): boolean => {
  const clean = normalizeCacheUrl(url);
  return clean.includes('marketplace/global');
};

const isCacheableGet = (url?: string): boolean => {
  if (!url) return false;
  return (
    url.includes('marketplace/products') ||
    url.includes('marketplace/global') ||
    url.includes('marketplace/daily-sales') ||
    url.includes('marketplace/daily-expenses') ||
    url.includes('marketplace/daily-summary') ||
    url.includes('marketplace/daily-trends') ||
    url.includes('users/profile') ||
    url.includes('users/stats') ||
    url.includes('users/actions') ||
    url.includes('brands/') ||
    url.includes('billing/transactions') ||
    url.includes('analytics/')
  );
};

// Attach auth token to every request automatically and clean up duplicate /api/ prefixes
api.interceptors.request.use(
  (config) => {
    const token = safeStorageGet('sb_auth_token');
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }

    // Strip duplicate /api/ prefix or leading slash to align with the Axios baseURL (${BASE_URL}/api/)
    if (config.url) {
      if (config.url.startsWith('/api/')) {
        config.url = config.url.substring(5);
      } else if (config.url.startsWith('api/')) {
        config.url = config.url.substring(4);
      } else if (config.url.startsWith('/')) {
        config.url = config.url.substring(1);
      }
    }

    const method = (config.method || 'get').toLowerCase();
    const url = config.url || '';

    // Allow Render cold-starts up to 35 seconds for public marketplace listings and merchant catalog
    if (method === 'get' && (url.includes('marketplace/global') || url.includes('marketplace/products'))) {
      if (!config.timeout || config.timeout === 180000) {
        config.timeout = 35000;
      }
    } else if (method === 'get' && isCacheableGet(url) && (!config.timeout || config.timeout === 180000)) {
      // For lightweight fast POS/dashboard routes, 15s allows quick offline fallback
      config.timeout = 15000;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Cache successful GET responses & provide automatic offline/timeout GET fallback + Render failover
api.interceptors.response.use(
  (response) => {
    const method = (response.config.method || 'get').toLowerCase();
    const url = response.config.url || '';
    if (method === 'get' && isCacheableGet(url) && response.status === 200 && response.data !== undefined) {
      safeStorageSet(buildCacheKey(response.config), JSON.stringify({
        ts: Date.now(),
        data: response.data,
      }));
    }
    return response;
  },
  async (error) => {
    // Do not failover or serve offline cache for intentionally cancelled/aborted requests
    if (axios.isCancel(error) || error?.code === 'ERR_CANCELED') {
      return Promise.reject(error);
    }

    const config = error?.config;
    const method = (config?.method || '').toLowerCase();
    const url = config?.url || '';

    const status = error?.response?.status;
    const isServerError = status === 502 || status === 503 || status === 504;

    // Automated Failover strictly for idempotent GET requests (never replay non-idempotent POST/PATCH)
    if (
      config &&
      method === 'get' &&
      !config._hasFailedOver &&
      (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED' || !error.response || isServerError)
    ) {
      config._hasFailedOver = true;
      config.baseURL = `${FALLBACK_API_ORIGIN}/api/`;
      try {
        return await api.request(config);
      } catch (fallbackError) {
        // Continue to offline cache fallback
      }
    }

    // Session Expiration Handling: Detect 401 Unauthorized from authenticated routes,
    // clear stale tokens, and broadcast session expiration event to the app UI.
    if (status === 401 && !url.includes('auth/login') && !url.includes('auth/register')) {
      const existingToken = safeStorageGet('sb_auth_token');
      if (existingToken) {
        safeStorageRemove('sb_auth_token');
        safeStorageRemove('sb_active_user_id');
        clearApiGetCache();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('sb_session_expired', {
              detail: { message: 'Your session has expired. Please sign in again.' },
            })
          );
        }
      }
    }

    // If a cacheable GET request failed due to network offline or timeout (no HTTP status response),
    // serve the last known good cached response so the platform stays fast and functional offline.
    if (method === 'get' && isCacheableGet(url) && !error.response) {
      try {
        const raw = safeStorageGet(buildCacheKey(config));
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.data !== undefined) {
            return Promise.resolve({
              data: parsed.data,
              status: 200,
              statusText: 'OK (Cached Offline)',
              headers: {},
              config,
              request: {},
              __fromCache: true,
            });
          }
        }
      } catch {
        // Fall through to reject
      }
    }

    return Promise.reject(error);
  }
);

export default api;
