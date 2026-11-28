/**
 * Centralized Timezone & Date Utilities for SmartBiz Coach
 * 
 * Enforces West Africa Time (WAT: UTC+1, Africa/Lagos) consistently across all
 * merchant surfaces (Cashbook, Dashboard, Invoices, Orders, Audits) to prevent
 * day-boundary divergence between local device time and Nigerian business cutoffs.
 */

export const BUSINESS_TIMEZONE = 'Africa/Lagos';

/**
 * Returns the current or given date formatted as YYYY-MM-DD in West Africa Time (WAT).
 */
export const getBusinessDateStr = (date: Date = new Date()): string => {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: BUSINESS_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  } catch {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
};

/**
 * Returns a future date formatted as YYYY-MM-DD in West Africa Time (WAT).
 */
export const getBusinessDueDateStr = (daysFromNow: number = 15): string => {
  const d = new Date(Date.now() + daysFromNow * 86400000);
  return getBusinessDateStr(d);
};

/**
 * Formats a date or ISO string into a human-readable string in WAT.
 * e.g., "18 Nov 2026, 02:45 WAT"
 */
export const formatBusinessDateTime = (dateOrIso: Date | string | number): string => {
  try {
    const d = typeof dateOrIso === 'string' || typeof dateOrIso === 'number' ? new Date(dateOrIso) : dateOrIso;
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: BUSINESS_TIMEZONE,
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(d) + ' WAT';
  } catch {
    return String(dateOrIso);
  }
};

/**
 * Formats a date or ISO string into a human-readable date in WAT.
 * e.g., "18 Nov 2026"
 */
export const formatBusinessDate = (dateOrIso: Date | string | number): string => {
  try {
    const d = typeof dateOrIso === 'string' || typeof dateOrIso === 'number' ? new Date(dateOrIso) : dateOrIso;
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: BUSINESS_TIMEZONE,
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(d);
  } catch {
    return String(dateOrIso);
  }
};

/**
 * Safely formats a YYYY-MM-DD business calendar date in WAT without
 * UTC-midnight day-shift (which pushes ISO dates back 1 day in western timezones).
 */
export const formatBusinessDateYMD = (
  dateStr: string,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }
): string => {
  try {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      return formatBusinessDate(dateStr);
    }
    const anchor = new Date(`${dateStr.slice(0, 10)}T12:00:00Z`);
    return new Intl.DateTimeFormat('en-NG', {
      timeZone: BUSINESS_TIMEZONE,
      ...options
    }).format(anchor);
  } catch {
    return String(dateStr);
  }
};
