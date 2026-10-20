import { useCallback, useEffect, useState } from 'react';

const KEY = 'smartbiz_saved_items_v1';

const read = (): number[] => {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((n) => typeof n === 'number') : [];
  } catch {
    return [];
  }
};

/**
 * Saved items ("wishlist") kept on the buyer's own device - no account needed.
 * Synced across tabs and components via the storage + custom events.
 */
export function useWishlist() {
  const [ids, setIds] = useState<number[]>(read);

  useEffect(() => {
    const sync = () => setIds(read());
    window.addEventListener('storage', sync);
    window.addEventListener('smartbiz-wishlist', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('smartbiz-wishlist', sync);
    };
  }, []);

  const toggle = useCallback((id: number) => {
    const current = read();
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event('smartbiz-wishlist'));
    return next.includes(id);
  }, []);

  return { ids, has: (id: number) => ids.includes(id), toggle };
}
