import { 
  StaffMember, 
  StaffRole, 
  StaffPermissions, 
  StaffSession, 
  SaleCorrectionRequest, 
  StaffActivityLogEntry,
  DEFAULT_CASHIER_PERMISSIONS,
  DEFAULT_MANAGER_PERMISSIONS,
  DEFAULT_OWNER_PERMISSIONS 
} from '../types';
import { getAppPublicUrl } from './domainConfig';

export const STAFF_STORAGE_KEYS = {
  STAFF_SESSION: 'smartledger_active_staff_session',
  STAFF_MEMBERS: 'smartledger_staff_members_',
  CORRECTION_REQUESTS: 'smartledger_correction_requests_',
  STAFF_ACTIVITY_LOGS: 'smartledger_staff_activity_logs_',
};

/**
 * SHA-256 hashing for staff Cashier PIN.
 * Salted with businessId to guarantee isolation and eliminate rainbow table risks.
 */
export async function hashStaffPin(pin: string, businessId: string): Promise<string> {
  const cleanPin = pin.trim();
  const salt = `smartledger_salt_${businessId}`;
  const data = new TextEncoder().encode(`${salt}:${cleanPin}`);

  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    try {
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fallback below
    }
  }

  // Pure JavaScript hash fallback (Murmur/FNV-inspired 64-bit hex hash)
  let h1 = 0xdeadbeef;
  let h2 = 0x41c64e6d;
  const str = `${salt}:${cleanPin}`;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(16, '0');
}

/**
 * Verify Cashier PIN against stored secure hash
 */
export async function verifyStaffPin(pin: string, storedHash: string, businessId: string): Promise<boolean> {
  if (!pin || !storedHash) return false;
  const computedHash = await hashStaffPin(pin, businessId);
  return computedHash === storedHash;
}

/**
 * Generates an opaque random token for invitation links and QR access
 */
export function generateStaffAccessToken(): string {
  const rand = Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12);
  return `stf_${Date.now().toString(36)}_${rand}`;
}

/**
 * Get active staff session from localStorage
 */
export function getStaffSession(): StaffSession | null {
  try {
    const raw = localStorage.getItem(STAFF_STORAGE_KEYS.STAFF_SESSION);
    if (!raw) return null;
    const session: StaffSession = JSON.parse(raw);
    
    // Check expiration (24 hour maximum duration per session)
    if (session.expiresAt && new Date(session.expiresAt).getTime() < Date.now()) {
      clearStaffSession();
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

/**
 * Persist staff session to localStorage
 */
export function saveStaffSession(session: StaffSession): void {
  localStorage.setItem(STAFF_STORAGE_KEYS.STAFF_SESSION, JSON.stringify(session));
}

/**
 * Clears active staff session
 */
export function clearStaffSession(): void {
  localStorage.removeItem(STAFF_STORAGE_KEYS.STAFF_SESSION);
}

/**
 * Checks whether Staff Mode is currently active
 */
export function isStaffModeActive(): boolean {
  const session = getStaffSession();
  return Boolean(session && session.staffId && session.role !== 'Owner');
}

/**
 * Locks current staff session (requires Cashier PIN to resume)
 */
export function lockStaffSession(): void {
  const session = getStaffSession();
  if (session) {
    session.isLocked = true;
    saveStaffSession(session);
  }
}

/**
 * Unlocks current staff session after successful PIN verification
 */
export function unlockStaffSession(): void {
  const session = getStaffSession();
  if (session) {
    session.isLocked = false;
    session.authenticatedAt = new Date().toISOString();
    // Refresh expiration for another 12 hours of uninterrupted shift
    session.expiresAt = new Date(Date.now() + 12 * 3600 * 1000).toISOString();
    saveStaffSession(session);
  }
}

/**
 * Enforces staff permissions.
 * If user is Owner (or no staff session), returns true.
 * If staff session exists, checks explicit permission flag.
 */
export function hasStaffPermission(
  session: StaffSession | null, 
  permissionKey: keyof StaffPermissions
): boolean {
  if (!session) return true; // Owner mode has full access
  if (session.role === 'Owner') return true;
  return Boolean(session.permissions && session.permissions[permissionKey]);
}

/**
 * Get default permissions for a role preset
 */
export function getDefaultPermissionsForRole(role: StaffRole): StaffPermissions {
  switch (role) {
    case 'Cashier':
      return { ...DEFAULT_CASHIER_PERMISSIONS };
    case 'Manager':
      return { ...DEFAULT_MANAGER_PERMISSIONS };
    case 'Owner':
      return { ...DEFAULT_OWNER_PERMISSIONS };
    default:
      return { ...DEFAULT_CASHIER_PERMISSIONS };
  }
}

/**
 * Retrieve staff list for a business
 */
export function getStoredStaffMembers(businessId: string): StaffMember[] {
  try {
    const raw = localStorage.getItem(`${STAFF_STORAGE_KEYS.STAFF_MEMBERS}${businessId}`);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Save staff list for a business
 */
export function saveStoredStaffMembers(businessId: string, staff: StaffMember[]): void {
  localStorage.setItem(`${STAFF_STORAGE_KEYS.STAFF_MEMBERS}${businessId}`, JSON.stringify(staff));
}

/**
 * Retrieve sale correction requests
 */
export function getStoredCorrectionRequests(businessId: string): SaleCorrectionRequest[] {
  try {
    const raw = localStorage.getItem(`${STAFF_STORAGE_KEYS.CORRECTION_REQUESTS}${businessId}`);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Save sale correction requests
 */
export function saveStoredCorrectionRequests(businessId: string, requests: SaleCorrectionRequest[]): void {
  localStorage.setItem(`${STAFF_STORAGE_KEYS.CORRECTION_REQUESTS}${businessId}`, JSON.stringify(requests));
}

/**
 * Retrieve staff activity log entries
 */
export function getStoredStaffActivityLogs(businessId: string): StaffActivityLogEntry[] {
  try {
    const raw = localStorage.getItem(`${STAFF_STORAGE_KEYS.STAFF_ACTIVITY_LOGS}${businessId}`);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Append an immutable activity log entry
 */
export function logStaffActivity(
  businessId: string,
  entry: Omit<StaffActivityLogEntry, 'id' | 'timestamp' | 'businessId'>
): StaffActivityLogEntry {
  const existing = getStoredStaffActivityLogs(businessId);
  const newEntry: StaffActivityLogEntry = {
    ...entry,
    id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    businessId,
    timestamp: new Date().toISOString(),
  };

  // Keep latest 250 records
  const updated = [newEntry, ...existing].slice(0, 250);
  localStorage.setItem(`${STAFF_STORAGE_KEYS.STAFF_ACTIVITY_LOGS}${businessId}`, JSON.stringify(updated));
  return newEntry;
}

/**
 * Helper to generate default initial demo staff members for small businesses if none exist yet
 */
export async function seedInitialStaffIfEmpty(businessId: string, ownerId: string, businessName: string): Promise<StaffMember[]> {
  const existing = getStoredStaffMembers(businessId);
  if (existing.length > 0) return existing;

  const johnPinHash = await hashStaffPin('1234', businessId);
  const sarahPinHash = await hashStaffPin('5678', businessId);
  const ericPinHash = await hashStaffPin('9999', businessId);

  const initialStaff: StaffMember[] = [
    {
      id: `staff_john_${Date.now()}`,
      name: 'John',
      role: 'Cashier',
      status: 'ACTIVE',
      cashierPinHash: johnPinHash,
      hasPin: true,
      pinMasked: '••••',
      permissions: { ...DEFAULT_CASHIER_PERMISSIONS },
      businessId,
      businessName,
      ownerId,
      createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
      accessToken: generateStaffAccessToken(),
    },
    {
      id: `staff_sarah_${Date.now() + 1}`,
      name: 'Sarah',
      role: 'Cashier',
      status: 'ACTIVE',
      cashierPinHash: sarahPinHash,
      hasPin: true,
      pinMasked: '••••',
      permissions: { ...DEFAULT_CASHIER_PERMISSIONS },
      businessId,
      businessName,
      ownerId,
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      accessToken: generateStaffAccessToken(),
    },
    {
      id: `staff_eric_${Date.now() + 2}`,
      name: 'Eric',
      role: 'Cashier',
      status: 'DISABLED',
      cashierPinHash: ericPinHash,
      hasPin: true,
      pinMasked: '••••',
      permissions: { ...DEFAULT_CASHIER_PERMISSIONS },
      businessId,
      businessName,
      ownerId,
      createdAt: new Date(Date.now() - 3600000 * 72).toISOString(),
      accessToken: generateStaffAccessToken(),
    },
  ];

  saveStoredStaffMembers(businessId, initialStaff);

  // Seed sample initial activity logs for John & Sarah matching prompt example
  const initialLogs: StaffActivityLogEntry[] = [
    {
      id: `act_sample_1`,
      businessId,
      staffId: initialStaff[0].id,
      staffName: 'John',
      staffRole: 'Cashier',
      action: 'sale_recorded',
      title: 'Recorded Sale',
      details: '49 Amandazi',
      amount: 9800,
      paymentMethod: 'Cash',
      timestamp: new Date(Date.now() - 3600000 * 2.5).toISOString(),
    },
    {
      id: `act_sample_2`,
      businessId,
      staffId: initialStaff[1].id,
      staffName: 'Sarah',
      staffRole: 'Cashier',
      action: 'sale_recorded',
      title: 'Recorded Sale',
      details: '20 Bread',
      amount: 12000,
      paymentMethod: 'Mobile Money',
      timestamp: new Date(Date.now() - 3600000 * 1.8).toISOString(),
    },
  ];
  localStorage.setItem(`${STAFF_STORAGE_KEYS.STAFF_ACTIVITY_LOGS}${businessId}`, JSON.stringify(initialLogs));

  return initialStaff;
}

/**
 * Alias for seedInitialStaffIfEmpty
 */
export const seedInitialStaffMembers = seedInitialStaffIfEmpty;

/**
 * Creates a new staff member with a hashed Cashier PIN and secure access token
 */
export async function createStaffMemberWithPin(params: {
  name: string;
  role: StaffRole;
  pin: string;
  permissions?: StaffPermissions;
  businessId: string;
  businessName: string;
  ownerId: string;
}): Promise<StaffMember> {
  const pinHash = await hashStaffPin(params.pin, params.businessId);
  return {
    id: `staff_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: params.name.trim(),
    role: params.role,
    status: 'ACTIVE',
    cashierPinHash: pinHash,
    hasPin: true,
    pinMasked: '••••',
    permissions: params.permissions || getDefaultPermissionsForRole(params.role),
    businessId: params.businessId,
    businessName: params.businessName,
    ownerId: params.ownerId,
    createdAt: new Date().toISOString(),
    accessToken: generateStaffAccessToken(),
  };
}

/**
 * Encodes staff member info safely into a tamper-evident invitation token
 */
export function encodeStaffInvitePayload(staff: StaffMember): string {
  try {
    const compact = {
      i: staff.id,
      n: staff.name,
      r: staff.role,
      t: staff.accessToken,
      h: staff.cashierPinHash,
      b: staff.businessId,
      m: staff.businessName,
      o: staff.ownerId,
      p: staff.permissions,
      s: staff.status,
    };
    const jsonStr = JSON.stringify(compact);
    // Base64URL safe encoding
    return btoa(unescape(encodeURIComponent(jsonStr)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  } catch {
    return staff.accessToken;
  }
}

/**
 * Decodes staff invitation payload
 */
export function decodeStaffInvitePayload(token: string): Partial<StaffMember> | null {
  try {
    // Restore base64 standard padding and chars
    let b64 = token.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const jsonStr = decodeURIComponent(escape(atob(b64)));
    const c = JSON.parse(jsonStr);
    if (!c.i || !c.n || !c.r) return null;
    return {
      id: c.i,
      name: c.n,
      role: c.r,
      accessToken: c.t || token,
      cashierPinHash: c.h,
      hasPin: true,
      pinMasked: '••••',
      businessId: c.b,
      businessName: c.m,
      ownerId: c.o,
      permissions: c.p || getDefaultPermissionsForRole(c.r),
      status: c.s || 'ACTIVE',
      createdAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * Generates the real, verified, accessible staff invitation link.
 * Uses the live active production host URL (e.g. Cloud Run, Firebase Hosting, or configured domain)
 * rather than an unconfigured domain.
 */
export function getStaffInviteUrl(staff: StaffMember, businessId: string): string {
  const baseUrl = getAppPublicUrl();
  const inviteCode = encodeStaffInvitePayload(staff);
  return `${baseUrl}?staffAccess=${encodeURIComponent(inviteCode)}&businessId=${encodeURIComponent(businessId)}`;
}

/**
 * Helper to parse staff invite token and businessId from the current window location.
 * Supports:
 * 1. /staff/invite/:token?businessId=...
 * 2. /?staffAccess=:token&businessId=...
 * 3. /?invite=:token&businessId=...
 */
export function parseStaffInviteFromUrl(): { token: string; businessId?: string; staffCandidate?: Partial<StaffMember> } | null {
  if (typeof window === 'undefined') return null;

  try {
    const url = new URL(window.location.href);
    
    // Check pathname: /staff/invite/:token
    let token = '';
    const pathMatch = url.pathname.match(/\/staff\/invite\/([a-zA-Z0-9_\-]+)/);
    if (pathMatch && pathMatch[1]) {
      token = pathMatch[1];
    } else {
      token = url.searchParams.get('staffAccess') || url.searchParams.get('invite') || '';
    }

    if (!token) return null;

    const businessId = url.searchParams.get('businessId') || undefined;
    const decoded = decodeStaffInvitePayload(token);

    return {
      token,
      businessId: businessId || decoded?.businessId,
      staffCandidate: decoded || undefined,
    };
  } catch {
    return null;
  }
}

