import api from './api';

export interface SocialConnectData {
  meta_access_token: string;
  instagram_account_id: string;
  facebook_page_id: string;
  is_connected?: boolean;
}

export const marketingService = {
  getSocialConnect: async (): Promise<SocialConnectData> => {
    const response = await api.get('marketing/social-connect/');
    return response.data;
  },

  saveSocialConnect: async (data: SocialConnectData): Promise<{ message: string; is_connected: boolean }> => {
    const response = await api.post('marketing/social-connect/', data);
    return response.data;
  },

  publishToMeta: async (payload: { caption: string; image_url: string; platforms?: string[] }): Promise<{ success: boolean; message: string; warnings?: string[] }> => {
    const response = await api.post('marketing/publish-meta/', payload);
    return response.data;
  }
};
