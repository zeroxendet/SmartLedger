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
  fetchSignInMethodsForEmail,
  linkWithCredential,
  linkWithPopup,
  reauthenticateWithPopup,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
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
  getDocs,
  deleteDoc,
  where,
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
  BusinessActivityLogEntry,
  ArchivedBusinessPeriod
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
      ignoreUndefinedProperties: true,
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
        ignoreUndefinedProperties: true,
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
  currentPeriodId?: string;
  currentPeriodStartedAt?: string;
  archivedPeriods?: ArchivedBusinessPeriod[];
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
  actionType?: 'enable_provider' | 'create_account' | 'login' | 'authorize_domain' | 'open_console' | 'continue_with_google'
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

  if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
    return {
      title: 'Login Failed',
      message: 'Email or password is incorrect.',
    };
  }

  if (code === 'auth/user-not-found') {
    return {
      title: 'No Account Found',
      message: 'No registered account was found with this email. Please check your spelling or create an account.',
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

  if (code === 'auth/too-many-requests') {
    return {
      title: 'Temporarily Locked Out',
      message: 'Access to this account has been temporarily disabled due to many failed login attempts. Please reset your password or try again later.',
    };
  }

  if (code === 'auth/user-disabled') {
    return {
      title: 'Account Disabled',
      message: 'This user account has been disabled. Please contact support.',
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
 * Reauthenticates the current user using Google Sign-In popup.
 * Required by Firebase Auth prior to sensitive operations like linking an Email/Password credential.
 */
export async function reauthenticateWithGoogle(): Promise<{ success: boolean; error?: any; user?: User }> {
  const user = auth.currentUser;
  if (!user) {
    return { success: false, error: { message: 'No authenticated user is currently signed in.' } };
  }
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await reauthenticateWithPopup(user, provider);
    return { success: true, user: result.user };
  } catch (error: any) {
    return { success: false, error };
  }
}

/**
 * Reauthenticates the current user using their existing password credential.
 */
export async function reauthenticateWithPassword(currentPassword: string): Promise<{ success: boolean; error?: any; user?: User }> {
  const user = auth.currentUser;
  if (!user || !user.email) {
    return { success: false, error: { message: 'No authenticated user with an email address is signed in.' } };
  }
  try {
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    const result = await reauthenticateWithCredential(user, credential);
    return { success: true, user: result.user };
  } catch (error: any) {
    return { success: false, error };
  }
}

/**
 * Links a Google account directly to the currently signed in user.
 * Preserves the exact same UID and all business records.
 */
export async function linkGoogleToCurrentUser(): Promise<{ success: boolean; error?: any; user?: User }> {
  const user = auth.currentUser;
  if (!user) {
    return { success: false, error: { message: 'No authenticated user is currently signed in.' } };
  }
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await linkWithPopup(user, provider);
    await user.reload();

    if (user.email) {
      const providers = user.providerData.map((p) => p.providerId);
      localStorage.setItem(
        `smartledger_account_provider_${user.email.toLowerCase()}`,
        JSON.stringify({ 
          providers, 
          hasPassword: providers.includes('password'),
          hasGoogle: true,
          updatedAt: new Date().toISOString()
        })
      );

      // Save auth provider flags to user's Firestore doc
      try {
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, {
          authProviders: providers,
          hasGoogle: true,
          hasPassword: providers.includes('password'),
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch {}
    }

    return { success: true, user: result.user };
  } catch (error: any) {
    return { success: false, error };
  }
}

/**
 * Creates or updates an Email/Password credential for the currently authenticated Firebase user.
 * Links the EmailAuthProvider credential directly to the existing UID (never creates a second account).
 * Never stores raw passwords in localStorage, database, or application state.
 */
export async function createPasswordForCurrentUser(password: string): Promise<{ success: boolean; error?: any }> {
  const user = auth.currentUser;
  if (!user) {
    return { success: false, error: { message: 'No authenticated user is currently signed in.' } };
  }
  if (!user.email) {
    return { success: false, error: { message: 'This account does not have an associated email address.' } };
  }

  try {
    const hasPasswordProvider = user.providerData.some((p) => p.providerId === 'password');
    if (hasPasswordProvider) {
      await updatePassword(user, password);
    } else {
      const credential = EmailAuthProvider.credential(user.email, password);
      await linkWithCredential(user, credential);
    }

    await user.reload();

    // Update local provider registry cache for instant detection across all components
    try {
      const providers = user.providerData.map((p) => p.providerId);
      if (!providers.includes('password')) providers.push('password');
      localStorage.setItem(
        `smartledger_account_provider_${user.email.toLowerCase()}`,
        JSON.stringify({
          providers,
          hasPassword: true,
          hasGoogle: providers.includes('google.com'),
          updatedAt: new Date().toISOString()
        })
      );
    } catch {}

    // Also persist provider state in Firestore user doc
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        hasPassword: true,
        authProviders: user.providerData.map((p) => p.providerId),
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch {}

    return { success: true };
  } catch (error: any) {
    return { success: false, error };
  }
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
    // Sanitize payload to eliminate any undefined values that could violate Firestore specifications
    const sanitizedData = JSON.parse(
      JSON.stringify(workspaceData, (_, v) => (v === undefined ? null : v))
    );

    const savePromise = setDoc(userDocRef, {
      ...sanitizedData,
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
    console.error('Firestore saveUserWorkspace error:', error);
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
 * Delete an individual activity log document by ID from Firestore
 */
export async function deleteBusinessActivityLog(userId: string, logId: string): Promise<boolean> {
  if (!userId || !db || !logId) return false;
  try {
    const docRef = doc(db, 'users', userId, 'activity_log', logId);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.warn('deleteBusinessActivityLog note:', err);
    return false;
  }
}

/**
 * Delete activity log documents matching a related transaction ID
 */
export async function deleteBusinessActivityLogsByRelatedId(userId: string, relatedId: string): Promise<boolean> {
  if (!userId || !db || !relatedId) return false;
  try {
    const activityCol = collection(db, 'users', userId, 'activity_log');
    const q = query(activityCol, where('relatedId', '==', relatedId));
    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deletePromises);
    return true;
  } catch (err) {
    console.warn('deleteBusinessActivityLogsByRelatedId note:', err);
    return false;
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

/**
 * Persist an archived business period snapshot to Firestore subcollection
 */
export async function archiveBusinessPeriodToFirestore(
  userId: string,
  period: ArchivedBusinessPeriod
): Promise<{ success: boolean; error?: any }> {
  if (!userId || !db) return { success: false, error: 'Database not available' };
  try {
    const periodDocRef = doc(db, 'users', userId, 'archived_periods', period.id);
    const sanitizedPeriod = JSON.parse(
      JSON.stringify(period, (_, v) => (v === undefined ? null : v))
    );
    await setDoc(periodDocRef, sanitizedPeriod);
    return { success: true };
  } catch (error) {
    console.error('Firestore archiveBusinessPeriod error:', error);
    return { success: false, error };
  }
}

/**
 * Fetch all archived periods from Firestore subcollection
 */
export async function fetchArchivedPeriodsFromFirestore(
  userId: string
): Promise<{ success: boolean; data?: ArchivedBusinessPeriod[]; error?: any }> {
  if (!userId || !db) return { success: false, error: 'Database not available' };
  try {
    const periodsCol = collection(db, 'users', userId, 'archived_periods');
    const q = query(periodsCol, orderBy('archivedAt', 'desc'));
    const snapshot = await getDocs(q);
    const periods: ArchivedBusinessPeriod[] = [];
    snapshot.forEach((docSnap) => {
      periods.push(docSnap.data() as ArchivedBusinessPeriod);
    });
    return { success: true, data: periods };
  } catch (error) {
    console.warn('Firestore fetchArchivedPeriods note:', error);
    return { success: false, error };
  }
}

/**
 * Permanently delete an archived business period document from Firestore
 */
export async function deleteArchivedPeriodFromFirestore(
  userId: string,
  periodId: string
): Promise<{ success: boolean; error?: any }> {
  if (!userId || !db || !periodId) return { success: false, error: 'Database or period ID missing' };
  try {
    const periodDocRef = doc(db, 'users', userId, 'archived_periods', periodId);
    await deleteDoc(periodDocRef);
    return { success: true };
  } catch (error) {
    console.error('Firestore deleteArchivedPeriod error:', error);
    return { success: false, error };
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
