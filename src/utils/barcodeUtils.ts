import { useEffect } from 'react';
import { Product, ProductVariant } from '../types';

/**
 * Validates and cleans a barcode string.
 * CRITICAL: Barcodes must always be stored and handled as strings to preserve leading zeros.
 * Example: "0123456789012" must remain "0123456789012" and NEVER be converted to 123456789012.
 */
export const cleanBarcode = (raw: string | undefined | null): string => {
  if (!raw) return '';
  return String(raw).trim();
};

export interface BarcodeLookupResult {
  product: Product;
  variant?: ProductVariant;
}

/**
 * Searches a business's products and variants for a matching barcode.
 * Business-isolated: only searches within the provided products array of the active business.
 */
export const findProductByBarcode = (
  products: Product[],
  rawCode: string
): BarcodeLookupResult | null => {
  const code = cleanBarcode(rawCode);
  if (!code) return null;

  // 1. Exact match on product main barcode
  for (const p of products) {
    if (p.barcode && cleanBarcode(p.barcode) === code) {
      return { product: p };
    }
  }

  // 2. Exact match on variant barcode
  for (const p of products) {
    if (p.variants && p.variants.length > 0) {
      for (const v of p.variants) {
        if (v.barcode && cleanBarcode(v.barcode) === code) {
          return { product: p, variant: v };
        }
      }
    }
  }

  // 3. Fallback match on product ID if entered directly
  const matchById = products.find((p) => p.id === code);
  if (matchById) {
    return { product: matchById };
  }

  return null;
};

/**
 * Checks if a barcode is already used by another product in the same business.
 * Uniqueness is strictly scoped per business (businessId + barcode).
 */
export const checkBarcodeUniqueness = (
  products: Product[],
  rawCode: string,
  excludeProductId?: string
): { isUnique: boolean; conflictingProduct?: Product } => {
  const code = cleanBarcode(rawCode);
  if (!code) return { isUnique: true };

  const conflict = products.find((p) => {
    if (excludeProductId && p.id === excludeProductId) {
      return false;
    }
    // Check main barcode
    if (p.barcode && cleanBarcode(p.barcode) === code) {
      return true;
    }
    // Check variants
    if (p.variants) {
      return p.variants.some((v) => v.barcode && cleanBarcode(v.barcode) === code);
    }
    return false;
  });

  if (conflict) {
    return { isUnique: false, conflictingProduct: conflict };
  }

  return { isUnique: true };
};

/**
 * Produces an instant audio beep and haptic vibration for successful scan confirmation.
 */
export const playBarcodeSuccessFeedback = () => {
  // 1. Haptic vibration (Android & modern mobile browsers)
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(100);
    } catch {
      // Ignore vibration error if not allowed by browser policy
    }
  }

  // 2. Crisp electronic POS scanner beep via Web Audio API
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, ctx.currentTime);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    }
  } catch {
    // Audio autoplay restrictions
  }
};

/**
 * Hook to support USB and Bluetooth barcode scanners.
 * Most hardware barcode scanners act as Human Interface Devices (keyboards),
 * typing characters at high speed (< 60ms intervals) and sending an Enter key.
 */
export const useBarcodeKeyboardScanner = ({
  onScan,
  enabled = true,
}: {
  onScan: (scannedCode: string) => void;
  enabled?: boolean;
}) => {
  useEffect(() => {
    if (!enabled) return;

    let buffer = '';
    let lastKeyTime = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore meta / control / alt keys
      if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') {
        return;
      }

      const now = Date.now();
      const timeDiff = now - lastKeyTime;
      lastKeyTime = now;

      if (e.key === 'Enter') {
        const clean = buffer.trim();
        // Standard barcodes are at least 3 characters
        if (clean.length >= 3) {
          e.preventDefault();
          onScan(clean);
        }
        buffer = '';
        return;
      }

      // If time between keystrokes is too long (user typing normally), reset buffer
      if (timeDiff > 250) {
        buffer = '';
      }

      // Only accumulate printable single characters
      if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, onScan]);
};
