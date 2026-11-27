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
const LS_SALES_KEY = 'sb_offline_sales';
const LS_EXPENSES_KEY = 'sb_offline_expenses';

function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore storage quota or private browsing errors
  }
}

function readLocalArray(key: string): any[] {
  try {
    const raw = safeGetItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getActiveScopeUserId(): string {
  return safeGetItem('sb_active_user_id') || 'anon';
}

function filterStrictlyByActiveUser(rows: any[], scopeId: string = getActiveScopeUserId()): any[] {
  if (!Array.isArray(rows)) return [];
  return rows.filter((r: any) => Boolean(r?.__userId) && String(r.__userId) === String(scopeId));
}

function withTenantScope(record: any) {
  const userId = record?.__userId || getActiveScopeUserId();
  const id = record?.id || `offline-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const offlineId = record?.offline_id || String(id);
  return { ...record, id, offline_id: offlineId, __userId: String(userId) };
}

function stripInternalSyncFields(record: any): Record<string, any> {
  const {
    id,
    __userId,
    __syncFailed,
    __syncError,
    __syncFailedAt,
    ...rest
  } = record || {};
  return {
    ...rest,
    offline_id: rest.offline_id || String(id || ''),
  };
}

function isPermanentClientError(status?: number): boolean {
  return Boolean(
    status &&
    status >= 400 &&
    status < 500 &&
    status !== 401 &&
    status !== 408 &&
    status !== 429
  );
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
  /**
   * Sync offline queue items to the server.
   * Retries only on 5xx or network errors; marks items as "failed" on 4xx (400, 403, 404, 422).
   */
  async syncOfflineQueue(
    apiPost: (endpoint: string, data: any) => Promise<any>
  ): Promise<{ synced: number; failed: number }> {
    const sales = await this.getAllSales();
    const expenses = await this.getAllExpenses();
    let synced = 0;
    let failed = 0;

    for (const sale of sales) {
      if (sale.__syncFailed) { failed++; continue; }
      try {
        await apiPost('marketplace/daily-sales/', sale);
        await this.removeSale(sale.id);
        synced++;
      } catch (err: any) {
        const status = err?.response?.status;
        if (status && status >= 400 && status < 500) {
          // Client error — mark as permanently failed, do not retry
          sale.__syncFailed = true;
          sale.__syncError = `HTTP ${status}`;
          await this.saveSale(sale);
          failed++;
        }
        // 5xx or network error — leave in queue for next retry cycle
      }
    }

    for (const expense of expenses) {
      if (expense.__syncFailed) { failed++; continue; }
      try {
        await apiPost('marketplace/daily-expenses/', expense);
        await this.removeExpense(expense.id);
        synced++;
      } catch (err: any) {
        const status = err?.response?.status;
        if (status && status >= 400 && status < 500) {
          expense.__syncFailed = true;
          expense.__syncError = `HTTP ${status}`;
          await this.saveExpense(expense);
          failed++;
        }
      }
    }

    return { synced, failed };
  },

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
