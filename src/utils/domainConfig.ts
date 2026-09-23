/**
 * SmartLedger Production Domain & URL Configuration
 * 
 * Centralized utility for managing application domain, public canonical URLs,
 * HTTPS verification, and custom domain deployment (e.g. smartledger.rw).
 */

export const PRODUCTION_CUSTOM_DOMAIN = 'smartledger.rw';
export const PRODUCTION_CUSTOM_DOMAIN_URL = `https://${PRODUCTION_CUSTOM_DOMAIN}`;
export const FIREBASE_PROJECT_ID = 'smartledger-d0f9c';
export const FIREBASE_HOSTING_DOMAIN = 'smartledger-d0f9c.web.app';
export const FIREBASE_HOSTING_URL = `https://${FIREBASE_HOSTING_DOMAIN}`;
export const FIREBASE_APP_DOMAIN = 'smartledger-d0f9c.firebaseapp.com';
export const CLOUD_RUN_SHARED_URL = 'https://ais-pre-aljjus6nvcko62lzqekq5i-624060619309.europe-west1.run.app';
export const FALLBACK_BACKUP_URL = CLOUD_RUN_SHARED_URL;

export type BaseUrlPreferenceMode = 'custom' | 'hosting' | 'auto';

export function getStaffActivationBaseUrlPreference(): { mode: BaseUrlPreferenceMode; customUrl?: string } {
  try {
    const mode = (localStorage.getItem('smartledger_base_url_mode') as BaseUrlPreferenceMode) || 'auto';
    const customUrl = localStorage.getItem('smartledger_custom_base_url') || undefined;
    return { mode, customUrl };
  } catch {
    return { mode: 'auto' };
  }
}

export function setStaffActivationBaseUrlPreference(mode: BaseUrlPreferenceMode, customUrl?: string): void {
  try {
    localStorage.setItem('smartledger_base_url_mode', mode);
    if (customUrl) {
      localStorage.setItem('smartledger_custom_base_url', customUrl.trim().replace(/\/+$/, ''));
    } else {
      localStorage.removeItem('smartledger_custom_base_url');
    }
  } catch {}
}

/**
 * Returns the configurable base URL for staff activation links.
 * 
 * Rules:
 * 1. If user preference is explicitly 'custom', use https://smartledger.rw.
 * 2. If user preference is explicitly 'hosting', use https://smartledger-d0f9c.web.app.
 * 3. If explicit environment variable VITE_PUBLIC_APP_URL is set, use that.
 * 4. In 'auto' mode:
 *    - If current origin is smartledger.rw, use https://smartledger.rw.
 *    - Otherwise, default to Firebase Hosting domain (https://smartledger-d0f9c.web.app)
 *      so that links generated in development/testing resolve without NXDOMAIN errors.
 */
export function getStaffActivationBaseUrl(): string {
  const { mode, customUrl } = getStaffActivationBaseUrlPreference();
  if (customUrl) return customUrl;
  if (mode === 'custom') return PRODUCTION_CUSTOM_DOMAIN_URL;
  if (mode === 'hosting') return FIREBASE_HOSTING_URL;

  // Check explicit environment configuration
  const envUrl = typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_PUBLIC_APP_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // Active browser origin check
  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin.trim().replace(/\/+$/, '');
    if (origin.toLowerCase().includes('smartledger.rw')) {
      return PRODUCTION_CUSTOM_DOMAIN_URL;
    }
    if (origin.includes('smartledger-d0f9c.web.app') || origin.includes('firebaseapp.com')) {
      return FIREBASE_HOSTING_URL;
    }
  }

  // Default to Firebase Hosting for development/testing as required
  return FIREBASE_HOSTING_URL;
}

/**
 * Builds the canonical staff activation URL:
 * https://smartledger.rw/staff/activate/{token}
 * or
 * https://smartledger-d0f9c.web.app/staff/activate/{token}
 */
export function getStaffActivationUrl(token: string): string {
  const base = getStaffActivationBaseUrl().replace(/\/+$/, '');
  const cleanToken = token.trim().replace(/^[<"']+|[>"',.;]+$/g, '');
  return `${base}/staff/activate/${cleanToken}`;
}

/**
 * Returns the verified, globally reachable public production URL for SmartLedger.
 * This guarantees that links copied by managers work immediately on any device,
 * mobile phone, WhatsApp, or incognito browser.
 * 
 * Rules:
 * 1. If running on smartledger.rw custom domain, use that.
 * 2. If running inside dev environment (ais-dev-*), automatically convert to public shared host (ais-pre-*).
 * 3. If running on localhost / 127.0.0.1, use public Cloud Run URL so shared links work on external phones.
 * 4. Fall back to verified public Cloud Run app URL.
 */
export function getAppPublicUrl(): string {
  // 1. Explicit environment configuration override (if set)
  const envUrl = typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_PUBLIC_APP_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // 2. Active browser location check
  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin.trim().replace(/\/+$/, '');
    if (origin && origin !== 'null') {
      // If custom domain is active
      if (origin.toLowerCase().includes('smartledger.rw')) {
        return PRODUCTION_CUSTOM_DOMAIN_URL;
      }
      // If running inside private dev container, map to public shared app URL
      if (origin.includes('ais-dev-')) {
        return origin.replace('ais-dev-', 'ais-pre-');
      }
      // If running on localhost, use the public Cloud Run URL so external mobile devices can open the link
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return CLOUD_RUN_SHARED_URL;
      }
      // If already on ais-pre or another live host
      return origin;
    }
  }

  // 3. Fallback to verified public Cloud Run URL
  return CLOUD_RUN_SHARED_URL;
}

export interface DomainInspection {
  currentHostname: string;
  currentOrigin: string;
  isCustomDomainActive: boolean;
  isFirebaseHosting: boolean;
  isCloudRunDeployment: boolean;
  isLocalhost: boolean;
  isSecureHttps: boolean;
  activeProductionUrl: string;
  targetCustomDomain: string;
  targetCustomUrl: string;
  firebaseHostingDomain: string;
  firebaseHostingUrl: string;
  backupCloudRunUrl: string;
}

/**
 * Inspects the current host environment to determine domain status,
 * SSL encryption state, and custom domain readiness.
 * Crucially: it only flags custom domain as ACTIVE if the current request is actually
 * served from smartledger.rw, preventing ERR_NAME_NOT_RESOLVED errors.
 */
export function inspectDomainEnvironment(): DomainInspection {
  const activeUrl = getAppPublicUrl();

  if (typeof window === 'undefined') {
    return {
      currentHostname: 'ais-pre-aljjus6nvcko62lzqekq5i-624060619309.europe-west1.run.app',
      currentOrigin: FALLBACK_BACKUP_URL,
      isCustomDomainActive: false,
      isFirebaseHosting: false,
      isCloudRunDeployment: true,
      isLocalhost: false,
      isSecureHttps: true,
      activeProductionUrl: FALLBACK_BACKUP_URL,
      targetCustomDomain: PRODUCTION_CUSTOM_DOMAIN,
      targetCustomUrl: PRODUCTION_CUSTOM_DOMAIN_URL,
      firebaseHostingDomain: FIREBASE_HOSTING_DOMAIN,
      firebaseHostingUrl: FIREBASE_HOSTING_URL,
      backupCloudRunUrl: FALLBACK_BACKUP_URL
    };
  }

  const hostname = window.location.hostname || '';
  const origin = window.location.origin || '';
  const protocol = window.location.protocol || '';

  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  const isCloudRunDeployment = hostname.includes('run.app');
  const isFirebaseHosting = hostname.includes('web.app') || hostname.includes('firebaseapp.com');
  const isCustomDomainActive = hostname.toLowerCase().includes('smartledger.rw');
  const isSecureHttps = protocol === 'https:';

  return {
    currentHostname: hostname,
    currentOrigin: origin,
    isCustomDomainActive,
    isFirebaseHosting,
    isCloudRunDeployment,
    isLocalhost,
    isSecureHttps,
    activeProductionUrl: activeUrl,
    targetCustomDomain: PRODUCTION_CUSTOM_DOMAIN,
    targetCustomUrl: PRODUCTION_CUSTOM_DOMAIN_URL,
    firebaseHostingDomain: FIREBASE_HOSTING_DOMAIN,
    firebaseHostingUrl: FIREBASE_HOSTING_URL,
    backupCloudRunUrl: FALLBACK_BACKUP_URL
  };
}

/**
 * Domains that should be registered in Firebase Authentication -> Authorized Domains
 */
export const REQUIRED_FIREBASE_AUTHORIZED_DOMAINS = [
  FIREBASE_HOSTING_DOMAIN,
  FIREBASE_APP_DOMAIN,
  PRODUCTION_CUSTOM_DOMAIN,
  `www.${PRODUCTION_CUSTOM_DOMAIN}`,
  'ais-pre-aljjus6nvcko62lzqekq5i-624060619309.europe-west1.run.app',
  'localhost'
];

export interface ProtectedDnsRecord {
  label: string;
  type: string;
  host: string;
  target: string;
  recommended: boolean;
}

export interface ProtectedDomainConfig {
  firebaseProjectId: string;
  firebaseHostingDomain: string;
  firebaseHostingUrl: string;
  firebaseAppDomain: string;
  customDomain: string;
  customDomainUrl: string;
  activeProductionUrl: string;
  isCustomDomainActive: boolean;
  dnsRecords: ProtectedDnsRecord[];
  authorizedDomains: string[];
}

/**
 * Fetch Custom Domain & URL configuration from the secure backend API.
 * 
 * Cryptographically verifies that the caller is the verified Business Owner
 * or App Developer. Unauthorized roles receive 403 Forbidden with zero sensitive data.
 */
export async function fetchProtectedDomainConfig(
  idToken: string | null | undefined,
  businessId: string | null | undefined
): Promise<{ authorized: boolean; error?: string; data?: ProtectedDomainConfig }> {
  if (!idToken) {
    return {
      authorized: false,
      error: 'Access Restricted: This area is available only to the Business Owner.'
    };
  }

  try {
    const res = await fetch(`/api/admin/domain-config?businessId=${encodeURIComponent(businessId || '')}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'x-business-id': businessId || ''
      }
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      return {
        authorized: false,
        error: errJson.error || 'Access Restricted: This area is available only to the Business Owner.'
      };
    }

    const json = await res.json();
    if (json.success && json.data) {
      return {
        authorized: true,
        data: json.data
      };
    }

    return {
      authorized: false,
      error: 'Access Restricted: This area is available only to the Business Owner.'
    };
  } catch {
    return {
      authorized: false,
      error: 'Access Restricted: This area is available only to the Business Owner.'
    };
  }
}
