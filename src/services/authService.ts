import api from './api';
import { User, UserStats, ActionCard } from '../types';

export const authService = {
  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const response = await api.post('/api/auth/login/', { email, password });
    return response.data;
  },

  async register(email: string, password: string, name: string, businessName: string): Promise<{ user: User; token: string }> {
    const response = await api.post('/api/auth/register/', { email, password, name, businessName });
    return response.data;
  },

  async getProfile(): Promise<User> {
    const response = await api.get('/api/auth/profile/');
    return response.data;
  },

  async getStats(): Promise<UserStats> {
    const response = await api.get('/api/auth/stats/');
    return response.data;
  },

  async getActions(): Promise<ActionCard[]> {
    const response = await api.get('/api/auth/actions/');
    return response.data;
  },

  async logout(): Promise<void> {
    await api.post('/api/auth/logout/');
    localStorage.removeItem('sb_auth_token');
    localStorage.removeItem('sb_user');
  },
};
