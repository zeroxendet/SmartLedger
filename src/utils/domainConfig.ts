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
 * Returns the public canonical URL for SmartLedger.
 * Priority:
 * 1. Environment variable VITE_PUBLIC_APP_URL (if provided)
 * 2. Active browser origin (e.g. https://smartledger-d0f9c.web.app, https://smartledger.rw, or active Cloud Run deployment)
 * 3. Default Firebase Hosting production domain (https://smartledger-d0f9c.web.app)
 */
export function getAppPublicUrl(): string {
  // 1. Explicit environment configuration override
  const envUrl = typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_PUBLIC_APP_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // 2. Dynamic browser location
  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin;
    // When running locally on dev server, return local or configured domain
    if (!origin.includes('localhost') && !origin.includes('127.0.0.1')) {
      return origin.replace(/\/+$/, '');
    }
  }

  // 3. Target Firebase Hosting production domain
  return FIREBASE_HOSTING_URL;
}

export interface DomainInspection {
  currentHostname: string;
  currentOrigin: string;
  isCustomDomain: boolean;
  isFirebaseHosting: boolean;
  isCloudRunDeployment: boolean;
  isLocalhost: boolean;
  isSecureHttps: boolean;
  targetCustomDomain: string;
  targetCustomUrl: string;
  firebaseHostingDomain: string;
  firebaseHostingUrl: string;
  backupCloudRunUrl: string;
}

/**
 * Inspects the current host environment to determine domain status,
 * SSL encryption state, and custom domain readiness.
 */
export function inspectDomainEnvironment(): DomainInspection {
  if (typeof window === 'undefined') {
    return {
      currentHostname: FIREBASE_HOSTING_DOMAIN,
      currentOrigin: FIREBASE_HOSTING_URL,
      isCustomDomain: false,
      isFirebaseHosting: true,
      isCloudRunDeployment: false,
      isLocalhost: false,
      isSecureHttps: true,
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
  const isCustomDomain = hostname.toLowerCase().includes('smartledger.rw') || (!isLocalhost && !isCloudRunDeployment && !isFirebaseHosting);
  const isSecureHttps = protocol === 'https:';

  return {
    currentHostname: hostname,
    currentOrigin: origin,
    isCustomDomain,
    isFirebaseHosting,
    isCloudRunDeployment,
    isLocalhost,
    isSecureHttps,
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
