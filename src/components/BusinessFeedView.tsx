import React, { useState, useEffect, useMemo } from 'react';
import { 
  Product, 
  Sale, 
  Expense, 
  Purchase, 
  Customer, 
  Supplier, 
  ProductionLog, 
  WasteLog, 
  CurrencyCode,
  BusinessActivityLogEntry,
  OtherIncome,
  CustomerReturn
} from '../types';
import { formatCurrency } from '../utils/calculations';
import { 
  Share2, 
  Clock, 
  CheckCircle2, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle, 
  Package, 
  Users, 
  DollarSign, 
  RefreshCw, 
  Wifi, 
  Sparkles,
  ShoppingBag,
  Filter,
  Check,
  MoreVertical,
  Trash2,
  Eye,
  X
} from 'lucide-react';
import { subscribeToBusinessActivityLog } from '../firebase';
import { DeleteMistakenRecordModal, RecordCorrectionDetail } from './DeleteMistakenRecordModal';
import { ActivityDetailsModal } from './ActivityDetailsModal';

export interface DisplayFeedItem {
  id: string;
  type: 'sale' | 'waste' | 'expense' | 'debt' | 'production' | 'purchase';
  title: string;
  subtitle?: string;
  amount?: number;
  amountFormatted?: string;
  amountClass?: string;
  quantity?: number;
  customerName?: string;
  timestamp: string;
  relativeTime: string;
  relatedId?: string;
  isVoided?: boolean;
  isDbLog?: boolean;
}

export interface BusinessFeedViewProps {
  workspaceId: string;
  businessName: string;
  currency: CurrencyCode;
  products: Product[];
  sales: Sale[];
  expenses: Expense[];
  purchases: Purchase[];
  customers: Customer[];
  suppliers: Supplier[];
  productionLogs: ProductionLog[];
  wasteLogs: WasteLog[];
  otherIncomes?: OtherIncome[];
  returns?: CustomerReturn[];
  currentPeriodStartedAt?: string;
  onDeleteRecord?: (params: {
    recordType: 'sale' | 'expense' | 'purchase' | 'customer_payment' | 'waste' | 'return' | 'production' | 'income' | 'customer' | 'supplier' | 'activity_only';
    recordId: string;
    activityLogId?: string;
    extraInfo?: any;
  }) => Promise<{ success: boolean; message: string; error?: string }>;
}

// Relative time calculation helper
function getRelativeTimeString(dateString: string): string {
  if (!dateString) return 'recently';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'recently';
  
  const now = new Date();
  const diffInSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

  if (diffInSeconds < 45) return 'just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} min${diffInMinutes === 1 ? '' : 's'} ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return 'yesterday';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export const BusinessFeedView: React.FC<BusinessFeedViewProps> = ({
  workspaceId,
  businessName,
  currency,
  products,
  sales,
  expenses,
  purchases,
  customers,
  suppliers,
  productionLogs,
  wasteLogs,
  otherIncomes = [],
  returns = [],
  currentPeriodStartedAt,
  onDeleteRecord,
}) => {
  const [liveDbLogs, setLiveDbLogs] = useState<BusinessActivityLogEntry[]>([]);
  const [isListenerActive, setIsListenerActive] = useState<boolean>(false);
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<Date>(new Date());
  const [activeFilter, setActiveFilter] = useState<'all' | 'sale' | 'waste' | 'expense' | 'debt'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [, setTicker] = useState<number>(0);

  // Modal & Menu states for Deleting Mistaken Records and Viewing Details
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [itemForDetails, setItemForDetails] = useState<DisplayFeedItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<DisplayFeedItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Re-calculate relative timestamps every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTicker((prev) => prev + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // 1. DATA ISOLATION & REAL-TIME LISTENER:
  // Subscribe to live Firestore activity_log subcollection filtered strictly by workspaceId
  useEffect(() => {
    if (!workspaceId) {
      setIsListenerActive(false);
      return;
    }

    setIsListenerActive(true);
    const unsubscribe = subscribeToBusinessActivityLog(
      workspaceId,
      (entries) => {
        setLiveDbLogs(entries);
        setLastSyncTimestamp(new Date());
        setIsListenerActive(true);
      },
      () => {
        setIsListenerActive(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [workspaceId]);

  // 2. DYNAMIC DAILY SUMMARY METRICS:
  // Strictly records created between 00:00:00 and 23:59:59 today
  const dailyMetrics = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const isCreatedToday = (dateStr?: string) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return !isNaN(d.getTime()) && d >= startOfToday && d <= endOfToday;
    };

    // A. Total Items Made / Produced
    const todayProduction = productionLogs.filter((p) => isCreatedToday(p.date));
    const totalItemsMade = todayProduction.reduce((acc, p) => acc + (Number(p.quantityProduced) || 0), 0);

    // B. Total Items Sold
    const todaySales = sales.filter((s) => isCreatedToday(s.date));
    const totalItemsSold = todaySales.reduce((acc, s) => {
      const itemsCount = s.items?.reduce((iAcc, item) => iAcc + (Number(item.quantity) || 0), 0) || 0;
      return acc + itemsCount;
    }, 0);

    // C. Items Wasted / Damaged
    const todayWaste = wasteLogs.filter((w) => isCreatedToday(w.date));
    const totalItemsWasted = todayWaste.reduce((acc, w) => acc + (Number(w.quantityWasted) || 0), 0);

    // D. Total Sales Revenue
    const totalSalesRevenue = todaySales.reduce((acc, s) => acc + (Number(s.totalAmount) || 0), 0);

    // E. Total Expenses
    const todayExpenses = expenses.filter((e) => isCreatedToday(e.date));
    const totalExpenses = todayExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

    // F. Cost of Wasted Items
    const costOfWastedItems = todayWaste.reduce((acc, w) => {
      if (w.estimatedLoss != null && !isNaN(Number(w.estimatedLoss))) {
        return acc + Number(w.estimatedLoss);
      }
      if (w.totalLoss != null && !isNaN(Number(w.totalLoss))) {
        return acc + Number(w.totalLoss);
      }
      const prod = products.find((p) => p.id === w.productId || p.name.toLowerCase() === w.productName.toLowerCase());
      const cost = prod?.costPrice || 0;
      return acc + cost * (Number(w.quantityWasted) || 0);
    }, 0);

    // G. Calculated Net Profit: (Total Sales - Total Expenses - Cost of Wasted Items)
    const netProfit = totalSalesRevenue - totalExpenses - costOfWastedItems;

    // H. Outstanding Customer Debts
    const debtors = customers.filter((c) => (c.amountOwed || 0) > 0);
    const totalOutstandingDebt = debtors.reduce((acc, c) => acc + (Number(c.amountOwed) || 0), 0);

    return {
      totalItemsMade,
      totalItemsSold,
      totalItemsWasted,
      totalSalesRevenue,
      totalExpenses,
      costOfWastedItems,
      netProfit,
      totalOutstandingDebt,
      debtorCount: debtors.length,
      todaySalesCount: todaySales.length,
    };
  }, [sales, expenses, wasteLogs, productionLogs, products, customers]);

  // 3. COMPILE REAL-TIME ACTIVITY FEED:
  // Merge live database events with workspace transaction records to ensure 100% complete chronological coverage
  const feedItems = useMemo<DisplayFeedItem[]>(() => {
    const itemsMap = new Map<string, DisplayFeedItem>();
    const seenRelatedIds = new Set<string>();

    // Add Live Database entries from Firestore that belong to the active business period
    liveDbLogs.forEach((log) => {
      if (currentPeriodStartedAt && log.timestamp) {
        const logTime = new Date(log.timestamp).getTime();
        const startTime = new Date(currentPeriodStartedAt).getTime();
        if (!isNaN(logTime) && !isNaN(startTime) && logTime < startTime) {
          return; // Skip logs from previous business period
        }
      }

      if (log.relatedId) {
        seenRelatedIds.add(log.relatedId);
      }

      let amountClass = 'text-slate-700';
      let amountFormatted: string | undefined;

      if (log.amount != null && log.amount > 0) {
        if (log.type === 'sale') {
          amountFormatted = `+${formatCurrency(log.amount, currency)}`;
          amountClass = 'text-emerald-600 font-extrabold';
        } else if (log.type === 'waste') {
          amountFormatted = `-${formatCurrency(log.amount, currency)}`;
          amountClass = 'text-amber-600 font-extrabold';
        } else if (log.type === 'expense') {
          amountFormatted = `-${formatCurrency(log.amount, currency)}`;
          amountClass = 'text-rose-600 font-extrabold';
        } else if (log.type === 'debt') {
          amountFormatted = `+${formatCurrency(log.amount, currency)}`;
          amountClass = 'text-indigo-600 font-extrabold';
        } else {
          amountFormatted = formatCurrency(log.amount, currency);
        }
      }

      itemsMap.set(log.id, {
        id: log.id,
        type: log.type,
        title: log.title,
        subtitle: log.subtitle,
        amount: log.amount,
        amountFormatted,
        amountClass,
        quantity: log.quantity,
        customerName: log.customerName,
        timestamp: log.timestamp,
        relativeTime: getRelativeTimeString(log.timestamp),
        relatedId: log.relatedId,
        isVoided: log.isVoided || log.title?.toLowerCase().includes('[voided]'),
        isDbLog: true,
      });
    });

    // Also include transactions from local/synced state (deduplicating by transaction ID)
    sales.forEach((s) => {
      if (seenRelatedIds.has(s.id)) return;
      const id = `sale_${s.id}`;
      if (!itemsMap.has(id)) {
        const productSummary = s.items?.map((i) => `${i.quantity} ${i.productName}`).join(', ') || 'goods';
        const customer = s.customerName || 'Customer';
        itemsMap.set(id, {
          id,
          type: 'sale',
          title: `Sold ${productSummary} to ${customer} (+${formatCurrency(s.totalAmount, currency)})`,
          subtitle: `Payment: ${s.paymentMethod} • Invoice #${s.invoiceNumber}`,
          amount: s.totalAmount,
          amountFormatted: `+${formatCurrency(s.totalAmount, currency)}`,
          amountClass: 'text-emerald-600 font-extrabold',
          customerName: customer,
          timestamp: s.date,
          relativeTime: getRelativeTimeString(s.date),
          relatedId: s.id,
          isVoided: s.isVoided,
        });
      }
    });

    wasteLogs.forEach((w) => {
      if (seenRelatedIds.has(w.id)) return;
      const id = `waste_${w.id}`;
      if (!itemsMap.has(id)) {
        const loss = w.estimatedLoss || w.totalLoss || 0;
        itemsMap.set(id, {
          id,
          type: 'waste',
          title: `Logged ${w.quantityWasted} wasted ${w.productName} (-${formatCurrency(loss, currency)})`,
          subtitle: `Reason: ${w.reason} • Stock adjusted`,
          amount: loss,
          amountFormatted: `-${formatCurrency(loss, currency)}`,
          amountClass: 'text-amber-600 font-extrabold',
          timestamp: w.date,
          relativeTime: getRelativeTimeString(w.date),
          relatedId: w.id,
        });
      }
    });

    expenses.forEach((e) => {
      if (seenRelatedIds.has(e.id)) return;
      const id = `exp_${e.id}`;
      if (!itemsMap.has(id)) {
        itemsMap.set(id, {
          id,
          type: 'expense',
          title: `Added ${e.category} expense (-${formatCurrency(e.amount, currency)})`,
          subtitle: e.notes || 'Operating business expense',
          amount: e.amount,
          amountFormatted: `-${formatCurrency(e.amount, currency)}`,
          amountClass: 'text-rose-600 font-extrabold',
          timestamp: e.date,
          relativeTime: getRelativeTimeString(e.date),
          relatedId: e.id,
        });
      }
    });

    productionLogs.forEach((pr) => {
      if (seenRelatedIds.has(pr.id)) return;
      const id = `prod_${pr.id}`;
      if (!itemsMap.has(id)) {
        itemsMap.set(id, {
          id,
          type: 'production',
          title: `Produced ${pr.quantityProduced} ${pr.productName}`,
          subtitle: pr.notes || 'Batch completed & stocked',
          quantity: pr.quantityProduced,
          amountFormatted: `+${pr.quantityProduced} units`,
          amountClass: 'text-blue-600 font-bold',
          timestamp: pr.date,
          relativeTime: getRelativeTimeString(pr.date),
          relatedId: pr.id,
        });
      }
    });

    purchases.forEach((pu) => {
      if (seenRelatedIds.has(pu.id)) return;
      const id = `purch_${pu.id}`;
      if (!itemsMap.has(id)) {
        itemsMap.set(id, {
          id,
          type: 'purchase',
          title: `Restocked ${pu.quantity} ${pu.productName} from ${pu.supplierName}`,
          subtitle: `Status: ${pu.paymentStatus === 'PAID' ? 'Paid' : 'Pay Later'}`,
          amount: pu.totalCost,
          amountFormatted: `-${formatCurrency(pu.totalCost, currency)}`,
          amountClass: 'text-slate-600 font-semibold',
          timestamp: pu.date,
          relativeTime: getRelativeTimeString(pu.date),
          relatedId: pu.id,
        });
      }
    });

    otherIncomes.forEach((inc) => {
      if (seenRelatedIds.has(inc.id)) return;
      const id = `inc_${inc.id}`;
      if (!itemsMap.has(id)) {
        itemsMap.set(id, {
          id,
          type: 'debt',
          title: inc.description || `Customer debt payment received (+${formatCurrency(inc.amount, currency)})`,
          subtitle: `Source: ${inc.source} • Recorded income`,
          amount: inc.amount,
          amountFormatted: `+${formatCurrency(inc.amount, currency)}`,
          amountClass: 'text-indigo-600 font-extrabold',
          timestamp: inc.date,
          relativeTime: getRelativeTimeString(inc.date),
          relatedId: inc.id,
        });
      }
    });

    returns.forEach((ret) => {
      if (seenRelatedIds.has(ret.id)) return;
      const id = `ret_${ret.id}`;
      if (!itemsMap.has(id)) {
        itemsMap.set(id, {
          id,
          type: 'sale',
          title: `Customer Return: ${ret.quantity} ${ret.productName} (-${formatCurrency(ret.refundAmount, currency)})`,
          subtitle: `Reason: ${ret.reason} • ${ret.restocked ? 'Restocked' : 'Damaged'}`,
          amount: ret.refundAmount,
          amountFormatted: `-${formatCurrency(ret.refundAmount, currency)}`,
          amountClass: 'text-amber-600 font-extrabold',
          customerName: ret.customerName,
          timestamp: ret.date,
          relativeTime: getRelativeTimeString(ret.date),
          relatedId: ret.id,
        });
      }
    });

    // Convert map to array and sort chronologically (newest first)
    return Array.from(itemsMap.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [liveDbLogs, sales, wasteLogs, expenses, productionLogs, purchases, otherIncomes, returns, currency, currentPeriodStartedAt]);

  const getUnderlyingRecord = (item: DisplayFeedItem) => {
    if (item.type === 'sale') {
      let sale = sales.find((s) => s.id === item.relatedId);
      if (!sale && item.id.startsWith('sale_')) {
        const sId = item.id.replace('sale_', '');
        sale = sales.find((s) => s.id === sId);
      }
      if (!sale && item.amount) {
        sale = sales.find((s) => Math.abs(s.totalAmount - (item.amount || 0)) < 0.01);
      }
      return { type: 'sale' as const, record: sale };
    }

    if (item.type === 'expense') {
      let exp = expenses.find((e) => e.id === item.relatedId);
      if (!exp && item.id.startsWith('exp_')) {
        const eId = item.id.replace('exp_', '');
        exp = expenses.find((e) => e.id === eId);
      }
      if (!exp && item.amount) {
        exp = expenses.find((e) => Math.abs(e.amount - (item.amount || 0)) < 0.01);
      }
      return { type: 'expense' as const, record: exp };
    }

    if (item.type === 'purchase') {
      let purch = purchases.find((p) => p.id === item.relatedId);
      if (!purch && item.id.startsWith('purch_')) {
        const pId = item.id.replace('purch_', '');
        purch = purchases.find((p) => p.id === pId);
      }
      if (!purch && item.amount) {
        purch = purchases.find((p) => Math.abs(p.totalCost - (item.amount || 0)) < 0.01);
      }
      return { type: 'purchase' as const, record: purch };
    }

    if (item.type === 'waste') {
      let waste = wasteLogs.find((w) => w.id === item.relatedId);
      if (!waste && item.id.startsWith('waste_')) {
        const wId = item.id.replace('waste_', '');
        waste = wasteLogs.find((w) => w.id === wId);
      }
      if (!waste && item.quantity) {
        waste = wasteLogs.find((w) => w.quantityWasted === item.quantity);
      }
      return { type: 'waste' as const, record: waste };
    }

    if (item.type === 'debt') {
      let inc = otherIncomes.find((i) => i.id === item.relatedId);
      if (!inc && item.amount) {
        inc = otherIncomes.find((i) => Math.abs(i.amount - (item.amount || 0)) < 0.01);
      }
      return { type: 'customer_payment' as const, record: inc };
    }

    if (item.type === 'production') {
      let prod = productionLogs.find((p) => p.id === item.relatedId);
      if (!prod && item.id.startsWith('prod_')) {
        const pId = item.id.replace('prod_', '');
        prod = productionLogs.find((p) => p.id === pId);
      }
      return { type: 'production' as const, record: prod };
    }

    return { type: 'activity_only' as const, record: null };
  };

  const getCorrections = (item: DisplayFeedItem, underlying: ReturnType<typeof getUnderlyingRecord>): RecordCorrectionDetail[] => {
    const details: RecordCorrectionDetail[] = [];
    if (item.type === 'sale') {
      const sale = underlying.record as Sale | undefined;
      const amt = sale?.totalAmount ?? item.amount ?? 0;
      details.push({
        label: 'Sales Revenue',
        effect: `Deducts -${formatCurrency(amt, currency)} from total sales and recalculates profit`,
      });
      if (sale?.items && sale.items.length > 0) {
        const itemsList = sale.items.map((i) => `+${i.quantity} ${i.productName}`).join(', ');
        details.push({
          label: 'Inventory Restored',
          effect: `Restores ${itemsList} back to available stock`,
        });
      } else if (item.quantity) {
        details.push({
          label: 'Inventory Restored',
          effect: `Restores +${item.quantity} units back to stock`,
        });
      }
      if (sale?.paymentMethod === 'Credit') {
        details.push({
          label: 'Customer Balance',
          effect: `Reduces outstanding balance for ${sale.customerName || 'customer'} by -${formatCurrency(amt, currency)}`,
        });
      }
    } else if (item.type === 'expense') {
      const exp = underlying.record as Expense | undefined;
      const amt = exp?.amount ?? item.amount ?? 0;
      details.push({
        label: 'Operating Expenses',
        effect: `Removes -${formatCurrency(amt, currency)} from recorded expenses`,
      });
      details.push({
        label: 'Net Profit Recalculation',
        effect: `Increases today's calculated net profit by +${formatCurrency(amt, currency)}`,
      });
    } else if (item.type === 'purchase') {
      const purch = underlying.record as Purchase | undefined;
      const qty = purch?.quantity ?? item.quantity ?? 1;
      const name = purch?.productName || 'product';
      const cost = purch?.totalCost ?? item.amount ?? 0;
      details.push({
        label: 'Stock Deduction',
        effect: `Deducts -${qty} ${name} from stock (reverses restock)`,
        isWarning: true,
      });
      if (purch?.paymentStatus === 'PAY_LATER') {
        details.push({
          label: 'Supplier Debt',
          effect: `Reduces payable debt to ${purch.supplierName} by -${formatCurrency(cost, currency)}`,
        });
      }
    } else if (item.type === 'waste') {
      const waste = underlying.record as WasteLog | undefined;
      const qty = waste?.quantityWasted ?? item.quantity ?? 1;
      const name = waste?.productName || 'product';
      const loss = waste?.estimatedLoss || waste?.totalLoss || item.amount || 0;
      details.push({
        label: 'Stock Restored',
        effect: `Restores +${qty} ${name} back to inventory`,
      });
      if (loss > 0) {
        details.push({
          label: 'Waste Loss Reversal',
          effect: `Reverses -${formatCurrency(loss, currency)} loss from profit calculation`,
        });
      }
    } else if (item.type === 'debt') {
      const amt = item.amount || 0;
      details.push({
        label: 'Customer Debt',
        effect: `Restores outstanding customer debt by +${formatCurrency(amt, currency)} (reverses payment)`,
        isWarning: true,
      });
    } else if (item.type === 'production') {
      const qty = item.quantity || 1;
      details.push({
        label: 'Stock Level',
        effect: `Deducts -${qty} produced units from inventory`,
        isWarning: true,
      });
    } else {
      details.push({
        label: 'Activity Feed',
        effect: 'Removes entry from the business activity feed',
      });
    }
    return details;
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete || !onDeleteRecord) return;
    setIsDeleting(true);
    try {
      const underlying = getUnderlyingRecord(itemToDelete);
      let recordId = itemToDelete.relatedId || itemToDelete.id;
      if (underlying.record && 'id' in underlying.record) {
        recordId = (underlying.record as any).id;
      }

      let extraInfo: any = {};
      if (underlying.type === 'customer_payment') {
        const cust = customers.find((c) => c.name === itemToDelete.customerName);
        extraInfo = {
          customerId: cust?.id,
          amount: itemToDelete.amount,
        };
      } else if (underlying.type === 'expense' && underlying.record) {
        const exp = underlying.record as Expense;
        const supp = suppliers.find((s) => exp.notes?.includes(s.name));
        if (supp) extraInfo.supplierId = supp.id;
      }

      const res = await onDeleteRecord({
        recordType: underlying.type,
        recordId,
        activityLogId: itemToDelete.id.startsWith('sale_') || itemToDelete.id.startsWith('exp_') || itemToDelete.id.startsWith('purch_') || itemToDelete.id.startsWith('waste_') || itemToDelete.id.startsWith('prod_') || itemToDelete.id.startsWith('inc_') || itemToDelete.id.startsWith('ret_')
          ? undefined
          : itemToDelete.id,
        extraInfo,
      });

      if (res.success) {
        setToastMessage(res.message || 'Record deleted successfully. Your business totals have been corrected.');
        setItemToDelete(null);
        setItemForDetails(null);
        setActiveMenuId(null);
        setTimeout(() => setToastMessage(null), 5000);
      } else {
        alert(res.error || 'Could not safely delete this record.');
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to delete record.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter feed items based on user selection
  const filteredFeedItems = useMemo(() => {
    if (activeFilter === 'all') return feedItems;
    return feedItems.filter((item) => item.type === activeFilter);
  }, [feedItems, activeFilter]);

  // 4. "SHARE DAILY SUMMARY" FEATURE:
  // Formats today's summary into a clean text snippet for WhatsApp/SMS:
  // "📊 [Business Name] Daily Summary - [Today's Date]\n"
  // "• Made: X | Sold: Y | Wasted: Z\n"
  // "• Revenue: [Sales] RWF\n"
  // "• Profit: [Profit] RWF\n"
  // "• Pending Debts: [Debts] RWF"
  const handleShareDailySummary = async () => {
    const todayStr = new Date().toLocaleDateString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    const summaryText = 
      `📊 ${businessName || 'SmartLedger'} Daily Summary - ${todayStr}\n` +
      `• Made: ${dailyMetrics.totalItemsMade} | Sold: ${dailyMetrics.totalItemsSold} | Wasted: ${dailyMetrics.totalItemsWasted}\n` +
      `• Revenue: ${formatCurrency(dailyMetrics.totalSalesRevenue, currency)}\n` +
      `• Profit: ${formatCurrency(dailyMetrics.netProfit, currency)}\n` +
      `• Pending Debts: ${formatCurrency(dailyMetrics.totalOutstandingDebt, currency)}`;

    let shared = false;

    // Trigger native share sheet if supported on device
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${businessName} Daily Summary`,
          text: summaryText,
        });
        shared = true;
        showToast('Daily summary shared successfully!');
      } catch (err: any) {
        // Fallback to clipboard if share was cancelled or unavailable
        if (err.name !== 'AbortError') {
          console.log('Native share error, falling back to copy:', err);
        }
      }
    }

    if (!shared) {
      try {
        await navigator.clipboard.writeText(summaryText);
        showToast('Daily summary copied to clipboard! Ready to share via WhatsApp or SMS.');
      } catch {
        // Fallback for clipboard API restrictions
        showToast('Summary generated! Ready to share.');
      }
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  return (
    <div id="smartledger-business-feed-view" className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div 
          id="feed-toast-notification"
          className="fixed top-5 right-5 z-50 max-w-sm bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-top-3 duration-200"
        >
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
            <Check className="w-4 h-4" />
          </div>
          <p className="text-xs font-medium leading-tight">{toastMessage}</p>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-bold font-['Outfit',sans-serif] text-slate-900 tracking-tight">
              Business Feed & Daily Summary
            </h2>
            {isListenerActive ? (
              <span 
                id="live-feed-status-badge"
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                title={`Connected to Firestore workspace ${workspaceId}`}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Live Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                <Wifi className="w-3 h-3" />
                Live Sync Ready
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time activity stream & today's dynamic performance metrics
          </p>
        </div>

        {/* Share Daily Summary Action Button */}
        <button
          id="share-daily-summary-btn"
          onClick={handleShareDailySummary}
          className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer select-none"
        >
          <Share2 className="w-4 h-4" />
          <span>[Share Daily Summary]</span>
        </button>
      </div>

      {/* DYNAMIC DAILY SUMMARY METRICS CARD */}
      <div 
        id="end-of-day-summary-card"
        className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
          <div>
            <h3 className="text-base font-bold font-['Outfit',sans-serif] text-slate-900">
              Today's Live Ledger &mdash; {businessName || 'Business'}
            </h3>
            <p className="text-xs text-slate-500">
              Dynamic stats from records created between 00:00:00 and 23:59:59 today
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              📅 {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Primary 4-Metric Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Total Items Made / Produced */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="font-semibold">🥖 Total Made / Produced:</span>
              <Package className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div>
              <span className="text-xl font-extrabold text-slate-900">
                {dailyMetrics.totalItemsMade.toLocaleString()}
              </span>
              <span className="text-[11px] text-slate-400 ml-1">units</span>
            </div>
          </div>

          {/* Total Items Sold */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="font-semibold">🥐 Total Items Sold:</span>
              <ShoppingBag className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div>
              <span className="text-xl font-extrabold text-emerald-700">
                {dailyMetrics.totalItemsSold.toLocaleString()}
              </span>
              <span className="text-[11px] text-slate-400 ml-1">units</span>
            </div>
          </div>

          {/* Items Wasted / Damaged */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="font-semibold">⚠️ Wasted / Damaged:</span>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div>
              <span className="text-xl font-extrabold text-amber-700">
                {dailyMetrics.totalItemsWasted.toLocaleString()}
              </span>
              <span className="text-[11px] text-slate-400 ml-1">units</span>
            </div>
          </div>

          {/* Calculated Net Profit */}
          <div className={`p-3.5 rounded-xl border flex flex-col justify-between ${
            dailyMetrics.netProfit >= 0
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
              : 'bg-rose-50/80 border-rose-200 text-rose-900'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-[11px] uppercase tracking-wider">
                {dailyMetrics.netProfit >= 0 ? '🟢 Net Profit Today:' : '🔴 Net Loss Today:'}
              </span>
              {dailyMetrics.netProfit >= 0 ? (
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-rose-600" />
              )}
            </div>
            <div>
              <span className="text-xl font-black">
                {formatCurrency(dailyMetrics.netProfit, currency)}
              </span>
              <p className="text-[10px] opacity-75 mt-0.5">
                Sales − Expenses − Waste Loss
              </p>
            </div>
          </div>
        </div>

        {/* Secondary Financial Breakdown Row */}
        <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 text-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-700">
            <div>
              <span className="text-slate-500 font-medium">💰 Total Sales: </span>
              <span className="font-extrabold text-slate-900">
                {formatCurrency(dailyMetrics.totalSalesRevenue, currency)}
              </span>
            </div>
            <span className="text-slate-300 hidden sm:inline">&bull;</span>
            <div>
              <span className="text-slate-500 font-medium">💸 Total Expenses: </span>
              <span className="font-extrabold text-rose-600">
                {formatCurrency(dailyMetrics.totalExpenses, currency)}
              </span>
            </div>
            <span className="text-slate-300 hidden sm:inline">&bull;</span>
            <div>
              <span className="text-slate-500 font-medium">⚠️ Waste Loss: </span>
              <span className="font-extrabold text-amber-600">
                {formatCurrency(dailyMetrics.costOfWastedItems, currency)}
              </span>
            </div>
          </div>

          <div className="border-t md:border-t-0 pt-2 md:pt-0 border-slate-200">
            <span className="text-amber-800 font-bold flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
              <span>
                Outstanding Customer Debts ({dailyMetrics.debtorCount}):{' '}
                <span className="underline font-extrabold">
                  {formatCurrency(dailyMetrics.totalOutstandingDebt, currency)}
                </span>
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* REAL-TIME ACTIVITY FEED TIMELINE */}
      <div className="p-5 sm:p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <span>Live Activity Feed</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                {filteredFeedItems.length} {filteredFeedItems.length === 1 ? 'event' : 'events'}
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Chronological log with relative timestamps
            </p>
          </div>

          {/* Activity Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveFilter('sale')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                activeFilter === 'sale'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Sales 🟢
            </button>
            <button
              onClick={() => setActiveFilter('waste')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                activeFilter === 'waste'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Waste ⚠️
            </button>
            <button
              onClick={() => setActiveFilter('expense')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                activeFilter === 'expense'
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Expenses 🔴
            </button>
            <button
              onClick={() => setActiveFilter('debt')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                activeFilter === 'debt'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Debts 👤
            </button>
          </div>
        </div>

        {/* Chronological Event Stream */}
        {filteredFeedItems.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <Clock className="w-10 h-10 mx-auto text-slate-300 stroke-[1.5]" />
            <p className="text-sm font-semibold text-slate-600">No activity logged yet</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Transactions, waste reports, debt repayments, and expenses will stream here in real time.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredFeedItems.map((item) => {
              // Icon and color badge per event archetype
              let iconBadge = '🟢';
              let badgeBg = 'bg-emerald-50 text-emerald-700 border-emerald-200';

              if (item.type === 'waste') {
                iconBadge = '⚠️';
                badgeBg = 'bg-amber-50 text-amber-700 border-amber-200';
              } else if (item.type === 'expense') {
                iconBadge = '🔴';
                badgeBg = 'bg-rose-50 text-rose-700 border-rose-200';
              } else if (item.type === 'debt') {
                iconBadge = '👤';
                badgeBg = 'bg-indigo-50 text-indigo-700 border-indigo-200';
              } else if (item.type === 'production') {
                iconBadge = '🥖';
                badgeBg = 'bg-blue-50 text-blue-700 border-blue-200';
              } else if (item.type === 'purchase') {
                iconBadge = '📦';
                badgeBg = 'bg-slate-100 text-slate-700 border-slate-200';
              }

              return (
                <div 
                  key={item.id} 
                  onClick={() => setItemForDetails(item)}
                  className={`py-3 flex items-center justify-between gap-3 px-3 rounded-xl transition-all cursor-pointer group ${
                    item.isVoided 
                      ? 'bg-slate-50/50 opacity-60 border border-dashed border-slate-200' 
                      : 'hover:bg-slate-50/80'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span 
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0 border ${badgeBg}`}
                    >
                      {iconBadge}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-xs font-bold truncate ${item.isVoided ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                          {item.title}
                        </p>
                        {item.isVoided && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-amber-100 text-amber-800 shrink-0">
                            Corrected / Voided
                          </span>
                        )}
                      </div>
                      {item.subtitle && (
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    <div className="text-right">
                      {item.amountFormatted && (
                        <span className={`text-xs block ${item.isVoided ? 'text-slate-400 line-through' : item.amountClass}`}>
                          {item.amountFormatted}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 block mt-0.5" title={item.timestamp}>
                        {item.relativeTime}
                      </span>
                    </div>

                    {/* 3-Dot Action Menu Button */}
                    <div className="relative">
                      <button
                        type="button"
                        id={`feed-item-menu-${item.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === item.id ? null : item.id);
                        }}
                        className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 flex items-center justify-center transition-colors cursor-pointer"
                        aria-label="Transaction options"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {/* Popover Action Menu */}
                      {activeMenuId === item.id && (
                        <>
                          <div 
                            className="fixed inset-0 z-30" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(null);
                            }} 
                          />
                          <div 
                            className="absolute right-0 top-9 z-40 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1 text-xs animate-in fade-in zoom-in-95 duration-150"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              id={`feed-menu-details-${item.id}`}
                              onClick={() => {
                                setActiveMenuId(null);
                                setItemForDetails(item);
                              }}
                              className="w-full px-3 py-2.5 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer font-medium"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-500" />
                              <span>View Details</span>
                            </button>

                            {!item.isVoided && (
                              <>
                                <div className="my-1 border-t border-slate-100" />
                                <button
                                  type="button"
                                  id={`feed-menu-delete-${item.id}`}
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    setItemToDelete(item);
                                  }}
                                  className="w-full px-3 py-2.5 text-left text-red-600 hover:bg-red-50 flex items-center gap-2.5 cursor-pointer font-bold"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                  <span>Delete Mistaken Record</span>
                                </button>
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Activity Details Modal */}
      <ActivityDetailsModal
        isOpen={!!itemForDetails}
        onClose={() => setItemForDetails(null)}
        item={itemForDetails}
        currency={currency}
        underlyingRecord={itemForDetails ? getUnderlyingRecord(itemForDetails) : null}
        onOpenDelete={() => {
          if (!itemForDetails) return;
          const targetItem = itemForDetails;
          setItemForDetails(null);
          setItemToDelete(targetItem);
        }}
      />

      {/* Delete Mistaken Record Confirmation Modal */}
      <DeleteMistakenRecordModal
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleConfirmDelete}
        recordType={itemToDelete?.type || 'record'}
        recordTitle={itemToDelete?.title || ''}
        recordTimestamp={itemToDelete?.timestamp}
        amountFormatted={itemToDelete?.amountFormatted}
        corrections={itemToDelete ? getCorrections(itemToDelete, getUnderlyingRecord(itemToDelete)) : []}
        isDeleting={isDeleting}
      />
    </div>
  );
};
