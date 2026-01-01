import api from './api';
import { User } from '../types';

export const authService = {
    login: async (credentials: any) => {
        const response = await api.post('users/login/', credentials);
        if (response.data.token) {
            localStorage.setItem('sb_auth_token', response.data.token);
        }
        return response.data;
    },

    register: async (userData: any) => {
        const response = await api.post('users/register/', userData);
        if (response.data.token) {
            localStorage.setItem('sb_auth_token', response.data.token);
        }
        return response.data;
    },

    getProfile: async () => {
        const response = await api.get('users/profile/');
        return response.data;
    },

    updateProfile: async (userData: any) => {
        const response = await api.patch('users/profile/', userData);
        return response.data;
    },

    logout: () => {
        localStorage.removeItem('sb_auth_token');
    },

    getStats: async () => {
        const response = await api.get('users/stats/');
        return response.data;
    },

    getActions: async () => {
        const response = await api.get('users/actions/');
        return response.data;
    }
};
