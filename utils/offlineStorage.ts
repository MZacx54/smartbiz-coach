/**
 * SmartBiz Coach — IndexedDB Resilient Offline Storage Engine
 * Provides structured offline persistence with fallback to localStorage.
 * Ensures sales and expenses recorded during Nigerian market network blackouts
 * are safely stored and never lost.
 */

const DB_NAME = 'SmartBizOfflineDB';
const DB_VERSION = 2;
const STORE_SALES = 'offline_sales';
const STORE_EXPENSES = 'offline_expenses';
const STORE_KV = 'kv_cache';

function getActiveScopeUserId(): string {
  try {
    return localStorage.getItem('sb_active_user_id') || 'anon';
  } catch {
    return 'anon';
  }
}

function withTenantScope(record: any) {
  const userId = record?.__userId || getActiveScopeUserId();
  return { ...record, __userId: String(userId) };
}

function requestPersistentStorageBestEffort() {
  try {
    if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.persist === 'function') {
      navigator.storage.persist().catch(() => {});
    }
  } catch {}
}

function openDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result as IDBDatabase;
        if (!db.objectStoreNames.contains(STORE_SALES)) {
          db.createObjectStore(STORE_SALES, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_EXPENSES)) {
          db.createObjectStore(STORE_EXPENSES, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_KV)) {
          db.createObjectStore(STORE_KV, { keyPath: 'key' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.warn('IndexedDB open error, falling back to localStorage');
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });
}

export const offlineStorage = {
  /**
   * Persist an offline sale to IndexedDB and mirror to localStorage scoped by active userId
   */
  async saveSale(sale: any): Promise<void> {
    const scopedSale = withTenantScope(sale);
    requestPersistentStorageBestEffort();
    try {
      const db = await openDB();
      if (db) {
        await new Promise<void>((resolve) => {
          const tx = db.transaction(STORE_SALES, 'readwrite');
          tx.objectStore(STORE_SALES).put(scopedSale);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        });
      }
    } catch (e) {
      console.warn('IndexedDB saveSale notice:', e);
    }

    // Mirror to localStorage
    try {
      const existing = JSON.parse(localStorage.getItem('sb_offline_sales') || '[]');
      const filtered = existing.filter((s: any) => String(s.id) !== String(scopedSale.id));
      localStorage.setItem('sb_offline_sales', JSON.stringify([scopedSale, ...filtered]));
    } catch {}
  },

  /**
   * Persist an offline expense to IndexedDB and mirror to localStorage scoped by active userId
   */
  async saveExpense(expense: any): Promise<void> {
    const scopedExpense = withTenantScope(expense);
    requestPersistentStorageBestEffort();
    try {
      const db = await openDB();
      if (db) {
        await new Promise<void>((resolve) => {
          const tx = db.transaction(STORE_EXPENSES, 'readwrite');
          tx.objectStore(STORE_EXPENSES).put(scopedExpense);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        });
      }
    } catch (e) {
      console.warn('IndexedDB saveExpense notice:', e);
    }

    // Mirror to localStorage
    try {
      const existing = JSON.parse(localStorage.getItem('sb_offline_expenses') || '[]');
      const filtered = existing.filter((ex: any) => String(ex.id) !== String(scopedExpense.id));
      localStorage.setItem('sb_offline_expenses', JSON.stringify([scopedExpense, ...filtered]));
    } catch {}
  },

  /**
   * Clear all IndexedDB offline stores (called on logout / account switch)
   */
  async clearAll(): Promise<void> {
    try {
      const db = await openDB();
      if (db) {
        await new Promise<void>((resolve) => {
          const stores = [STORE_SALES, STORE_EXPENSES, ...(db.objectStoreNames.contains(STORE_KV) ? [STORE_KV] : [])];
          const tx = db.transaction(stores, 'readwrite');
          stores.forEach((s) => tx.objectStore(s).clear());
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        });
      }
    } catch {}
  },

  /**
   * Persist large structured data (such as photo studio projects) in IndexedDB.
   */
  async saveJsonItem(key: string, value: any): Promise<void> {
    const scopedKey = `${getActiveScopeUserId()}:${key}`;
    try {
      const db = await openDB();
      if (db && db.objectStoreNames.contains(STORE_KV)) {
        await new Promise<void>((resolve) => {
          const tx = db.transaction(STORE_KV, 'readwrite');
          tx.objectStore(STORE_KV).put({ key: scopedKey, value });
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        });
        return;
      }
    } catch {}
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  },

  async loadJsonItem<T>(key: string, fallback: T): Promise<T> {
    const scopedKey = `${getActiveScopeUserId()}:${key}`;
    try {
      const db = await openDB();
      if (db && db.objectStoreNames.contains(STORE_KV)) {
        const res = await new Promise<any>((resolve) => {
          const tx = db.transaction(STORE_KV, 'readonly');
          const req = tx.objectStore(STORE_KV).get(scopedKey);
          req.onsuccess = () => resolve(req.result?.value);
          req.onerror = () => resolve(undefined);
        });
        if (res !== undefined) return res as T;
      }
    } catch {}
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  },

  /**
   * Remove a synced sale by ID from both IndexedDB and localStorage
   */
  async removeSale(id: string | number): Promise<void> {
    try {
      const db = await openDB();
      if (db) {
        const tx = db.transaction(STORE_SALES, 'readwrite');
        tx.objectStore(STORE_SALES).delete(id);
      }
    } catch {}

    try {
      const existing = JSON.parse(localStorage.getItem('sb_offline_sales') || '[]');
      const remaining = existing.filter((s: any) => String(s.id) !== String(id));
      localStorage.setItem('sb_offline_sales', JSON.stringify(remaining));
    } catch {}
  },

  /**
   * Remove a synced expense by ID from both IndexedDB and localStorage
   */
  async removeExpense(id: string | number): Promise<void> {
    try {
      const db = await openDB();
      if (db) {
        const tx = db.transaction(STORE_EXPENSES, 'readwrite');
        tx.objectStore(STORE_EXPENSES).delete(id);
      }
    } catch {}

    try {
      const existing = JSON.parse(localStorage.getItem('sb_offline_expenses') || '[]');
      const remaining = existing.filter((ex: any) => String(ex.id) !== String(id));
      localStorage.setItem('sb_offline_expenses', JSON.stringify(remaining));
    } catch {}
  },

  /**
   * Load all offline sales from IndexedDB (scoped to active userId, or fallback to localStorage)
   */
  async getAllSales(): Promise<any[]> {
    const scopeId = getActiveScopeUserId();
    const filterScoped = (rows: any[]) =>
      rows.filter((r: any) => !r?.__userId || String(r.__userId) === String(scopeId));
    try {
      const db = await openDB();
      if (db) {
        return new Promise((resolve) => {
          const tx = db.transaction(STORE_SALES, 'readonly');
          const req = tx.objectStore(STORE_SALES).getAll();
          req.onsuccess = () => {
            if (req.result && req.result.length > 0) {
              resolve(filterScoped(req.result));
            } else {
              resolve(filterScoped(JSON.parse(localStorage.getItem('sb_offline_sales') || '[]')));
            }
          };
          req.onerror = () => resolve(filterScoped(JSON.parse(localStorage.getItem('sb_offline_sales') || '[]')));
        });
      }
    } catch {}
    try {
      return filterScoped(JSON.parse(localStorage.getItem('sb_offline_sales') || '[]'));
    } catch {
      return [];
    }
  },

  /**
   * Load all offline expenses from IndexedDB (scoped to active userId, or fallback to localStorage)
   */
  async getAllExpenses(): Promise<any[]> {
    const scopeId = getActiveScopeUserId();
    const filterScoped = (rows: any[]) =>
      rows.filter((r: any) => !r?.__userId || String(r.__userId) === String(scopeId));
    try {
      const db = await openDB();
      if (db) {
        return new Promise((resolve) => {
          const tx = db.transaction(STORE_EXPENSES, 'readonly');
          const req = tx.objectStore(STORE_EXPENSES).getAll();
          req.onsuccess = () => {
            if (req.result && req.result.length > 0) {
              resolve(filterScoped(req.result));
            } else {
              resolve(filterScoped(JSON.parse(localStorage.getItem('sb_offline_expenses') || '[]')));
            }
          };
          req.onerror = () => resolve(filterScoped(JSON.parse(localStorage.getItem('sb_offline_expenses') || '[]')));
        });
      }
    } catch {}
    try {
      return filterScoped(JSON.parse(localStorage.getItem('sb_offline_expenses') || '[]'));
    } catch {
      return [];
    }
  }
};
