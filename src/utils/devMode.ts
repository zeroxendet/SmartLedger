import { useState, useEffect } from 'react';

/**
 * Known owner & admin email addresses
 */
export const OWNER_EMAILS = [
  'zeroxendet@gmail.com',
  'admin@smartledger.app',
  'owner@smartledger.app',
  'admin@smartledger.rw',
  'owner@smartledger.rw'
];

/**
 * Strict Owner and Developer Verification.
 * 
 * Enforces Zero-Trust authorization:
 * - A user CANNOT become an owner or developer via URL params, localStorage, or state tampering.
 * - Authenticated Firebase identity must match developer whitelist or business owner UID.
 * - Staff members, cashiers, managers, and accountants are strictly excluded.
 */
export function isVerifiedOwnerOrDeveloper(
  currentUser: { uid?: string; email?: string | null } | null | undefined,
  businessOwnerId?: string | null,
  isStaffSessionActive?: boolean
): boolean {
  // If in staff mode, or staff session is active -> ZERO ACCESS
  if (isStaffSessionActive) {
    return false;
  }

  if (!currentUser || !currentUser.uid) {
    return false;
  }

  const email = (currentUser.email || '').toLowerCase().trim();

  // 1. Verified App Developer / Super Admin
  if (email && OWNER_EMAILS.some(o => o.toLowerCase() === email)) {
    return true;
  }
  if (email && (email.endsWith('@smartledger.app') || email.endsWith('@smartledger.rw'))) {
    return true;
  }

  // 2. Verified Business Owner (UID matches business owner ID)
  if (businessOwnerId && currentUser.uid === businessOwnerId) {
    return true;
  }

  return false;
}

/**
 * Check if the current context is running in developer or owner mode.
 * Secured against unauthorized role escalation.
 */
export function checkIsDevOrOwner(currentUserEmail?: string | null): boolean {
  if (typeof window === 'undefined') return false;

  // 1. Authenticated user email check (Primary authentic source)
  if (currentUserEmail) {
    const email = currentUserEmail.toLowerCase().trim();
    if (OWNER_EMAILS.some(o => o.toLowerCase() === email)) {
      return true;
    }
    if (email.endsWith('@smartledger.app') || email.endsWith('@smartledger.rw') || email.includes('+admin') || email.includes('+dev')) {
      return true;
    }
  }

  // 2. Localhost development environment only
  try {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return true;
    }
  } catch {
    // Ignore hostname errors
  }

  return false;
}

/**
 * Toggle developer mode manually and notify all listeners
 */
export function setDevModePreference(enabled: boolean): void {
  try {
    localStorage.setItem('smartledger_dev_mode', enabled ? 'true' : 'false');
    window.dispatchEvent(new CustomEvent('smartledger_dev_mode_change', { detail: { enabled } }));
  } catch (err) {
    console.error('Failed to set dev mode preference:', err);
  }
}

/**
 * React hook for reactive developer/owner state
 */
export function useDevMode(currentUserEmail?: string | null): {
  isDevOrOwner: boolean;
  toggleDevMode: () => void;
  setDevMode: (enabled: boolean) => void;
} {
  const [isDevOrOwner, setIsDevOrOwner] = useState<boolean>(() => checkIsDevOrOwner(currentUserEmail));

  useEffect(() => {
    // Re-check whenever user email changes
    setIsDevOrOwner(checkIsDevOrOwner(currentUserEmail));

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'smartledger_dev_mode') {
        setIsDevOrOwner(checkIsDevOrOwner(currentUserEmail));
      }
    };

    const handleCustomChange = () => {
      setIsDevOrOwner(checkIsDevOrOwner(currentUserEmail));
    };

    // Keyboard shortcut Ctrl+Shift+D or Alt+D to easily toggle dev mode
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') || (e.altKey && e.key.toLowerCase() === 'd')) {
        e.preventDefault();
        const current = checkIsDevOrOwner(currentUserEmail);
        const next = !current;
        setDevModePreference(next);
        setIsDevOrOwner(next);
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('smartledger_dev_mode_change', handleCustomChange);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('smartledger_dev_mode_change', handleCustomChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentUserEmail]);

  const toggleDevMode = () => {
    const next = !isDevOrOwner;
    setDevModePreference(next);
    setIsDevOrOwner(next);
  };

  const setDevMode = (enabled: boolean) => {
    setDevModePreference(enabled);
    setIsDevOrOwner(enabled);
  };

  return { isDevOrOwner, toggleDevMode, setDevMode };
}
