import api from './api';

export interface SocialConnectData {
  meta_access_token: string;
  instagram_account_id: string;
  facebook_page_id: string;
  whatsapp_phone_number_id?: string;
  whatsapp_access_token?: string;
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
  },

  sendWhatsAppCloudMessage: async (payload: { phone: string; message: string; template_name?: string }): Promise<{ success: boolean; message: string; whatsapp_message_id?: string }> => {
    const response = await api.post('marketing/send-whatsapp-cloud/', payload);
    return response.data;
  }
};
