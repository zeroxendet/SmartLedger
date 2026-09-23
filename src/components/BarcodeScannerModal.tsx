import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Product, ProductVariant, CurrencyCode } from '../types';
import { formatCurrency } from '../utils/calculations';
import { 
  findProductByBarcode, 
  cleanBarcode, 
  playBarcodeSuccessFeedback,
  useBarcodeKeyboardScanner
} from '../utils/barcodeUtils';
import { 
  X, 
  Camera, 
  Barcode, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Volume2,
  VolumeX,
  Keyboard,
  Plus,
  ArrowRight,
  Sparkles,
  ShoppingBag,
  ShoppingCart
} from 'lucide-react';

export interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'sales' | 'capture'; // 'sales' finds product for POS, 'capture' returns barcode string to form
  products?: Product[];
  currency?: CurrencyCode;
  cartCount?: number; // current total items in cart
  onProductScanned?: (product: Product, variant?: ProductVariant) => void;
  onBarcodeCaptured?: (barcode: string) => void;
  onAddNewProductWithBarcode?: (barcode: string) => void;
  onSellProduct?: (product: Product, quantity: number, variant?: ProductVariant) => void;
  title?: string;
  subtitle?: string;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  mode = 'sales',
  products = [],
  currency = 'RWF',
  cartCount = 0,
  onProductScanned,
  onBarcodeCaptured,
  onAddNewProductWithBarcode,
  onSellProduct,
  title,
  subtitle,
}) => {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [matchedProduct, setMatchedProduct] = useState<Product | null>(null);
  const [matchedVariant, setMatchedVariant] = useState<ProductVariant | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [manualCode, setManualCode] = useState('');
  const [scanCooldown, setScanCooldown] = useState(false);
  const [isUnknownBarcode, setIsUnknownBarcode] = useState(false);
  const [scannedTimes, setScannedTimes] = useState(0);

  const qrCodeInstanceRef = useRef<Html5Qrcode | null>(null);
  const readerElementId = 'smartledger-barcode-viewport';

  const handleBarcodeDecoded = useCallback((code: string) => {
    if (scanCooldown) return;
    const cleanCode = cleanBarcode(code);
    if (!cleanCode) return;

    setScanCooldown(true);
    setTimeout(() => setScanCooldown(false), 1200); // 1.2s cooldown to prevent accidental rapid repeat triggers

    setLastScannedCode(cleanCode);

    if (soundEnabled) {
      playBarcodeSuccessFeedback();
    }

    // 1. CAPTURE MODE (Add Product / Edit Product)
    if (mode === 'capture') {
      if (onBarcodeCaptured) {
        onBarcodeCaptured(cleanCode);
      }
      onClose();
      return;
    }

    // 2. SALES / POS MODE
    const match = findProductByBarcode(products, cleanCode);
    if (match) {
      setMatchedProduct((prev) => {
        if (prev && prev.id === match.product.id) {
          setScannedTimes((t) => t + 1);
        } else {
          setScannedTimes(1);
        }
        return match.product;
      });
      setMatchedVariant(match.variant || null);
      setIsUnknownBarcode(false);

      if (onProductScanned) {
        onProductScanned(match.product, match.variant);
      }
    } else {
      setMatchedProduct(null);
      setMatchedVariant(null);
      setIsUnknownBarcode(true);
      setScannedTimes(0);
    }
  }, [scanCooldown, soundEnabled, mode, products, onBarcodeCaptured, onProductScanned, onClose]);

  // Support USB and Bluetooth barcode scanners
  useBarcodeKeyboardScanner({
    onScan: (code) => {
      if (isOpen) {
        handleBarcodeDecoded(code);
      }
    },
    enabled: isOpen,
  });

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

  const startCamera = async () => {
    setCameraError(null);
    try {
      await stopCamera();

      // Ensure DOM element is present
      const container = document.getElementById(readerElementId);
      if (!container) {
        setTimeout(startCamera, 100);
        return;
      }

      // Prioritize common retail 1D formats and 2D QR codes
      const formatsToSupport = [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.ITF,
      ];

      const html5QrCode = new Html5Qrcode(readerElementId, {
        formatsToSupport,
        verbose: false,
      });
      qrCodeInstanceRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 15,
          qrbox: { width: 280, height: 160 },
          aspectRatio: 1.333,
        },
        (decodedText) => {
          handleBarcodeDecoded(decodedText);
        },
        () => {
          // Standard no-barcode frame scan
        }
      );

      setCameraActive(true);
    } catch (err: any) {
      console.warn('Barcode camera startup error:', err);
      setCameraActive(false);
      const isDenied = err?.name === 'NotAllowedError' || String(err).includes('Permission denied');
      setCameraError(
        isDenied
          ? 'Camera access was denied. Please allow camera permissions in your browser or device settings to scan barcodes. You can also enter the code manually below.'
          : 'Could not access device camera. Please check your camera connection or enter the barcode manually below.'
      );
    }
  };

  useEffect(() => {
    if (isOpen) {
      setIsUnknownBarcode(false);
      setMatchedProduct(null);
      setLastScannedCode(null);
      setScannedTimes(0);
      // Small timeout to allow modal animation and DOM mount
      const timer = setTimeout(() => {
        startCamera();
      }, 150);
      return () => clearTimeout(timer);
    } else {
      stopCamera();
    }
  }, [isOpen]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleBarcodeDecoded(manualCode);
    setManualCode('');
  };

  if (!isOpen) return null;

  const defaultTitle = mode === 'capture' 
    ? 'Scan Product Barcode' 
    : 'Scan Barcode • POS Ring-up';
  const defaultSubtitle = mode === 'capture'
    ? 'Scan bottle or package to auto-fill barcode'
    : 'Align camera with barcode to find product';

  return (
    <div 
      id="smartledger-barcode-scanner-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
    >
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="bg-slate-900 px-5 py-4 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <Barcode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold font-['Outfit',sans-serif]">
                {title || defaultTitle}
              </h3>
              <p className="text-xs text-slate-400">
                {subtitle || defaultSubtitle}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute Audio Beep' : 'Unmute Audio Beep'}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewport Area */}
        <div className="p-4 sm:p-5 flex flex-col items-center space-y-4 overflow-y-auto">
          {/* Camera Frame */}
          <div className="relative w-full aspect-[4/3] bg-slate-950 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center border-2 border-slate-800">
            <div id={readerElementId} className="w-full h-full" />

            {/* Target Laser Guide */}
            {cameraActive && !cameraError && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <div className="w-64 h-36 border-2 border-emerald-400/80 rounded-xl relative overflow-hidden shadow-[0_0_20px_rgba(16,185,129,0.35)]">
                  {/* Animated laser line */}
                  <div className="w-full h-0.5 bg-emerald-400 shadow-[0_0_10px_#34d399] absolute top-1/2 -translate-y-1/2 animate-pulse" />
                  <div className="absolute top-2 left-2 text-[10px] font-mono text-emerald-400/90 font-bold tracking-wider">
                    POINT AT BARCODE
                  </div>
                  <div className="absolute bottom-2 right-2 text-[9px] font-mono text-slate-400 font-semibold">
                    EAN • UPC • CODE128
                  </div>
                </div>
              </div>
            )}

            {/* Camera Error or Denial State */}
            {cameraError && (
              <div className="absolute inset-0 p-5 bg-slate-900/95 flex flex-col items-center justify-center text-center space-y-2 text-slate-300">
                <AlertCircle className="w-9 h-9 text-amber-400" />
                <p className="text-xs font-bold text-slate-100">Camera Unavailable</p>
                <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">{cameraError}</p>
                <button
                  type="button"
                  onClick={startCamera}
                  className="mt-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-xs font-bold rounded-xl flex items-center gap-1.5 text-white transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Camera</span>
                </button>
              </div>
            )}
          </div>

          {/* REAL-TIME PRODUCT FOUND CARD (Requirement 6 & 7) */}
          {matchedProduct && (
            <div className="w-full p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl animate-fade-in space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-base shrink-0 shadow-sm">
                    ✓
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-emerald-950 font-['Outfit',sans-serif]">
                      {matchedProduct.name} {matchedVariant ? `(${matchedVariant.name})` : ''}
                    </h4>
                    <p className="text-xs text-emerald-800 mt-0.5">
                      Stock: <strong>{matchedVariant ? matchedVariant.stock : matchedProduct.stock} units</strong>
                    </p>
                    <p className="text-xs text-emerald-950 font-extrabold mt-0.5">
                      Price: {formatCurrency(matchedVariant ? matchedVariant.sellingPrice : matchedProduct.sellingPrice, currency as CurrencyCode)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2.5 py-1 rounded-lg bg-emerald-200/80 text-emerald-900 text-xs font-extrabold font-mono">
                    Scanned: {scannedTimes}x
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    // Reset to keep scanning more items
                    setLastScannedCode(null);
                  }}
                  className="flex-1 py-2.5 px-3 bg-white border border-emerald-300 hover:bg-emerald-100/50 text-emerald-900 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Camera className="w-4 h-4 text-emerald-700" />
                  <span>Scan Next / Again</span>
                </button>
                <button
                  type="button"
                  id="btn-scanner-sell-product"
                  onClick={() => {
                    stopCamera();
                    onClose();
                    if (onSellProduct) {
                      onSellProduct(matchedProduct, Math.max(1, scannedTimes), matchedVariant || undefined);
                    }
                  }}
                  className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-extrabold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-200"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Sell</span>
                </button>
              </div>
            </div>
          )}

          {/* UNKNOWN BARCODE CARD (Requirement 8) */}
          {isUnknownBarcode && (
            <div className="w-full p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl animate-fade-in space-y-3 text-amber-900">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-amber-950">Product Not Found</h4>
                  <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                    We couldn't find a product with this barcode.
                  </p>
                  {lastScannedCode && (
                    <p className="text-[11px] font-mono text-amber-900 font-bold mt-1 bg-amber-200/70 inline-block px-2 py-0.5 rounded">
                      {lastScannedCode}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsUnknownBarcode(false);
                    setLastScannedCode(null);
                  }}
                  className="flex-1 py-2.5 px-3 bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Scan Again</span>
                </button>

                {onAddNewProductWithBarcode && (
                  <button
                    type="button"
                    onClick={() => {
                      stopCamera();
                      onClose();
                      onAddNewProductWithBarcode(lastScannedCode || '');
                    }}
                    className="flex-1 py-2.5 px-3 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add New Product</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Manual Input & USB Scanner Support (Requirement 10 & 13) */}
          <form onSubmit={handleManualSubmit} className="w-full space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                <Keyboard className="w-3.5 h-3.5" />
                USB / Bluetooth / Manual:
              </span>
              <span className="text-[10px] text-slate-400">Press Enter to lookup</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Scan or enter barcode number..."
                className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm"
              >
                Lookup
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs flex-shrink-0">
          <span className="text-slate-500 text-[11px] flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-600" />
            <span>Preserves leading zeros &bull; Scoped to this business</span>
          </span>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
