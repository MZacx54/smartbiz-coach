import api from './api';
import { BrandIdentity } from '../types';

export const mapDbToBrand = (dbBrand: any): BrandIdentity => {
    if (!dbBrand) return dbBrand;
    return {
        id: dbBrand.id,
        businessName: dbBrand.businessName || dbBrand.business_name || '',
        niche: dbBrand.niche || '',
        vibe: dbBrand.vibe || '',
        colors: dbBrand.colors || { primary: '', secondary: '', accent: '' },
        fonts: dbBrand.fonts || { primary: '', secondary: '' },
        taglines: dbBrand.taglines || [],
        socialBio: dbBrand.socialBio || dbBrand.social_bio || '',
        whatsappGreeting: dbBrand.whatsappGreeting || dbBrand.whatsapp_greeting || '',
        elevatorPitch: dbBrand.elevatorPitch || dbBrand.elevator_pitch || '',
        brandVoice: dbBrand.brandVoice || dbBrand.brand_voice || '',
        targetAudience: dbBrand.targetAudience || dbBrand.target_audience || '',
        logoPrompt: dbBrand.logoPrompt || dbBrand.logo_prompt || '',
        logoUrl: dbBrand.logoUrl || dbBrand.logo_url || '',
        policies: dbBrand.policies || { payment: '', delivery: '', refund: '' },
        trustBadgeText: dbBrand.trustBadgeText || dbBrand.trust_badge_text || '',
        whatsappContent: dbBrand.whatsappContent || dbBrand.whatsapp_content || {
            stickerIdeas: [],
            statusTemplates: [],
            quickReplies: [],
            broadcastMessages: []
        },
        packaging: dbBrand.packaging || { thankYouNote: '', unboxingTip: '' }
    };
};

export const mapBrandToDb = (brand: BrandIdentity): any => {
    return {
        business_name: brand.businessName,
        niche: brand.niche,
        vibe: brand.vibe,
        colors: brand.colors,
        fonts: brand.fonts,
        taglines: brand.taglines,
        social_bio: brand.socialBio,
        whatsapp_greeting: brand.whatsappGreeting,
        elevator_pitch: brand.elevatorPitch,
        brand_voice: brand.brandVoice,
        target_audience: brand.targetAudience,
        logo_prompt: brand.logoPrompt,
        logo_url: brand.logoUrl,
        policies: brand.policies,
        trust_badge_text: brand.trustBadgeText,
        whatsapp_content: brand.whatsappContent,
        packaging: brand.packaging
    };
};

export const brandService = {
    getBrand: async (): Promise<BrandIdentity | null> => {
        const response = await api.get('brand/');
        if (Array.isArray(response.data) && response.data.length > 0) {
            return mapDbToBrand(response.data[0]);
        }
        return null;
    },

    createBrand: async (brandData: BrandIdentity): Promise<BrandIdentity> => {
        const dbPayload = mapBrandToDb(brandData);
        const response = await api.post('brand/', dbPayload);
        return mapDbToBrand(response.data);
    },

    updateBrand: async (id: number, brandData: BrandIdentity): Promise<BrandIdentity> => {
        const dbPayload = mapBrandToDb(brandData);
        const response = await api.put(`brand/${id}/`, dbPayload);
        return mapDbToBrand(response.data);
    },

    generateIdentity: async (name: string, niche: string, vibe: string) => {
        const response = await api.post('brand/generate/', { name, niche, vibe });
        // The generator returns camelCase fields directly since the LLM prompt was structured that way,
        // but mapDbToBrand is safe to clean up any fallback values.
        return mapDbToBrand(response.data);
    }
};
