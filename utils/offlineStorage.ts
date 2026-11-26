/**
 * SmartBiz Coach — IndexedDB Resilient Offline Storage Engine
 * Provides structured offline persistence with fallback to localStorage.
 * Ensures sales and expenses recorded during Nigerian market network blackouts
 * are safely stored and never lost.
 */

const DB_NAME = 'SmartBizOfflineDB';
const DB_VERSION = 1;
const STORE_SALES = 'offline_sales';
const STORE_EXPENSES = 'offline_expenses';

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
   * Persist an offline sale to IndexedDB and mirror to localStorage
   */
  async saveSale(sale: any): Promise<void> {
    try {
      const db = await openDB();
      if (db) {
        const tx = db.transaction(STORE_SALES, 'readwrite');
        tx.objectStore(STORE_SALES).put(sale);
      }
    } catch (e) {
      console.warn('IndexedDB saveSale notice:', e);
    }

    // Mirror to localStorage
    try {
      const existing = JSON.parse(localStorage.getItem('sb_offline_sales') || '[]');
      const filtered = existing.filter((s: any) => String(s.id) !== String(sale.id));
      localStorage.setItem('sb_offline_sales', JSON.stringify([sale, ...filtered]));
    } catch {}
  },

  /**
   * Persist an offline expense to IndexedDB and mirror to localStorage
   */
  async saveExpense(expense: any): Promise<void> {
    try {
      const db = await openDB();
      if (db) {
        const tx = db.transaction(STORE_EXPENSES, 'readwrite');
        tx.objectStore(STORE_EXPENSES).put(expense);
      }
    } catch (e) {
      console.warn('IndexedDB saveExpense notice:', e);
    }

    // Mirror to localStorage
    try {
      const existing = JSON.parse(localStorage.getItem('sb_offline_expenses') || '[]');
      const filtered = existing.filter((ex: any) => String(ex.id) !== String(expense.id));
      localStorage.setItem('sb_offline_expenses', JSON.stringify([expense, ...filtered]));
    } catch {}
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
   * Load all offline sales from IndexedDB (or fallback to localStorage)
   */
  async getAllSales(): Promise<any[]> {
    try {
      const db = await openDB();
      if (db) {
        return new Promise((resolve) => {
          const tx = db.transaction(STORE_SALES, 'readonly');
          const req = tx.objectStore(STORE_SALES).getAll();
          req.onsuccess = () => {
            if (req.result && req.result.length > 0) {
              resolve(req.result);
            } else {
              // Fallback to localStorage
              resolve(JSON.parse(localStorage.getItem('sb_offline_sales') || '[]'));
            }
          };
          req.onerror = () => resolve(JSON.parse(localStorage.getItem('sb_offline_sales') || '[]'));
        });
      }
    } catch {}
    try {
      return JSON.parse(localStorage.getItem('sb_offline_sales') || '[]');
    } catch {
      return [];
    }
  },

  /**
   * Load all offline expenses from IndexedDB (or fallback to localStorage)
   */
  async getAllExpenses(): Promise<any[]> {
    try {
      const db = await openDB();
      if (db) {
        return new Promise((resolve) => {
          const tx = db.transaction(STORE_EXPENSES, 'readonly');
          const req = tx.objectStore(STORE_EXPENSES).getAll();
          req.onsuccess = () => {
            if (req.result && req.result.length > 0) {
              resolve(req.result);
            } else {
              resolve(JSON.parse(localStorage.getItem('sb_offline_expenses') || '[]'));
            }
          };
          req.onerror = () => resolve(JSON.parse(localStorage.getItem('sb_offline_expenses') || '[]'));
        });
      }
    } catch {}
    try {
      return JSON.parse(localStorage.getItem('sb_offline_expenses') || '[]');
    } catch {
      return [];
    }
  }
};
