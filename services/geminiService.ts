import api from './api';

// All AI functions now proxy to backend

export const analyzeBusinessName = async (businessName: string) => {
    const response = await api.post('business/analyze-name/', { business_name: businessName });
    return response.data;
};

export const generateSeasonalTips = async () => {
    const response = await api.post('content/generate-seasonal-tips/');
    return response.data;
};

export const generateBrandIdentity = async (name: string, niche: string, vibe: string, token: string, description?: string, tone?: string) => {
    const response = await api.post('brand/generate/', { name, niche, vibe, description, tone });
    return response.data;
};

export const generateBrandLogo = async (prompt: string) => {
    const response = await api.post('brand/generate-logo/', { prompt });
    return response.data.logoUrl;
};

export const transcribeAudio = async (audioBlob: Blob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob);
    const response = await api.post('content/transcribe/', formData);
    return response.data.text;
};

export const generateTrendIdeas = async (niche: string) => {
    const response = await api.post('content/generate-trend-ideas/', { niche });
    return response.data;
};

export const getTrendingTopics = async () => {
    const response = await api.get('content/trends/today/');
    return response.data;
};

export const generateDebtReminder = async (debtorName: string, amount: number, dueDate: string) => {
    const response = await api.post('content/generate-debt-reminder/', { debtor_name: debtorName, amount, due_date: dueDate });
    return response.data;
};

export const analyzeNeighborhood = async (location: string) => {
    const response = await api.post('business/analyze-neighborhood/', { location });
    return response.data;
};

export interface LocalSearchResult {
    name: string;
    category: string;
    distance: string;
    rating: number;
}

// Updated interfaces
export interface GrantSearchParams {
    businessName: string;
    location?: string;
    industry?: string;
    yearsInBusiness?: string;
    gender?: string;
}

export interface VendorSearchResponse {
    text: string;
    places: LocalSearchResult[];
}

export const generateDailyMotivation = async (persona?: string) => {
    const response = await api.post('content/generate-motivation/', { persona });
    return response.data;
};

export const chatWithSmartBiz = async (history: any[], message: string) => {
    const response = await api.post('content/chat/', { history, message });
    return response.data;
};

export const findGrants = async (params: GrantSearchParams) => {
    const response = await api.post('business/find-grants/', params);
    return response.data;
};

export const searchLocalVendors = async (query: string, location: string = 'Lagos'): Promise<any> => {
    const response = await api.post('business/search-vendors/', { query, location });
    return response.data; // Expecting { text: string, places: [] }
};

export const generateBusinessPlan = async (businessName: string, niche: string, context?: string) => {
    const response = await api.post('business/generate-plan/', { business_name: businessName, niche, context });
    return response.data;
};

// Content generation functions
export const generateSocialPost = async (topic: string, platform: string, brand: any) => {
    const response = await api.post('content/generate-social/', { topic, platform, brand });
    return response.data;
};

// Updated to match ContentGenerator.tsx usage: (topic, platform, tone, style)
export const generateVideoScript = async (topic: string, platform: string, tone: string, style: string) => {
    const response = await api.post('content/generate-video-script/', { topic, platform, tone, style });
    return response.data;
};

export const editImage = async (imageBase64: string, mimeType: string, prompt: string) => {
    const response = await api.post('content/edit-image/', { image_base64: imageBase64, mime_type: mimeType, prompt });
    return response.data;
};

// Alias for backwards compatibility
export const editProductImage = editImage;

// More content generation functions
export const generateSocialContent = async (topic: string, platform: string, tone: string, format: string) => {
    const response = await api.post('content/generate-social-content/', { topic, platform, tone, format });
    return response.data;
};

export const generateWeeklyPlan = async (niche: string) => {
    const response = await api.post('content/generate-weekly-plan/', { niche });
    return response.data;
};

export const generateSuggestedPrompts = async (niche: string, contentType: string, imageBase64?: string, imageMimeType?: string, trendNames?: string[]) => {
    const response = await api.post('content/generate-prompts/', {
        niche,
        content_type: contentType,
        image_base64: imageBase64,
        image_mime_type: imageMimeType,
        trend_names: trendNames
    });
    return response.data;
};

export const generateMarketingVideo = async (script: any, visualStyle: string, onProgress?: (message: string) => void) => {
    if (onProgress) onProgress('Analyzing script for visual scenes...');
    const response = await api.post('content/generate-video/', { script, visual_style: visualStyle });
    if (onProgress) onProgress('Storyboard generated successfully!');
    return response.data; // Now returns { storyboard: [], message: "" }
};

