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
 * Check if the current context is running in developer or owner mode.
 * 
 * Criteria:
 * 1. URL parameter: ?dev=true or ?admin=true or ?owner=true (or dev=false to force off)
 * 2. LocalStorage setting: 'smartledger_dev_mode' === 'true'
 * 3. User email matching known owner/admin emails or @smartledger.app domain
 * 4. Localhost development environment
 */
export function checkIsDevOrOwner(currentUserEmail?: string | null): boolean {
  if (typeof window === 'undefined') return false;

  // 1. Check URL query parameters
  try {
    const params = new URLSearchParams(window.location.search);
    const devParam = params.get('dev') || params.get('admin') || params.get('owner') || params.get('debug');
    if (devParam === 'true' || devParam === '1') {
      localStorage.setItem('smartledger_dev_mode', 'true');
      return true;
    }
    if (devParam === 'false' || devParam === '0') {
      localStorage.setItem('smartledger_dev_mode', 'false');
      return false;
    }
  } catch {
    // Ignore URL errors
  }

  // 2. Explicit user toggle in LocalStorage
  try {
    const stored = localStorage.getItem('smartledger_dev_mode');
    if (stored === 'true') return true;
    if (stored === 'false') return false;
  } catch {
    // Ignore storage errors
  }

  // 3. Authenticated user email check
  if (currentUserEmail) {
    const email = currentUserEmail.toLowerCase().trim();
    if (OWNER_EMAILS.some(o => o.toLowerCase() === email)) {
      return true;
    }
    if (email.endsWith('@smartledger.app') || email.endsWith('@smartledger.rw') || email.includes('+admin') || email.includes('+dev')) {
      return true;
    }
  }

  // 4. Development environment (localhost / 127.0.0.1)
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
