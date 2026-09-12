import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Product, CurrencyCode } from '../types';
import { formatCurrency } from '../utils/calculations';
import { 
  X, 
  Camera, 
  Barcode, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Volume2,
  VolumeX,
  Keyboard
} from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  currency: CurrencyCode;
  onProductScanned: (product: Product) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  products,
  currency,
  onProductScanned,
}) => {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [matchedProduct, setMatchedProduct] = useState<Product | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [manualCode, setManualCode] = useState('');
  const [scanCooldown, setScanCooldown] = useState(false);

  const qrCodeInstanceRef = useRef<Html5Qrcode | null>(null);
  const readerElementId = 'smartledger-barcode-viewport';

  const playBeep = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      // AudioContext policy
    }
  };

  const handleBarcodeDecoded = (code: string) => {
    if (scanCooldown) return;
    const cleanCode = code.trim();
    if (!cleanCode) return;

    setScanCooldown(true);
    setTimeout(() => setScanCooldown(false), 1500); // 1.5s cooldown to prevent multiple rapid triggers

    setLastScannedCode(cleanCode);

    // Query inventory for matching barcode, SKU, or ID
    const found = products.find(
      (p) => 
        (p.barcode && p.barcode.trim() === cleanCode) ||
        p.id === cleanCode ||
        p.name.toLowerCase() === cleanCode.toLowerCase()
    );

    if (found) {
      setMatchedProduct(found);
      playBeep();
      onProductScanned(found);
    } else {
      setMatchedProduct(null);
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (qrCodeInstanceRef.current) {
        try {
          await qrCodeInstanceRef.current.stop();
          qrCodeInstanceRef.current.clear();
        } catch {}
      }

      const html5QrCode = new Html5Qrcode(readerElementId);
      qrCodeInstanceRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 15,
          qrbox: { width: 280, height: 180 },
          aspectRatio: 1.333,
        },
        (decodedText) => {
          handleBarcodeDecoded(decodedText);
        },
        () => {
          // Frame evaluation error (standard for frames with no barcode)
        }
      );

      setCameraActive(true);
    } catch (err: any) {
      console.warn('Barcode camera start note:', err);
      setCameraActive(false);
      setCameraError(
        err?.message || 'Camera permission denied or camera unavailable in this environment. You can enter barcodes manually below.'
      );
    }
  };

  const stopCamera = async () => {
    if (qrCodeInstanceRef.current) {
      try {
        if (qrCodeInstanceRef.current.isScanning) {
          await qrCodeInstanceRef.current.stop();
        }
        qrCodeInstanceRef.current.clear();
      } catch (err) {
        console.warn('Stop camera error:', err);
      }
      qrCodeInstanceRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleBarcodeDecoded(manualCode);
    setManualCode('');
  };

  if (!isOpen) return null;

  return (
    <div 
      id="barcode-scanner-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 px-5 py-4 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Barcode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold font-['Outfit',sans-serif]">
                Scan Product Barcode / QR
              </h3>
              <p className="text-xs text-slate-400">Instant POS Ring-up</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute Beep' : 'Unmute Beep'}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewport Area */}
        <div className="p-4 sm:p-5 flex flex-col items-center space-y-4 overflow-y-auto">
          {/* Camera Frame */}
          <div className="relative w-full aspect-[4/3] bg-slate-950 rounded-xl overflow-hidden shadow-inner flex items-center justify-center border-2 border-slate-800">
            <div id={readerElementId} className="w-full h-full" />

            {/* Target Scanning Overlay Laser */}
            {cameraActive && !cameraError && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <div className="w-64 h-36 border-2 border-emerald-400/80 rounded-lg relative overflow-hidden shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                  {/* Laser line animation */}
                  <div className="w-full h-0.5 bg-emerald-400 shadow-[0_0_8px_#34d399] absolute top-0 animate-bounce" />
                  <div className="absolute top-1 left-2 text-[10px] font-mono text-emerald-400/90 font-bold tracking-wider">
                    ALIGN BARCODE
                  </div>
                </div>
              </div>
            )}

            {/* Error or Fallback state */}
            {cameraError && (
              <div className="absolute inset-0 p-5 bg-slate-900/90 flex flex-col items-center justify-center text-center space-y-2 text-slate-300">
                <AlertCircle className="w-8 h-8 text-amber-400" />
                <p className="text-xs font-semibold text-slate-200">Camera Inaccessible</p>
                <p className="text-[11px] text-slate-400 max-w-xs">{cameraError}</p>
                <button
                  onClick={startCamera}
                  className="mt-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 text-white transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Camera</span>
                </button>
              </div>
            )}
          </div>

          {/* Real-time Match Feedback */}
          {lastScannedCode && (
            <div className="w-full animate-fade-in">
              {matchedProduct ? (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-emerald-950">
                        {matchedProduct.name}
                      </h4>
                      <p className="text-[11px] text-emerald-700">
                        Added to cart &bull; {formatCurrency(matchedProduct.sellingPrice, currency)} &bull; Stock: {matchedProduct.stock}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono bg-emerald-200/60 text-emerald-900 px-2 py-0.5 rounded font-bold">
                    +1 Qty
                  </span>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-2 text-amber-900">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-bold">Unknown Barcode: {lastScannedCode}</p>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      No item in inventory has this barcode or ID.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Manual Barcode Entry Fallback (USB scanner or typing) */}
          <form onSubmit={handleManualSubmit} className="w-full space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Keyboard className="w-3.5 h-3.5" />
                Manual Code / USB Scanner:
              </span>
              <span className="text-[10px]">Press Enter to add</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Scan or type barcode (e.g. 7891234567)"
                className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Scan
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs">
          <span className="text-slate-500 text-[11px]">
            Supports UPC, EAN-13, Code 128, & QR
          </span>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all cursor-pointer"
          >
            Back to Cart
          </button>
        </div>
      </div>
    </div>
  );
};
