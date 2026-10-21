import React, { useState, useEffect } from 'react';
import { Download, Share, PlusSquare, CheckCircle, X, Smartphone, Monitor, MoreVertical } from 'lucide-react';

export const usePWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>((window as any).__deferredPwaPrompt || null);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    return (
      (window as any).__pwaIsInstalled ||
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      window.location.search.includes('source=pwa')
    );
  });
  const [isIOS, setIsIOS] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  useEffect(() => {
    // Check if standalone
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      window.location.search.includes('source=pwa');
    if (isStandalone) setIsInstalled(true);

    // Check iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice =
      /iphone|ipad|ipod/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(isIosDevice);

    // Pick up early prompt if already captured before React mount
    if ((window as any).__deferredPwaPrompt && !deferredPrompt) {
      setDeferredPrompt((window as any).__deferredPwaPrompt);
    }

    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      (window as any).__deferredPwaPrompt = e;
      setDeferredPrompt(e);
    };

    const handlePromptReady = () => {
      if ((window as any).__deferredPwaPrompt) {
        setDeferredPrompt((window as any).__deferredPwaPrompt);
      }
    };

    const handleInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      (window as any).__deferredPwaPrompt = null;
      setShowInstallGuide(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('smartbiz_pwa_prompt_ready', handlePromptReady);
    window.addEventListener('appinstalled', handleInstalled);
    window.addEventListener('smartbiz_pwa_installed', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('smartbiz_pwa_prompt_ready', handlePromptReady);
      window.removeEventListener('appinstalled', handleInstalled);
      window.removeEventListener('smartbiz_pwa_installed', handleInstalled);
    };
  }, []);

  const triggerInstall = async () => {
    const promptToUse = deferredPrompt || (window as any).__deferredPwaPrompt;
    if (promptToUse) {
      try {
        promptToUse.prompt();
        const choice = await promptToUse.userChoice;
        if (choice?.outcome === 'accepted') {
          setIsInstalled(true);
        }
        setDeferredPrompt(null);
        (window as any).__deferredPwaPrompt = null;
      } catch (err) {
        setShowInstallGuide(true);
      }
    } else {
      setShowInstallGuide(true);
    }
  };

  return {
    canInstall: !isInstalled,
    isInstalled,
    isIOS,
    showInstallGuide,
    setShowInstallGuide,
    triggerInstall,
  };
};

export const PWAInstallModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  isIOS: boolean;
}> = ({ isOpen, onClose, isIOS }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl relative border border-emerald-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-md overflow-hidden p-2">
            <img src="/favicon.png" alt="SmartBiz" className="w-full h-full object-contain" />
          </div>
          <div>
            <h3 className="font-extrabold text-gray-900 text-lg">Install SmartBiz App</h3>
            <p className="text-xs text-emerald-700 font-semibold">
              {isIOS ? 'iPhone / iPad Installation' : 'Android & Chrome / Edge Install'}
            </p>
          </div>
        </div>

        <p className="text-xs text-gray-600 mb-5 leading-relaxed">
          {isIOS
            ? 'Install SmartBiz to your home screen for full-screen mode, 5x faster speeds, and open market offline POS access:'
            : 'Get the official native app on your phone or PC with zero Play Store storage requirements:'}
        </p>

        {isIOS ? (
          <div className="space-y-3 text-xs text-gray-700">
            <div className="flex items-start space-x-3 bg-gray-50 p-3 rounded-2xl border border-gray-100">
              <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl shrink-0 mt-0.5">
                <Share className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-gray-900">Step 1: Tap Share</p>
                <p className="text-[11px] text-gray-500">Tap the Share icon at the bottom bar of Safari.</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 bg-gray-50 p-3 rounded-2xl border border-gray-100">
              <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl shrink-0 mt-0.5">
                <PlusSquare className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-gray-900">Step 2: Add to Home Screen</p>
                <p className="text-[11px] text-gray-500">
                  Scroll down and tap <span className="font-bold text-emerald-700">"Add to Home Screen"</span>.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 bg-gray-50 p-3 rounded-2xl border border-gray-100">
              <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl shrink-0 mt-0.5">
                <CheckCircle className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-gray-900">Step 3: Confirm 'Add'</p>
                <p className="text-[11px] text-gray-500">
                  Tap <span className="font-bold text-emerald-700">"Add"</span> in the top right. Done!
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-xs text-gray-700">
            <div className="flex items-start space-x-3 bg-gray-50 p-3 rounded-2xl border border-gray-100">
              <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl shrink-0 mt-0.5">
                <MoreVertical className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-gray-900">Step 1: Open Browser Menu</p>
                <p className="text-[11px] text-gray-500">Tap the 3 dots in the top right corner of Chrome or Edge.</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 bg-gray-50 p-3 rounded-2xl border border-gray-100">
              <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl shrink-0 mt-0.5">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-gray-900">Step 2: Tap "Install App"</p>
                <p className="text-[11px] text-gray-500">
                  Select <span className="font-bold text-emerald-700">"Install app"</span> or <span className="font-bold text-emerald-700">"Add to Home screen"</span>.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 bg-gray-50 p-3 rounded-2xl border border-gray-100">
              <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl shrink-0 mt-0.5">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-gray-900">Step 3: Open SmartBiz</p>
                <p className="text-[11px] text-gray-500">Access your store & POS directly from your home screen like any native app!</p>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full mt-6 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold shadow-lg shadow-emerald-600/20 transition text-xs"
        >
          Got It, Let's Go!
        </button>
      </div>
    </div>
  );
};

export const PWAInstallButton: React.FC<{
  className?: string;
  variant?: 'nav' | 'hero' | 'floating' | 'banner';
  label?: string;
}> = ({ className = '', variant = 'nav', label }) => {
  const { isInstalled, isIOS, showInstallGuide, setShowInstallGuide, triggerInstall } = usePWAInstall();

  if (isInstalled) return null;

  if (variant === 'hero') {
    return (
      <>
        <button
          onClick={triggerInstall}
          className={`inline-flex items-center justify-center px-6 py-3.5 rounded-2xl font-bold text-sm transition-all shadow-lg hover:shadow-xl active:scale-95 bg-white border-2 border-emerald-300 text-emerald-900 hover:bg-emerald-50 ${className}`}
        >
          <Smartphone className="w-4 h-4 mr-2 text-emerald-600" />
          {label || 'Install Free App on Phone / PC'}
        </button>
        <PWAInstallModal
          isOpen={showInstallGuide}
          onClose={() => setShowInstallGuide(false)}
          isIOS={isIOS}
        />
      </>
    );
  }

  if (variant === 'nav') {
    return (
      <>
        <button
          onClick={triggerInstall}
          className={`inline-flex items-center space-x-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition shadow-sm ${className}`}
          title="Install SmartBiz Coach App to your Home Screen"
        >
          <Download className="w-3.5 h-3.5 text-emerald-600" />
          <span>{label || 'Install App'}</span>
        </button>
        <PWAInstallModal
          isOpen={showInstallGuide}
          onClose={() => setShowInstallGuide(false)}
          isIOS={isIOS}
        />
      </>
    );
  }

  if (variant === 'banner') {
    return (
      <>
        <div className={`bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-4 py-2.5 rounded-2xl flex items-center justify-between shadow-lg ${className}`}>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Smartphone className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold leading-tight">Install SmartBiz App</p>
              <p className="text-[10px] text-emerald-100">Works 100% offline in open markets & instant checkout</p>
            </div>
          </div>
          <button
            onClick={triggerInstall}
            className="px-3 py-1.5 bg-white text-emerald-800 font-bold text-xs rounded-xl hover:bg-emerald-50 shadow-sm active:scale-95 transition"
          >
            Install Free
          </button>
        </div>
        <PWAInstallModal
          isOpen={showInstallGuide}
          onClose={() => setShowInstallGuide(false)}
          isIOS={isIOS}
        />
      </>
    );
  }

  return (
    <>
      <button
        onClick={triggerInstall}
        className={`inline-flex items-center space-x-2 px-4 py-2 rounded-2xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-md ${className}`}
      >
        <Download className="w-4 h-4" />
        <span>{label || 'Install SmartBiz App'}</span>
      </button>
      <PWAInstallModal
        isOpen={showInstallGuide}
        onClose={() => setShowInstallGuide(false)}
        isIOS={isIOS}
      />
    </>
  );
};
