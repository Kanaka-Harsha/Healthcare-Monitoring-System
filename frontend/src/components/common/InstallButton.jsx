import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X, Check } from 'lucide-react';

let globalDeferredPrompt = null;

export const usePwaInstall = () => {
  const [isInstallable, setIsInstallable] = useState(Boolean(globalDeferredPrompt));
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already in standalone / installed mode
    const checkIsStandalone = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                           window.navigator.standalone === true;
      setIsInstalled(isStandalone);
    };

    checkIsStandalone();

    // Detect iOS devices
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      globalDeferredPrompt = e;
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      globalDeferredPrompt = null;
      setIsInstallable(false);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const triggerInstall = async (onShowIosGuide) => {
    if (globalDeferredPrompt) {
      globalDeferredPrompt.prompt();
      const { outcome } = await globalDeferredPrompt.userChoice;
      if (outcome === 'accepted') {
        globalDeferredPrompt = null;
        setIsInstallable(false);
        setIsInstalled(true);
      }
    } else if (isIOS && onShowIosGuide) {
      onShowIosGuide();
    }
  };

  return {
    isInstallable,
    isInstalled,
    isIOS,
    triggerInstall
  };
};

export const InstallModalIOS = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-sm bg-white rounded-xl shadow-2xl p-6 border border-slate-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <img src="/icon-192.png" alt="App Icon" className="w-12 h-12 rounded-lg shadow-sm border border-teal-100" />
          <div>
            <h3 className="text-base font-bold text-slate-900">Install SwastGrama</h3>
            <p className="text-xs text-slate-500">Install on your iPhone / iPad</p>
          </div>
        </div>

        <div className="space-y-3 text-xs text-slate-700 bg-slate-50 p-4 rounded-lg border border-slate-200">
          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-teal-700 text-white flex items-center justify-center font-bold text-[11px] flex-shrink-0">1</span>
            <p>Tap the <strong>Share</strong> button (square with arrow up) at the bottom of Safari.</p>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-teal-700 text-white flex items-center justify-center font-bold text-[11px] flex-shrink-0">2</span>
            <p>Scroll down and select <strong>"Add to Home Screen"</strong>.</p>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-teal-700 text-white flex items-center justify-center font-bold text-[11px] flex-shrink-0">3</span>
            <p>Tap <strong>Add</strong> in the top right. Launch directly from your home screen in full screen!</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-5 py-2.5 rounded-lg bg-teal-800 hover:bg-teal-900 text-white font-semibold text-xs transition"
        >
          Got it!
        </button>
      </div>
    </div>
  );
};

export const InstallAppButton = ({ className = '', variant = 'navbar' }) => {
  const { isInstallable, isInstalled, isIOS, triggerInstall } = usePwaInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);

  // If already installed as standalone app, hide button
  if (isInstalled) {
    return null;
  }

  // If not installable and not iOS, hide button unless in dev/demo mode
  if (!isInstallable && !isIOS) {
    return null;
  }

  const handleClick = () => {
    triggerInstall(() => setShowIOSModal(true));
  };

  if (variant === 'prominent') {
    return (
      <>
        <button
          type="button"
          onClick={handleClick}
          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs shadow-md hover:shadow transition ${className}`}
        >
          <Download className="w-4 h-4 animate-bounce" />
          <span>Install App on Phone</span>
        </button>
        <InstallModalIOS isOpen={showIOSModal} onClose={() => setShowIOSModal(false)} />
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        title="Install SwastGrama App on your device"
        className={`flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded text-xs font-semibold bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300 hover:border-teal-400 transition flex-shrink-0 ${className}`}
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Install App</span>
        <span className="sm:hidden">Install</span>
      </button>
      <InstallModalIOS isOpen={showIOSModal} onClose={() => setShowIOSModal(false)} />
    </>
  );
};

export default InstallAppButton;
