import api from './api';

// All AI functions now proxy to backend

export const analyzeBusinessName = async (businessName: string) => {
    const response = await api.post('business/analyze-name/', { business_name: businessName });
    return response.data;
};

export const generateDailyMotivation = async () => {
    const response = await api.post('content/generate-motivation/');
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

export const chatWithSmartBiz = async (message: string) => {
    const response = await api.post('content/chat/', { message });
    return response.data;
};

export const transcribeAudio = async (audioBlob: Blob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob);
    const response = await api.post('content/transcribe/', formData);
    return response.data.text;
};

export const findGrants = async (businessName: string) => {
    const response = await api.post('business/find-grants/', { business_name: businessName });
    return response.data;
};

export interface LocalSearchResult {
    name: string;
    category: string;
    distance: string;
    rating: number;
}

export const searchLocalVendors = async (query: string, location: string): Promise<LocalSearchResult[]> => {
    const response = await api.post('business/search-vendors/', { query, location });
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

export const generateBusinessPlan = async (businessName: string, niche: string) => {
    const response = await api.post('business/generate-plan/', { business_name: businessName, niche });
    return response.data;
};

// Content generation functions
export const generateSocialPost = async (topic: string, platform: string, brand: any) => {
    const response = await api.post('content/generate-social/', { topic, platform, brand });
    return response.data;
};

export const generateVideoScript = async (topic: string, duration: string, brand: any) => {
    const response = await api.post('content/generate-video-script/', { topic, duration, brand });
    return response.data;
};

export const generateTrendIdeas = async (niche: string) => {
    const response = await api.post('content/generate-trend-ideas/', { niche });
    return response.data;
};

export const editImage = async (imageUrl: string, prompt: string) => {
    const response = await api.post('content/edit-image/', { image_url: imageUrl, prompt });
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
    if (onProgress) onProgress('Starting video generation...');
    const response = await api.post('content/generate-video/', { script, visual_style: visualStyle });
    if (onProgress) onProgress('Video generated successfully!');
    return response.data.videoUrl;
};

