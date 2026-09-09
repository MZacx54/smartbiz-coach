import React, { useState, useEffect } from 'react';
import { Download, Share, PlusSquare, CheckCircle, X, Smartphone } from 'lucide-react';

export const usePWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    // Check if standalone
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      window.location.search.includes('source=pwa');
    setIsInstalled(isStandalone);

    // Check iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice =
      /iphone|ipad|ipod/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(isIosDevice);

    // Catch Chrome/Android/Desktop install prompt
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const triggerInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else if (isIOS && !isInstalled) {
      setShowIOSModal(true);
    } else {
      // Fallback: notify how to bookmark/install
      alert("To install, tap your browser's menu (three dots) and select 'Install app' or 'Add to Home screen'.");
    }
  };

  return {
    canInstall: !isInstalled,
    isInstalled,
    isIOS,
    showIOSModal,
    setShowIOSModal,
    triggerInstall,
  };
};

export const IOSInstallModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl relative border border-emerald-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center shadow-md overflow-hidden">
            <img src="/favicon.png" alt="SmartBiz" className="w-10 h-10 object-contain" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-lg">Install SmartBiz App</h3>
            <p className="text-xs text-emerald-700 font-medium">Install to iPhone/iPad Home Screen</p>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-5 leading-relaxed">
          Install SmartBiz Coach for instant full-screen access, faster speed, and direct login without App Store:
        </p>

        <div className="space-y-3.5 text-sm text-gray-700">
          <div className="flex items-start space-x-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
            <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg shrink-0 mt-0.5">
              <Share className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Step 1: Tap Share</p>
              <p className="text-xs text-gray-500">Tap the Share icon at the bottom of Safari.</p>
            </div>
          </div>

          <div className="flex items-start space-x-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
            <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg shrink-0 mt-0.5">
              <PlusSquare className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Step 2: Add to Home Screen</p>
              <p className="text-xs text-gray-500">Scroll down and select <span className="font-medium text-emerald-700">"Add to Home Screen"</span>.</p>
            </div>
          </div>

          <div className="flex items-start space-x-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
            <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg shrink-0 mt-0.5">
              <CheckCircle className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Step 3: Confirm 'Add'</p>
              <p className="text-xs text-gray-500">Tap <span className="font-medium text-emerald-700">"Add"</span> in the top right corner. You are ready!</p>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-lg shadow-emerald-600/20 transition text-sm"
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
  const { canInstall, isInstalled, showIOSModal, setShowIOSModal, triggerInstall } = usePWAInstall();

  if (isInstalled) return null;

  if (variant === 'hero') {
    return (
      <>
        <button
          onClick={triggerInstall}
          className={`inline-flex items-center justify-center px-6 py-3.5 rounded-xl font-semibold text-sm transition-all shadow-lg hover:shadow-xl active:scale-95 bg-white border border-emerald-200 text-emerald-900 hover:bg-emerald-50 ${className}`}
        >
          <Smartphone className="w-4 h-4 mr-2 text-emerald-600" />
          {label || 'Install Free App on Phone/PC'}
        </button>
        <IOSInstallModal isOpen={showIOSModal} onClose={() => setShowIOSModal(false)} />
      </>
    );
  }

  if (variant === 'nav') {
    return (
      <>
        <button
          onClick={triggerInstall}
          className={`inline-flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition shadow-sm ${className}`}
          title="Install SmartBiz Coach App to your Home Screen"
        >
          <Download className="w-3.5 h-3.5 text-emerald-600" />
          <span>{label || 'Install App'}</span>
        </button>
        <IOSInstallModal isOpen={showIOSModal} onClose={() => setShowIOSModal(false)} />
      </>
    );
  }

  return (
    <>
      <button
        onClick={triggerInstall}
        className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-md ${className}`}
      >
        <Download className="w-4 h-4" />
        <span>{label || 'Install SmartBiz App'}</span>
      </button>
      <IOSInstallModal isOpen={showIOSModal} onClose={() => setShowIOSModal(false)} />
    </>
  );
};
