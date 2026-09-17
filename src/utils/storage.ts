import {
  BusinessProfile,
  Product,
  Sale,
  Expense,
  Customer,
  Supplier,
  TimelineEvent,
  NotificationItem,
  BusinessGoals,
  ProductionLog,
  WasteLog,
  CustomerReturn,
  SupplierReturn,
  OtherIncome,
  Purchase,
  CashRegisterShift,
  ArchivedBusinessPeriod
} from '../types';

import {
  initialBusinessProfile,
  initialProducts,
  initialSales,
  initialExpenses,
  initialCustomers,
  initialSuppliers,
  initialTimelineEvents,
  initialNotifications,
  initialGoals,
  initialProductionLogs,
  initialWasteLogs,
  initialPurchases
} from '../data/initialData';

function getKey(base: string, userId?: string): string {
  return userId ? `smartledger_${userId}_${base}` : `smartledger_${base}`;
}

export function getStoredProfile(userId?: string): BusinessProfile | null {
  if (userId) {
    const userKey = getKey('profile', userId);
    const saved = localStorage.getItem(userKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.name) return parsed;
      } catch {}
    }
  }

  // Resilient fallback: check general/previous profile
  const globalSaved = localStorage.getItem('smartledger_profile');
  if (globalSaved) {
    try {
      const parsed = JSON.parse(globalSaved);
      if (parsed && parsed.name) {
        if (userId) {
          localStorage.setItem(getKey('profile', userId), globalSaved);
        }
        return parsed;
      }
    } catch {}
  }

  return initialBusinessProfile;
}

export function saveStoredProfile(profile: BusinessProfile, userId?: string) {
  const targetId = userId || profile.userId;
  if (targetId) {
    const key = getKey('profile', targetId);
    localStorage.setItem(key, JSON.stringify(profile));
  }
  localStorage.setItem('smartledger_profile', JSON.stringify(profile));
}

export function getStoredProducts(userId?: string): Product[] {
  // 1. Check user-scoped key if provided
  if (userId) {
    const key = getKey('products', userId);
    const saved = localStorage.getItem(key);
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch {}
    }
  }

  // 2. Check global/fallback products key
  const globalSaved = localStorage.getItem('smartledger_products');
  if (globalSaved !== null) {
    try {
      const parsed = JSON.parse(globalSaved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        if (userId) {
          localStorage.setItem(getKey('products', userId), globalSaved);
        }
        return parsed;
      }
    } catch {}
  }

  // 3. Check last known products backup
  const backupSaved = localStorage.getItem('smartledger_last_known_products');
  if (backupSaved !== null) {
    try {
      const parsed = JSON.parse(backupSaved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        if (userId) {
          localStorage.setItem(getKey('products', userId), backupSaved);
        }
        return parsed;
      }
    } catch {}
  }

  return initialProducts;
}

export function saveStoredProducts(products: Product[], userId?: string) {
  if (userId) {
    const key = getKey('products', userId);
    localStorage.setItem(key, JSON.stringify(products));
  }
  // If products are populated, keep global and backup cache fresh
  if (Array.isArray(products) && products.length > 0) {
    localStorage.setItem('smartledger_products', JSON.stringify(products));
    localStorage.setItem('smartledger_last_known_products', JSON.stringify(products));
  }
}

export function getStoredSales(userId?: string): Sale[] {
  const key = getKey('sales', userId);
  const saved = localStorage.getItem(key);
  if (saved !== null) {
    try { return JSON.parse(saved); } catch {}
  }
  if (userId && localStorage.getItem(getKey('profile', userId))) {
    return [];
  }
  return initialSales;
}

export function saveStoredSales(sales: Sale[], userId?: string) {
  const key = getKey('sales', userId);
  localStorage.setItem(key, JSON.stringify(sales));
}

export function getStoredExpenses(userId?: string): Expense[] {
  const key = getKey('expenses', userId);
  const saved = localStorage.getItem(key);
  if (saved !== null) {
    try { return JSON.parse(saved); } catch {}
  }
  if (userId && localStorage.getItem(getKey('profile', userId))) {
    return [];
  }
  return initialExpenses;
}

export function saveStoredExpenses(expenses: Expense[], userId?: string) {
  const key = getKey('expenses', userId);
  localStorage.setItem(key, JSON.stringify(expenses));
}

export function getStoredPurchases(userId?: string): Purchase[] {
  const key = getKey('purchases', userId);
  const saved = localStorage.getItem(key);
  if (saved !== null) {
    try { return JSON.parse(saved); } catch {}
  }
  if (userId && localStorage.getItem(getKey('profile', userId))) {
    return [];
  }
  return initialPurchases;
}

export function saveStoredPurchases(purchases: Purchase[], userId?: string) {
  const key = getKey('purchases', userId);
  localStorage.setItem(key, JSON.stringify(purchases));
}

export function getStoredCustomers(userId?: string): Customer[] {
  const key = getKey('customers', userId);
  const saved = localStorage.getItem(key);
  if (saved !== null) {
    try { return JSON.parse(saved); } catch {}
  }
  if (userId && localStorage.getItem(getKey('profile', userId))) {
    return [];
  }
  return initialCustomers;
}

export function saveStoredCustomers(customers: Customer[], userId?: string) {
  const key = getKey('customers', userId);
  localStorage.setItem(key, JSON.stringify(customers));
}

export function getStoredSuppliers(userId?: string): Supplier[] {
  const key = getKey('suppliers', userId);
  const saved = localStorage.getItem(key);
  if (saved !== null) {
    try { return JSON.parse(saved); } catch {}
  }
  if (userId && localStorage.getItem(getKey('profile', userId))) {
    return [];
  }
  return initialSuppliers;
}

export function saveStoredSuppliers(suppliers: Supplier[], userId?: string) {
  const key = getKey('suppliers', userId);
  localStorage.setItem(key, JSON.stringify(suppliers));
}

export function getStoredTimeline(userId?: string): TimelineEvent[] {
  const key = getKey('timeline', userId);
  const saved = localStorage.getItem(key);
  if (saved) {
    try { return JSON.parse(saved); } catch {}
  }
  return initialTimelineEvents;
}

export function saveStoredTimeline(events: TimelineEvent[], userId?: string) {
  const key = getKey('timeline', userId);
  localStorage.setItem(key, JSON.stringify(events));
}

export function getStoredNotifications(userId?: string): NotificationItem[] {
  const key = getKey('notifications', userId);
  const saved = localStorage.getItem(key);
  if (saved) {
    try { return JSON.parse(saved); } catch {}
  }
  return initialNotifications;
}

export function saveStoredNotifications(notifs: NotificationItem[], userId?: string) {
  const key = getKey('notifications', userId);
  localStorage.setItem(key, JSON.stringify(notifs));
}

export function getStoredGoals(userId?: string): BusinessGoals {
  const key = getKey('goals', userId);
  const saved = localStorage.getItem(key);
  if (saved) {
    try { return JSON.parse(saved); } catch {}
  }
  return initialGoals;
}

export function saveStoredGoals(goals: BusinessGoals, userId?: string) {
  const key = getKey('goals', userId);
  localStorage.setItem(key, JSON.stringify(goals));
}

export function getStoredProduction(userId?: string): ProductionLog[] {
  const key = getKey('production', userId);
  const saved = localStorage.getItem(key);
  if (saved) {
    try { return JSON.parse(saved); } catch {}
  }
  return initialProductionLogs;
}

export function saveStoredProduction(logs: ProductionLog[], userId?: string) {
  const key = getKey('production', userId);
  localStorage.setItem(key, JSON.stringify(logs));
}

export function getStoredWaste(userId?: string): WasteLog[] {
  const key = getKey('waste', userId);
  const saved = localStorage.getItem(key);
  if (saved) {
    try { return JSON.parse(saved); } catch {}
  }
  return initialWasteLogs;
}

export function saveStoredWaste(logs: WasteLog[], userId?: string) {
  const key = getKey('waste', userId);
  localStorage.setItem(key, JSON.stringify(logs));
}

export function getStoredCustomerReturns(userId?: string): CustomerReturn[] {
  const key = getKey('cust_returns', userId);
  const saved = localStorage.getItem(key);
  if (saved) {
    try { return JSON.parse(saved); } catch {}
  }
  return [];
}

export function saveStoredCustomerReturns(returns: CustomerReturn[], userId?: string) {
  const key = getKey('cust_returns', userId);
  localStorage.setItem(key, JSON.stringify(returns));
}

export function getStoredSupplierReturns(userId?: string): SupplierReturn[] {
  const key = getKey('supp_returns', userId);
  const saved = localStorage.getItem(key);
  if (saved) {
    try { return JSON.parse(saved); } catch {}
  }
  return [];
}

export function saveStoredSupplierReturns(returns: SupplierReturn[], userId?: string) {
  const key = getKey('supp_returns', userId);
  localStorage.setItem(key, JSON.stringify(returns));
}

export function getStoredShifts(userId?: string): CashRegisterShift[] {
  const key = getKey('shifts', userId);
  const saved = localStorage.getItem(key);
  if (saved) {
    try { return JSON.parse(saved); } catch {}
  }
  return [];
}

export function saveStoredShifts(shifts: CashRegisterShift[], userId?: string) {
  const key = getKey('shifts', userId);
  localStorage.setItem(key, JSON.stringify(shifts));
}

export function getStoredOtherIncome(userId?: string): OtherIncome[] {
  const key = getKey('income', userId);
  const saved = localStorage.getItem(key);
  if (saved) {
    try { return JSON.parse(saved); } catch {}
  }
  return [];
}

export function saveStoredOtherIncome(incomes: OtherIncome[], userId?: string) {
  const key = getKey('income', userId);
  localStorage.setItem(key, JSON.stringify(incomes));
}

export function getStoredCashBase(userId?: string): number {
  const key = getKey('cash_start', userId);
  const saved = localStorage.getItem(key);
  if (saved) {
    return Number(saved) || 0;
  }
  return 0;
}

export function saveStoredCashBase(amount: number, userId?: string) {
  const key = getKey('cash_start', userId);
  localStorage.setItem(key, String(amount));
}

export function getStoredArchivedPeriods(userId?: string): ArchivedBusinessPeriod[] {
  const key = getKey('archived_periods', userId);
  const saved = localStorage.getItem(key);
  if (saved !== null) {
    try { return JSON.parse(saved); } catch {}
  }
  return [];
}

export function saveStoredArchivedPeriods(periods: ArchivedBusinessPeriod[], userId?: string) {
  const key = getKey('archived_periods', userId);
  localStorage.setItem(key, JSON.stringify(periods));
}

export const storage = {
  getProfile: getStoredProfile,
  saveProfile: saveStoredProfile,
  getProducts: getStoredProducts,
  saveProducts: saveStoredProducts,
  getSales: getStoredSales,
  saveSales: saveStoredSales,
  getExpenses: getStoredExpenses,
  saveExpenses: saveStoredExpenses,
  getPurchases: getStoredPurchases,
  savePurchases: saveStoredPurchases,
  getCustomers: getStoredCustomers,
  saveCustomers: saveStoredCustomers,
  getSuppliers: getStoredSuppliers,
  saveSuppliers: saveStoredSuppliers,
  getProductionLogs: getStoredProduction,
  saveProductionLogs: saveStoredProduction,
  getWasteLogs: getStoredWaste,
  saveWasteLogs: saveStoredWaste,
  getOtherIncomes: getStoredOtherIncome,
  saveOtherIncomes: saveStoredOtherIncome,
  getCashBase: getStoredCashBase,
  saveCashBase: saveStoredCashBase,
  getArchivedPeriods: getStoredArchivedPeriods,
  saveArchivedPeriods: saveStoredArchivedPeriods,
  clearAll: () => localStorage.clear(),
};

export function userScopedStorage(userId: string) {
  return {
    getProfile: () => getStoredProfile(userId),
    saveProfile: (profile: BusinessProfile) => saveStoredProfile(profile, userId),
    getProducts: () => getStoredProducts(userId),
    saveProducts: (products: Product[]) => saveStoredProducts(products, userId),
    getSales: () => getStoredSales(userId),
    saveSales: (sales: Sale[]) => saveStoredSales(sales, userId),
    getExpenses: () => getStoredExpenses(userId),
    saveExpenses: (expenses: Expense[]) => saveStoredExpenses(expenses, userId),
    getPurchases: () => getStoredPurchases(userId),
    savePurchases: (purchases: Purchase[]) => saveStoredPurchases(purchases, userId),
    getCustomers: () => getStoredCustomers(userId),
    saveCustomers: (customers: Customer[]) => saveStoredCustomers(customers, userId),
    getSuppliers: () => getStoredSuppliers(userId),
    saveSuppliers: (suppliers: Supplier[]) => saveStoredSuppliers(suppliers, userId),
    getProductionLogs: () => getStoredProduction(userId),
    saveProductionLogs: (logs: ProductionLog[]) => saveStoredProduction(logs, userId),
    getWasteLogs: () => getStoredWaste(userId),
    saveWasteLogs: (logs: WasteLog[]) => saveStoredWaste(logs, userId),
    getOtherIncomes: () => getStoredOtherIncome(userId),
    saveOtherIncomes: (incomes: OtherIncome[]) => saveStoredOtherIncome(incomes, userId),
    getCustomerReturns: () => getStoredCustomerReturns(userId),
    saveCustomerReturns: (returns: CustomerReturn[]) => saveStoredCustomerReturns(returns, userId),
    getShifts: () => getStoredShifts(userId),
    saveShifts: (shifts: CashRegisterShift[]) => saveStoredShifts(shifts, userId),
    getArchivedPeriods: () => getStoredArchivedPeriods(userId),
    saveArchivedPeriods: (periods: ArchivedBusinessPeriod[]) => saveStoredArchivedPeriods(periods, userId),
    getCashBase: () => getStoredCashBase(userId),
    saveCashBase: (amount: number) => saveStoredCashBase(amount, userId),
  };
}

