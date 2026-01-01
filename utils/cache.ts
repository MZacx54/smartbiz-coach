// Simple in-memory cache for API responses
interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number; // Time to live in milliseconds
}

class ApiCache {
    private cache: Map<string, CacheEntry<any>> = new Map();

    /**
     * Get cached data if it exists and hasn't expired
     */
    get<T>(key: string): T | null {
        const entry = this.cache.get(key);

        if (!entry) {
            return null;
        }

        const now = Date.now();
        const isExpired = (now - entry.timestamp) > entry.ttl;

        if (isExpired) {
            this.cache.delete(key);
            return null;
        }

        return entry.data as T;
    }

    /**
     * Store data in cache with TTL
     * @param key - Cache key
     * @param data - Data to cache
     * @param ttl - Time to live in milliseconds (default: 5 minutes)
     */
    set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl,
        });
    }

    /**
     * Clear specific cache key
     */
    delete(key: string): void {
        this.cache.delete(key);
    }

    /**
     * Clear all cache
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Check if key exists and is valid
     */
    has(key: string): boolean {
        return this.get(key) !== null;
    }

    /**
     * Get cache stats for debugging
     */
    getStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys()),
        };
    }
}

// Export singleton instance
export const apiCache = new ApiCache();

/**
 * Helper to wrap async functions with caching
 * Usage: const data = await withCache('user-profile', () => fetchProfile(), 300000);
 */
export async function withCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
): Promise<T> {
    // Check cache first
    const cached = apiCache.get<T>(key);
    if (cached !== null) {
        return cached;
    }

    // Fetch and cache
    const data = await fetcher();
    apiCache.set(key, data, ttl);
    return data;
}

export default apiCache;
