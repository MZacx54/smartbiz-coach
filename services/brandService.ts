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
        packaging: dbBrand.packaging || { thankYouNote: '', unboxingTip: '' },
        phone: dbBrand.phone || '',
        email: dbBrand.email || '',
        location: dbBrand.location || dbBrand.address || '',
        address: dbBrand.address || dbBrand.location || '',
        cacNumber: dbBrand.cacNumber || dbBrand.cac_number || '',
        tin: dbBrand.tin || dbBrand.tin_number || dbBrand.tinNumber || '',
        tinNumber: dbBrand.tinNumber || dbBrand.tin_number || dbBrand.tin || '',
        smedanNumber: dbBrand.smedanNumber || dbBrand.smedan_number || '',
        corporateEntityType: dbBrand.corporateEntityType || dbBrand.corporate_entity_type || 'Sole Proprietorship / BN',
        mission: dbBrand.mission || '',
        vision: dbBrand.vision || '',
        coreValues: Array.isArray(dbBrand.coreValues) ? dbBrand.coreValues : (Array.isArray(dbBrand.core_values) ? dbBrand.core_values : ['Integrity', 'Excellence', 'Reliability', 'Agility']),
        executiveBio: dbBrand.executiveBio || dbBrand.executive_bio || '',
        slaPolicy: dbBrand.slaPolicy || dbBrand.sla_policy || '',
        ndprCompliance: dbBrand.ndprCompliance || dbBrand.ndpr_compliance || '',
        whatsapp: dbBrand.whatsapp || '',
        openingHours: dbBrand.openingHours || dbBrand.opening_hours || {
            monFri: '8:00 AM - 6:00 PM',
            saturday: '9:00 AM - 4:00 PM',
            sunday: 'Closed'
        }
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
        packaging: brand.packaging,
        phone: brand.phone,
        email: brand.email,
        address: brand.address || brand.location,
        location: brand.location || brand.address,
        cac_number: brand.cacNumber,
        tin_number: brand.tinNumber || brand.tin,
        smedan_number: brand.smedanNumber,
        corporate_entity_type: brand.corporateEntityType,
        mission: brand.mission,
        vision: brand.vision,
        core_values: brand.coreValues,
        executive_bio: brand.executiveBio,
        sla_policy: brand.slaPolicy,
        ndpr_compliance: brand.ndprCompliance,
        opening_hours: brand.openingHours
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

    generateIdentity: async (name: string, niche: string, vibe: string, extraData?: any) => {
        const response = await api.post('brand/generate/', { name, niche, vibe, ...extraData });
        return mapDbToBrand(response.data);
    }
};
