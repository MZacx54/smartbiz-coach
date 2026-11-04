import React, { useState, useEffect } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import { Link } from 'react-router-dom';

export const CookieConsent: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem('sb_cookie_consent');
      if (!consent) {
        // Small delay so it doesn't jarringly pop on immediate page load
        const timer = setTimeout(() => setIsVisible(true), 1200);
        return () => clearTimeout(timer);
      }
    } catch {
      // Ignore if localStorage unavailable
    }
  }, []);

  const handleAcceptAll = () => {
    try {
      localStorage.setItem('sb_cookie_consent', 'accepted_all');
    } catch {}
    setIsVisible(false);
  };

  const handleEssentialOnly = () => {
    try {
      localStorage.setItem('sb_cookie_consent', 'essential_only');
    } catch {}
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-[100] animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="bg-slate-900/95 backdrop-blur-md text-white p-5 rounded-3xl shadow-2xl border border-slate-800 flex flex-col gap-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
              NDPR & Privacy Compliance
            </span>
          </div>
          <button
            onClick={handleEssentialOnly}
            className="text-slate-400 hover:text-white p-1 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          SmartBiz Coach uses local device storage and essential security cookies to preserve your day-book sales offline, manage POS receipts, and comply with the Nigeria Data Protection Regulation (NDPR). We do not sell your commercial data.
        </p>

        <div className="flex items-center gap-2 pt-1 flex-wrap">
          <button
            onClick={handleAcceptAll}
            className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs py-2.5 px-4 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
          >
            Accept All
          </button>
          <button
            onClick={handleEssentialOnly}
            className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-all border border-white/10 active:scale-95 cursor-pointer"
          >
            Essential Only
          </button>
          <Link
            to="/privacy"
            className="text-[11px] text-slate-400 hover:text-emerald-400 underline ml-auto transition-colors"
          >
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
