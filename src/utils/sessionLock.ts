/**
 * SmartLedger Session Security & Automatic Lock Configuration
 * 
 * Requirement:
 * If a user leaves SmartLedger, switches to another app, closes/minimizes the browser/app,
 * or SmartLedger remains in the background for 5 minutes or more, the next time they return
 * they MUST be required to authenticate again before accessing any business data.
 */

// Easy single configuration value to adjust lock timeout as needed
export const SESSION_LOCK_TIMEOUT_MINUTES = 5;
export const SESSION_LOCK_TIMEOUT_MS = SESSION_LOCK_TIMEOUT_MINUTES * 60 * 1000;

// Persistent LocalStorage Keys for resilient lifecycle detection
export const STORAGE_KEYS = {
  IS_LOCKED: 'smartledger_is_session_locked',
  LAST_BACKGROUND_TIME: 'smartledger_last_background_timestamp',
  LAST_ACTIVE_TIME: 'smartledger_last_active_timestamp',
  LOCKED_USER_EMAIL: 'smartledger_locked_user_email',
  LOCKED_USER_NAME: 'smartledger_locked_user_name',
  LOCKED_BUSINESS_NAME: 'smartledger_locked_business_name',
};

/**
 * Checks if the current session should be locked based on stored timestamps.
 * Evaluates both elapsed background time and elapsed idle/inactivity time.
 */
export function checkShouldSessionLock(): boolean {
  // If already locked, keep locked (prevents bypass on page refresh)
  const isCurrentlyLocked = localStorage.getItem(STORAGE_KEYS.IS_LOCKED) === 'true';
  if (isCurrentlyLocked) {
    return true;
  }

  const now = Date.now();

  // Check elapsed time since the app was last backgrounded or lost focus
  const rawBgTime = localStorage.getItem(STORAGE_KEYS.LAST_BACKGROUND_TIME);
  if (rawBgTime) {
    const bgTime = parseInt(rawBgTime, 10);
    if (!isNaN(bgTime) && bgTime > 0) {
      const elapsedBg = now - bgTime;
      if (elapsedBg >= SESSION_LOCK_TIMEOUT_MS) {
        return true;
      }
    }
  }

  // Check elapsed idle time since last interaction
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
 * Mark the session as locked in persistent storage
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
 * Record a background transition timestamp
 */
export function recordBackgroundTimestamp(): void {
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
 * Update the user's last interaction timestamp
 */
export function recordUserActiveTimestamp(): void {
  // Don't update activity if currently locked
  if (localStorage.getItem(STORAGE_KEYS.IS_LOCKED) === 'true') {
    return;
  }
  localStorage.setItem(STORAGE_KEYS.LAST_ACTIVE_TIME, String(Date.now()));
}

/**
 * Clear all session lock storage on complete user logout
 */
export function clearSessionLockStorage(): void {
  localStorage.removeItem(STORAGE_KEYS.IS_LOCKED);
  localStorage.removeItem(STORAGE_KEYS.LAST_BACKGROUND_TIME);
  localStorage.removeItem(STORAGE_KEYS.LAST_ACTIVE_TIME);
  localStorage.removeItem(STORAGE_KEYS.LOCKED_USER_EMAIL);
  localStorage.removeItem(STORAGE_KEYS.LOCKED_USER_NAME);
  localStorage.removeItem(STORAGE_KEYS.LOCKED_BUSINESS_NAME);
}
