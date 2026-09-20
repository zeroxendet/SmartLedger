/**
 * SmartLedger Session Security & Automatic Lock Configuration
 * 
 * Inactivity & Session Timeout Rules:
 * 1. When a user successfully logs in, start tracking the active session.
 * 2. While the user is actively using SmartLedger, keep the session active.
 * 3. If the user leaves SmartLedger, switches to another app, locks the phone/computer,
 *    minimizes the browser, or the app goes into the background, record the exact time.
 * 4. If the user returns within 5 minutes, open SmartLedger normally without asking for login.
 * 5. If the user returns after 5 minutes or more, lock the session immediately.
 * 6. When locked, show the existing "Session Locked" screen and require authentication before accessing data.
 */

// 5-minute timeout window
export const SESSION_LOCK_TIMEOUT_MINUTES = 5;
export const SESSION_LOCK_TIMEOUT_MS = SESSION_LOCK_TIMEOUT_MINUTES * 60 * 1000;

// Persistent LocalStorage Keys
export const STORAGE_KEYS = {
  IS_LOCKED: 'smartledger_is_session_locked',
  LAST_BACKGROUND_TIME: 'smartledger_last_background_timestamp',
  LAST_ACTIVE_TIME: 'smartledger_last_active_timestamp',
  LOCKED_USER_EMAIL: 'smartledger_locked_user_email',
  LOCKED_USER_NAME: 'smartledger_locked_user_name',
  LOCKED_BUSINESS_NAME: 'smartledger_locked_business_name',
  LAST_ACTIVE_TAB: 'smartledger_last_active_tab',
};

/**
 * Returns whether the session is currently marked as locked in storage
 */
export function isSessionCurrentlyLocked(): boolean {
  // Only locked if there is an active session identity AND the flag is set
  const hasActiveSession = Boolean(
    localStorage.getItem('smartledger_active_uid') || 
    localStorage.getItem('smartledger_active_user_meta')
  );
  if (!hasActiveSession) return false;
  return localStorage.getItem(STORAGE_KEYS.IS_LOCKED) === 'true';
}

/**
 * Evaluates whether the session should be locked.
 * Checks:
 * 1. Active user session existence (never lock when unauthenticated/logged out).
 * 2. Explicit locked state.
 * 3. Elapsed background time if the app was left (>= 5 minutes).
 * 4. Elapsed unattended idle time if left open in foreground without any user input (>= 5 minutes).
 */
export function checkShouldSessionLock(): boolean {
  // 1. If not logged in, NEVER display session locked screen
  const hasActiveSession = Boolean(
    localStorage.getItem('smartledger_active_uid') || 
    localStorage.getItem('smartledger_active_user_meta')
  );
  if (!hasActiveSession) {
    return false;
  }

  // 2. If already locked, maintain lock (prevents bypass on page refresh)
  if (localStorage.getItem(STORAGE_KEYS.IS_LOCKED) === 'true') {
    return true;
  }

  const now = Date.now();

  // 3. Check elapsed background time (app was minimized, phone locked, or switched away)
  const rawBgTime = localStorage.getItem(STORAGE_KEYS.LAST_BACKGROUND_TIME);
  if (rawBgTime) {
    const bgTime = parseInt(rawBgTime, 10);
    if (!isNaN(bgTime) && bgTime > 0) {
      const elapsedBg = now - bgTime;
      if (elapsedBg >= SESSION_LOCK_TIMEOUT_MS) {
        return true;
      }
      // Left and returned within 5 minutes: do NOT lock
      return false;
    }
  }

  // 4. Check elapsed unattended foreground idle time
  const rawActiveTime = localStorage.getItem(STORAGE_KEYS.LAST_ACTIVE_TIME);
  if (rawActiveTime) {
    const activeTime = parseInt(rawActiveTime, 10);
    if (!isNaN(activeTime) && activeTime > 0) {
      const elapsedActive = now - activeTime;
      if (elapsedActive >= SESSION_LOCK_TIMEOUT_MS) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Called when the app becomes visible/foregrounded again (e.g. tab switch, phone unlock, or app return).
 * Evaluates whether the 5-minute background threshold was exceeded.
 */
export function evaluateSessionOnReturn(): { shouldLock: boolean } {
  const hasActiveSession = Boolean(
    localStorage.getItem('smartledger_active_uid') || 
    localStorage.getItem('smartledger_active_user_meta')
  );
  if (!hasActiveSession) {
    clearSessionLockStorage();
    return { shouldLock: false };
  }

  // If already locked prior to leaving, keep locked
  if (localStorage.getItem(STORAGE_KEYS.IS_LOCKED) === 'true') {
    return { shouldLock: true };
  }

  const now = Date.now();
  const rawBgTime = localStorage.getItem(STORAGE_KEYS.LAST_BACKGROUND_TIME);

  if (rawBgTime) {
    const bgTime = parseInt(rawBgTime, 10);
    if (!isNaN(bgTime) && bgTime > 0) {
      const elapsedBg = now - bgTime;
      if (elapsedBg >= SESSION_LOCK_TIMEOUT_MS) {
        // Exceeded 5-minute background limit: lock immediately
        setSessionLockedState(true);
        return { shouldLock: true };
      } else {
        // Returned within 5 minutes: clear background time and continue active session
        clearBackgroundTimestamp();
        recordUserActiveTimestamp();
        return { shouldLock: false };
      }
    }
  }

  // Check unattended foreground idle time
  const rawActiveTime = localStorage.getItem(STORAGE_KEYS.LAST_ACTIVE_TIME);
  if (rawActiveTime) {
    const activeTime = parseInt(rawActiveTime, 10);
    if (!isNaN(activeTime) && activeTime > 0) {
      const elapsedActive = now - activeTime;
      if (elapsedActive >= SESSION_LOCK_TIMEOUT_MS) {
        setSessionLockedState(true);
        return { shouldLock: true };
      }
    }
  }

  recordUserActiveTimestamp();
  return { shouldLock: false };
}

/**
 * Mark the session as locked/unlocked in persistent storage
 */
export function setSessionLockedState(locked: boolean): void {
  if (locked) {
    localStorage.setItem(STORAGE_KEYS.IS_LOCKED, 'true');
  } else {
    localStorage.removeItem(STORAGE_KEYS.IS_LOCKED);
    localStorage.removeItem(STORAGE_KEYS.LAST_BACKGROUND_TIME);
    localStorage.setItem(STORAGE_KEYS.LAST_ACTIVE_TIME, String(Date.now()));
  }
}

/**
 * Record a background transition timestamp (when user leaves SmartLedger)
 */
export function recordBackgroundTimestamp(): void {
  // Only record if an active session exists and is not already locked
  if (localStorage.getItem(STORAGE_KEYS.IS_LOCKED) === 'true') return;
  const hasActiveSession = Boolean(
    localStorage.getItem('smartledger_active_uid') || 
    localStorage.getItem('smartledger_active_user_meta')
  );
  if (!hasActiveSession) return;

  localStorage.setItem(STORAGE_KEYS.LAST_BACKGROUND_TIME, String(Date.now()));
}

/**
 * Clear the background transition timestamp (when user returns within 5 mins)
 */
export function clearBackgroundTimestamp(): void {
  localStorage.removeItem(STORAGE_KEYS.LAST_BACKGROUND_TIME);
  localStorage.setItem(STORAGE_KEYS.LAST_ACTIVE_TIME, String(Date.now()));
}

/**
 * Update the user's last interaction timestamp while actively working
 */
export function recordUserActiveTimestamp(): void {
  if (localStorage.getItem(STORAGE_KEYS.IS_LOCKED) === 'true') {
    return;
  }
  localStorage.setItem(STORAGE_KEYS.LAST_ACTIVE_TIME, String(Date.now()));
}

/**
 * Clear all session lock storage on complete user logout or fresh account switch
 */
export function clearSessionLockStorage(): void {
  localStorage.removeItem(STORAGE_KEYS.IS_LOCKED);
  localStorage.removeItem(STORAGE_KEYS.LAST_BACKGROUND_TIME);
  localStorage.removeItem(STORAGE_KEYS.LAST_ACTIVE_TIME);
  localStorage.removeItem(STORAGE_KEYS.LOCKED_USER_EMAIL);
  localStorage.removeItem(STORAGE_KEYS.LOCKED_USER_NAME);
  localStorage.removeItem(STORAGE_KEYS.LOCKED_BUSINESS_NAME);
}
