/**
 * SmartBiz Design System (Phase 1)
 * One small kit used by every redesigned screen so spacing, colours and tap
 * targets stay consistent.
 *   emerald = primary / success   amber = caution   rose = danger   slate = neutral
 * All interactive elements have a minimum 44px tap target.
 */
import React from 'react';

type Tone = 'emerald' | 'amber' | 'rose' | 'blue' | 'slate' | 'purple';

const TONES: Record<Tone, { bg: string; text: string; border: string; soft: string }> = {
  emerald: { bg: 'bg-emerald-600', text: 'text-emerald-700', border: 'border-emerald-100', soft: 'bg-emerald-50' },
  amber: { bg: 'bg-amber-500', text: 'text-amber-700', border: 'border-amber-100', soft: 'bg-amber-50' },
  rose: { bg: 'bg-rose-600', text: 'text-rose-700', border: 'border-rose-100', soft: 'bg-rose-50' },
  blue: { bg: 'bg-blue-600', text: 'text-blue-700', border: 'border-blue-100', soft: 'bg-blue-50' },
  slate: { bg: 'bg-slate-800', text: 'text-slate-700', border: 'border-slate-100', soft: 'bg-slate-50' },
  purple: { bg: 'bg-purple-600', text: 'text-purple-700', border: 'border-purple-100', soft: 'bg-purple-50' },
};

/* ---------- Card ---------- */
export const Card: React.FC<{
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  padded?: boolean;
}> = ({ children, className = '', onClick, padded = true }) => (
  <div
    onClick={onClick}
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
    onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
    className={`bg-white rounded-3xl border border-slate-100 shadow-sm ${padded ? 'p-4 sm:p-5' : ''} ${
      onClick ? 'cursor-pointer hover:shadow-md hover:border-slate-200 active:scale-[0.99] transition-all' : ''
    } ${className}`}
  >
    {children}
  </div>
);

/* ---------- Button ---------- */
export const Button: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'md' | 'lg';
  full?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit';
  className?: string;
  title?: string;
}> = ({ children, onClick, variant = 'primary', size = 'md', full, disabled, type = 'button', className = '', title }) => {
  const styles = {
    primary: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20',
    secondary: 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-200',
    ghost: 'bg-transparent hover:bg-slate-100 text-slate-600',
    danger: 'bg-rose-600 hover:bg-rose-500 text-white',
  }[variant];
  const sizes = size === 'lg' ? 'min-h-[56px] px-6 text-base' : 'min-h-[44px] px-4 text-sm';
  return (
    <button
      type={type}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`${styles} ${sizes} ${full ? 'w-full' : ''} rounded-2xl font-bold inline-flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${className}`}
    >
      {children}
    </button>
  );
};

/* ---------- StatTile ---------- */
export const StatTile: React.FC<{
  label: string;
  value?: string;
  hint?: string;
  icon?: string;
  tone?: Tone;
  loading?: boolean;
  onClick?: () => void;
}> = ({ label, value, hint, icon, tone = 'slate', loading, onClick }) => {
  const t = TONES[tone];
  return (
    <Card onClick={onClick} className={`border ${t.border}`}>
      <div className="flex items-center gap-2">
        {icon && <span className={`w-8 h-8 rounded-xl ${t.soft} flex items-center justify-center text-base`}>{icon}</span>}
        <p className="text-xs font-bold text-slate-500">{label}</p>
      </div>
      {loading ? (
        <Skeleton className="h-7 w-24 mt-3" />
      ) : (
        <p className={`text-xl sm:text-2xl font-black mt-2 ${t.text}`}>{value ?? '—'}</p>
      )}
      {hint && !loading && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
    </Card>
  );
};

/* ---------- Skeleton ---------- */
export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-200/70 rounded-xl ${className}`} />
);

/* ---------- EmptyState ---------- */
export const EmptyState: React.FC<{
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ icon = '✨', title, description, actionLabel, onAction }) => (
  <div className="text-center py-10 px-4">
    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto text-3xl mb-3">{icon}</div>
    <h3 className="text-base font-extrabold text-slate-800">{title}</h3>
    {description && <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">{description}</p>}
    {actionLabel && onAction && (
      <div className="mt-4">
        <Button onClick={onAction}>{actionLabel}</Button>
      </div>
    )}
  </div>
);

/* ---------- PageHeader ---------- */
export const PageHeader: React.FC<{
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}> = ({ title, subtitle, action }) => (
  <div className="flex items-start justify-between gap-3 mb-4">
    <div>
      <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-heading">{title}</h1>
      {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
    {action}
  </div>
);
