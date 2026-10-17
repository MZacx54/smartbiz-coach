import axios from 'axios';

// Base URL comes from the Vercel environment variable VITE_API_URL
// which must be set to: https://api.smartbizcoach.com.ng
let BASE_URL = import.meta.env.VITE_API_URL || 'https://api.smartbizcoach.com.ng';
// Normalize trailing slashes and strip redundant /api suffix
BASE_URL = BASE_URL.replace(/\/api\/?$/, '');

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

const isCacheableGet = (url?: string): boolean => {
  if (!url) return false;
  return (
    url.includes('marketplace/products') ||
    url.includes('marketplace/daily-sales') ||
    url.includes('marketplace/daily-expenses') ||
    url.includes('marketplace/daily-summary') ||
    url.includes('marketplace/daily-trends') ||
    url.includes('auth/profile') ||
    url.includes('auth/stats') ||
    url.includes('auth/actions') ||
    url.includes('brands/') ||
    url.includes('billing/transactions')
  );
};

// Attach auth token to every request automatically and clean up duplicate /api/ prefixes
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('sb_auth_token');
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }

    // Strip duplicate /api/ prefix if present to align with the Axios baseURL
    if (config.url) {
      if (config.url.startsWith('/api/')) {
        config.url = config.url.substring(5);
      } else if (config.url.startsWith('api/')) {
        config.url = config.url.substring(4);
      }
    }

    // For lightweight cacheable GET requests (non-AI), use a 12s timeout if none was specified
    // so offline fallback triggers quickly without affecting any AI POST/GET endpoints.
    const method = (config.method || 'get').toLowerCase();
    if (method === 'get' && isCacheableGet(config.url) && (!config.timeout || config.timeout === 180000)) {
      config.timeout = 12000;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Cache successful GET responses & provide automatic offline/timeout GET fallback
api.interceptors.response.use(
  (response) => {
    const method = (response.config.method || 'get').toLowerCase();
    const url = response.config.url || '';
    if (method === 'get' && isCacheableGet(url) && response.status === 200 && response.data !== undefined) {
      try {
        localStorage.setItem(`${GET_CACHE_PREFIX}${url}`, JSON.stringify({
          ts: Date.now(),
          data: response.data,
        }));
      } catch {
        // Ignore storage quota errors
      }
    }
    return response;
  },
  (error) => {
    const config = error?.config;
    const method = (config?.method || '').toLowerCase();
    const url = config?.url || '';

    // If a cacheable GET request failed due to network offline or timeout (no HTTP status response),
    // serve the last known good cached response so the platform stays fast and functional offline.
    if (method === 'get' && isCacheableGet(url) && !error.response) {
      try {
        const raw = localStorage.getItem(`${GET_CACHE_PREFIX}${url}`);
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
