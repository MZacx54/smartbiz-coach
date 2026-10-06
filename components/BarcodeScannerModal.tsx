import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, Volume2, VolumeX, RefreshCw, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (scannedCode: string) => void;
  title?: string;
  description?: string;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  title = "Scan Product Barcode / QR Code",
  description = "Point your phone camera at the barcode or packaging to scan instantly."
}) => {
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [manualCode, setManualCode] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'interactive-barcode-scanner';

  // Sound beep on successful scan
  const playScanBeep = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // 880 Hz beep (A5)
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch {
      // Audio not permitted or not supported
    }
  };

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      return;
    }

    let isMounted = true;

    const startScanner = async () => {
      setScannerError(null);
      setIsScanning(true);

      // Small delay to ensure modal DOM is mounted
      await new Promise(r => setTimeout(r, 300));
      if (!isMounted) return;

      try {
        const scanner = new Html5Qrcode(containerId);
        scannerRef.current = scanner;

        const config = {
          fps: 15,
          qrbox: { width: 260, height: 260 },
          aspectRatio: 1.0,
        };

        await scanner.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            playScanBeep();
            toast.success(`Scanned: ${decodedText}`, { icon: '🏷️' });
            stopScanner();
            onScan(decodedText);
            onClose();
          },
          () => {
            // Frame scan without barcode match, continue listening
          }
        );
      } catch (err: any) {
        console.warn('Barcode camera access error:', err);
        setScannerError(
          err?.message?.includes('Permission')
            ? 'Camera permission denied. Please allow camera access in your browser settings or enter the code manually.'
            : 'Camera could not be started. You can type the barcode/SKU manually below.'
        );
        setIsScanning(false);
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [isOpen]);

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (e) {
        console.warn('Error clearing scanner:', e);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    playScanBeep();
    onScan(manualCode.trim());
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl text-white">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white">{title}</h3>
              <p className="text-[11px] text-slate-400 leading-tight">{description}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={soundEnabled ? "Mute scan beep" : "Enable scan beep"}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              onClick={() => {
                stopScanner();
                onClose();
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewport / Scanner container */}
        <div className="p-4 sm:p-6 bg-slate-950 flex flex-col items-center">
          <div className="relative w-full max-w-[320px] aspect-square rounded-2xl overflow-hidden bg-slate-900 border-2 border-dashed border-emerald-500/50 flex items-center justify-center shadow-inner">
            <div id={containerId} className="w-full h-full" />

            {/* Laser scanning beam overlay animation */}
            {isScanning && !scannerError && (
              <div className="pointer-events-none absolute inset-x-6 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#10b981] animate-pulse top-1/2 -translate-y-1/2" />
            )}

            {scannerError && (
              <div className="absolute inset-0 p-4 bg-slate-900/95 flex flex-col items-center justify-center text-center">
                <span className="text-3xl mb-2">📷</span>
                <p className="text-xs font-semibold text-rose-400 mb-3">{scannerError}</p>
                <button
                  onClick={() => {
                    stopScanner();
                    setTimeout(() => {
                      const scanner = new Html5Qrcode(containerId);
                      scannerRef.current = scanner;
                      scanner.start(
                        { facingMode: "environment" },
                        { fps: 15, qrbox: { width: 260, height: 260 } },
                        (text) => {
                          playScanBeep();
                          onScan(text);
                          onClose();
                        },
                        () => {}
                      ).catch(() => setScannerError("Camera not accessible. Please enter code manually."));
                    }, 300);
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 text-slate-200"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Retry Camera
                </button>
              </div>
            )}
          </div>

          <p className="text-[11px] text-slate-400 mt-3 text-center">
            Supports EAN-13, UPC, Code 128, QR Code, and retail packaging barcodes.
          </p>
        </div>

        {/* Manual fallback input */}
        <div className="p-4 sm:p-5 bg-slate-900 border-t border-slate-800">
          <form onSubmit={handleManualSubmit} className="space-y-2">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Or Type Barcode / SKU Manually
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="e.g. 6151234567890 or TEX-ANK-001"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-extrabold rounded-xl transition-all shadow-md shadow-emerald-600/20"
              >
                Enter
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};

export default BarcodeScannerModal;
