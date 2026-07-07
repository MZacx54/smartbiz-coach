import axios from 'axios';

// Base URL comes from the Vercel environment variable VITE_API_URL
// which must be set to: https://api.smartbizcoach.com.ng
// All service calls use paths like 'users/login/' which get prefixed with /api/
const BASE_URL = import.meta.env.VITE_API_URL || 'https://smartbiz-coach.onrender.com';

const api = axios.create({
  baseURL: `${BASE_URL}/api/`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach auth token to every request automatically
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
