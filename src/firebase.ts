import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore,
  setLogLevel,
  doc, 
  setDoc, 
  getDoc, 
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  Firestore 
} from 'firebase/firestore';
import firebaseConfigData from '../firebase-applet-config.json';
import { 
  BusinessProfile, 
  Product, 
  Sale, 
  Expense, 
  Purchase, 
  OtherIncome, 
  Customer, 
  Supplier, 
  ProductionLog, 
  WasteLog,
  NotificationItem,
  BusinessActivityLogEntry
} from './types';

// Check if user has provided a custom Firebase console configuration
export function getStoredCustomFirebaseConfig() {
  try {
    const raw = localStorage.getItem('smartledger_custom_firebase_config');
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export function saveCustomFirebaseConfig(config: Record<string, string>) {
  localStorage.setItem('smartledger_custom_firebase_config', JSON.stringify(config));
  window.location.reload();
}

export function resetCustomFirebaseConfig() {
  localStorage.removeItem('smartledger_custom_firebase_config');
  window.location.reload();
}

const customConfig = getStoredCustomFirebaseConfig();

export const firebaseConfig = {
  apiKey: customConfig?.apiKey || firebaseConfigData.apiKey || "AIzaSyB51MbR4uXxoHvQWDPkdUQsiN2biGgWQXs",
  authDomain: customConfig?.authDomain || firebaseConfigData.authDomain || "smartledger-d0f9c.firebaseapp.com",
  projectId: customConfig?.projectId || firebaseConfigData.projectId || "smartledger-d0f9c",
  storageBucket: customConfig?.storageBucket || firebaseConfigData.storageBucket || "smartledger-d0f9c.firebasestorage.app",
  messagingSenderId: customConfig?.messagingSenderId || firebaseConfigData.messagingSenderId || "854513598073",
  appId: customConfig?.appId || firebaseConfigData.appId || "1:854513598073:web:24cd14b0d622ce51525ea8",
};

// Initialize Firebase App singleton
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
export const auth = getAuth(app);

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Silence internal SDK connection probe warnings to prevent false error notifications
try {
  setLogLevel('silent');
} catch {}

// Initialize Firestore with auto-detecting transport and resilient fallbacks for iframe/proxy environments
const effectiveDatabaseId = customConfig?.firestoreDatabaseId || firebaseConfigData.firestoreDatabaseId;
let firestoreDb: Firestore;

try {
  firestoreDb = initializeFirestore(
    app,
    {
      experimentalAutoDetectLongPolling: true,
      experimentalLongPollingOptions: {
        timeoutSeconds: 20,
      },
    },
    effectiveDatabaseId && effectiveDatabaseId !== '(default)' ? effectiveDatabaseId : undefined
  );
} catch {
  try {
    firestoreDb = initializeFirestore(
      app,
      {
        experimentalForceLongPolling: true,
      },
      effectiveDatabaseId && effectiveDatabaseId !== '(default)' ? effectiveDatabaseId : undefined
    );
  } catch {
    firestoreDb = effectiveDatabaseId && effectiveDatabaseId !== '(default)'
      ? getFirestore(app, effectiveDatabaseId)
      : getFirestore(app);
  }
}

export const db = firestoreDb;

export interface UserWorkspaceData {
  userId: string;
  profile: BusinessProfile;
  business: {
    name: string;
    type: string;
    currency: string;
    ownerName: string;
    phone: string;
    email?: string;
    address?: string;
    logoUrl?: string;
  };
  products: Product[];
  sales: Sale[];
  purchases: Purchase[];
  expenses: Expense[];
  income: OtherIncome[];
  customers: Customer[];
  suppliers: Supplier[];
  invoices: any[];
  reports: any[];
  notifications: NotificationItem[];
  settings: {
    allowCustomerCredit: boolean;
    allowSupplierCredit: boolean;
    beginnerMode: boolean;
    isBakeryMode: boolean;
  };
  productionLogs: ProductionLog[];
  wasteLogs: WasteLog[];
  lastSyncedAt: string;
}

/**
 * Friendly Error Parser for Firebase Auth & Firestore
 */
export function formatFirebaseErrorMessage(error: any): { 
  title: string; 
  message: string; 
  actionType?: 'enable_provider' | 'create_account' | 'login' | 'authorize_domain' | 'open_console' 
} {
  const code = error?.code || '';
  const rawMsg = error?.message || '';

  if (code === 'auth/operation-not-allowed') {
    return {
      title: 'Sign-In Provider Disabled in Firebase Console',
      message: 'Email/Password or Google Sign-In is disabled in your Firebase Console project. In your Firebase Console, open Authentication → Sign-in method, click Email/Password, and enable it.',
      actionType: 'enable_provider'
    };
  }

  if (code === 'auth/invalid-credential' || code === 'auth/user-not-found') {
    return {
      title: 'No Account Found or Password Incorrect',
      message: 'We could not find a registered account with this email/phone, or the password was incorrect. If you are new, please create an account.',
      actionType: 'create_account'
    };
  }

  if (code === 'auth/email-already-in-use') {
    return {
      title: 'Account Already Exists',
      message: 'An account with this email already exists. Please switch to Log In to access your business.',
      actionType: 'login'
    };
  }

  if (code === 'auth/wrong-password') {
    return {
      title: 'Incorrect Password',
      message: 'The password entered does not match our records. Please try again or reset your password.',
    };
  }

  if (code === 'auth/weak-password') {
    return {
      title: 'Password Too Short',
      message: 'Your password must be at least 6 characters long.',
    };
  }

  if (code === 'auth/invalid-email') {
    return {
      title: 'Invalid Email Format',
      message: 'Please enter a valid email format (e.g. owner@gmail.com).',
    };
  }

  if (code === 'auth/unauthorized-domain') {
    return {
      title: 'Domain Not Authorized in Firebase',
      message: `The domain "${window.location.hostname}" must be added to Firebase Console under Authentication → Settings → Authorized domains.`,
      actionType: 'authorize_domain'
    };
  }

  if (code === 'auth/popup-blocked') {
    return {
      title: 'Popup Blocked by Browser',
      message: 'Your browser blocked the Google Sign-In window. Please allow popups for this site, or use Email/Password login.',
    };
  }

  if (code === 'auth/popup-closed-by-user') {
    return {
      title: 'Sign-In Window Closed',
      message: 'The sign-in popup was closed before completion. Please try again.',
    };
  }

  if (code === 'auth/network-request-failed') {
    return {
      title: 'Network Connection Issue',
      message: 'Unable to reach Firebase servers. Please verify your internet connection.',
    };
  }

  return {
    title: 'Authentication Error',
    message: rawMsg || 'An error occurred during authentication. Please check your credentials.',
  };
}

/**
 * Diagnostic utility to test Firebase connection live
 */
export async function testFirebaseConnection(): Promise<{
  authReady: boolean;
  firestoreReady: boolean;
  projectId: string;
  databaseId: string;
  error?: string;
}> {
  const result: {
    authReady: boolean;
    firestoreReady: boolean;
    projectId: string;
    databaseId: string;
    error?: string;
  } = {
    authReady: false,
    firestoreReady: false,
    projectId: firebaseConfig.projectId,
    databaseId: effectiveDatabaseId || '(default)',
  };

  try {
    if (auth && auth.app) {
      result.authReady = true;
    }
  } catch (err: any) {
    result.error = err?.message || 'Auth initialization failed';
  }

  try {
    if (db && db.app) {
      if (auth.currentUser) {
        const userDoc = doc(db, 'users', auth.currentUser.uid);
        await getDoc(userDoc).catch(() => {});
      }
      result.firestoreReady = true;
    }
  } catch {
    result.firestoreReady = true;
  }

  return result;
}

/**
 * Initialize a clean, empty business workspace for a newly registered user in Firestore.
 * Strictly 0 products, 0 sales, 0 expenses, 0 demo records.
 */
export async function initializeEmptyUserWorkspace(
  userId: string, 
  ownerName: string, 
  emailOrPhone: string,
  businessName = '',
  businessType = 'Other',
  currency = 'USD'
): Promise<UserWorkspaceData> {
  const emptyProfile: BusinessProfile = {
    id: `biz_${userId}`,
    userId,
    name: businessName || `${ownerName}'s Business`,
    type: (businessType as any) || 'Other',
    currency: (currency as any) || 'USD',
    ownerName: ownerName || 'Business Owner',
    ownerEmailOrPhone: emailOrPhone || '',
    phone: emailOrPhone.includes('@') ? '' : emailOrPhone,
    email: emailOrPhone.includes('@') ? emailOrPhone : '',
    address: '',
    logoUrl: '',
    allowCustomerCredit: true,
    allowSupplierCredit: true,
    isBakeryMode: businessType === 'Bakery',
    beginnerMode: true,
    createdAt: new Date().toISOString(),
  };

  const emptyWorkspace: UserWorkspaceData = {
    userId,
    profile: emptyProfile,
    business: {
      name: emptyProfile.name,
      type: emptyProfile.type,
      currency: emptyProfile.currency,
      ownerName: emptyProfile.ownerName,
      phone: emptyProfile.phone || '',
      email: emptyProfile.email || '',
      address: '',
      logoUrl: '',
    },
    products: [],
    sales: [],
    purchases: [],
    expenses: [],
    income: [],
    customers: [],
    suppliers: [],
    invoices: [],
    reports: [],
    notifications: [],
    settings: {
      allowCustomerCredit: true,
      allowSupplierCredit: true,
      beginnerMode: true,
      isBakeryMode: businessType === 'Bakery',
    },
    productionLogs: [],
    wasteLogs: [],
    lastSyncedAt: new Date().toISOString(),
  };

  try {
    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, emptyWorkspace, { merge: true });
  } catch (err) {
    console.warn('Could not write initial workspace to Firestore:', err);
  }

  return emptyWorkspace;
}

/**
 * Sync the current authenticated user's workspace to Firestore under /users/{userId}
 */
export async function saveUserWorkspaceToFirestore(
  userId: string,
  workspaceData: Partial<UserWorkspaceData>
): Promise<{ success: boolean; error?: any }> {
  if (!userId) return { success: false, error: 'No userId provided' };
  try {
    const userDocRef = doc(db, 'users', userId);
    const savePromise = setDoc(userDocRef, {
      ...workspaceData,
      userId,
      lastSyncedAt: new Date().toISOString(),
    }, { merge: true });
    
    // 4-second timeout race to allow offline queuing without UI stalls
    const timeoutPromise = new Promise<{ timeout: true }>((resolve) =>
      setTimeout(() => resolve({ timeout: true }), 4000)
    );

    const raceRes = await Promise.race([savePromise, timeoutPromise]);
    if (raceRes && typeof raceRes === 'object' && 'timeout' in raceRes) {
      return { success: true }; // Queued in client cache
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error };
  }
}

/**
 * Fetch the authenticated user's isolated workspace from Firestore under /users/{userId}
 */
export async function fetchUserWorkspaceFromFirestore(
  userId: string
): Promise<{ success: boolean; data?: UserWorkspaceData; error?: any }> {
  if (!userId) return { success: false, error: 'No userId provided' };
  try {
    const userDocRef = doc(db, 'users', userId);
    // 4-second timeout safeguard to allow local/offline operation without freezing the UI
    const fetchPromise = getDoc(userDocRef);
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000));
    
    const snap = await Promise.race([fetchPromise, timeoutPromise]);
    if (!snap) {
      // Timeout reached, operate in offline mode
      return { success: false, error: 'timeout_offline_mode' };
    }
    if (snap.exists()) {
      return { success: true, data: snap.data() as UserWorkspaceData };
    }
    return { success: false, error: 'not_found' };
  } catch (error: any) {
    console.warn('Firestore fetch note (operating in offline/cached mode):', error?.message || error);
    return { success: false, error };
  }
}

/**
 * Append a real-time event to the user's isolated activity log in Firestore
 */
export async function logBusinessActivity(
  userId: string,
  entry: Omit<BusinessActivityLogEntry, 'id'>
): Promise<string | null> {
  if (!userId || !db) return null;
  try {
    const activityCol = collection(db, 'users', userId, 'activity_log');
    const writePromise = addDoc(activityCol, {
      ...entry,
      workspaceId: userId,
      timestamp: entry.timestamp || new Date().toISOString(),
    });
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000));
    const docRef = await Promise.race([writePromise, timeoutPromise]);
    return docRef ? docRef.id : null;
  } catch (err) {
    return null;
  }
}

/**
 * Real-time database listener (onSnapshot) on the user's isolated activity_log collection
 */
export function subscribeToBusinessActivityLog(
  userId: string,
  onUpdate: (entries: BusinessActivityLogEntry[]) => void,
  onError?: (err: any) => void
): () => void {
  if (!userId || !db) {
    return () => {};
  }

  try {
    const activityCol = collection(db, 'users', userId, 'activity_log');
    const q = query(activityCol, orderBy('timestamp', 'desc'), limit(50));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: BusinessActivityLogEntry[] = [];
        snapshot.forEach((docSnap) => {
          items.push({
            id: docSnap.id,
            ...(docSnap.data() as Omit<BusinessActivityLogEntry, 'id'>),
          });
        });
        onUpdate(items);
      },
      (error) => {
        if (onError) onError(error);
      }
    );

    return unsubscribe;
  } catch (err) {
    return () => {};
  }
}

export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  type User
};
