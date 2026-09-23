import { 
  Product, 
  Sale, 
  Purchase, 
  ProductionLog, 
  WasteLog, 
  CustomerReturn, 
  SupplierReturn, 
  PurchaseOrder,
  StaffPermissions 
} from '../types';

export interface ProductHistorySummary {
  hasHistory: boolean;
  salesCount: number;
  unitsSold: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  purchasesCount: number;
  unitsPurchased: number;
  totalPurchaseCost: number;
  productionLogsCount: number;
  unitsProduced: number;
  wasteLogsCount: number;
  unitsWasted: number;
  returnsCount: number;
  unitsReturned: number;
  summaryText: string;
  reasons: string[];
}

interface CheckProductHistoryOptions {
  sales?: Sale[];
  purchases?: Purchase[];
  productionLogs?: ProductionLog[];
  wasteLogs?: WasteLog[];
  customerReturns?: CustomerReturn[];
  supplierReturns?: SupplierReturn[];
  purchaseOrders?: PurchaseOrder[];
}

/**
 * Checks all business transaction records to verify whether a product has any history.
 * Checks sales, invoices, purchases, production batches, waste logs, and returns.
 * Does NOT rely solely on current stock (e.g. 0 units can still have extensive historical sales).
 */
export function checkProductHistory(
  product: Product,
  records: CheckProductHistoryOptions
): ProductHistorySummary {
  const {
    sales = [],
    purchases = [],
    productionLogs = [],
    wasteLogs = [],
    customerReturns = [],
    supplierReturns = [],
    purchaseOrders = []
  } = records;

  let salesCount = 0;
  let unitsSold = 0;
  let totalRevenue = 0;
  let totalCost = 0;

  const targetId = product.id;
  const targetName = product.name?.trim().toLowerCase();
  const targetBarcode = product.barcode?.trim();

  // 1. Check Sales & Invoices
  for (const sale of sales) {
    if (!sale.items || !Array.isArray(sale.items)) continue;
    
    let saleHadProduct = false;
    for (const item of sale.items) {
      const matchId = item.productId === targetId;
      const matchBarcode = Boolean(targetBarcode && item.barcode && item.barcode.trim() === targetBarcode);
      const matchName = Boolean(targetName && item.productName && item.productName.trim().toLowerCase() === targetName);

      if (matchId || matchBarcode || matchName) {
        saleHadProduct = true;
        const qty = Number(item.quantity) || 0;
        const unitPrice = Number(item.sellingPrice ?? item.unitPrice ?? 0);
        const unitCost = Number(item.buyingPrice ?? 0);
        const rev = Number(item.total ?? (unitPrice * qty));
        const cost = unitCost * qty;

        unitsSold += qty;
        totalRevenue += rev;
        totalCost += cost;
      }
    }

    if (saleHadProduct) {
      salesCount++;
    }
  }

  const totalProfit = totalRevenue - totalCost;

  // 2. Check Inventory Purchases
  let purchasesCount = 0;
  let unitsPurchased = 0;
  let totalPurchaseCost = 0;

  for (const p of purchases) {
    const matchId = p.productId === targetId;
    const matchName = Boolean(targetName && p.productName && p.productName.trim().toLowerCase() === targetName);

    if (matchId || matchName) {
      purchasesCount++;
      const qty = Number(p.quantity) || 0;
      unitsPurchased += qty;
      totalPurchaseCost += Number(p.totalCost ?? (p.costPerUnit * qty) ?? 0);
    }
  }

  // 3. Check Production Logs
  let productionLogsCount = 0;
  let unitsProduced = 0;

  for (const pl of productionLogs) {
    const matchId = pl.productId === targetId;
    const matchName = Boolean(targetName && pl.productName && pl.productName.trim().toLowerCase() === targetName);

    if (matchId || matchName) {
      productionLogsCount++;
      unitsProduced += Number(pl.quantityProduced) || 0;
    }
  }

  // 4. Check Waste Logs
  let wasteLogsCount = 0;
  let unitsWasted = 0;

  for (const wl of wasteLogs) {
    const matchId = wl.productId === targetId;
    const matchName = Boolean(targetName && wl.productName && wl.productName.trim().toLowerCase() === targetName);

    if (matchId || matchName) {
      wasteLogsCount++;
      unitsWasted += Number(wl.quantityWasted) || 0;
    }
  }

  // 5. Check Customer Returns
  let returnsCount = 0;
  let unitsReturned = 0;

  for (const cr of customerReturns) {
    const matchId = cr.productId === targetId;
    const matchName = Boolean(targetName && cr.productName && cr.productName.trim().toLowerCase() === targetName);

    if (matchId || matchName) {
      returnsCount++;
      unitsReturned += Number(cr.quantity) || 0;
    }
  }

  // 6. Check Supplier Returns
  for (const sr of supplierReturns) {
    const matchId = sr.productId === targetId;
    const matchName = Boolean(targetName && sr.productName && sr.productName.trim().toLowerCase() === targetName);

    if (matchId || matchName) {
      returnsCount++;
      unitsReturned += Number(sr.quantity) || 0;
    }
  }

  // 7. Check Purchase Orders
  for (const po of purchaseOrders) {
    if (!po.items || !Array.isArray(po.items)) continue;
    for (const itm of po.items) {
      if (itm.productId === targetId || (targetName && itm.productName && itm.productName.trim().toLowerCase() === targetName)) {
        purchasesCount++;
      }
    }
  }

  const reasons: string[] = [];
  if (salesCount > 0) reasons.push(`${salesCount} sales (${unitsSold} units)`);
  if (purchasesCount > 0) reasons.push(`${purchasesCount} purchase orders`);
  if (productionLogsCount > 0) reasons.push(`${productionLogsCount} production batches`);
  if (wasteLogsCount > 0) reasons.push(`${wasteLogsCount} waste records`);
  if (returnsCount > 0) reasons.push(`${returnsCount} return entries`);

  const hasHistory = reasons.length > 0;
  const summaryText = hasHistory
    ? reasons.join(', ')
    : 'No transaction history';

  return {
    hasHistory,
    salesCount,
    unitsSold,
    totalRevenue,
    totalCost,
    totalProfit,
    purchasesCount,
    unitsPurchased,
    totalPurchaseCost,
    productionLogsCount,
    unitsProduced,
    wasteLogsCount,
    unitsWasted,
    returnsCount,
    unitsReturned,
    summaryText,
    reasons
  };
}

/**
 * Validates whether the active user role and permissions allow archiving a product.
 */
export function canUserArchiveProduct(
  userRole: 'Owner' | 'Manager' | 'Cashier' | string = 'Owner',
  permissions?: StaffPermissions
): boolean {
  if (userRole === 'Owner') return true;
  if (userRole === 'Manager') {
    return permissions?.canArchiveProducts ?? permissions?.editProducts ?? true;
  }
  return permissions?.canArchiveProducts ?? false;
}

/**
 * Validates whether the active user role and permissions allow restoring an archived product.
 */
export function canUserRestoreProduct(
  userRole: 'Owner' | 'Manager' | 'Cashier' | string = 'Owner',
  permissions?: StaffPermissions
): boolean {
  if (userRole === 'Owner') return true;
  if (userRole === 'Manager') {
    return permissions?.canRestoreProducts ?? permissions?.editProducts ?? true;
  }
  return permissions?.canRestoreProducts ?? false;
}

/**
 * Validates whether the active user role and permissions allow permanently deleting an un-used product.
 * NOTE: Cashiers can NEVER permanently delete products.
 */
export function canUserPermanentlyDeleteProduct(
  userRole: 'Owner' | 'Manager' | 'Cashier' | string = 'Owner',
  permissions?: StaffPermissions
): boolean {
  if (userRole === 'Owner') return true;
  if (userRole === 'Manager') {
    return permissions?.canDeleteProducts ?? false;
  }
  return false;
}
