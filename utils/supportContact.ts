const RAW_WA_SUPPORT = (import.meta.env.VITE_WA_DIRECT_SUPPORT || '').trim();

const normalizeNigerianDigits = (raw: string): string => {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0') && digits.length === 11) {
    return `234${digits.slice(1)}`;
  }
  if (digits.length === 10 && /^[789]/.test(digits)) {
    return `234${digits}`;
  }
  return digits;
};

export const getSupportDigits = (): string => {
  if (!RAW_WA_SUPPORT) return '';
  if (RAW_WA_SUPPORT.startsWith('http')) {
    const match = RAW_WA_SUPPORT.match(/wa\.me\/(\d+)/i);
    return match ? match[1] : '';
  }
  return normalizeNigerianDigits(RAW_WA_SUPPORT);
};

export const getSupportDisplayPhone = (): string => {
  const digits = getSupportDigits();
  if (!digits) return '';
  return digits.startsWith('234') ? `+${digits}` : digits;
};

export const getSupportWhatsAppUrl = (defaultMessage = 'Hello SmartBiz Coach Support'): string => {
  if (!RAW_WA_SUPPORT) return '/contact';
  if (RAW_WA_SUPPORT.startsWith('http')) {
    if (RAW_WA_SUPPORT.includes('text=')) return RAW_WA_SUPPORT;
    const sep = RAW_WA_SUPPORT.includes('?') ? '&' : '?';
    return `${RAW_WA_SUPPORT}${sep}text=${encodeURIComponent(defaultMessage)}`;
  }
  const digits = normalizeNigerianDigits(RAW_WA_SUPPORT);
  if (!digits) return '/contact';
  return `https://wa.me/${digits}?text=${encodeURIComponent(defaultMessage)}`;
};
