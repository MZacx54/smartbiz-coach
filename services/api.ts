import axios from 'axios';

// Base URL comes from the Vercel environment variable VITE_API_URL
// which must be set to: https://api.smartbizcoach.com.ng
let BASE_URL = import.meta.env.VITE_API_URL || 'https://smartbiz-backend-qj3r.onrender.com';
// Normalize trailing slashes and strip redundant /api suffix
BASE_URL = BASE_URL.replace(/\/api\/?$/, '');

const api = axios.create({
  baseURL: `${BASE_URL}/api/`,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
