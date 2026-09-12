import React, { useState, useEffect, useRef } from 'react';
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
  CustomerReturn,
  CashRegisterShift
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
import { BottomNavBar } from './components/BottomNavBar';

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
  Clock,
  RotateCcw
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
  UserWorkspaceData
} from './firebase';
import { formatCurrency } from './utils/calculations';
import { userScopedStorage } from './utils/storage';
import { useDevMode } from './utils/devMode';

export function App() {
  // Splash screen state (Phase 1)
  const [showSplash, setShowSplash] = useState<boolean>(true);

  // Firebase Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const { isDevOrOwner } = useDevMode(currentUser?.email);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [isWizardOpen, setIsWizardOpen] = useState<boolean>(false);
  const [wizardUser, setWizardUser] = useState<{ name: string; email: string }>({ name: '', email: '' });

  // Main navigation tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'customers' | 'suppliers' | 'reports' | 'feed'>('dashboard');
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

  const [cloudSyncStatus, setCloudSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('synced');

  // Flag to avoid syncing initial load back to Firestore
  const isInitialLoadComplete = useRef<boolean>(false);

  const handleContinueOffline = (name = 'Business Owner') => {
    const localId = 'local_user_default';
    const storage = userScopedStorage(localId);
    const existing = storage.getProfile();
    if (existing && existing.name) {
      setProfile(existing);
      setProducts(storage.getProducts());
      setSales(storage.getSales());
      setExpenses(storage.getExpenses());
      setPurchases(storage.getPurchases());
      setOtherIncomes(storage.getOtherIncomes());
      setCustomers(storage.getCustomers());
      setSuppliers(storage.getSuppliers());
      setShifts(storage.getShifts());
      setReturns(storage.getCustomerReturns());
      setIsAuthenticated(true);
      setIsWizardOpen(false);
      isInitialLoadComplete.current = true;
    } else {
      setWizardUser({ name, email: 'local@smartledger.app' });
      setIsWizardOpen(true);
    }
  };

  // 1. Listen for Firebase Authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Authenticated user: load their private Firestore workspace
        await loadUserData(user);
      } else {
        // Logged out: reset all state to zero
        clearLocalState();
        setIsAuthenticated(false);
        setIsWizardOpen(false);
        setIsAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const clearLocalState = () => {
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
    isInitialLoadComplete.current = false;
  };

  const loadUserData = async (user: User) => {
    setIsAuthLoading(true);
    try {
      const storage = userScopedStorage(user.uid);

      // 1. Instant optimistic restore from local device cache for seamless offline operation
      const localProf = storage.getProfile();
      if (localProf && localProf.name) {
        setProfile(localProf);
        setProducts(storage.getProducts());
        setSales(storage.getSales());
        setExpenses(storage.getExpenses());
        setPurchases(storage.getPurchases());
        setOtherIncomes(storage.getOtherIncomes());
        setCustomers(storage.getCustomers());
        setSuppliers(storage.getSuppliers());
        setShifts(storage.getShifts());
        setReturns(storage.getCustomerReturns());
        setIsAuthenticated(true);
        setIsWizardOpen(false);
      }

      // 2. Fetch latest data from Firestore
      const res = await fetchUserWorkspaceFromFirestore(user.uid);

      if (res.success && res.data && res.data.profile) {
        // Existing user with configured business in Firestore
        const ws = res.data;
        setProfile(ws.profile);
        setProducts(ws.products || []);
        setSales(ws.sales || []);
        setExpenses(ws.expenses || []);
        setPurchases(ws.purchases || []);
        setOtherIncomes(ws.income || []);
        setCustomers(ws.customers || []);
        setSuppliers(ws.suppliers || []);
        setProductionLogs(ws.productionLogs || []);
        setWasteLogs(ws.wasteLogs || []);

        // Cache locally for offline resilience
        storage.saveProfile(ws.profile);
        storage.saveProducts(ws.products || []);
        storage.saveSales(ws.sales || []);
        storage.saveExpenses(ws.expenses || []);
        storage.savePurchases(ws.purchases || []);
        storage.saveOtherIncomes(ws.income || []);
        storage.saveCustomers(ws.customers || []);
        storage.saveSuppliers(ws.suppliers || []);

        setIsAuthenticated(true);
        setIsWizardOpen(false);
      } else if (!localProf || !localProf.name) {
        // New account with no business profile yet: open Business Setup Wizard
        setWizardUser({
          name: user.displayName || '',
          email: user.email || '',
        });
        setIsWizardOpen(true);
        setIsAuthenticated(false);
      }
    } catch (err) {
      console.error('Error loading user business workspace:', err);
    } finally {
      setIsAuthLoading(false);
      // Allow syncing after state is established
      setTimeout(() => {
        isInitialLoadComplete.current = true;
      }, 500);
    }
  };

  // 2. Sync state changes to user's isolated Cloud Firestore workspace
  useEffect(() => {
    if (!currentUser || !profile || !isInitialLoadComplete.current) return;

    const storage = userScopedStorage(currentUser.uid);
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

    // Debounced Firestore sync
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
        };

        const res = await saveUserWorkspaceToFirestore(currentUser.uid, workspacePayload);
        if (res.success) {
          setCloudSyncStatus('synced');
        } else {
          setCloudSyncStatus('synced');
        }
      } catch (err) {
        console.warn('Firestore autosync warning:', err);
        setCloudSyncStatus('offline');
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [currentUser, profile, products, sales, expenses, purchases, otherIncomes, customers, suppliers, productionLogs, wasteLogs]);

  // Auth & Onboarding Handlers
  const handleAuthSuccess = async (name: string, emailOrPhone: string, isNewAccount: boolean) => {
    setIsAuthModalOpen(false);
    if (isNewAccount || !profile) {
      setWizardUser({ name, email: emailOrPhone });
      setIsWizardOpen(true);
    } else {
      setIsAuthenticated(true);
    }
  };

  const handleWizardComplete = async (newProfile: BusinessProfile) => {
    setProfile(newProfile);
    setIsWizardOpen(false);
    setIsAuthenticated(true);

    if (currentUser) {
      const storage = userScopedStorage(currentUser.uid);
      storage.saveProfile(newProfile);
      storage.saveProducts([]);
      storage.saveSales([]);
      storage.saveExpenses([]);
      storage.savePurchases([]);
      storage.saveOtherIncomes([]);
      storage.saveCustomers([]);
      storage.saveSuppliers([]);

      // Initialize clean empty workspace in Cloud Firestore
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
          allowCustomerCredit: newProfile.allowCustomerCredit,
          allowSupplierCredit: newProfile.allowSupplierCredit,
          beginnerMode: newProfile.beginnerMode,
          isBakeryMode: newProfile.isBakeryMode,
        },
        productionLogs: [],
        wasteLogs: [],
      });
      isInitialLoadComplete.current = true;
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Logout error:', err);
    }
    clearLocalState();
    setIsAuthenticated(false);
    setIsWizardOpen(false);
  };

  // Business Action Handlers
  const handleCompleteSale = (sale: Sale, restockIfProduced = 0) => {
    setSales((prev) => [sale, ...prev]);

    // Update Product Stock
    setProducts((prev) =>
      prev.map((p) => {
        const item = sale.items.find((i) => i.productId === p.id);
        if (item) {
          const newStock = p.stock + restockIfProduced - item.quantity;
          return { ...p, stock: Math.max(0, newStock) };
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
    setCustomers((prev) => [newCust, ...prev]);
    return newId;
  };

  const handleRecordCustomerPayment = (customerId: string, amount: number, notes?: string) => {
    const targetCustomer = customers.find((c) => c.id === customerId);
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === customerId
          ? { ...c, amountOwed: Math.max(0, (c.amountOwed || 0) - amount) }
          : c
      )
    );

    // Record as cash entry / income
    setOtherIncomes((prev) => [
      {
        id: `inc_cust_pay_${Date.now()}`,
        source: 'Other',
        amount,
        description: `Customer debt repayment: ${notes || ''}`,
        date: new Date().toISOString(),
      },
      ...prev,
    ]);

    if (currentUser) {
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
    setSuppliers((prev) => [newSupp, ...prev]);
    return newId;
  };

  const handleRecordSupplierPayment = (supplierId: string, amount: number) => {
    setSuppliers((prev) =>
      prev.map((s) =>
        s.id === supplierId
          ? { ...s, amountOwed: Math.max(0, (s.amountOwed || 0) - amount) }
          : s
      )
    );

    // Record as expense
    setExpenses((prev) => [
      {
        id: `exp_supp_pay_${Date.now()}`,
        category: 'Other',
        amount,
        notes: `Paid supplier invoice`,
        paidVia: 'Cash',
        date: new Date().toISOString(),
      },
      ...prev,
    ]);
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

  // Cashier Mode Role Protection Handlers
  const handleNavigateTab = (targetTab: 'dashboard' | 'products' | 'customers' | 'suppliers' | 'reports' | 'feed') => {
    if (isCashierMode && (targetTab === 'reports' || targetTab === 'feed')) {
      setPendingTabAfterUnlock(targetTab);
      setPinModalMode('unlock_owner');
      setIsPinModalOpen(true);
      return;
    }
    setActiveTab(targetTab);
  };

  const handleUnlockPinSuccess = (newPin?: string) => {
    if (pinModalMode === 'unlock_owner') {
      setIsCashierMode(false);
      localStorage.setItem('smartledger_is_cashier_mode', 'false');
      if (pendingTabAfterUnlock) {
        setActiveTab(pendingTabAfterUnlock);
        setPendingTabAfterUnlock(null);
      }
    } else if (pinModalMode === 'set_pin' && newPin) {
      setCashierPin(newPin);
      localStorage.setItem('smartledger_cashier_pin', newPin);
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

  // 1. Splash Screen Lifecycle
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

  // 4. Main Multi-Tenant SmartLedger Application
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
            {/* Cashier Mode Toggle Button */}
            {isCashierMode ? (
              <button
                id="header-cashier-mode-btn"
                onClick={() => {
                  setPinModalMode('unlock_owner');
                  setIsPinModalOpen(true);
                }}
                title="Staff Cashier Mode Active. Tap with Owner PIN to unlock all features."
                className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Cashier Locked</span>
              </button>
            ) : (
              <button
                id="header-lock-cashier-btn"
                onClick={handleLockCashierMode}
                title="Switch to Cashier Mode (hides profits & restricts staff to sales)"
                className="hidden sm:flex px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
              >
                <Unlock className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden md:inline">Lock Cashier</span>
              </button>
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
            isCashierMode={isCashierMode}
            onUnlockCashierMode={() => {
              setPinModalMode('unlock_owner');
              setIsPinModalOpen(true);
            }}
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
            onAddProduct={(newP) => setProducts((prev) => [newP, ...prev])}
            onUpdateProduct={(updatedP) =>
              setProducts((prev) => prev.map((p) => (p.id === updatedP.id ? updatedP : p)))
            }
            onQuickSell={() => {
              setIsSellOpen(true);
            }}
            onWriteOffExpired={handleWriteOffExpired}
          />
        )}

        {activeTab === 'customers' && (
          <CustomersView
            customers={customers}
            sales={sales}
            currency={profile.currency}
            isBeginner={profile.beginnerMode}
            onAddCustomer={handleAddCustomer}
            onRecordCustomerPayment={handleRecordCustomerPayment}
          />
        )}

        {activeTab === 'suppliers' && (
          <SuppliersView
            suppliers={suppliers}
            purchases={purchases}
            currency={profile.currency}
            isBeginner={profile.beginnerMode}
            onAddSupplier={handleAddSupplier}
            onRecordSupplierPayment={handleRecordSupplierPayment}
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
            currency={profile.currency}
            isBeginner={profile.beginnerMode}
            onToggleBeginnerMode={handleToggleBeginnerMode}
            onRefreshSales={async () => {
              if (currentUser) {
                await loadUserData(currentUser);
              }
            }}
            onNavigateToSales={() => {
              setIsSellOpen(true);
            }}
          />
        )}

        {activeTab === 'feed' && (
          <BusinessFeedView
            workspaceId={currentUser?.uid || ''}
            businessName={profile.name}
            currency={profile.currency}
            products={products}
            sales={sales}
            expenses={expenses}
            purchases={purchases}
            customers={customers}
            suppliers={suppliers}
            productionLogs={productionLogs}
            wasteLogs={wasteLogs}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 pb-24 md:pb-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            <strong>SmartLedger</strong> &mdash; Multi-Tenant Business OS &copy; {new Date().getFullYear()}
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
      />

      {/* Modal Dialogs */}
      <SellModal
        isOpen={isSellOpen}
        onClose={() => setIsSellOpen(false)}
        products={products}
        customers={customers}
        currency={profile.currency}
        allowCustomerCredit={profile.allowCustomerCredit}
        onCompleteSale={handleCompleteSale}
        onAddCustomer={handleAddCustomer}
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
    </div>
  );
}
export default App;
