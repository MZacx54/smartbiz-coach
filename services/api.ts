import axios from 'axios';

// Force the correct production API URL, bypassing any faulty environment variables
const configuredUrl = 'https://api.smartbizcoach.com.ng';
const cleanBaseUrl = configuredUrl; // The endpoint paths in services already include /api/users/ etc. Wait, no they don't!


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
