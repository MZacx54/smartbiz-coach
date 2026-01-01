import api from './api';
import { BrandIdentity } from '../types';

export const brandService = {
    getBrand: async () => {
        const response = await api.get('brand/');
        // Return first brand if array, or null
        if (Array.isArray(response.data) && response.data.length > 0) {
            return response.data[0];
        }
        return null;
    },

    createBrand: async (brandData: BrandIdentity) => {
        const response = await api.post('brand/', brandData);
        return response.data;
    },

    updateBrand: async (id: number, brandData: BrandIdentity) => {
        const response = await api.put(`brand/${id}/`, brandData);
        return response.data;
    },

    generateIdentity: async (name: string, niche: string, vibe: string) => {
        const response = await api.post('brand/generate/', { name, niche, vibe });
        return response.data;
    }
};
