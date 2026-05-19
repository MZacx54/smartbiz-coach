import axios from 'axios';

const configuredUrl = import.meta.env.VITE_API_URL || 'https://www.smartbizcoach.com.ng';
const cleanBaseUrl = configuredUrl.endsWith('/api') ? configuredUrl.slice(0, -4) : (configuredUrl.endsWith('/api/') ? configuredUrl.slice(0, -5) : configuredUrl);

const api = axios.create({
  baseURL: cleanBaseUrl,
  xsrfCookieName: 'csrftoken',
  xsrfHeaderName: 'X-CSRFToken',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('sb_auth_token');
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
