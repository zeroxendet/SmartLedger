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
export const FALLBACK_BACKUP_URL = 'https://ais-pre-aljjus6nvcko62lzqekq5i-624060619309.europe-west1.run.app';

/**
 * Returns the verified, reachable production URL for SmartLedger.
 * Priority:
 * 1. Current active browser origin if running on a live remote host (Cloud Run, Firebase Hosting, verified custom domain)
 * 2. Explicit environment configuration override (VITE_PUBLIC_APP_URL)
 * 3. Verified Cloud Run production deployment URL
 * 4. Default Firebase Hosting production domain
 */
export function getAppPublicUrl(): string {
  // 1. Dynamic active browser location (guaranteed reachable host currently serving the app)
  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin.trim().replace(/\/+$/, '');
    const hostname = window.location.hostname || '';

    // If running on a live public host (Cloud Run, Firebase Hosting, or verified custom domain)
    if (!hostname.includes('localhost') && !hostname.includes('127.0.0.1')) {
      return origin;
    }
  }

  // 2. Explicit environment configuration override
  const envUrl = typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_PUBLIC_APP_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // 3. Fallback to verified Cloud Run deployment
  return FALLBACK_BACKUP_URL;
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
