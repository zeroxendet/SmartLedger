import React, { useState, useEffect, useRef } from 'react';
import { 
  BusinessProfile, 
  Product, 
  ProductVariant,
  Sale, 
  Expense, 
  Purchase, 
  OtherIncome, 
  Customer, 
  Supplier, 
  ProductionLog, 
  WasteLog,
  CustomerReturn,
  CashRegisterShift,
  ArchivedBusinessPeriod
} from './types';
import { SplashScreen } from './components/SplashScreen';
import { WelcomeScreen } from './components/WelcomeScreen';
import { AuthModal } from './components/AuthModal';
import { BusinessSetupWizard } from './components/BusinessSetupWizard';
import { BrandLogo } from './components/BrandLogo';
import { DashboardView } from './components/DashboardView';
import { ProductsView } from './components/ProductsView';
import { CustomersView } from './components/CustomersView';
import { SuppliersView } from './components/SuppliersView';
import { ReportsView } from './components/ReportsView';
import { BusinessFeedView } from './components/BusinessFeedView';
import { SellModal } from './components/SellModal';
import { ExpensesModal } from './components/ExpensesModal';
import { PurchasesModal } from './components/PurchasesModal';
import { IncomeModal } from './components/IncomeModal';
import { AIAssistantModal } from './components/AIAssistantModal';
import { BakeryProductionModal } from './components/BakeryProductionModal';
import { FirebaseConsoleModal } from './components/FirebaseConsoleModal';
import { ShiftReconciliationModal } from './components/ShiftReconciliationModal';
import { ReturnsModal } from './components/ReturnsModal';
import { CashierPinModal } from './components/CashierPinModal';
import { PurchaseOrderModal } from './components/PurchaseOrderModal';
import { ShareAppModal } from './components/ShareAppModal';
import { SettingsModal } from './components/SettingsModal';
import { RestartBusinessModal } from './components/RestartBusinessModal';
import { ArchivedPeriodDetailsModal } from './components/ArchivedPeriodDetailsModal';
import { ReceiptModal } from './components/ReceiptModal';
import { BottomNavBar } from './components/BottomNavBar';
import { SessionLockScreen } from './components/SessionLockScreen';
import { 
  SESSION_LOCK_TIMEOUT_MINUTES,
  SESSION_LOCK_TIMEOUT_MS,
  checkShouldSessionLock,
  setSessionLockedState,
  recordBackgroundTimestamp,
  clearBackgroundTimestamp,
  recordUserActiveTimestamp,
  clearSessionLockStorage,
  evaluateSessionOnReturn,
  STORAGE_KEYS
} from './utils/sessionLock';
import { 
  checkProductHistory, 
  canUserArchiveProduct, 
  canUserRestoreProduct, 
  canUserPermanentlyDeleteProduct 
} from './utils/productHistoryUtils';

import { 
  LayoutDashboard, 
  Package, 
  Users, 
  Truck, 
  BarChart3, 
  Activity, 
  Bot, 
  Wheat, 
  LogOut, 
  Menu, 
  X, 
  Cloud,
  CheckCircle2,
  RefreshCw,
  Flame,
  Lock,
  Unlock,
  KeyRound,
  Clock,
  RotateCcw,
  Share2,
  Settings as SettingsIcon,
  Archive,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import { 
  auth, 
  signOut, 
  onAuthStateChanged, 
  User, 
  saveUserWorkspaceToFirestore, 
  fetchUserWorkspaceFromFirestore,
  initializeEmptyUserWorkspace,
  logBusinessActivity,
  UserWorkspaceData,
  archiveBusinessPeriodToFirestore,
  fetchArchivedPeriodsFromFirestore,
  deleteArchivedPeriodFromFirestore,
  deleteBusinessActivityLog,
  deleteBusinessActivityLogsByRelatedId
} from './firebase';
import { formatCurrency } from './utils/calculations';
import { userScopedStorage } from './utils/storage';
import { useDevMode } from './utils/devMode';


export function App() {
  // Splash screen state (Phase 1)
  const [showSplash, setShowSplash] = useState<boolean>(true);

  // Firebase Auth & Unified User Session State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeUserId, setActiveUserId] = useState<string | null>(() => {
    return localStorage.getItem('smartledger_active_uid') || null;
  });
  const effectiveUserId = currentUser?.uid || activeUserId || null;

  const { isDevOrOwner } = useDevMode(currentUser?.email);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [isWizardOpen, setIsWizardOpen] = useState<boolean>(false);
  const [wizardUser, setWizardUser] = useState<{ name: string; email: string }>({ name: '', email: '' });

  // Main navigation tab with resilient persistence across reloads & session unlocks
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'customers' | 'suppliers' | 'reports' | 'feed'>(() => {
    try {
      const saved = localStorage.getItem('smartledger_last_active_tab');
      if (saved && ['dashboard', 'products', 'customers', 'suppliers', 'reports', 'feed'].includes(saved)) {
        return saved as any;
      }
    } catch {}
    return 'dashboard';
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Business Data States (Strictly isolated per user, 0 demo records)
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [otherIncomes, setOtherIncomes] = useState<OtherIncome[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [productionLogs, setProductionLogs] = useState<ProductionLog[]>([]);
  const [wasteLogs, setWasteLogs] = useState<WasteLog[]>([]);
  const [shifts, setShifts] = useState<CashRegisterShift[]>([]);
  const [returns, setReturns] = useState<CustomerReturn[]>([]);

  // Cash Register Active Shift
  const activeShift = shifts.find((s) => s.status === 'OPEN') || null;

  // Operational Modals
  const [isSellOpen, setIsSellOpen] = useState<boolean>(false);
  const [preselectedSellProduct, setPreselectedSellProduct] = useState<Product | null>(null);
  const [preselectedSellQuantity, setPreselectedSellQuantity] = useState<number>(1);
  const [preselectedSellVariant, setPreselectedSellVariant] = useState<ProductVariant | null>(null);
  const [initialBarcodeToAdd, setInitialBarcodeToAdd] = useState<string | null>(null);
  const [isSpendOpen, setIsSpendOpen] = useState<boolean>(false);
  const [isBuyStockOpen, setIsBuyStockOpen] = useState<boolean>(false);
  const [isReceiveIncomeOpen, setIsReceiveIncomeOpen] = useState<boolean>(false);
  const [isAIOpen, setIsAIOpen] = useState<boolean>(false);
  const [isBakeryOpen, setIsBakeryOpen] = useState<boolean>(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState<boolean>(false);
  const [isReturnsOpen, setIsReturnsOpen] = useState<boolean>(false);
  const [isPOModalOpen, setIsPOModalOpen] = useState<boolean>(false);
  const [isFirebaseConsoleModalOpen, setIsFirebaseConsoleModalOpen] = useState<boolean>(false);

  // Cashier Mode Role Protection (PIN Lock)
  const [isCashierMode, setIsCashierMode] = useState<boolean>(() => {
    return localStorage.getItem('smartledger_is_cashier_mode') === 'true';
  });
  const [cashierPin, setCashierPin] = useState<string>(() => {
    return localStorage.getItem('smartledger_cashier_pin') || '1234';
  });
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);
  const [pinModalMode, setPinModalMode] = useState<'unlock_owner' | 'set_pin'>('unlock_owner');
  const [pendingTabAfterUnlock, setPendingTabAfterUnlock] = useState<'reports' | 'feed' | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [archivedPeriods, setArchivedPeriods] = useState<ArchivedBusinessPeriod[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isRestartBusinessOpen, setIsRestartBusinessOpen] = useState<boolean>(false);
  const [selectedArchivedPeriod, setSelectedArchivedPeriod] = useState<ArchivedBusinessPeriod | null>(null);

  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);
  const [selectedReceiptSale, setSelectedReceiptSale] = useState<Sale | null>(null);

  // Secure Automatic Session Lock State (5-minute background / idle timeout)
  const [isSessionLocked, setIsSessionLocked] = useState<boolean>(() => {
    return checkShouldSessionLock();
  });

  const [cloudSyncStatus, setCloudSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('synced');

  // Flag to avoid syncing initial load back to Firestore
  const isInitialLoadComplete = useRef<boolean>(false);

  const handleContinueOffline = (name = 'Business Owner') => {
    const localId = 'local_user_default';
    setActiveUserId(localId);
    localStorage.setItem('smartledger_active_uid', localId);
    setIsSessionLocked(false);
    setSessionLockedState(false);
    clearBackgroundTimestamp();
    recordUserActiveTimestamp();
    const storage = userScopedStorage(localId);
    const existing = storage.getProfile();
    if (existing && existing.name) {
      setProfile(existing);
      if (existing.cashierPin) {
        setCashierPin(existing.cashierPin);
        localStorage.setItem('smartledger_cashier_pin', existing.cashierPin);
      }
      setProducts(storage.getProducts());
      setSales(storage.getSales());
      setExpenses(storage.getExpenses());
      setPurchases(storage.getPurchases());
      setOtherIncomes(storage.getOtherIncomes());
      setCustomers(storage.getCustomers());
      setSuppliers(storage.getSuppliers());
      setShifts(storage.getShifts());
      setReturns(storage.getCustomerReturns());
      setArchivedPeriods(storage.getArchivedPeriods() || []);
      setIsAuthenticated(true);
      setIsWizardOpen(false);
      isInitialLoadComplete.current = true;
    } else {
      setWizardUser({ name, email: 'local@smartledger.app' });
      setIsWizardOpen(true);
    }
  };

  const clearLocalState = () => {
    clearSessionLockStorage();
    setIsSessionLocked(false);
    setProfile(null);
    setProducts([]);
    setSales([]);
    setExpenses([]);
    setPurchases([]);
    setOtherIncomes([]);
    setCustomers([]);
    setSuppliers([]);
    setProductionLogs([]);
    setWasteLogs([]);
    setShifts([]);
    setReturns([]);
    setArchivedPeriods([]);
    isInitialLoadComplete.current = false;
  };

  /**
   * Load user workspace data by UID with intelligent non-destructive merging:
   * Local products are NEVER overwritten by an empty Firestore array.
   */
  const loadUserDataForUid = async (uid: string, email?: string, displayName?: string) => {
    setIsAuthLoading(true);
    try {
      const storage = userScopedStorage(uid);

      // 1. Instant optimistic restore from local device cache for seamless offline operation
      const localProf = storage.getProfile();
      const localProducts = storage.getProducts() || [];
      const localSales = storage.getSales() || [];
      const localExpenses = storage.getExpenses() || [];
      const localPurchases = storage.getPurchases() || [];
      const localOtherIncomes = storage.getOtherIncomes() || [];
      const localCustomers = storage.getCustomers() || [];
      const localSuppliers = storage.getSuppliers() || [];
      const localShifts = storage.getShifts() || [];
      const localReturns = storage.getCustomerReturns() || [];
      const localProdLogs = storage.getProductionLogs() || [];
      const localWasteLogs = storage.getWasteLogs() || [];
      const localArchived = storage.getArchivedPeriods() || [];

      if (localProf && localProf.name) {
        setProfile(localProf);
        if (localProf.cashierPin) {
          setCashierPin(localProf.cashierPin);
          localStorage.setItem('smartledger_cashier_pin', localProf.cashierPin);
        }
        setProducts(localProducts);
        setSales(localSales);
        setExpenses(localExpenses);
        setPurchases(localPurchases);
        setOtherIncomes(localOtherIncomes);
        setCustomers(localCustomers);
        setSuppliers(localSuppliers);
        setShifts(localShifts);
        setReturns(localReturns);
        setProductionLogs(localProdLogs);
        setWasteLogs(localWasteLogs);
        setArchivedPeriods(localArchived);
        setIsAuthenticated(true);
        setIsWizardOpen(false);
      }

      // 2. Fetch latest data from Firestore (only when authenticated as matching user)
      const res = (auth.currentUser && auth.currentUser.uid === uid && !uid.startsWith('local_'))
        ? await fetchUserWorkspaceFromFirestore(uid)
        : { success: false, error: 'unauthenticated' };

      if (res.success && res.data && res.data.profile) {
        const ws = res.data;
        setProfile(ws.profile);
        if (ws.profile.cashierPin) {
          setCashierPin(ws.profile.cashierPin);
          localStorage.setItem('smartledger_cashier_pin', ws.profile.cashierPin);
        }

        // INTELLIGENT MERGE FOR PRODUCTS:
        // Do not let an empty or outdated Firestore document wipe out products saved locally!
        let finalProducts = ws.products || [];
        if (finalProducts.length === 0 && localProducts.length > 0) {
          finalProducts = localProducts;
          // Sync local products back to Firestore
          saveUserWorkspaceToFirestore(uid, { products: localProducts }).catch(() => {});
        } else if (localProducts.length > 0) {
          // Merge by product ID, preserving all unique products from both sources
          const prodMap = new Map<string, Product>();
          finalProducts.forEach((p) => prodMap.set(p.id, p));
          localProducts.forEach((p) => {
            if (!prodMap.has(p.id)) {
              prodMap.set(p.id, p);
            }
          });
          finalProducts = Array.from(prodMap.values());
        }

        setProducts(finalProducts);
        storage.saveProducts(finalProducts);

        // Safe merge for sales, expenses, customers, suppliers
        const finalSales = (ws.sales && ws.sales.length > 0) ? ws.sales : localSales;
        setSales(finalSales);
        storage.saveSales(finalSales);

        const finalExpenses = (ws.expenses && ws.expenses.length > 0) ? ws.expenses : localExpenses;
        setExpenses(finalExpenses);
        storage.saveExpenses(finalExpenses);

        const finalPurchases = (ws.purchases && ws.purchases.length > 0) ? ws.purchases : localPurchases;
        setPurchases(finalPurchases);
        storage.savePurchases(finalPurchases);

        const finalIncome = (ws.income && ws.income.length > 0) ? ws.income : localOtherIncomes;
        setOtherIncomes(finalIncome);
        storage.saveOtherIncomes(finalIncome);

        const finalCustomers = (ws.customers && ws.customers.length > 0) ? ws.customers : localCustomers;
        setCustomers(finalCustomers);
        storage.saveCustomers(finalCustomers);

        const finalSuppliers = (ws.suppliers && ws.suppliers.length > 0) ? ws.suppliers : localSuppliers;
        setSuppliers(finalSuppliers);
        storage.saveSuppliers(finalSuppliers);

        const finalProdLogs = (ws.productionLogs && ws.productionLogs.length > 0) ? ws.productionLogs : localProdLogs;
        setProductionLogs(finalProdLogs);
        storage.saveProductionLogs(finalProdLogs);

        const finalWasteLogs = (ws.wasteLogs && ws.wasteLogs.length > 0) ? ws.wasteLogs : localWasteLogs;
        setWasteLogs(finalWasteLogs);
        storage.saveWasteLogs(finalWasteLogs);

        // Fetch and merge archived periods (only if authenticated with matching UID)
        if (auth.currentUser && auth.currentUser.uid === uid && !uid.startsWith('local_')) {
          try {
            const archivedRes = await fetchArchivedPeriodsFromFirestore(uid);
            if (archivedRes.success && archivedRes.data && archivedRes.data.length > 0) {
              const archMap = new Map<string, ArchivedBusinessPeriod>();
              archivedRes.data.forEach((p) => archMap.set(p.id, p));
              localArchived.forEach((p) => {
                if (!archMap.has(p.id)) archMap.set(p.id, p);
              });
              const mergedArchived = Array.from(archMap.values()).sort((a, b) => 
                new Date(b.archivedAt).getTime() - new Date(a.archivedAt).getTime()
              );
              setArchivedPeriods(mergedArchived);
              storage.saveArchivedPeriods(mergedArchived);
            } else if (ws.archivedPeriods && ws.archivedPeriods.length > 0) {
              setArchivedPeriods(ws.archivedPeriods);
              storage.saveArchivedPeriods(ws.archivedPeriods);
            }
          } catch (e) {
            console.warn('Could not fetch archived periods from Firestore:', e);
          }
        } else if (ws.archivedPeriods && ws.archivedPeriods.length > 0) {
          setArchivedPeriods(ws.archivedPeriods);
          storage.saveArchivedPeriods(ws.archivedPeriods);
        }

        storage.saveProfile(ws.profile);

        setIsAuthenticated(true);
        setIsWizardOpen(false);
      } else if (!localProf || !localProf.name) {
        // Truly a new user with no setup anywhere: open Business Setup Wizard
        setWizardUser({
          name: displayName || '',
          email: email || '',
        });
        setIsWizardOpen(true);
        setIsAuthenticated(false);
      } else {
        // Local profile loaded successfully
        setIsAuthenticated(true);
        setIsWizardOpen(false);
      }
    } catch (err) {
      console.error('Error loading user business workspace:', err);
    } finally {
      setIsAuthLoading(false);
      // Allow syncing after state is established
      setTimeout(() => {
        isInitialLoadComplete.current = true;
      }, 300);
    }
  };

  // 1. Listen for Firebase Authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Standard business owner login
        setActiveUserId(user.uid);
        localStorage.setItem('smartledger_active_uid', user.uid);
        await loadUserDataForUid(user.uid, user.email || '', user.displayName || '');
      } else {
        // Check if there is a persistent active local user session
        const storedUid = localStorage.getItem('smartledger_active_uid');
        const storedMetaRaw = localStorage.getItem('smartledger_active_user_meta');
        if (storedUid && storedMetaRaw) {
          try {
            const meta = JSON.parse(storedMetaRaw);
            setActiveUserId(storedUid);
            await loadUserDataForUid(storedUid, meta.email, meta.name);
            return;
          } catch {}
        }
        // Logged out: reset all state to zero
        clearLocalState();
        setIsAuthenticated(false);
        setIsWizardOpen(false);
        setIsAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. Sync state changes to user's isolated workspace (Local Storage immediately, Firestore debounced)
  useEffect(() => {
    const uid = effectiveUserId;
    if (!uid || !profile || !isInitialLoadComplete.current) return;

    const storage = userScopedStorage(uid);
    storage.saveProfile(profile);
    storage.saveProducts(products);
    storage.saveSales(sales);
    storage.saveExpenses(expenses);
    storage.savePurchases(purchases);
    storage.saveOtherIncomes(otherIncomes);
    storage.saveCustomers(customers);
    storage.saveSuppliers(suppliers);
    storage.saveProductionLogs(productionLogs);
    storage.saveWasteLogs(wasteLogs);
    storage.saveShifts(shifts);
    storage.saveCustomerReturns(returns);

    // Debounced Firestore sync for Firebase-authenticated accounts
    if (currentUser?.uid) {
      const timeoutId = setTimeout(async () => {
        setCloudSyncStatus('syncing');
        try {
          const workspacePayload: Partial<UserWorkspaceData> = {
            userId: currentUser.uid,
            profile,
            business: {
              name: profile.name,
              type: profile.type,
              currency: profile.currency,
              ownerName: profile.ownerName,
              phone: profile.phone || '',
              email: profile.email || currentUser.email || '',
              address: profile.address || '',
              logoUrl: profile.logoUrl || '',
            },
            products,
            sales,
            expenses,
            purchases,
            income: otherIncomes,
            customers,
            suppliers,
            productionLogs,
            wasteLogs,
            settings: {
              allowCustomerCredit: profile.allowCustomerCredit,
              allowSupplierCredit: profile.allowSupplierCredit,
              beginnerMode: profile.beginnerMode,
              isBakeryMode: profile.isBakeryMode,
            },
            lastSyncedAt: new Date().toISOString(),
          };

          const res = await saveUserWorkspaceToFirestore(currentUser.uid, workspacePayload);
          if (res.success) {
            setCloudSyncStatus('synced');
          }
        } catch (err) {
          console.warn('Firestore autosync warning:', err);
          setCloudSyncStatus('offline');
        }
      }, 800);

      return () => clearTimeout(timeoutId);
    }
  }, [effectiveUserId, currentUser, profile, products, sales, expenses, purchases, otherIncomes, customers, suppliers, productionLogs, wasteLogs, shifts, returns]);

  // Sync current user identity & business name to session lock storage for offline/refresh resilience
  useEffect(() => {
    if (currentUser?.email) {
      localStorage.setItem(STORAGE_KEYS.LOCKED_USER_EMAIL, currentUser.email);
    } else if (profile?.email) {
      localStorage.setItem(STORAGE_KEYS.LOCKED_USER_EMAIL, profile.email);
    }
    if (profile?.name) {
      localStorage.setItem(STORAGE_KEYS.LOCKED_BUSINESS_NAME, profile.name);
    }
    if (profile?.ownerName) {
      localStorage.setItem(STORAGE_KEYS.LOCKED_USER_NAME, profile.ownerName);
    } else if (currentUser?.displayName) {
      localStorage.setItem(STORAGE_KEYS.LOCKED_USER_NAME, currentUser.displayName);
    }
  }, [currentUser, profile]);

  // Secure Automatic Session Lock Lifecycle (5-minute background/idle timeout on Mobile & Desktop)
  useEffect(() => {
    if (!isAuthenticated || !profile) return;

    // Handle visibility changes (browser tab switch, minimize, phone sleep/lock, switching to other apps)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        recordBackgroundTimestamp();
      } else if (document.visibilityState === 'visible') {
        const { shouldLock } = evaluateSessionOnReturn();
        setIsSessionLocked(shouldLock);
      }
    };

    // Mobile & PWA lifecycle: pagehide & pageshow
    const handlePageHide = () => {
      recordBackgroundTimestamp();
    };

    const handlePageShow = () => {
      const { shouldLock } = evaluateSessionOnReturn();
      setIsSessionLocked(shouldLock);
    };

    // Track active user interactions to refresh active session timestamp
    let lastActivityLog = 0;
    const handleUserActivity = () => {
      const now = Date.now();
      if (now - lastActivityLog > 3000) {
        lastActivityLog = now;
        recordUserActiveTimestamp();
      }
    };

    // Periodic check (every 5 seconds) to lock session if left unattended while foregrounded
    const idleCheckInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        const { shouldLock } = evaluateSessionOnReturn();
        if (shouldLock) {
          setIsSessionLocked(true);
        }
      }
    }, 5000);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('pointerdown', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('touchstart', handleUserActivity);
    window.addEventListener('scroll', handleUserActivity, { passive: true });
    window.addEventListener('mousemove', handleUserActivity, { passive: true });

    // Initial check upon mount
    const { shouldLock: initialShouldLock } = evaluateSessionOnReturn();
    setIsSessionLocked(initialShouldLock);

    return () => {
      clearInterval(idleCheckInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('pointerdown', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
      window.removeEventListener('scroll', handleUserActivity);
      window.removeEventListener('mousemove', handleUserActivity);
    };
  }, [isAuthenticated, profile]);

  const handleUnlockSession = () => {
    setIsSessionLocked(false);
    setSessionLockedState(false);
    clearBackgroundTimestamp();
    recordUserActiveTimestamp();
  };

  const handleManualLockSession = () => {
    setIsSessionLocked(true);
    setSessionLockedState(true);
  };

  // Auth & Onboarding Handlers
  const handleAuthSuccess = async (
    name: string,
    emailOrPhone: string,
    isNewAccount: boolean,
    userId?: string
  ) => {
    setIsAuthModalOpen(false);
    setIsSessionLocked(false);
    setSessionLockedState(false);
    clearBackgroundTimestamp();
    recordUserActiveTimestamp();
    const targetUid = userId || currentUser?.uid || auth.currentUser?.uid || `user_${Date.now()}`;
    setActiveUserId(targetUid);
    localStorage.setItem('smartledger_active_uid', targetUid);
    const meta = { uid: targetUid, name, email: emailOrPhone };
    localStorage.setItem('smartledger_active_user_meta', JSON.stringify(meta));

    // Check if user already has a saved profile
    const storage = userScopedStorage(targetUid);
    const localProf = storage.getProfile();

    if (!isNewAccount && localProf && localProf.name) {
      // Existing user with saved data: load immediately without wizard!
      await loadUserDataForUid(targetUid, emailOrPhone, name);
      setIsAuthenticated(true);
      setIsWizardOpen(false);
    } else if (!isNewAccount && (currentUser || auth.currentUser)) {
      // Check Firestore
      await loadUserDataForUid(targetUid, emailOrPhone, name);
    } else if (isNewAccount || !localProf || !localProf.name) {
      // Genuinely new user with no profile
      setWizardUser({ name, email: emailOrPhone });
      setIsWizardOpen(true);
      setIsAuthenticated(false);
    } else {
      await loadUserDataForUid(targetUid, emailOrPhone, name);
      setIsAuthenticated(true);
      setIsWizardOpen(false);
    }
  };

  const handleWizardComplete = async (newProfile: BusinessProfile) => {
    setProfile(newProfile);
    setIsWizardOpen(false);
    setIsAuthenticated(true);

    const targetUid = effectiveUserId || `user_${Date.now()}`;
    setActiveUserId(targetUid);
    localStorage.setItem('smartledger_active_uid', targetUid);

    const storage = userScopedStorage(targetUid);
    storage.saveProfile(newProfile);
    // PRESERVE whatever products already exist (or empty array if none)
    storage.saveProducts(products);
    storage.saveSales(sales);
    storage.saveExpenses(expenses);
    storage.savePurchases(purchases);
    storage.saveOtherIncomes(otherIncomes);
    storage.saveCustomers(customers);
    storage.saveSuppliers(suppliers);

    if (currentUser?.uid) {
      // Initialize workspace in Cloud Firestore
      await saveUserWorkspaceToFirestore(currentUser.uid, {
        userId: currentUser.uid,
        profile: newProfile,
        business: {
          name: newProfile.name,
          type: newProfile.type,
          currency: newProfile.currency,
          ownerName: newProfile.ownerName,
          phone: newProfile.phone || '',
          email: newProfile.email || currentUser.email || '',
          address: newProfile.address || '',
          logoUrl: newProfile.logoUrl || '',
        },
        products,
        sales,
        purchases,
        expenses,
        income: otherIncomes,
        customers,
        suppliers,
        invoices: [],
        reports: [],
        notifications: [],
        settings: {
          allowCustomerCredit: newProfile.allowCustomerCredit,
          allowSupplierCredit: newProfile.allowSupplierCredit,
          beginnerMode: newProfile.beginnerMode,
          isBakeryMode: newProfile.isBakeryMode,
        },
        productionLogs: [],
        wasteLogs: [],
      });
    }
    isInitialLoadComplete.current = true;
  };

  const handleLogout = async () => {
    const uid = effectiveUserId;
    if (uid && profile) {
      // 1. Immediately flush all state to local storage before clearing
      const storage = userScopedStorage(uid);
      storage.saveProfile(profile);
      storage.saveProducts(products);
      storage.saveSales(sales);
      storage.saveExpenses(expenses);
      storage.savePurchases(purchases);
      storage.saveOtherIncomes(otherIncomes);
      storage.saveCustomers(customers);
      storage.saveSuppliers(suppliers);
      storage.saveProductionLogs(productionLogs);
      storage.saveWasteLogs(wasteLogs);
      storage.saveShifts(shifts);
      storage.saveCustomerReturns(returns);

      // 2. If Firebase user, immediately flush to Firestore
      if (currentUser?.uid) {
        try {
          await saveUserWorkspaceToFirestore(currentUser.uid, {
            userId: currentUser.uid,
            profile,
            products,
            sales,
            expenses,
            purchases,
            income: otherIncomes,
            customers,
            suppliers,
            productionLogs,
            wasteLogs,
            lastSyncedAt: new Date().toISOString(),
          });
        } catch (e) {
          console.warn('Flush before logout note:', e);
        }
      }
    }

    try {
      await signOut(auth);
    } catch (err) {
      console.error('Logout error:', err);
    }
    clearSessionLockStorage();
    setIsSessionLocked(false);
    localStorage.removeItem('smartledger_active_uid');
    localStorage.removeItem('smartledger_active_user_meta');
    setActiveUserId(null);
    clearLocalState();
    setIsAuthenticated(false);
    setIsWizardOpen(false);
  };

  // Product Management Handlers (Instant save & cloud synchronization)
  const handleAddProduct = (newProd: Product) => {
    const nextProducts = [newProd, ...products.filter((p) => p.id !== newProd.id)];
    setProducts(nextProducts);

    // 1. Immediately write to persistent local storage
    const uid = effectiveUserId;
    if (uid) {
      userScopedStorage(uid).saveProducts(nextProducts);
    }

    // 2. Immediately write to Firestore if Firebase authenticated
    if (currentUser?.uid) {
      setCloudSyncStatus('syncing');
      saveUserWorkspaceToFirestore(currentUser.uid, {
        products: nextProducts,
        lastSyncedAt: new Date().toISOString(),
      })
        .then(() => setCloudSyncStatus('synced'))
        .catch(() => setCloudSyncStatus('offline'));
    }

    // 3. Log business activity
    if (currentUser?.uid) {
      logBusinessActivity(currentUser.uid, {
        workspaceId: currentUser.uid,
        type: 'production',
        title: `Added product: ${newProd.name}`,
        subtitle: `Stock: ${newProd.stock} ${newProd.unit || 'units'} • Price: ${formatCurrency(newProd.sellingPrice, profile?.currency || 'USD')}`,
        amount: newProd.sellingPrice * newProd.stock,
        quantity: newProd.stock,
        productName: newProd.name,
        timestamp: new Date().toISOString(),
      });
    }
  };

  const handleUpdateProduct = (updatedProd: Product) => {
    const nextProducts = products.map((p) => (p.id === updatedProd.id ? updatedProd : p));
    setProducts(nextProducts);

    const uid = effectiveUserId;
    if (uid) {
      userScopedStorage(uid).saveProducts(nextProducts);
    }

    if (currentUser?.uid) {
      saveUserWorkspaceToFirestore(currentUser.uid, {
        products: nextProducts,
        lastSyncedAt: new Date().toISOString(),
      }).catch(() => {});
    }
  };

  /**
   * Safe Product Archiving (Preserves 100% of historical transactions and financial calculations)
   */
  const handleArchiveProduct = async (product: Product, reason?: string): Promise<boolean> => {
    try {
      const actorName = profile.ownerName || 'Business Owner';
      const updatedProduct: Product = {
        ...product,
        status: 'archived',
        isArchived: true,
        archivedAt: new Date().toISOString(),
        archivedBy: actorName,
        archivedReason: reason || 'Archived by business owner',
      };

      // Keep original product record and ID intact
      const nextProducts = products.map((p) => (p.id === product.id ? updatedProduct : p));
      setProducts(nextProducts);

      const uid = effectiveUserId;
      if (uid) {
        userScopedStorage(uid).saveProducts(nextProducts);
      }

      if (currentUser?.uid) {
        await saveUserWorkspaceToFirestore(currentUser.uid, {
          products: nextProducts,
          lastSyncedAt: new Date().toISOString(),
        });
      }

      // Log business activity
      if (currentUser?.uid) {
        logBusinessActivity(currentUser.uid, {
          workspaceId: currentUser.uid,
          type: 'production',
          title: `Archived product: ${product.name}`,
          subtitle: `Archived by ${actorName}. Previous sales and profits preserved.`,
          productName: product.name,
          timestamp: new Date().toISOString(),
        });
      }

      return true;
    } catch (err) {
      console.error('Failed to archive product:', err);
      return false;
    }
  };

  /**
   * Restore an archived product back to active catalog
   */
  const handleRestoreProduct = async (product: Product): Promise<boolean> => {
    try {
      const actorName = profile.ownerName || 'Business Owner';
      const updatedProduct: Product = {
        ...product,
        status: 'active',
        isArchived: false,
        restoredAt: new Date().toISOString(),
        restoredBy: actorName,
      };

      // Keep original product record and ID intact - NEVER duplicate!
      const nextProducts = products.map((p) => (p.id === product.id ? updatedProduct : p));
      setProducts(nextProducts);

      const uid = effectiveUserId;
      if (uid) {
        userScopedStorage(uid).saveProducts(nextProducts);
      }

      if (currentUser?.uid) {
        await saveUserWorkspaceToFirestore(currentUser.uid, {
          products: nextProducts,
          lastSyncedAt: new Date().toISOString(),
        });
      }

      if (currentUser?.uid) {
        logBusinessActivity(currentUser.uid, {
          workspaceId: currentUser.uid,
          type: 'production',
          title: `Restored product: ${product.name}`,
          subtitle: `Restored by ${actorName} to active catalog.`,
          productName: product.name,
          timestamp: new Date().toISOString(),
        });
      }

      return true;
    } catch (err) {
      console.error('Failed to restore product:', err);
      return false;
    }
  };

  /**
   * Permanent Deletion of product with ZERO transaction history
   */
  const handlePermanentDeleteProduct = async (product: Product): Promise<boolean> => {
    // Strict backend/controller validation: never delete if history exists
    const history = checkProductHistory(product, {
      sales,
      purchases,
      productionLogs,
      wasteLogs,
      customerReturns: returns,
      supplierReturns: [],
      purchaseOrders: [],
    });

    if (history.hasHistory) {
      console.warn('Blocked permanent delete: product has historical records.');
      return false;
    }

    try {
      const nextProducts = products.filter((p) => p.id !== product.id);
      setProducts(nextProducts);

      const uid = effectiveUserId;
      if (uid) {
        userScopedStorage(uid).saveProducts(nextProducts);
      }

      if (currentUser?.uid) {
        await saveUserWorkspaceToFirestore(currentUser.uid, {
          products: nextProducts,
          lastSyncedAt: new Date().toISOString(),
        });
      }

      const actorName = profile.ownerName || 'Business Owner';
      if (currentUser?.uid) {
        logBusinessActivity(currentUser.uid, {
          workspaceId: currentUser.uid,
          type: 'production',
          title: `Permanently deleted product: ${product.name}`,
          subtitle: `Deleted by ${actorName} (no transaction history).`,
          productName: product.name,
          timestamp: new Date().toISOString(),
        });
      }

      return true;
    } catch (err) {
      console.error('Failed to permanently delete product:', err);
      return false;
    }
  };

  // Business Action Handlers
  const handleCompleteSale = (sale: Sale, restockIfProduced = 0) => {
    setSales((prev) => [sale, ...prev]);

    // Update Product Stock accurately across all line items in the sale
    setProducts((prev) =>
      prev.map((p) => {
        const matchingItems = sale.items.filter((i) => i.productId === p.id);
        if (matchingItems.length > 0) {
          const totalSold = matchingItems.reduce((acc, it) => acc + (it.quantity || 1), 0);
          const newStock = Math.max(0, p.stock + restockIfProduced - totalSold);

          // Also reduce variant stock if specific variants were sold
          let updatedVariants = p.variants;
          if (p.variants && p.variants.length > 0) {
            updatedVariants = p.variants.map((v) => {
              const variantSold = matchingItems
                .filter((it) => it.variantId === v.id)
                .reduce((acc, it) => acc + (it.quantity || 1), 0);
              return variantSold > 0 ? { ...v, stock: Math.max(0, v.stock - variantSold) } : v;
            });
          }

          return { ...p, stock: newStock, variants: updatedVariants };
        }
        return p;
      })
    );

    // If produced extra on the fly, log production
    if (restockIfProduced > 0) {
      const firstItem = sale.items[0];
      if (firstItem) {
        setProductionLogs((prev) => [
          {
            id: `prod_fly_${Date.now()}`,
            productId: firstItem.productId,
            productName: firstItem.productName,
            quantityProduced: restockIfProduced,
            notes: 'Auto-added during sale stock reconciliation',
            date: new Date().toISOString(),
          },
          ...prev,
        ]);
      }
    }

    // Update Customer Debt if Credit sale
    if (sale.paymentMethod === 'Credit' && sale.customerId) {
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === sale.customerId
            ? { ...c, amountOwed: (c.amountOwed || 0) + sale.totalAmount }
            : c
        )
      );
    }

    // Real-Time Activity Log entry for live feed
    if (currentUser) {
      const itemsList = sale.items.map((i) => `${i.quantity} ${i.productName}`).join(', ');
      const customer = sale.customerName || 'Customer';
      logBusinessActivity(currentUser.uid, {
        workspaceId: currentUser.uid,
        type: 'sale',
        title: `Sold ${itemsList} to ${customer} (+${formatCurrency(sale.totalAmount, profile?.currency || 'RWF')})`,
        subtitle: `Payment: ${sale.paymentMethod} • Invoice #${sale.invoiceNumber}`,
        amount: sale.totalAmount,
        quantity: sale.items.reduce((acc, i) => acc + i.quantity, 0),
        customerName: customer,
        timestamp: sale.date || new Date().toISOString(),
      });
    }
  };

  const handleAddExpense = (expense: Expense) => {
    setExpenses((prev) => [expense, ...prev]);

    if (currentUser) {
      logBusinessActivity(currentUser.uid, {
        workspaceId: currentUser.uid,
        type: 'expense',
        title: `Added ${expense.category} expense (-${formatCurrency(expense.amount, profile?.currency || 'RWF')})`,
        subtitle: expense.notes || 'Operating expense',
        amount: expense.amount,
        timestamp: expense.date || new Date().toISOString(),
      });
    }
  };

  const handleAddPurchase = (purchase: Purchase) => {
    setPurchases((prev) => [purchase, ...prev]);

    // Restock product if existing
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === purchase.productId || p.name.toLowerCase() === purchase.productName.toLowerCase()) {
          return { ...p, stock: p.stock + purchase.quantity };
        }
        return p;
      })
    );

    // If Pay Later, increase supplier debt
    if (purchase.paymentStatus === 'PAY_LATER' && purchase.supplierId) {
      setSuppliers((prev) =>
        prev.map((s) =>
          s.id === purchase.supplierId
            ? { ...s, amountOwed: (s.amountOwed || 0) + purchase.totalCost }
            : s
        )
      );
    }

    if (currentUser) {
      logBusinessActivity(currentUser.uid, {
        workspaceId: currentUser.uid,
        type: 'purchase',
        title: `Restocked ${purchase.quantity} ${purchase.productName} from ${purchase.supplierName}`,
        subtitle: `Status: ${purchase.paymentStatus === 'PAID' ? 'Paid' : 'Pay Later'}`,
        amount: purchase.totalCost,
        quantity: purchase.quantity,
        productName: purchase.productName,
        timestamp: purchase.date || new Date().toISOString(),
      });
    }
  };

  const handleAddIncome = (income: OtherIncome) => {
    setOtherIncomes((prev) => [income, ...prev]);
  };

  const handleAddCustomer = (name: string, phone = '', initialDebt = 0): string => {
    const newId = `cust_${Date.now()}`;
    const newCust: Customer = {
      id: newId,
      name,
      phone,
      amountOwed: initialDebt,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    };
    const updatedCustomers = [newCust, ...customers];
    setCustomers(updatedCustomers);

    const userId = effectiveUserId || (currentUser ? currentUser.uid : 'local_user_default');
    userScopedStorage(userId).saveCustomers(updatedCustomers);

    if (currentUser?.uid) {
      saveUserWorkspaceToFirestore(currentUser.uid, {
        customers: updatedCustomers,
      }).catch((e) => console.warn('Could not sync customer to Firestore:', e));

      logBusinessActivity(currentUser.uid, {
        workspaceId: currentUser.uid,
        type: 'sale',
        title: `Added Customer: ${name}`,
        subtitle: phone ? `Phone: ${phone}` : 'New customer registered in directory',
        timestamp: new Date().toISOString(),
      });
    }

    return newId;
  };

  const handleRecordCustomerPayment = (customerId: string, amount: number, notes?: string) => {
    const targetCustomer = customers.find((c) => c.id === customerId);
    const updatedCustomers = customers.map((c) =>
      c.id === customerId
        ? { ...c, amountOwed: Math.max(0, (c.amountOwed || 0) - amount) }
        : c
    );
    setCustomers(updatedCustomers);

    // Record as cash entry / income
    const newIncome: OtherIncome = {
      id: `inc_cust_pay_${Date.now()}`,
      source: 'Other',
      amount,
      description: `Customer debt repayment: ${targetCustomer?.name || 'Customer'}${notes ? ` • ${notes}` : ''}`,
      date: new Date().toISOString(),
    };
    const updatedIncomes = [newIncome, ...otherIncomes];
    setOtherIncomes(updatedIncomes);

    const userId = effectiveUserId || (currentUser ? currentUser.uid : 'local_user_default');
    const storage = userScopedStorage(userId);
    storage.saveCustomers(updatedCustomers);
    storage.saveOtherIncomes(updatedIncomes);

    if (currentUser?.uid) {
      saveUserWorkspaceToFirestore(currentUser.uid, {
        customers: updatedCustomers,
        income: updatedIncomes,
      }).catch((e) => console.warn('Could not sync customer payment to Firestore:', e));

      const custName = targetCustomer?.name || 'Customer';
      logBusinessActivity(currentUser.uid, {
        workspaceId: currentUser.uid,
        type: 'debt',
        title: `${custName} paid ${formatCurrency(amount, profile?.currency || 'RWF')} on account`,
        subtitle: notes || 'Customer debt payment received',
        amount: amount,
        customerName: custName,
        timestamp: new Date().toISOString(),
      });
    }
  };

  const handleDeleteCustomer = async (
    customerId: string
  ): Promise<{ success: boolean; message?: string; error?: string }> => {
    if (isCashierMode) {
      return {
        success: false,
        error: 'Cashier Mode is active. Only the Business Owner can delete customers.',
      };
    }

    const customerToDelete = customers.find((c) => c.id === customerId);
    if (!customerToDelete) {
      return { success: false, error: 'Customer not found.' };
    }

    const customerNameLower = customerToDelete.name.trim().toLowerCase();
    const hasSales = sales.some(
      (s) =>
        (s.customerId && s.customerId === customerId) ||
        (s.customerName && s.customerName.trim().toLowerCase() === customerNameLower)
    );
    const hasDebt = (customerToDelete.amountOwed || 0) > 0;
    const hasReturns = (returns || []).some(
      (r) =>
        (r.customerId && r.customerId === customerId) ||
        (r.customerName && r.customerName.trim().toLowerCase() === customerNameLower)
    );
    const hasIncome = otherIncomes.some(
      (i) => i.description && i.description.toLowerCase().includes(customerNameLower)
    );

    if (hasSales || hasDebt || hasReturns || hasIncome) {
      return {
        success: false,
        error: 'Cannot permanently delete customer with connected financial history. Please archive instead.',
      };
    }

    const userId = effectiveUserId || (currentUser ? currentUser.uid : 'local_user_default');
    const storage = userScopedStorage(userId);

    try {
      const updatedCustomers = customers.filter((c) => c.id !== customerId);
      setCustomers(updatedCustomers);
      storage.saveCustomers(updatedCustomers);

      if (currentUser?.uid) {
        await saveUserWorkspaceToFirestore(currentUser.uid, {
          customers: updatedCustomers,
        });

        await logBusinessActivity(currentUser.uid, {
          workspaceId: currentUser.uid,
          type: 'sale',
          title: `Deleted Mistaken Customer: ${customerToDelete.name}`,
          subtitle: 'Removed unused customer record from business directory.',
          timestamp: new Date().toISOString(),
        });
      }

      return {
        success: true,
        message: `Customer "${customerToDelete.name}" deleted successfully.`,
      };
    } catch (err: any) {
      console.error('Error deleting customer:', err);
      return {
        success: false,
        error: err?.message || 'Database error occurred while deleting customer.',
      };
    }
  };

  const handleArchiveCustomer = async (
    customerId: string
  ): Promise<{ success: boolean; message?: string; error?: string }> => {
    if (isCashierMode) {
      return {
        success: false,
        error: 'Cashier Mode is active. Only the Business Owner can archive customers.',
      };
    }

    const customerToArchive = customers.find((c) => c.id === customerId);
    if (!customerToArchive) {
      return { success: false, error: 'Customer not found.' };
    }

    const userId = effectiveUserId || (currentUser ? currentUser.uid : 'local_user_default');
    const storage = userScopedStorage(userId);

    try {
      const updatedCustomers = customers.map((c) =>
        c.id === customerId
          ? { ...c, isArchived: true, archivedAt: new Date().toISOString() }
          : c
      );
      setCustomers(updatedCustomers);
      storage.saveCustomers(updatedCustomers);

      if (currentUser?.uid) {
        await saveUserWorkspaceToFirestore(currentUser.uid, {
          customers: updatedCustomers,
        });

        await logBusinessActivity(currentUser.uid, {
          workspaceId: currentUser.uid,
          type: 'sale',
          title: `Archived Customer: ${customerToArchive.name}`,
          subtitle: 'Archived customer record while safely preserving all historical invoices and payments.',
          timestamp: new Date().toISOString(),
        });
      }

      return {
        success: true,
        message: `Customer "${customerToArchive.name}" archived successfully.`,
      };
    } catch (err: any) {
      console.error('Error archiving customer:', err);
      return {
        success: false,
        error: err?.message || 'Database error occurred while archiving customer.',
      };
    }
  };

  const handleUnarchiveCustomer = async (
    customerId: string
  ): Promise<{ success: boolean; message?: string; error?: string }> => {
    if (isCashierMode) {
      return {
        success: false,
        error: 'Cashier Mode is active. Only the Business Owner can restore customers.',
      };
    }

    const target = customers.find((c) => c.id === customerId);
    if (!target) return { success: false, error: 'Customer not found.' };

    const userId = effectiveUserId || (currentUser ? currentUser.uid : 'local_user_default');
    const storage = userScopedStorage(userId);

    try {
      const updatedCustomers = customers.map((c) =>
        c.id === customerId
          ? { ...c, isArchived: false, archivedAt: undefined }
          : c
      );
      setCustomers(updatedCustomers);
      storage.saveCustomers(updatedCustomers);

      if (currentUser?.uid) {
        await saveUserWorkspaceToFirestore(currentUser.uid, {
          customers: updatedCustomers,
        });

        await logBusinessActivity(currentUser.uid, {
          workspaceId: currentUser.uid,
          type: 'sale',
          title: `Restored Customer: ${target.name}`,
          subtitle: 'Reactivated customer to active business directory.',
          timestamp: new Date().toISOString(),
        });
      }

      return {
        success: true,
        message: `Customer "${target.name}" restored to active list.`,
      };
    } catch (err: any) {
      console.error('Error restoring customer:', err);
      return {
        success: false,
        error: err?.message || 'Database error occurred while restoring customer.',
      };
    }
  };

  const handleAddSupplier = (name: string, phone = '', productsSupplied: string[] = []): string => {
    const newId = `supp_${Date.now()}`;
    const newSupp: Supplier = {
      id: newId,
      name,
      phone,
      amountOwed: 0,
      productsSupplied,
      createdAt: new Date().toISOString(),
    };
    const updatedSuppliers = [newSupp, ...suppliers];
    setSuppliers(updatedSuppliers);

    const userId = effectiveUserId || (currentUser ? currentUser.uid : 'local_user_default');
    userScopedStorage(userId).saveSuppliers(updatedSuppliers);

    if (currentUser?.uid) {
      saveUserWorkspaceToFirestore(currentUser.uid, {
        suppliers: updatedSuppliers,
      }).catch((e) => console.warn('Could not sync supplier to Firestore:', e));

      logBusinessActivity(currentUser.uid, {
        workspaceId: currentUser.uid,
        type: 'purchase',
        title: `Added Supplier: ${name}`,
        subtitle: phone ? `Phone: ${phone}` : 'New vendor registered in directory',
        timestamp: new Date().toISOString(),
      });
    }

    return newId;
  };

  const handleRecordSupplierPayment = (supplierId: string, amount: number) => {
    const targetSupplier = suppliers.find((s) => s.id === supplierId);
    const updatedSuppliers = suppliers.map((s) =>
      s.id === supplierId
        ? { ...s, amountOwed: Math.max(0, (s.amountOwed || 0) - amount) }
        : s
    );
    setSuppliers(updatedSuppliers);

    const newExpense: Expense = {
      id: `exp_supp_pay_${Date.now()}`,
      category: 'Other',
      amount,
      notes: `Paid supplier invoice: ${targetSupplier?.name || 'Vendor'}`,
      paidVia: 'Cash',
      date: new Date().toISOString(),
    };
    const updatedExpenses = [newExpense, ...expenses];
    setExpenses(updatedExpenses);

    const userId = effectiveUserId || (currentUser ? currentUser.uid : 'local_user_default');
    const storage = userScopedStorage(userId);
    storage.saveSuppliers(updatedSuppliers);
    storage.saveExpenses(updatedExpenses);

    if (currentUser?.uid) {
      saveUserWorkspaceToFirestore(currentUser.uid, {
        suppliers: updatedSuppliers,
        expenses: updatedExpenses,
      }).catch((e) => console.warn('Could not sync payment to Firestore:', e));

      logBusinessActivity(currentUser.uid, {
        workspaceId: currentUser.uid,
        type: 'expense',
        title: `Paid Supplier: ${targetSupplier?.name || 'Vendor'} (${formatCurrency(amount, profile?.currency || 'RWF')})`,
        subtitle: `Supplier balance reduced by ${formatCurrency(amount, profile?.currency || 'RWF')}`,
        amount,
        timestamp: new Date().toISOString(),
      });
    }
  };

  const handleDeleteSupplier = async (
    supplierId: string
  ): Promise<{ success: boolean; message?: string; error?: string }> => {
    if (isCashierMode) {
      return {
        success: false,
        error: 'Cashier Mode is active. Only the Business Owner can delete suppliers.',
      };
    }

    const supplierToDelete = suppliers.find((s) => s.id === supplierId);
    if (!supplierToDelete) {
      return { success: false, error: 'Supplier not found.' };
    }

    const supplierNameLower = supplierToDelete.name.trim().toLowerCase();
    const hasPurchases = purchases.some(
      (p) =>
        (p.supplierId && p.supplierId === supplierId) ||
        (p.supplierName && p.supplierName.trim().toLowerCase() === supplierNameLower)
    );
    const hasDebt = (supplierToDelete.amountOwed || 0) > 0;
    const hasExpenses = expenses.some(
      (e) => e.notes && e.notes.toLowerCase().includes(supplierNameLower)
    );

    if (hasPurchases || hasDebt || hasExpenses) {
      return {
        success: false,
        error: 'Cannot permanently delete supplier with connected financial history. Please archive instead.',
      };
    }

    const userId = effectiveUserId || (currentUser ? currentUser.uid : 'local_user_default');
    const storage = userScopedStorage(userId);

    try {
      const updatedSuppliers = suppliers.filter((s) => s.id !== supplierId);
      setSuppliers(updatedSuppliers);
      storage.saveSuppliers(updatedSuppliers);

      if (currentUser?.uid) {
        await saveUserWorkspaceToFirestore(currentUser.uid, {
          suppliers: updatedSuppliers,
        });

        await logBusinessActivity(currentUser.uid, {
          workspaceId: currentUser.uid,
          type: 'purchase',
          title: `Deleted Mistaken Supplier: ${supplierToDelete.name}`,
          subtitle: 'Removed unused supplier record from business directory.',
          timestamp: new Date().toISOString(),
        });
      }

      return {
        success: true,
        message: `Supplier "${supplierToDelete.name}" deleted successfully.`,
      };
    } catch (err: any) {
      console.error('Error deleting supplier:', err);
      return {
        success: false,
        error: err?.message || 'Database error occurred while deleting supplier.',
      };
    }
  };

  const handleArchiveSupplier = async (
    supplierId: string
  ): Promise<{ success: boolean; message?: string; error?: string }> => {
    if (isCashierMode) {
      return {
        success: false,
        error: 'Cashier Mode is active. Only the Business Owner can archive suppliers.',
      };
    }

    const supplierToArchive = suppliers.find((s) => s.id === supplierId);
    if (!supplierToArchive) {
      return { success: false, error: 'Supplier not found.' };
    }

    const userId = effectiveUserId || (currentUser ? currentUser.uid : 'local_user_default');
    const storage = userScopedStorage(userId);

    try {
      const updatedSuppliers = suppliers.map((s) =>
        s.id === supplierId
          ? { ...s, isArchived: true, archivedAt: new Date().toISOString() }
          : s
      );
      setSuppliers(updatedSuppliers);
      storage.saveSuppliers(updatedSuppliers);

      if (currentUser?.uid) {
        await saveUserWorkspaceToFirestore(currentUser.uid, {
          suppliers: updatedSuppliers,
        });

        await logBusinessActivity(currentUser.uid, {
          workspaceId: currentUser.uid,
          type: 'purchase',
          title: `Archived Supplier: ${supplierToArchive.name}`,
          subtitle: 'Archived supplier record while safely preserving all historical purchase transactions.',
          timestamp: new Date().toISOString(),
        });
      }

      return {
        success: true,
        message: `Supplier "${supplierToArchive.name}" archived successfully.`,
      };
    } catch (err: any) {
      console.error('Error archiving supplier:', err);
      return {
        success: false,
        error: err?.message || 'Database error occurred while archiving supplier.',
      };
    }
  };

  const handleUnarchiveSupplier = async (
    supplierId: string
  ): Promise<{ success: boolean; message?: string; error?: string }> => {
    if (isCashierMode) {
      return {
        success: false,
        error: 'Cashier Mode is active. Only the Business Owner can restore suppliers.',
      };
    }

    const target = suppliers.find((s) => s.id === supplierId);
    if (!target) return { success: false, error: 'Supplier not found.' };

    const userId = effectiveUserId || (currentUser ? currentUser.uid : 'local_user_default');
    const storage = userScopedStorage(userId);

    try {
      const updatedSuppliers = suppliers.map((s) =>
        s.id === supplierId
          ? { ...s, isArchived: false, archivedAt: undefined }
          : s
      );
      setSuppliers(updatedSuppliers);
      storage.saveSuppliers(updatedSuppliers);

      if (currentUser?.uid) {
        await saveUserWorkspaceToFirestore(currentUser.uid, {
          suppliers: updatedSuppliers,
        });

        await logBusinessActivity(currentUser.uid, {
          workspaceId: currentUser.uid,
          type: 'purchase',
          title: `Restored Supplier: ${target.name}`,
          subtitle: 'Reactivated supplier to active business directory.',
          timestamp: new Date().toISOString(),
        });
      }

      return {
        success: true,
        message: `Supplier "${target.name}" restored to active list.`,
      };
    } catch (err: any) {
      console.error('Error restoring supplier:', err);
      return {
        success: false,
        error: err?.message || 'Database error occurred while restoring supplier.',
      };
    }
  };

  const handleAddProduction = (log: ProductionLog) => {
    setProductionLogs((prev) => [log, ...prev]);
    // Increase stock
    setProducts((prev) =>
      prev.map((p) =>
        p.id === log.productId
          ? { ...p, stock: p.stock + log.quantityProduced }
          : p
      )
    );

    if (currentUser) {
      logBusinessActivity(currentUser.uid, {
        workspaceId: currentUser.uid,
        type: 'production',
        title: `Produced ${log.quantityProduced} ${log.productName}`,
        subtitle: log.notes || 'Batch produced & stocked',
        quantity: log.quantityProduced,
        productName: log.productName,
        timestamp: log.date || new Date().toISOString(),
      });
    }
  };

  const handleAddWaste = (log: WasteLog) => {
    setWasteLogs((prev) => [log, ...prev]);
    // Deduct stock
    setProducts((prev) =>
      prev.map((p) =>
        p.id === log.productId
          ? { ...p, stock: Math.max(0, p.stock - log.quantityWasted) }
          : p
      )
    );

    if (currentUser) {
      const loss = log.estimatedLoss || log.totalLoss || 0;
      logBusinessActivity(currentUser.uid, {
        workspaceId: currentUser.uid,
        type: 'waste',
        title: `Logged ${log.quantityWasted} wasted ${log.productName} (-${formatCurrency(loss, profile?.currency || 'RWF')})`,
        subtitle: `Reason: ${log.reason} • Stock adjusted`,
        amount: loss,
        quantity: log.quantityWasted,
        productName: log.productName,
        timestamp: log.date || new Date().toISOString(),
      });
    }
  };

  // Shift Management Handlers
  const handleOpenShift = (newShift: CashRegisterShift) => {
    setShifts((prev) => [newShift, ...prev.filter((s) => s.id !== newShift.id)]);
    const updated = [newShift, ...shifts.filter((s) => s.id !== newShift.id)];
    const userId = currentUser ? currentUser.uid : 'local_user_default';
    userScopedStorage(userId).saveShifts(updated);

    if (currentUser) {
      logBusinessActivity(currentUser.uid, {
        workspaceId: currentUser.uid,
        type: 'sale',
        title: `Cash Register Opened by ${newShift.cashierName}`,
        subtitle: `Starting float: ${formatCurrency(newShift.startingFloat, profile?.currency || 'RWF')}`,
        amount: newShift.startingFloat,
        timestamp: newShift.openedAt,
      });
    }
  };

  const handleCloseShift = (closedShift: CashRegisterShift) => {
    setShifts((prev) => [closedShift, ...prev.filter((s) => s.id !== closedShift.id)]);
    const updated = [closedShift, ...shifts.filter((s) => s.id !== closedShift.id)];
    const userId = currentUser ? currentUser.uid : 'local_user_default';
    userScopedStorage(userId).saveShifts(updated);

    if (currentUser) {
      const variance = closedShift.cashVariance || 0;
      const varianceText = variance === 0 ? 'Balanced' : variance > 0 ? `+${variance} over` : `${variance} short`;
      logBusinessActivity(currentUser.uid, {
        workspaceId: currentUser.uid,
        type: 'sale',
        title: `Shift Closed (Z-Report) by ${closedShift.cashierName}`,
        subtitle: `Expected: ${formatCurrency(closedShift.expectedCash, profile?.currency || 'RWF')} | Counted: ${formatCurrency(closedShift.actualCashCounted || 0, profile?.currency || 'RWF')} (${varianceText})`,
        amount: closedShift.actualCashCounted,
        timestamp: closedShift.closedAt || new Date().toISOString(),
      });
    }
  };

  // Customer Return Handler
  const handleProcessReturn = (ret: CustomerReturn) => {
    setReturns((prev) => [ret, ...prev]);
    const updated = [ret, ...returns];
    const userId = currentUser ? currentUser.uid : 'local_user_default';
    userScopedStorage(userId).saveCustomerReturns(updated);

    // 1. If restocked, increase stock back
    if (ret.restocked) {
      setProducts((prev) =>
        prev.map((p) => (p.id === ret.productId ? { ...p, stock: p.stock + ret.quantity } : p))
      );
    } else {
      // Log as damaged / returned waste
      const wasteEntry: WasteLog = {
        id: `waste_ret_${Date.now()}`,
        productId: ret.productId,
        productName: ret.productName,
        quantityWasted: ret.quantity,
        reason: 'Damaged / Returned',
        totalLoss: ret.refundAmount,
        date: ret.date,
      };
      setWasteLogs((prev) => [wasteEntry, ...prev]);
    }

    // 2. Log refund activity
    if (currentUser) {
      logBusinessActivity(currentUser.uid, {
        workspaceId: currentUser.uid,
        type: 'sale',
        title: `Customer Return: ${ret.quantity} ${ret.productName} (-${formatCurrency(ret.refundAmount, profile?.currency || 'RWF')})`,
        subtitle: `Reason: ${ret.reason} • ${ret.restocked ? 'Restocked to inventory' : 'Damaged / Written off'}`,
        amount: ret.refundAmount,
        quantity: ret.quantity,
        productName: ret.productName,
        customerName: ret.customerName,
        timestamp: ret.date,
      });
    }
  };

  // Write-Off Expired Stock Handler
  const handleWriteOffExpired = (product: Product, quantity: number, reason: string) => {
    const estimatedLoss = quantity * product.costPrice;
    const wasteEntry: WasteLog = {
      id: `waste_exp_${Date.now()}`,
      productId: product.id,
      productName: product.name,
      quantityWasted: quantity,
      reason: reason || 'Expired / Spoilage',
      estimatedLoss,
      totalLoss: estimatedLoss,
      date: new Date().toISOString(),
    };
    handleAddWaste(wasteEntry);
  };

  // Purchase Order Receiving Handler
  const handleRecordPOPurchases = (
    poPurchases: {
      productId: string;
      productName: string;
      quantity: number;
      costPerUnit: number;
      totalCost: number;
      supplierId?: string;
      supplierName: string;
      paymentStatus: 'PAID' | 'PAY_LATER';
      date: string;
    }[]
  ) => {
    poPurchases.forEach((p) => {
      const newPurchase: Purchase = {
        id: `purch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        productId: p.productId,
        productName: p.productName,
        quantity: p.quantity,
        costPerUnit: p.costPerUnit,
        totalCost: p.totalCost,
        supplierId: p.supplierId,
        supplierName: p.supplierName,
        paymentStatus: p.paymentStatus,
        date: p.date,
      };
      handleAddPurchase(newPurchase);
    });
  };

  // Quick POS Selling Handler from Product Catalog / Scanner
  const handleQuickSell = (product?: Product, quantity: number = 1, variant?: ProductVariant) => {
    if (product && (product.isArchived || product.status === 'archived')) {
      return;
    }
    if (product) {
      setPreselectedSellProduct(product);
      setPreselectedSellQuantity(quantity);
      setPreselectedSellVariant(variant || null);
    } else {
      setPreselectedSellProduct(null);
      setPreselectedSellQuantity(1);
      setPreselectedSellVariant(null);
    }
    setIsSellOpen(true);
  };

  // Cashier Mode Role Protection Handlers
  const handleNavigateTab = (targetTab: 'dashboard' | 'products' | 'customers' | 'suppliers' | 'reports' | 'feed') => {
    recordUserActiveTimestamp();

    if (isCashierMode && (targetTab === 'reports' || targetTab === 'feed')) {
      setPendingTabAfterUnlock(targetTab);
      setPinModalMode('unlock_owner');
      setIsPinModalOpen(true);
      return;
    }
    setActiveTab(targetTab);
    localStorage.setItem('smartledger_last_active_tab', targetTab);
  };

  const handleUnlockPinSuccess = (newPin?: string) => {
    if (newPin) {
      // User successfully chose/updated their custom 4-digit PIN
      setCashierPin(newPin);
      localStorage.setItem('smartledger_cashier_pin', newPin);
      if (profile) {
        const updatedProfile: BusinessProfile = { ...profile, cashierPin: newPin };
        setProfile(updatedProfile);
        const userId = currentUser ? currentUser.uid : 'local_user_default';
        userScopedStorage(userId).saveProfile(updatedProfile);

        if (currentUser) {
          saveUserWorkspaceToFirestore(currentUser.uid, { profile: updatedProfile });
          logBusinessActivity(currentUser.uid, {
            workspaceId: currentUser.uid,
            type: 'sale',
            title: 'Cashier Protection PIN Updated',
            subtitle: 'A custom 4-digit PIN was configured to secure cashier POS mode',
            timestamp: new Date().toISOString(),
          });
        }
      }
    } else {
      // Unlocked owner mode
      setIsCashierMode(false);
      localStorage.setItem('smartledger_is_cashier_mode', 'false');
      if (pendingTabAfterUnlock) {
        setActiveTab(pendingTabAfterUnlock);
        localStorage.setItem('smartledger_last_active_tab', pendingTabAfterUnlock);
        setPendingTabAfterUnlock(null);
      }
    }
  };

  const handleLockCashierMode = () => {
    setIsCashierMode(true);
    localStorage.setItem('smartledger_is_cashier_mode', 'true');
    if (activeTab === 'reports' || activeTab === 'feed') {
      setActiveTab('dashboard');
    }
  };

  const handleToggleBeginnerMode = () => {
    if (!profile) return;
    setProfile((prev) => prev ? { ...prev, beginnerMode: !prev.beginnerMode } : null);
  };

  // Secure Restart Business Handler: Safely archives current business records,
  // preserves account & profile settings, and initializes clean 0-based period.
  const handleRestartBusiness = async () => {
    if (isCashierMode) {
      alert('Cashier mode is active. Please unlock Owner mode to restart the business.');
      return;
    }

    const userId = effectiveUserId || 'local_user_default';
    const storage = userScopedStorage(userId);

    const currentPeriodNum = profile?.periodNumber || 1;
    const periodStart = profile?.currentPeriodStartedAt || profile?.createdAt || new Date().toISOString();
    const nowIso = new Date().toISOString();
    const periodLabel = `Period #${currentPeriodNum} (${new Date(periodStart).toLocaleDateString()} - ${new Date(nowIso).toLocaleDateString()})`;

    const totalSales = sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalProfit = sales.reduce((sum, s) => sum + (s.profit || 0), 0) - totalExpenses;
    const totalPurchases = purchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
    const totalIncome = otherIncomes.reduce((sum, i) => sum + (i.amount || 0), 0);

    const archivedSnapshot: ArchivedBusinessPeriod = {
      id: `period_${profile?.currentPeriodId || currentPeriodNum}_${Date.now()}`,
      periodNumber: currentPeriodNum,
      periodLabel,
      startedAt: periodStart,
      archivedAt: nowIso,
      currency: profile?.currency || 'RWF',
      summary: {
        totalSales,
        totalProfit,
        totalExpenses,
        totalPurchases,
        totalIncome,
        productsCount: products.length,
        customersCount: customers.length,
        suppliersCount: suppliers.length,
        salesCount: sales.length,
        expensesCount: expenses.length,
        purchasesCount: purchases.length,
      },
      products: [...products],
      sales: [...sales],
      expenses: [...expenses],
      purchases: [...purchases],
      income: [...otherIncomes],
      customers: [...customers],
      suppliers: [...suppliers],
      productionLogs: [...productionLogs],
      wasteLogs: [...wasteLogs],
      shifts: [...shifts],
      customerReturns: [...returns],
    };

    // 1. Add to archived periods
    const updatedArchived = [archivedSnapshot, ...archivedPeriods];
    setArchivedPeriods(updatedArchived);
    storage.saveArchivedPeriods(updatedArchived);

    if (currentUser?.uid) {
      archiveBusinessPeriodToFirestore(currentUser.uid, archivedSnapshot).catch((err) => {
        console.warn('Could not archive period to Firestore subcollection:', err);
      });
    }

    // 2. Next Period Profile
    const nextPeriodNum = currentPeriodNum + 1;
    const nextPeriodId = `period_${nextPeriodNum}_${Date.now()}`;
    const nextPeriodStartedAt = nowIso;

    const updatedProfile: BusinessProfile = {
      ...profile!,
      periodNumber: nextPeriodNum,
      currentPeriodId: nextPeriodId,
      currentPeriodStartedAt: nextPeriodStartedAt,
    };

    setProfile(updatedProfile);
    storage.saveProfile(updatedProfile);

    // 3. Reset active state strictly to zero/empty
    setProducts([]);
    setSales([]);
    setExpenses([]);
    setPurchases([]);
    setOtherIncomes([]);
    setCustomers([]);
    setSuppliers([]);
    setProductionLogs([]);
    setWasteLogs([]);
    setShifts([]);
    setReturns([]);

    // 4. Reset local storage for active business records
    storage.saveProducts([]);
    storage.saveSales([]);
    storage.saveExpenses([]);
    storage.savePurchases([]);
    storage.saveOtherIncomes([]);
    storage.saveCustomers([]);
    storage.saveSuppliers([]);
    storage.saveProductionLogs([]);
    storage.saveWasteLogs([]);
    storage.saveShifts([]);
    storage.saveCustomerReturns([]);
    storage.saveCashBase(0);

    // 5. Persist clean slate to Firestore
    if (currentUser?.uid) {
      try {
        await saveUserWorkspaceToFirestore(currentUser.uid, {
          profile: updatedProfile,
          currentPeriodId: nextPeriodId,
          currentPeriodStartedAt: nextPeriodStartedAt,
          products: [],
          sales: [],
          expenses: [],
          purchases: [],
          income: [],
          customers: [],
          suppliers: [],
          productionLogs: [],
          wasteLogs: [],
        });

        await logBusinessActivity(currentUser.uid, {
          workspaceId: currentUser.uid,
          type: 'sale',
          title: `Started Fresh: Period #${nextPeriodNum}`,
          subtitle: `Clean starting point initialized. Period #${currentPeriodNum} archived safely.`,
          timestamp: nextPeriodStartedAt,
        });
      } catch (err) {
        console.warn('Firestore sync note during restart:', err);
      }
    }

    // 6. Navigate to dashboard and close modals
    setActiveTab('dashboard');
    setIsRestartBusinessOpen(false);
    setIsSettingsOpen(false);
  };

  // Update business profile handler
  const handleUpdateProfile = (updated: Partial<BusinessProfile>) => {
    if (!profile) return;
    const newProfile: BusinessProfile = { ...profile, ...updated };
    setProfile(newProfile);
    const userId = effectiveUserId || (currentUser ? currentUser.uid : 'local_user_default');
    const storage = userScopedStorage(userId);
    storage.saveProfile(newProfile);
    if (currentUser?.uid) {
      saveUserWorkspaceToFirestore(currentUser.uid, { profile: newProfile }).catch((err) => {
        console.warn('Could not persist updated profile to Firestore:', err);
      });
    }
  };

  // Permanent Archived Period Deletion Handler (Owner-only, Database Permanent Removal)
  const handleDeleteArchivedPeriod = async (
    period: ArchivedBusinessPeriod
  ): Promise<{ success: boolean; message?: string; error?: string }> => {
    // 1. Role verification: Cashier mode must NOT allow deletion
    if (isCashierMode) {
      return {
        success: false,
        error: 'Cashier Mode is active. Only the Business Owner can permanently delete archived periods.',
      };
    }

    // 2. Safeguard check: Active business period cannot be deleted
    if (
      period.id === profile?.currentPeriodId ||
      period.periodNumber === profile?.periodNumber
    ) {
      return {
        success: false,
        error: 'The current active business period cannot be deleted.',
      };
    }

    const userId = effectiveUserId || (currentUser ? currentUser.uid : 'local_user_default');
    const storage = userScopedStorage(userId);

    try {
      // 3. Permanently remove from Cloud Firestore subcollection
      if (currentUser?.uid) {
        const firestoreRes = await deleteArchivedPeriodFromFirestore(currentUser.uid, period.id);
        if (!firestoreRes.success) {
          console.warn('Firestore deleteArchivedPeriod warning:', firestoreRes.error);
        }

        // Log permanent deletion activity for owner audit trail
        await logBusinessActivity(currentUser.uid, {
          workspaceId: currentUser.uid,
          type: 'sale',
          title: `[Permanently Deleted] Archived Period #${period.periodNumber}`,
          subtitle: `Permanently removed ${period.periodLabel} (${period.sales.length} sales, ${period.expenses.length} expenses) from database.`,
          timestamp: new Date().toISOString(),
        });
      }

      // 4. Update local storage and React state
      const updatedPeriods = archivedPeriods.filter((p) => p.id !== period.id);
      setArchivedPeriods(updatedPeriods);
      storage.saveArchivedPeriods(updatedPeriods);

      // 5. If this period is currently opened in the details modal, close it
      if (selectedArchivedPeriod?.id === period.id) {
        setSelectedArchivedPeriod(null);
      }

      return {
        success: true,
        message: 'Archived business period permanently deleted.',
      };
    } catch (err: any) {
      console.error('Error deleting archived period:', err);
      return {
        success: false,
        error: err?.message || 'Database error occurred while deleting archived period.',
      };
    }
  };

  // Safe Mistaken Record Deletion & Reversal Handler:
  // Reverses transactions mathematically (sales, purchases, expenses, debt, waste, production)
  // across database, dashboard stats, inventory, and customer/supplier balances.
  const handleDeleteMistakenRecord = async ({
    recordType,
    recordId,
    activityLogId,
    extraInfo,
  }: {
    recordType: 'sale' | 'expense' | 'purchase' | 'customer_payment' | 'waste' | 'return' | 'production' | 'income' | 'customer' | 'supplier' | 'activity_only';
    recordId: string;
    activityLogId?: string;
    extraInfo?: any;
  }): Promise<{ success: boolean; message: string; error?: string }> => {
    const userId = effectiveUserId || (currentUser ? currentUser.uid : 'local_user_default');
    const storage = userScopedStorage(userId);

    try {
      if (recordType === 'sale') {
        const saleToDelete = sales.find((s) => s.id === recordId);
        if (!saleToDelete) {
          if (activityLogId && currentUser?.uid) {
            await deleteBusinessActivityLog(currentUser.uid, activityLogId);
          }
          return { success: true, message: 'Record removed from activity feed.' };
        }

        // 1. Remove sale from state and storage
        const updatedSales = sales.filter((s) => s.id !== recordId);
        setSales(updatedSales);
        storage.saveSales(updatedSales);

        // 2. Restore inventory stock for each sold product
        let updatedProducts = [...products];
        if (saleToDelete.items && saleToDelete.items.length > 0) {
          saleToDelete.items.forEach((item) => {
            const prodIdx = updatedProducts.findIndex((p) => p.id === item.productId || p.name.toLowerCase() === item.productName.toLowerCase());
            if (prodIdx >= 0) {
              const curStock = updatedProducts[prodIdx].currentStock ?? 0;
              updatedProducts[prodIdx] = {
                ...updatedProducts[prodIdx],
                currentStock: curStock + item.quantity,
              };
            }
          });
          setProducts(updatedProducts);
          storage.saveProducts(updatedProducts);
        }

        // 3. If credit sale, deduct debt from customer balance
        let updatedCustomers = [...customers];
        if (saleToDelete.paymentMethod === 'Credit' && saleToDelete.customerId) {
          const custIdx = updatedCustomers.findIndex((c) => c.id === saleToDelete.customerId);
          if (custIdx >= 0) {
            const curDebt = updatedCustomers[custIdx].currentBalance ?? 0;
            const newDebt = Math.max(0, curDebt - saleToDelete.totalAmount);
            updatedCustomers[custIdx] = {
              ...updatedCustomers[custIdx],
              currentBalance: newDebt,
              debtHistory: (updatedCustomers[custIdx].debtHistory || []).filter(
                (h) => !h.notes?.includes(saleToDelete.invoiceNumber)
              ),
            };
            setCustomers(updatedCustomers);
            storage.saveCustomers(updatedCustomers);
          }
        }

        // 4. Update Firestore & Activity Log
        if (currentUser?.uid) {
          await saveUserWorkspaceToFirestore(currentUser.uid, {
            sales: updatedSales,
            products: updatedProducts,
            customers: updatedCustomers,
          });

          await deleteBusinessActivityLogsByRelatedId(currentUser.uid, recordId);
          if (activityLogId) {
            await deleteBusinessActivityLog(currentUser.uid, activityLogId);
          }

          await logBusinessActivity(currentUser.uid, {
            workspaceId: currentUser.uid,
            type: 'sale',
            title: `[Mistake Corrected] Deleted Sale #${saleToDelete.invoiceNumber}`,
            subtitle: `Reversed items back to stock. Reduced sales by -${formatCurrency(saleToDelete.totalAmount, profile?.currency || 'RWF')}`,
            timestamp: new Date().toISOString(),
          });
        }

        return {
          success: true,
          message: `Sale #${saleToDelete.invoiceNumber} deleted. Inventory restored and totals recalculated.`,
        };
      }

      if (recordType === 'expense') {
        const expenseToDelete = expenses.find((e) => e.id === recordId);
        if (!expenseToDelete) {
          if (activityLogId && currentUser?.uid) {
            await deleteBusinessActivityLog(currentUser.uid, activityLogId);
          }
          return { success: true, message: 'Expense record removed.' };
        }

        const updatedExpenses = expenses.filter((e) => e.id !== recordId);
        setExpenses(updatedExpenses);
        storage.saveExpenses(updatedExpenses);

        // If this was a supplier debt payment, restore supplier balance
        let updatedSuppliers = [...suppliers];
        const supplierId = extraInfo?.supplierId;
        if (supplierId) {
          const sIdx = updatedSuppliers.findIndex((s) => s.id === supplierId);
          if (sIdx >= 0) {
            updatedSuppliers[sIdx] = {
              ...updatedSuppliers[sIdx],
              balanceOwed: (updatedSuppliers[sIdx].balanceOwed || 0) + expenseToDelete.amount,
            };
            setSuppliers(updatedSuppliers);
            storage.saveSuppliers(updatedSuppliers);
          }
        }

        if (currentUser?.uid) {
          await saveUserWorkspaceToFirestore(currentUser.uid, {
            expenses: updatedExpenses,
            suppliers: updatedSuppliers,
          });
          await deleteBusinessActivityLogsByRelatedId(currentUser.uid, recordId);
          if (activityLogId) {
            await deleteBusinessActivityLog(currentUser.uid, activityLogId);
          }
          await logBusinessActivity(currentUser.uid, {
            workspaceId: currentUser.uid,
            type: 'expense',
            title: `[Mistake Corrected] Deleted Expense: ${expenseToDelete.category}`,
            subtitle: `Removed -${formatCurrency(expenseToDelete.amount, profile?.currency || 'RWF')} expense. Recalculated net profit.`,
            timestamp: new Date().toISOString(),
          });
        }

        return {
          success: true,
          message: `Expense deleted. Business expenses and net profit recalculated.`,
        };
      }

      if (recordType === 'purchase') {
        const purchaseToDelete = purchases.find((p) => p.id === recordId);
        if (!purchaseToDelete) {
          if (activityLogId && currentUser?.uid) {
            await deleteBusinessActivityLog(currentUser.uid, activityLogId);
          }
          return { success: true, message: 'Purchase record removed.' };
        }

        const updatedPurchases = purchases.filter((p) => p.id !== recordId);
        setPurchases(updatedPurchases);
        storage.savePurchases(updatedPurchases);

        // Reverse stock addition (deduct added stock)
        let updatedProducts = [...products];
        const prodIdx = updatedProducts.findIndex(
          (p) => p.id === purchaseToDelete.productId || p.name.toLowerCase() === purchaseToDelete.productName.toLowerCase()
        );
        if (prodIdx >= 0) {
          const curStock = updatedProducts[prodIdx].currentStock ?? 0;
          updatedProducts[prodIdx] = {
            ...updatedProducts[prodIdx],
            currentStock: Math.max(0, curStock - purchaseToDelete.quantity),
          };
          setProducts(updatedProducts);
          storage.saveProducts(updatedProducts);
        }

        // If PAY_LATER, deduct debt owed to supplier
        let updatedSuppliers = [...suppliers];
        if (purchaseToDelete.paymentStatus === 'PAY_LATER') {
          const sIdx = updatedSuppliers.findIndex(
            (s) => s.id === purchaseToDelete.supplierId || s.name.toLowerCase() === purchaseToDelete.supplierName.toLowerCase()
          );
          if (sIdx >= 0) {
            const curOwed = updatedSuppliers[sIdx].balanceOwed ?? 0;
            updatedSuppliers[sIdx] = {
              ...updatedSuppliers[sIdx],
              balanceOwed: Math.max(0, curOwed - purchaseToDelete.totalCost),
            };
            setSuppliers(updatedSuppliers);
            storage.saveSuppliers(updatedSuppliers);
          }
        }

        if (currentUser?.uid) {
          await saveUserWorkspaceToFirestore(currentUser.uid, {
            purchases: updatedPurchases,
            products: updatedProducts,
            suppliers: updatedSuppliers,
          });
          await deleteBusinessActivityLogsByRelatedId(currentUser.uid, recordId);
          if (activityLogId) {
            await deleteBusinessActivityLog(currentUser.uid, activityLogId);
          }
          await logBusinessActivity(currentUser.uid, {
            workspaceId: currentUser.uid,
            type: 'purchase',
            title: `[Mistake Corrected] Deleted Purchase: ${purchaseToDelete.productName}`,
            subtitle: `Reversed restock of ${purchaseToDelete.quantity} units from inventory.`,
            timestamp: new Date().toISOString(),
          });
        }

        return {
          success: true,
          message: `Purchase removed. Inventory stock and supplier balances corrected.`,
        };
      }

      if (recordType === 'customer_payment' || recordType === 'income') {
        const updatedIncomes = otherIncomes.filter((i) => i.id !== recordId);
        setOtherIncomes(updatedIncomes);
        storage.saveOtherIncomes(updatedIncomes);

        let updatedCustomers = [...customers];
        const customerId = extraInfo?.customerId;
        const amount = Number(extraInfo?.amount || 0);

        if (customerId && amount > 0) {
          const cIdx = updatedCustomers.findIndex((c) => c.id === customerId);
          if (cIdx >= 0) {
            updatedCustomers[cIdx] = {
              ...updatedCustomers[cIdx],
              currentBalance: (updatedCustomers[cIdx].currentBalance || 0) + amount,
            };
            setCustomers(updatedCustomers);
            storage.saveCustomers(updatedCustomers);
          }
        }

        if (currentUser?.uid) {
          await saveUserWorkspaceToFirestore(currentUser.uid, {
            income: updatedIncomes,
            customers: updatedCustomers,
          });
          await deleteBusinessActivityLogsByRelatedId(currentUser.uid, recordId);
          if (activityLogId) {
            await deleteBusinessActivityLog(currentUser.uid, activityLogId);
          }
          await logBusinessActivity(currentUser.uid, {
            workspaceId: currentUser.uid,
            type: 'debt',
            title: `[Mistake Corrected] Deleted Customer Payment`,
            subtitle: `Reversed customer payment. Restored customer balance by +${formatCurrency(amount, profile?.currency || 'RWF')}`,
            timestamp: new Date().toISOString(),
          });
        }

        return {
          success: true,
          message: `Customer payment deleted. Customer balance restored.`,
        };
      }

      if (recordType === 'waste') {
        const wasteToDelete = wasteLogs.find((w) => w.id === recordId);
        if (!wasteToDelete) {
          if (activityLogId && currentUser?.uid) {
            await deleteBusinessActivityLog(currentUser.uid, activityLogId);
          }
          return { success: true, message: 'Waste record removed.' };
        }

        const updatedWaste = wasteLogs.filter((w) => w.id !== recordId);
        setWasteLogs(updatedWaste);
        storage.saveWasteLogs(updatedWaste);

        // Restore stock for wasted item
        let updatedProducts = [...products];
        const pIdx = updatedProducts.findIndex(
          (p) => p.id === wasteToDelete.productId || p.name.toLowerCase() === wasteToDelete.productName.toLowerCase()
        );
        if (pIdx >= 0) {
          const curStock = updatedProducts[pIdx].currentStock ?? 0;
          updatedProducts[pIdx] = {
            ...updatedProducts[pIdx],
            currentStock: curStock + wasteToDelete.quantityWasted,
          };
          setProducts(updatedProducts);
          storage.saveProducts(updatedProducts);
        }

        if (currentUser?.uid) {
          await saveUserWorkspaceToFirestore(currentUser.uid, {
            wasteLogs: updatedWaste,
            products: updatedProducts,
          });
          await deleteBusinessActivityLogsByRelatedId(currentUser.uid, recordId);
          if (activityLogId) {
            await deleteBusinessActivityLog(currentUser.uid, activityLogId);
          }
          await logBusinessActivity(currentUser.uid, {
            workspaceId: currentUser.uid,
            type: 'waste',
            title: `[Mistake Corrected] Deleted Waste Report: ${wasteToDelete.productName}`,
            subtitle: `Restored ${wasteToDelete.quantityWasted} units back to stock and reversed loss.`,
            timestamp: new Date().toISOString(),
          });
        }

        return {
          success: true,
          message: `Waste report deleted. ${wasteToDelete.quantityWasted} units restored to stock.`,
        };
      }

      if (recordType === 'production') {
        const prodToDelete = productionLogs.find((p) => p.id === recordId);
        if (!prodToDelete) {
          if (activityLogId && currentUser?.uid) {
            await deleteBusinessActivityLog(currentUser.uid, activityLogId);
          }
          return { success: true, message: 'Production log removed.' };
        }

        const updatedProd = productionLogs.filter((p) => p.id !== recordId);
        setProductionLogs(updatedProd);
        storage.saveProductionLogs(updatedProd);

        // Deduct produced quantity from inventory
        let updatedProducts = [...products];
        const pIdx = updatedProducts.findIndex(
          (p) => p.id === prodToDelete.productId || p.name.toLowerCase() === prodToDelete.productName.toLowerCase()
        );
        if (pIdx >= 0) {
          const curStock = updatedProducts[pIdx].currentStock ?? 0;
          updatedProducts[pIdx] = {
            ...updatedProducts[pIdx],
            currentStock: Math.max(0, curStock - prodToDelete.quantityProduced),
          };
          setProducts(updatedProducts);
          storage.saveProducts(updatedProducts);
        }

        if (currentUser?.uid) {
          await saveUserWorkspaceToFirestore(currentUser.uid, {
            productionLogs: updatedProd,
            products: updatedProducts,
          });
          await deleteBusinessActivityLogsByRelatedId(currentUser.uid, recordId);
          if (activityLogId) {
            await deleteBusinessActivityLog(currentUser.uid, activityLogId);
          }
        }

        return {
          success: true,
          message: `Production record deleted and inventory stock adjusted.`,
        };
      }

      if (recordType === 'return') {
        const returnToDelete = returns.find((r) => r.id === recordId);
        if (returnToDelete) {
          const updatedReturns = returns.filter((r) => r.id !== recordId);
          setReturns(updatedReturns);
          storage.saveCustomerReturns(updatedReturns);
          if (currentUser?.uid) {
            await deleteBusinessActivityLogsByRelatedId(currentUser.uid, recordId);
            if (activityLogId) {
              await deleteBusinessActivityLog(currentUser.uid, activityLogId);
            }
          }
        }
        return {
          success: true,
          message: `Return record removed successfully.`,
        };
      }

      // Default fallback: activity only
      if (activityLogId && currentUser?.uid) {
        await deleteBusinessActivityLog(currentUser.uid, activityLogId);
      }
      return {
        success: true,
        message: `Activity record removed.`,
      };
    } catch (err: any) {
      console.error('Error deleting mistaken record:', err);
      return {
        success: false,
        message: 'Could not delete record.',
        error: err?.message || 'Database error occurred while deleting record.',
      };
    }
  };



  // 1.5. Splash Screen Lifecycle
  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  // 2. Business Setup Wizard for New Users
  if (isWizardOpen) {
    return (
      <BusinessSetupWizard
        ownerName={wizardUser.name}
        ownerEmailOrPhone={wizardUser.email}
        onComplete={handleWizardComplete}
      />
    );
  }

  // 3. Welcome / Unauthenticated Screen
  if (!isAuthenticated || !profile) {
    return (
      <>
        <WelcomeScreen
          onCreateAccount={() => {
            setAuthModalMode('signup');
            setIsAuthModalOpen(true);
          }}
          onLogin={() => {
            setAuthModalMode('login');
            setIsAuthModalOpen(true);
          }}
          onOpenFirebaseConsole={() => setIsFirebaseConsoleModalOpen(true)}
          onContinueOffline={handleContinueOffline}
          isDev={isDevOrOwner}
          currentUserEmail={currentUser?.email}
        />
        <AuthModal
          isOpen={isAuthModalOpen}
          initialMode={authModalMode}
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={handleAuthSuccess}
          onContinueOffline={handleContinueOffline}
          isDev={isDevOrOwner}
          currentUserEmail={currentUser?.email}
        />
        {isDevOrOwner && (
          <FirebaseConsoleModal
            isOpen={isFirebaseConsoleModalOpen}
            onClose={() => setIsFirebaseConsoleModalOpen(false)}
            onContinueOffline={handleContinueOffline}
          />
        )}
      </>
    );
  }

  // 4. Secure Automatic Session Lock Screen (Zero business data rendered in DOM while locked)
  if (isSessionLocked) {
    return (
      <SessionLockScreen
        profile={profile}
        currentUserEmail={currentUser?.email || profile?.email}
        currentUserName={profile?.ownerName || currentUser?.displayName}
        cashierPin={cashierPin}
        onUnlockSuccess={handleUnlockSession}
        onLogout={handleLogout}
      />
    );
  }

  // 5. Main Multi-Tenant SmartLedger Application
  return (
    <div 
      id="smartledger-main-app" 
      className="min-h-screen bg-slate-100 text-slate-900 font-['Plus_Jakarta_Sans',sans-serif] flex flex-col selection:bg-emerald-500 selection:text-white"
    >
      {/* Top Application Header */}
      <header className="sticky top-0 z-40 bg-slate-900 text-white border-b border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Brand Logo & Logged-in User's Business Identity */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-2 cursor-pointer text-left"
            >
              <BrandLogo size="sm" lightMode={true} tagline={false} />
            </button>

            <div className="hidden sm:block h-5 w-px bg-slate-700" />

            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs font-bold text-white font-['Outfit',sans-serif]">
                {profile.name}
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 border border-slate-700">
                {profile.currency}
              </span>

              {/* Real Cloud Firestore Sync Status (Developer/Owner only) */}
              {isDevOrOwner && (
                <button 
                  id="header-firebase-status-badge"
                  onClick={() => setIsFirebaseConsoleModalOpen(true)}
                  title="Firebase Console Diagnostics & Sync Status (Click to inspect)"
                  className="hidden lg:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/30 text-[10px] text-emerald-300 transition-colors cursor-pointer"
                >
                  <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span>
                    {cloudSyncStatus === 'syncing' ? 'Syncing...' : 'Firebase Synced'}
                  </span>
                  {cloudSyncStatus === 'syncing' ? (
                    <RefreshCw className="w-2.5 h-2.5 text-emerald-400 animate-spin" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 text-xs font-semibold">
            <button
              id="nav-tab-dashboard"
              onClick={() => handleNavigateTab('dashboard')}
              className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'dashboard'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>

            <button
              id="nav-tab-products"
              onClick={() => handleNavigateTab('products')}
              className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'products'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>{profile.beginnerMode ? 'Products' : 'Inventory'}</span>
            </button>

            <button
              id="nav-tab-customers"
              onClick={() => handleNavigateTab('customers')}
              className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'customers'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>{profile.beginnerMode ? 'Customers' : 'Receivables'}</span>
            </button>

            <button
              id="nav-tab-suppliers"
              onClick={() => handleNavigateTab('suppliers')}
              className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'suppliers'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>{profile.beginnerMode ? 'Suppliers' : 'Payables'}</span>
            </button>

            <button
              id="nav-tab-reports"
              onClick={() => handleNavigateTab('reports')}
              className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'reports'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Reports</span>
              {isCashierMode && <Lock className="w-3 h-3 text-amber-400" />}
            </button>

            <button
              id="nav-tab-feed"
              onClick={() => handleNavigateTab('feed')}
              className={`px-3 py-1.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'feed'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Business Feed</span>
              {isCashierMode && <Lock className="w-3 h-3 text-amber-400" />}
            </button>
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2">
            {/* Cashier Mode Toggle & PIN Configuration Controls */}
            {isCashierMode ? (
              <div className="flex items-center gap-1">
                <button
                  id="header-cashier-mode-btn"
                  onClick={() => {
                    setPinModalMode('unlock_owner');
                    setIsPinModalOpen(true);
                  }}
                  title="Staff Cashier Mode Active. Tap with PIN to unlock owner view."
                  className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Cashier Locked</span>
                </button>
                <button
                  id="header-cashier-set-pin-btn"
                  onClick={() => {
                    setPinModalMode('set_pin');
                    setIsPinModalOpen(true);
                  }}
                  title="Choose or Change your custom 4-Digit Cashier PIN"
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white transition-colors cursor-pointer border border-slate-700"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-1.5">
                <button
                  id="header-choose-pin-btn"
                  onClick={() => {
                    setPinModalMode('set_pin');
                    setIsPinModalOpen(true);
                  }}
                  title="Choose or Change 4-digit Cashier Protection PIN"
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer border border-slate-700"
                >
                  <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden lg:inline">Set PIN</span>
                </button>
                <button
                  id="header-lock-cashier-btn"
                  onClick={handleLockCashierMode}
                  title="Switch to Cashier Mode (hides profits & restricts staff to sales)"
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
                >
                  <Unlock className="w-3.5 h-3.5 text-slate-400" />
                  <span className="hidden md:inline">Lock Cashier</span>
                </button>
              </div>
            )}

            {/* Shift / Daily Cash Drawer (Z-Report) Quick Action */}
            <button
              id="header-shift-reconciliation-btn"
              onClick={() => setIsShiftModalOpen(true)}
              title={activeShift ? `Shift Open: ${activeShift.cashierName} (Click for Z-Report / Reconciliation)` : 'Cash Register Closed. Click to Open Shift'}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeShift
                  ? 'bg-teal-950/60 border border-teal-500/40 text-teal-300 hover:bg-teal-900/60'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-teal-400" />
              <span className="hidden lg:inline">{activeShift ? 'Till Open' : 'Open Till'}</span>
            </button>

            {/* Customer Returns Quick Action */}
            <button
              id="header-returns-btn"
              onClick={() => setIsReturnsOpen(true)}
              title="Customer Returns & Refunds"
              className="hidden lg:flex px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
              <span>Returns</span>
            </button>

            {/* Bakery Mode Direct Button if enabled */}
            {profile.isBakeryMode && (
              <button
                id="top-bakery-mode-btn"
                onClick={() => setIsBakeryOpen(true)}
                className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-950/60 border border-amber-600/40 text-amber-300 hover:bg-amber-900/60 text-xs font-semibold transition-colors cursor-pointer"
                title="Bakery Production & Waste"
              >
                <Wheat className="w-3.5 h-3.5" />
                <span>Bakery Log</span>
              </button>
            )}

            {/* Share App / Link Button */}
            <button
              id="top-share-app-btn"
              onClick={() => setIsShareModalOpen(true)}
              title="Share app link or QR code with users and cashiers"
              className="px-2.5 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-indigo-500/40"
            >
              <Share2 className="w-3.5 h-3.5 text-indigo-300" />
              <span className="hidden sm:inline">Share App</span>
            </button>

            {/* Business Settings & Restart Business Quick Action */}
            <button
              id="top-settings-btn"
              onClick={() => setIsSettingsOpen(true)}
              title="Business Settings & Restart Business"
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
            >
              <SettingsIcon className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Settings</span>
            </button>

            {/* AI Assistant Button */}
            <button
              id="top-ask-ai-btn"
              onClick={() => setIsAIOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Bot className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ask AI</span>
            </button>

            {/* Firebase Console Settings Button (Developer/Owner only) */}
            {isDevOrOwner && (
              <button
                id="top-firebase-console-btn"
                onClick={() => setIsFirebaseConsoleModalOpen(true)}
                title="Firebase Console Connection Settings & Diagnostics"
                className="p-2 rounded-xl text-amber-400 hover:text-amber-300 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Flame className="w-4 h-4 fill-amber-400" />
              </button>
            )}

            {/* Quick Lock Session Button */}
            <button
              id="top-lock-session-btn"
              onClick={handleManualLockSession}
              title="Lock Session Now (Protects sensitive data)"
              className="p-2 rounded-xl text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </button>

            {/* Logout Button */}
            <button
              id="top-logout-btn"
              onClick={handleLogout}
              title={`Log Out (${currentUser?.email || profile.ownerName})`}
              className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>

            {/* Mobile Hamburger */}
            <button
              id="mobile-menu-toggle-btn"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-slate-950 border-b border-slate-800 px-4 py-3 space-y-1 text-xs font-semibold">
            {[
              { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
              { id: 'products' as const, label: profile.beginnerMode ? 'Products' : 'Inventory', icon: Package },
              { id: 'customers' as const, label: profile.beginnerMode ? 'Customers' : 'Receivables', icon: Users },
              { id: 'suppliers' as const, label: profile.beginnerMode ? 'Suppliers' : 'Payables', icon: Truck },
              { id: 'reports' as const, label: 'Reports', icon: BarChart3, locked: isCashierMode },
              { id: 'feed' as const, label: 'Business Feed', icon: Activity, locked: isCashierMode },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    handleNavigateTab(tab.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full p-2.5 rounded-xl flex items-center justify-between text-left transition-colors ${
                    activeTab === tab.id
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-300 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </div>
                  {tab.locked && <Lock className="w-3.5 h-3.5 text-amber-400" />}
                </button>
              );
            })}
            <button
              onClick={() => {
                setIsSettingsOpen(true);
                setIsMobileMenuOpen(false);
              }}
              className="w-full p-2.5 rounded-xl flex items-center gap-2.5 text-left text-slate-300 hover:bg-slate-900 transition-colors"
            >
              <SettingsIcon className="w-4 h-4 text-slate-400" />
              <span>Business Settings & Restart</span>
            </button>
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                handleManualLockSession();
              }}
              className="w-full p-2.5 rounded-xl flex items-center gap-2.5 text-left text-amber-300 hover:bg-slate-900 transition-colors"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Lock Session Now</span>
            </button>
          </div>
        )}
      </header>

      {/* Main Container Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24 md:pb-8 space-y-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            profile={profile}
            products={products}
            sales={sales}
            expenses={expenses}
            customers={customers}
            suppliers={suppliers}
            returns={returns}
            isCashierMode={isCashierMode}
            onUnlockCashierMode={() => {
              setPinModalMode('unlock_owner');
              setIsPinModalOpen(true);
            }}
            onChangeCashierPin={() => {
              setPinModalMode('set_pin');
              setIsPinModalOpen(true);
            }}
            onOpenShareApp={() => setIsShareModalOpen(true)}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onLockCashierMode={handleLockCashierMode}
            onOpenPurchaseOrder={() => setIsPOModalOpen(true)}
            onOpenShiftReconciliation={() => setIsShiftModalOpen(true)}
            onOpenReturns={() => setIsReturnsOpen(true)}
            activeShift={activeShift}
            onOpenSell={() => setIsSellOpen(true)}
            onOpenBuyStock={() => setIsBuyStockOpen(true)}
            onOpenSpendMoney={() => setIsSpendOpen(true)}
            onOpenReceiveMoney={() => setIsReceiveIncomeOpen(true)}
            onOpenAI={() => setIsAIOpen(true)}
            onOpenBakery={() => setIsBakeryOpen(true)}
            onNavigateTab={handleNavigateTab}
          />
        )}

        {activeTab === 'products' && (
          <ProductsView
            products={products}
            currency={profile.currency}
            isBeginner={profile.beginnerMode}
            canSell={true}
            userRole="Owner"
            currentUserName={profile.ownerName || 'Business Owner'}
            sales={sales}
            purchases={purchases}
            productionLogs={productionLogs}
            wasteLogs={wasteLogs}
            customerReturns={returns}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onArchiveProduct={handleArchiveProduct}
            onRestoreProduct={handleRestoreProduct}
            onPermanentDeleteProduct={handlePermanentDeleteProduct}
            onQuickSell={handleQuickSell}
            onWriteOffExpired={handleWriteOffExpired}
            initialBarcodeToAdd={initialBarcodeToAdd}
            onClearInitialBarcodeToAdd={() => setInitialBarcodeToAdd(null)}
          />
        )}

        {activeTab === 'customers' && (
          <CustomersView
            customers={customers}
            sales={sales}
            customerReturns={returns}
            otherIncomes={otherIncomes}
            currency={profile.currency}
            isBeginner={profile.beginnerMode}
            isCashierMode={isCashierMode}
            onUnlockCashierMode={() => {
              setPinModalMode('unlock_owner');
              setIsPinModalOpen(true);
            }}
            onAddCustomer={handleAddCustomer}
            onRecordCustomerPayment={handleRecordCustomerPayment}
            onDeleteCustomer={handleDeleteCustomer}
            onArchiveCustomer={handleArchiveCustomer}
            onUnarchiveCustomer={handleUnarchiveCustomer}
          />
        )}

        {activeTab === 'suppliers' && (
          <SuppliersView
            suppliers={suppliers}
            purchases={purchases}
            expenses={expenses}
            currency={profile.currency}
            isBeginner={profile.beginnerMode}
            isCashierMode={isCashierMode}
            onUnlockCashierMode={() => {
              setPinModalMode('unlock_owner');
              setIsPinModalOpen(true);
            }}
            onAddSupplier={handleAddSupplier}
            onRecordSupplierPayment={handleRecordSupplierPayment}
            onDeleteSupplier={handleDeleteSupplier}
            onArchiveSupplier={handleArchiveSupplier}
            onUnarchiveSupplier={handleUnarchiveSupplier}
            onOpenPurchaseOrder={() => setIsPOModalOpen(true)}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsView
            products={products}
            sales={sales}
            expenses={expenses}
            customers={customers}
            suppliers={suppliers}
            returns={returns}
            currency={profile.currency}
            isBeginner={profile.beginnerMode}
            onToggleBeginnerMode={handleToggleBeginnerMode}
            onRefreshSales={async () => {
              if (effectiveUserId) {
                await loadUserDataForUid(effectiveUserId, profile?.email, profile?.ownerName);
              }
            }}
            onNavigateToSales={() => {
              setIsSellOpen(true);
            }}
          />
        )}

        {activeTab === 'feed' && (
          <BusinessFeedView
            workspaceId={effectiveUserId || currentUser?.uid || ''}
            businessName={profile.name}
            currency={profile.currency}
            currentPeriodStartedAt={profile.currentPeriodStartedAt}
            products={products}
            sales={sales}
            expenses={expenses}
            purchases={purchases}
            customers={customers}
            suppliers={suppliers}
            productionLogs={productionLogs}
            wasteLogs={wasteLogs}
            otherIncomes={otherIncomes}
            returns={returns}
            onDeleteRecord={handleDeleteMistakenRecord}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 pb-24 md:pb-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            <strong>SmartLedger</strong> &mdash; Your Business. Made Simple. &copy; {new Date().getFullYear()}
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleBeginnerMode}
              className="text-slate-600 hover:text-emerald-700 underline cursor-pointer"
            >
              Toggle Mode ({profile.beginnerMode ? 'Beginner: Simple Words' : 'Accounting Terms'})
            </button>
            <span>&bull;</span>
            <button
              onClick={() => setIsAIOpen(true)}
              className="text-emerald-600 hover:text-emerald-700 font-semibold cursor-pointer"
            >
              Ask AI Partner
            </button>
          </div>
        </div>
      </footer>

      {/* Modern Responsive Bottom Navigation Bar */}
      <BottomNavBar
        activeTab={activeTab}
        onSelectTab={handleNavigateTab}
        beginnerMode={profile.beginnerMode}
        isCashierMode={isCashierMode}
      />

      {/* Modal Dialogs */}
      <SellModal
        isOpen={isSellOpen}
        onClose={() => {
          setIsSellOpen(false);
          setPreselectedSellProduct(null);
          setPreselectedSellQuantity(1);
          setPreselectedSellVariant(null);
        }}
        products={products}
        customers={customers}
        currency={profile.currency}
        allowCustomerCredit={profile.allowCustomerCredit}
        profile={profile}
        initialProduct={preselectedSellProduct}
        initialQuantity={preselectedSellQuantity}
        initialVariant={preselectedSellVariant}
        onCompleteSale={handleCompleteSale}
        onAddCustomer={handleAddCustomer}
        onAddNewProductWithBarcode={(barcode) => {
          setIsSellOpen(false);
          setPreselectedSellProduct(null);
          setPreselectedSellQuantity(1);
          setPreselectedSellVariant(null);
          setActiveTab('products');
          setInitialBarcodeToAdd(barcode);
        }}
      />

      <ExpensesModal
        isOpen={isSpendOpen}
        onClose={() => setIsSpendOpen(false)}
        currency={profile.currency}
        existingExpenses={expenses}
        onAddExpense={handleAddExpense}
      />

      <PurchasesModal
        isOpen={isBuyStockOpen}
        onClose={() => setIsBuyStockOpen(false)}
        products={products}
        suppliers={suppliers}
        currency={profile.currency}
        allowSupplierCredit={profile.allowSupplierCredit}
        onAddPurchase={handleAddPurchase}
        onAddSupplier={handleAddSupplier}
      />

      <IncomeModal
        isOpen={isReceiveIncomeOpen}
        onClose={() => setIsReceiveIncomeOpen(false)}
        currency={profile.currency}
        onAddIncome={handleAddIncome}
      />

      <AIAssistantModal
        isOpen={isAIOpen}
        onClose={() => setIsAIOpen(false)}
        profile={profile}
        products={products}
        sales={sales}
        expenses={expenses}
        customers={customers}
        suppliers={suppliers}
        purchases={purchases}
        returns={returns}
        wasteLogs={wasteLogs}
        onNavigateTab={handleNavigateTab}
        onReviewSale={(_saleId) => {
          setIsAIOpen(false);
          handleNavigateTab('feed');
        }}
      />

      {profile.isBakeryMode && (
        <BakeryProductionModal
          isOpen={isBakeryOpen}
          onClose={() => setIsBakeryOpen(false)}
          products={products}
          currency={profile.currency}
          productionLogs={productionLogs}
          wasteLogs={wasteLogs}
          onAddProduction={handleAddProduction}
          onAddWaste={handleAddWaste}
        />
      )}

      {/* Shift Reconciliation & Daily Cash Drawer (Z-Report) */}
      <ShiftReconciliationModal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
        currency={profile.currency}
        businessName={profile.name}
        activeShift={activeShift}
        shiftHistory={shifts}
        sales={sales}
        expenses={expenses}
        otherIncomes={otherIncomes}
        returns={returns}
        onOpenShift={(startingFloat, cashierName) => {
          const newShift: CashRegisterShift = {
            id: `shift_${Date.now()}`,
            cashierName: cashierName || 'Cashier',
            openedAt: new Date().toISOString(),
            startingFloat,
            status: 'OPEN',
            totalSalesAmount: 0,
            cashSales: 0,
            momoSales: 0,
            bankSales: 0,
            creditSales: 0,
            totalExpensesCash: 0,
            totalCustomerRepaymentsCash: 0,
            refundsTotal: 0,
            expectedCash: startingFloat,
          };
          handleOpenShift(newShift);
        }}
        onCloseShift={handleCloseShift}
      />

      {/* Customer Returns, Refunds & Restocking */}
      <ReturnsModal
        isOpen={isReturnsOpen}
        onClose={() => setIsReturnsOpen(false)}
        sales={sales}
        products={products}
        customers={customers}
        currency={profile.currency}
        businessName={profile.name}
        onProcessReturn={(returnData) => {
          handleProcessReturn(returnData.customerReturn);
        }}
      />

      {/* Cashier Mode Role Protection PIN Modal */}
      <CashierPinModal
        isOpen={isPinModalOpen}
        onClose={() => {
          setIsPinModalOpen(false);
          setPendingTabAfterUnlock(null);
        }}
        mode={pinModalMode}
        currentPin={cashierPin}
        onSuccess={handleUnlockPinSuccess}
      />

      {/* Purchase Order Generator & Receiving */}
      <PurchaseOrderModal
        isOpen={isPOModalOpen}
        onClose={() => setIsPOModalOpen(false)}
        products={products}
        suppliers={suppliers}
        currency={profile.currency}
        businessName={profile.name}
        businessPhone={profile.phone}
        onRecordPurchases={handleRecordPOPurchases}
      />

      {/* Firebase Console Settings & Live Diagnostics */}
      <FirebaseConsoleModal
        isOpen={isFirebaseConsoleModalOpen}
        onClose={() => setIsFirebaseConsoleModalOpen(false)}
        onContinueOffline={handleContinueOffline}
      />

      {/* Share App Link & Worker Invitation Modal */}
      <ShareAppModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        businessName={profile?.name || 'SmartLedger'}
        businessId={profile?.id || effectiveUserId || 'default_biz'}
      />

      {/* Business Settings & Archived Records Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        profile={profile}
        onUpdateProfile={handleUpdateProfile}
        archivedPeriods={archivedPeriods}
        onOpenRestartBusiness={() => {
          setIsSettingsOpen(false);
          setIsRestartBusinessOpen(true);
        }}
        onViewArchivedPeriod={(period) => {
          setSelectedArchivedPeriod(period);
        }}
        onOpenArchivedPeriod={(period) => {
          setSelectedArchivedPeriod(period);
        }}
        onDeleteArchivedPeriod={handleDeleteArchivedPeriod}
        isCashierMode={isCashierMode}
        onUnlockCashierMode={() => {
          setPinModalMode('unlock');
          setIsPinModalOpen(true);
        }}
        onChangeCashierPin={() => {
          setPinModalMode('set');
          setIsPinModalOpen(true);
        }}
        onOpenFirebaseConsole={() => setIsFirebaseConsoleModalOpen(true)}
        isDevOrOwner={isDevOrOwner}
      />

      {/* Thermal & Digital Receipt Modal for Staff and Owner */}
      {selectedReceiptSale && (
        <ReceiptModal
          isOpen={isReceiptModalOpen}
          onClose={() => {
            setIsReceiptModalOpen(false);
            setSelectedReceiptSale(null);
          }}
          sale={selectedReceiptSale}
          profile={profile}
          currency={profile.currency}
          customers={customers}
        />
      )}

      {/* Secure Restart Business Confirmation Modal */}
      <RestartBusinessModal
        isOpen={isRestartBusinessOpen}
        onClose={() => setIsRestartBusinessOpen(false)}
        businessName={profile.name}
        currentPeriodNumber={profile.periodNumber || 1}
        onConfirmRestart={handleRestartBusiness}
      />

      {/* Archived Business Period Details Modal (Read-Only) */}
      <ArchivedPeriodDetailsModal
        period={selectedArchivedPeriod}
        isOpen={Boolean(selectedArchivedPeriod)}
        onClose={() => setSelectedArchivedPeriod(null)}
        profile={profile}
        isCashierMode={isCashierMode}
        onUnlockCashierMode={() => {
          setPinModalMode('unlock');
          setIsPinModalOpen(true);
        }}
        onDeleteArchivedPeriod={handleDeleteArchivedPeriod}
      />
    </div>
  );
}
export default App;
