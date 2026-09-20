import {
  Product,
  Sale,
  Expense,
  Customer,
  Supplier,
  Purchase,
  WasteLog,
  CustomerReturn,
  CurrencyCode,
  BusinessType,
} from '../types';
import { formatCurrency } from './calculations';

export type ExplainerPeriod = 'today' | 'this_week' | 'this_month';

export interface ExplainerPeriodBounds {
  period: ExplainerPeriod;
  label: string;
  start: Date;
  end: Date;
  prevLabel: string;
  prevStart: Date;
  prevEnd: Date;
}

export interface MetricTrend {
  current: number;
  previous: number;
  diff: number;
  percent: number | null; // null if no previous base
  direction: 'up' | 'down' | 'same';
  isPositiveForBusiness: boolean;
}

export interface ProductPerformanceItem {
  id: string;
  name: string;
  quantitySold: number;
  revenue: number;
  profit: number;
  currentStock: number;
  minStockLevel: number;
  unit?: string;
  wasteQuantity?: number;
  wasteLoss?: number;
}

export interface PossibleDuplicateTransaction {
  id: string;
  firstSaleId: string;
  secondSaleId: string;
  firstInvoiceNumber: string;
  secondInvoiceNumber: string;
  productName: string;
  amount: number;
  timeDiffMinutes: number;
  dateStr: string;
}

export interface CustomerDebtSummary {
  id: string;
  name: string;
  phone?: string;
  amountOwed: number;
  dueDate?: string;
  isOverdue: boolean;
}

export interface SupplierPayableSummary {
  id: string;
  name: string;
  phone?: string;
  amountOwed: number;
}

export interface ExpenseCategoryBreakdown {
  category: string;
  amount: number;
  percentage: number;
  prevAmount?: number;
  isIncreased?: boolean;
}

export interface BusinessSummaryData {
  hasEnoughData: boolean;
  emptyDataReason?: string;
  period: ExplainerPeriod;
  periodLabel: string;
  prevPeriodLabel: string;
  hasPreviousPeriodData: boolean;

  // Primary Metrics
  salesTotal: number;
  cogsTotal: number;
  grossProfit: number;
  expensesTotal: number;
  netProfit: number;
  profitMarginPercent: number;
  unitsSoldTotal: number;
  customersOweTotal: number;
  suppliersOweTotal: number;

  // Metric Trends
  trends: {
    sales: MetricTrend;
    netProfit: MetricTrend;
    expenses: MetricTrend;
    unitsSold: MetricTrend;
  };

  // Money Received (Payment method collections)
  moneyReceived: {
    cash: number;
    mobileMoney: number;
    bank: number;
    total: number;
  };

  // Plain-Language Explanations
  narrativeSummary: string;
  profitExplanation: string;

  // What's Going Well (only real positive findings)
  positiveHighlights: string[];

  // What Needs Attention (real warnings only)
  attentionItems: string[];

  // Detected anomalies (e.g. duplicate sales to review)
  potentialDuplicates: PossibleDuplicateTransaction[];

  // Top Products and Inventory Movement
  topProductsByQuantity: ProductPerformanceItem[];
  topProductsByRevenue: ProductPerformanceItem[];
  slowMovingProducts: ProductPerformanceItem[];
  lowStockProducts: {
    name: string;
    stock: number;
    minStockLevel: number;
    unit?: string;
    isOutOfStock: boolean;
  }[];

  // Expense Breakdown
  expenseCategories: ExpenseCategoryBreakdown[];

  // Customer & Supplier lists
  debtorCustomers: CustomerDebtSummary[];
  creditorSuppliers: SupplierPayableSummary[];

  // Practical Action Plan (2-5 suggestions)
  actionPlan: {
    id: string;
    text: string;
    type: 'stock' | 'debt' | 'expense' | 'duplicate' | 'supplier' | 'record';
    targetId?: string;
  }[];

  // Calculation Transparency Details
  calculationDetails: {
    sales: { amount: number; label: 'Actual' };
    cogs: { amount: number; label: 'Actual' | 'Estimated' };
    expenses: { amount: number; label: 'Actual' };
    netProfit: { amount: number; label: 'Actual' };
    hasEstimatedCosts: boolean;
  };
}

/**
 * Computes exact start and end date bounds for a given period and its preceding comparison period.
 */
export function getExplainerPeriodBounds(period: ExplainerPeriod): ExplainerPeriodBounds {
  const now = new Date();

  if (period === 'today') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const prevStart = new Date(start.getTime() - 24 * 60 * 60 * 1000);
    const prevEnd = new Date(end.getTime() - 24 * 60 * 60 * 1000);

    return {
      period,
      label: 'Today',
      start,
      end,
      prevLabel: 'yesterday',
      prevStart,
      prevEnd,
    };
  }

  if (period === 'this_week') {
    const day = now.getDay();
    const distanceToMonday = (day + 6) % 7;
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - distanceToMonday, 0, 0, 0, 0);
    const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);

    const prevStart = new Date(start.getTime() - 7 * 24 * 60 * 60 * 1000);
    const prevEnd = new Date(start.getTime() - 1);

    return {
      period,
      label: 'This Week',
      start,
      end,
      prevLabel: 'last week',
      prevStart,
      prevEnd,
    };
  }

  // 'this_month'
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
  const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  return {
    period,
    label: 'This Month',
    start,
    end,
    prevLabel: 'last month',
    prevStart,
    prevEnd,
  };
}

function isInDateRange(dateStr: string, start: Date, end: Date): boolean {
  try {
    const time = new Date(dateStr).getTime();
    return time >= start.getTime() && time <= end.getTime();
  } catch {
    return false;
  }
}

function computeTrend(
  current: number,
  previous: number,
  isHigherBetter = true
): MetricTrend {
  const diff = current - previous;
  let percent: number | null = null;

  if (previous > 0) {
    percent = Math.round((diff / previous) * 100);
  } else if (previous === 0 && current > 0) {
    percent = 100;
  }

  let direction: 'up' | 'down' | 'same' = 'same';
  if (diff > 0.01) direction = 'up';
  else if (diff < -0.01) direction = 'down';

  const isPositiveForBusiness = isHigherBetter
    ? direction === 'up' || direction === 'same'
    : direction === 'down' || direction === 'same';

  return {
    current,
    previous,
    diff,
    percent,
    direction,
    isPositiveForBusiness,
  };
}

/**
 * Pure analytical engine that processes the user's real SmartLedger database records.
 * NEVER invents missing numbers or transactions.
 */
export function generateBusinessSummary(
  period: ExplainerPeriod,
  products: Product[],
  sales: Sale[],
  expenses: Expense[],
  customers: Customer[],
  suppliers: Supplier[],
  purchases: Purchase[] = [],
  returns: CustomerReturn[] = [],
  wasteLogs: WasteLog[] = [],
  currency: CurrencyCode = 'RWF'
): BusinessSummaryData {
  const bounds = getExplainerPeriodBounds(period);
  const { start, end, prevStart, prevEnd, label: periodLabel, prevLabel } = bounds;

  // 1. Data sufficiency check
  const totalRecordedCount = products.length + sales.length + expenses.length + customers.length + suppliers.length;
  if (totalRecordedCount === 0 || (sales.length === 0 && expenses.length === 0 && products.length === 0)) {
    return {
      hasEnoughData: false,
      emptyDataReason: "I don't have enough recorded information yet to give you a reliable business analysis.",
      period,
      periodLabel,
      prevPeriodLabel: prevLabel,
      hasPreviousPeriodData: false,
      salesTotal: 0,
      cogsTotal: 0,
      grossProfit: 0,
      expensesTotal: 0,
      netProfit: 0,
      profitMarginPercent: 0,
      unitsSoldTotal: 0,
      customersOweTotal: 0,
      suppliersOweTotal: 0,
      trends: {
        sales: { current: 0, previous: 0, diff: 0, percent: null, direction: 'same', isPositiveForBusiness: true },
        netProfit: { current: 0, previous: 0, diff: 0, percent: null, direction: 'same', isPositiveForBusiness: true },
        expenses: { current: 0, previous: 0, diff: 0, percent: null, direction: 'same', isPositiveForBusiness: true },
        unitsSold: { current: 0, previous: 0, diff: 0, percent: null, direction: 'same', isPositiveForBusiness: true },
      },
      moneyReceived: { cash: 0, mobileMoney: 0, bank: 0, total: 0 },
      narrativeSummary: "I don't have enough recorded information yet to give you a reliable business analysis.",
      profitExplanation: '',
      positiveHighlights: [],
      attentionItems: [],
      potentialDuplicates: [],
      topProductsByQuantity: [],
      topProductsByRevenue: [],
      slowMovingProducts: [],
      lowStockProducts: [],
      expenseCategories: [],
      debtorCustomers: [],
      creditorSuppliers: [],
      actionPlan: [
        { id: 'act_empty_product', text: 'Add your business products with buying and selling prices.', type: 'stock' },
        { id: 'act_empty_sale', text: 'Record your first sale to start tracking cash flow and profit.', type: 'record' },
      ],
      calculationDetails: {
        sales: { amount: 0, label: 'Actual' },
        cogs: { amount: 0, label: 'Actual' },
        expenses: { amount: 0, label: 'Actual' },
        netProfit: { amount: 0, label: 'Actual' },
        hasEstimatedCosts: false,
      },
    };
  }

  // 2. Filter valid sales for current period and previous period
  const validPeriodSales = sales.filter((s) => {
    if (s.isVoided) return false;
    if (s.status === 'CANCELLED' || s.status === 'VOIDED' || s.status === 'FAILED') return false;
    return isInDateRange(s.date, start, end);
  });

  const validPrevSales = sales.filter((s) => {
    if (s.isVoided) return false;
    if (s.status === 'CANCELLED' || s.status === 'VOIDED' || s.status === 'FAILED') return false;
    return isInDateRange(s.date, prevStart, prevEnd);
  });

  // 3. Filter expenses
  const periodExpenses = expenses.filter((e) => isInDateRange(e.date, start, end));
  const prevExpenses = expenses.filter((e) => isInDateRange(e.date, prevStart, prevEnd));

  // 4. Filter customer returns/refunds
  const periodReturns = returns.filter((r) => isInDateRange(r.date, start, end));
  const totalRefundAmount = periodReturns.reduce((acc, r) => acc + (r.refundAmount || 0), 0);

  // 5. Product lookup map
  const productMap = new Map<string, Product>();
  products.forEach((p) => productMap.set(p.id, p));

  // 6. Calculate Sales, COGS, and units sold in current period
  let grossSales = 0;
  let cogsTotal = 0;
  let unitsSoldTotal = 0;
  let hasEstimatedCosts = false;

  const productPerformanceMap = new Map<string, {
    product: Product | undefined;
    productId: string;
    productName: string;
    quantity: number;
    revenue: number;
    cost: number;
    profit: number;
  }>();

  validPeriodSales.forEach((sale) => {
    grossSales += sale.totalAmount;

    sale.items.forEach((item) => {
      const qty = item.quantity || 0;
      unitsSoldTotal += qty;
      const sellingPrice = item.sellingPrice ?? item.unitPrice ?? 0;
      const lineRevenue = item.total ?? item.subtotal ?? (sellingPrice * qty);

      const catalogProduct = productMap.get(item.productId);
      const buyingPrice = item.buyingPrice ?? catalogProduct?.buyingPrice ?? catalogProduct?.costPrice ?? 0;

      if (buyingPrice <= 0 && lineRevenue > 0) {
        hasEstimatedCosts = true;
      }

      const lineCost = buyingPrice * qty;
      cogsTotal += lineCost;

      const existing = productPerformanceMap.get(item.productId);
      if (existing) {
        existing.quantity += qty;
        existing.revenue += lineRevenue;
        existing.cost += lineCost;
        existing.profit += (lineRevenue - lineCost);
      } else {
        productPerformanceMap.set(item.productId, {
          product: catalogProduct,
          productId: item.productId,
          productName: item.productName || catalogProduct?.name || 'Unknown Item',
          quantity: qty,
          revenue: lineRevenue,
          cost: lineCost,
          profit: lineRevenue - lineCost,
        });
      }
    });
  });

  // Subtract refunds from net sales (matching ReportsView)
  const salesTotal = Math.max(0, grossSales - totalRefundAmount);
  const expensesTotal = periodExpenses.reduce((acc, e) => acc + e.amount, 0);
  const grossProfit = salesTotal - cogsTotal;
  const netProfit = grossProfit - expensesTotal;
  const profitMarginPercent = salesTotal > 0 ? Math.round((netProfit / salesTotal) * 100) : 0;

  // 7. Calculate previous period metrics
  let prevGrossSales = 0;
  let prevCogsTotal = 0;
  let prevUnitsSoldTotal = 0;

  validPrevSales.forEach((sale) => {
    prevGrossSales += sale.totalAmount;
    sale.items.forEach((item) => {
      const qty = item.quantity || 0;
      prevUnitsSoldTotal += qty;
      const catalogProduct = productMap.get(item.productId);
      const buyingPrice = item.buyingPrice ?? catalogProduct?.buyingPrice ?? catalogProduct?.costPrice ?? 0;
      prevCogsTotal += buyingPrice * qty;
    });
  });

  const prevExpensesTotal = prevExpenses.reduce((acc, e) => acc + e.amount, 0);
  const prevNetProfit = (prevGrossSales - prevCogsTotal) - prevExpensesTotal;

  // Is there historical data to compare against?
  const hasPreviousPeriodData = validPrevSales.length > 0 || prevExpenses.length > 0;

  // 8. Trends
  const trends = {
    sales: computeTrend(salesTotal, prevGrossSales, true),
    netProfit: computeTrend(netProfit, prevNetProfit, true),
    expenses: computeTrend(expensesTotal, prevExpensesTotal, false),
    unitsSold: computeTrend(unitsSoldTotal, prevUnitsSoldTotal, true),
  };

  // 9. Money Received breakdown (Cash, Mobile Money, Bank)
  const moneyReceived = {
    cash: 0,
    mobileMoney: 0,
    bank: 0,
    total: 0,
  };

  validPeriodSales.forEach((sale) => {
    if (sale.paymentMethod === 'Credit' && sale.paymentStatus === 'UNPAID') {
      return; // Not received as cash yet
    }

    if (sale.paymentSplits && sale.paymentSplits.length > 0) {
      sale.paymentSplits.forEach((split) => {
        if (split.method === 'Cash') moneyReceived.cash += split.amount;
        else if (split.method === 'Mobile Money') moneyReceived.mobileMoney += split.amount;
        else if (split.method === 'Bank') moneyReceived.bank += split.amount;
      });
    } else if (sale.paymentMethod === 'Cash') {
      moneyReceived.cash += sale.totalAmount;
    } else if (sale.paymentMethod === 'Mobile Money') {
      moneyReceived.mobileMoney += sale.totalAmount;
    } else if (sale.paymentMethod === 'Bank') {
      moneyReceived.bank += sale.totalAmount;
    }
  });

  // Adjust for refunds by method
  periodReturns.forEach((ret) => {
    const refundAmt = ret.refundAmount || 0;
    if (ret.refundMethod === 'Cash') {
      moneyReceived.cash = Math.max(0, moneyReceived.cash - refundAmt);
    } else if (ret.refundMethod === 'Mobile Money') {
      moneyReceived.mobileMoney = Math.max(0, moneyReceived.mobileMoney - refundAmt);
    } else if (ret.refundMethod === 'Bank') {
      moneyReceived.bank = Math.max(0, moneyReceived.bank - refundAmt);
    }
  });

  moneyReceived.total = moneyReceived.cash + moneyReceived.mobileMoney + moneyReceived.bank;

  // 10. Customer Debts & Supplier Payables
  const nowTime = new Date().getTime();
  const debtorCustomers: CustomerDebtSummary[] = customers
    .filter((c) => !c.isArchived && (c.amountOwed || 0) > 0)
    .map((c) => {
      let isOverdue = false;
      if (c.dueDate) {
        try {
          isOverdue = new Date(c.dueDate).getTime() < nowTime;
        } catch {
          isOverdue = false;
        }
      }
      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        amountOwed: c.amountOwed,
        dueDate: c.dueDate,
        isOverdue,
      };
    })
    .sort((a, b) => b.amountOwed - a.amountOwed);

  const customersOweTotal = debtorCustomers.reduce((acc, c) => acc + c.amountOwed, 0);

  const creditorSuppliers: SupplierPayableSummary[] = suppliers
    .filter((s) => !s.isArchived && (s.amountOwed || 0) > 0)
    .map((s) => ({
      id: s.id,
      name: s.name,
      phone: s.phone,
      amountOwed: s.amountOwed,
    }))
    .sort((a, b) => b.amountOwed - a.amountOwed);

  const suppliersOweTotal = creditorSuppliers.reduce((acc, s) => acc + s.amountOwed, 0);

  // 11. Top Products & Stock Analysis
  const sortedPerformance = Array.from(productPerformanceMap.values());

  const topProductsByQuantity: ProductPerformanceItem[] = [...sortedPerformance]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5)
    .map((item) => ({
      id: item.productId,
      name: item.productName,
      quantitySold: item.quantity,
      revenue: item.revenue,
      profit: item.profit,
      currentStock: item.product?.stock ?? 0,
      minStockLevel: item.product?.minStockLevel ?? 0,
      unit: item.product?.unit,
    }));

  const topProductsByRevenue: ProductPerformanceItem[] = [...sortedPerformance]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
    .map((item) => ({
      id: item.productId,
      name: item.productName,
      quantitySold: item.quantity,
      revenue: item.revenue,
      profit: item.profit,
      currentStock: item.product?.stock ?? 0,
      minStockLevel: item.product?.minStockLevel ?? 0,
      unit: item.product?.unit,
    }));

  // Slow-moving products (in inventory with 0 units sold this period)
  const slowMovingProducts: ProductPerformanceItem[] = products
    .filter((p) => {
      const sold = productPerformanceMap.get(p.id);
      return !sold || sold.quantity === 0;
    })
    .slice(0, 5)
    .map((p) => ({
      id: p.id,
      name: p.name,
      quantitySold: 0,
      revenue: 0,
      profit: 0,
      currentStock: p.stock,
      minStockLevel: p.minStockLevel,
      unit: p.unit,
    }));

  // Low stock products
  const lowStockProducts = products
    .filter((p) => p.stock <= p.minStockLevel)
    .map((p) => ({
      name: p.name,
      stock: p.stock,
      minStockLevel: p.minStockLevel,
      unit: p.unit,
      isOutOfStock: p.stock <= 0,
    }))
    .sort((a, b) => a.stock - b.stock);

  // 12. Expense Category Breakdown
  const categoryMap = new Map<string, number>();
  periodExpenses.forEach((e) => {
    const cat = e.category || 'Other';
    categoryMap.set(cat, (categoryMap.get(cat) || 0) + e.amount);
  });

  const prevCategoryMap = new Map<string, number>();
  prevExpenses.forEach((e) => {
    const cat = e.category || 'Other';
    prevCategoryMap.set(cat, (prevCategoryMap.get(cat) || 0) + e.amount);
  });

  const expenseCategories: ExpenseCategoryBreakdown[] = Array.from(categoryMap.entries())
    .map(([category, amount]) => {
      const prevAmt = prevCategoryMap.get(category);
      const isIncreased = prevAmt !== undefined && amount > prevAmt;
      return {
        category,
        amount,
        percentage: expensesTotal > 0 ? Math.round((amount / expensesTotal) * 100) : 0,
        prevAmount: prevAmt,
        isIncreased,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  // 13. Detect Potential Duplicate Transactions (AI Quality Check)
  // Two sales with identical totalAmount, identical first item name, and recorded within 5 minutes of each other
  const potentialDuplicates: PossibleDuplicateTransaction[] = [];
  const sortedSalesForDups = [...validPeriodSales].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  for (let i = 0; i < sortedSalesForDups.length - 1; i++) {
    const saleA = sortedSalesForDups[i];
    const saleB = sortedSalesForDups[i + 1];

    const timeDiffMs = Math.abs(new Date(saleB.date).getTime() - new Date(saleA.date).getTime());
    const timeDiffMin = Math.round(timeDiffMs / (60 * 1000));

    if (timeDiffMin <= 5 && saleA.totalAmount === saleB.totalAmount && saleA.totalAmount > 0) {
      const itemA = saleA.items[0]?.productName || '';
      const itemB = saleB.items[0]?.productName || '';

      if (itemA === itemB && itemA.length > 0) {
        potentialDuplicates.push({
          id: `dup_${saleA.id}_${saleB.id}`,
          firstSaleId: saleA.id,
          secondSaleId: saleB.id,
          firstInvoiceNumber: saleA.invoiceNumber || saleA.id.slice(-6),
          secondInvoiceNumber: saleB.invoiceNumber || saleB.id.slice(-6),
          productName: itemA,
          amount: saleA.totalAmount,
          timeDiffMinutes: Math.max(1, timeDiffMin),
          dateStr: new Date(saleA.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      }
    }
  }

  // 14. Plain-Language Narrative Summary
  let narrativeSummary = '';
  if (salesTotal > 0) {
    narrativeSummary = `You made ${formatCurrency(netProfit, currency)} in net profit ${periodLabel.toLowerCase()}. Your sales were ${formatCurrency(salesTotal, currency)}. After accounting for the cost of products sold (${formatCurrency(cogsTotal, currency)}) and recorded business expenses (${formatCurrency(expensesTotal, currency)}), your remaining profit was ${formatCurrency(netProfit, currency)}.`;
  } else if (expensesTotal > 0) {
    narrativeSummary = `You recorded ${formatCurrency(expensesTotal, currency)} in expenses ${periodLabel.toLowerCase()}, with no recorded sales yet for this period.`;
  } else {
    narrativeSummary = `You have recorded activity in your business, but no completed sales or expenses fall within ${periodLabel.toLowerCase()} yet.`;
  }

  const profitExplanation =
    'Net profit means the real money left over after deducting what the goods cost to purchase and all recorded operating expenses from your total sales.';

  // 15. 🟢 What's Going Well (Grounded only in real data)
  const positiveHighlights: string[] = [];

  if (topProductsByQuantity.length > 0 && topProductsByQuantity[0].quantitySold > 0) {
    const top = topProductsByQuantity[0];
    positiveHighlights.push(
      `${top.name} was your top-selling product by quantity ${periodLabel.toLowerCase()} (${top.quantitySold} ${top.unit || 'units'} sold generating ${formatCurrency(top.revenue, currency)}).`
    );
  }

  if (hasPreviousPeriodData && trends.sales.direction === 'up' && trends.sales.percent !== null) {
    positiveHighlights.push(
      `Your sales increased by ${trends.sales.percent}% compared with ${prevLabel} (${formatCurrency(salesTotal, currency)} vs ${formatCurrency(trends.sales.previous, currency)}).`
    );
  } else if (hasPreviousPeriodData && trends.unitsSold.direction === 'up' && trends.unitsSold.diff > 0) {
    positiveHighlights.push(
      `You sold ${trends.unitsSold.diff} more product unit(s) ${periodLabel.toLowerCase()} than ${prevLabel}.`
    );
  }

  if (moneyReceived.mobileMoney > 0 && moneyReceived.mobileMoney >= moneyReceived.cash) {
    const momoPercent = moneyReceived.total > 0 ? Math.round((moneyReceived.mobileMoney / moneyReceived.total) * 100) : 0;
    positiveHighlights.push(
      `Mobile Money was your strongest payment collection channel, accounting for ${momoPercent}% of received payments (${formatCurrency(moneyReceived.mobileMoney, currency)}).`
    );
  } else if (moneyReceived.cash > 0 && moneyReceived.cash > moneyReceived.mobileMoney) {
    positiveHighlights.push(
      `Cash collections were steady at ${formatCurrency(moneyReceived.cash, currency)}.`
    );
  }

  if (hasPreviousPeriodData && trends.expenses.direction === 'down' && trends.expenses.diff < 0) {
    positiveHighlights.push(
      `Your operating expenses were lower by ${formatCurrency(Math.abs(trends.expenses.diff), currency)} compared with ${prevLabel}.`
    );
  }

  if (profitMarginPercent >= 25 && salesTotal > 0) {
    positiveHighlights.push(
      `Your profit margin remained strong at ${profitMarginPercent}% of sales.`
    );
  }

  if (debtorCustomers.length === 0 && salesTotal > 0) {
    positiveHighlights.push(
      `All customer sales were collected in full with no unpaid customer credit balances.`
    );
  }

  // Fallback if no specific positive trend can be confirmed
  if (positiveHighlights.length === 0 && salesTotal > 0) {
    positiveHighlights.push(
      `You recorded ${validPeriodSales.length} completed sale transaction(s) ${periodLabel.toLowerCase()}.`
    );
  }

  // 16. ⚠️ What Needs Attention (Grounded in real data only)
  const attentionItems: string[] = [];

  // Low stock
  if (lowStockProducts.length > 0) {
    const outOfStock = lowStockProducts.filter((p) => p.isOutOfStock);
    const lowStock = lowStockProducts.filter((p) => !p.isOutOfStock);

    if (outOfStock.length > 0) {
      const names = outOfStock.map((p) => p.name).slice(0, 3).join(', ');
      attentionItems.push(
        `⚠️ ${outOfStock.length} product(s) are completely out of stock (${names}). Restock immediately to avoid lost sales.`
      );
    }
    if (lowStock.length > 0) {
      const first = lowStock[0];
      attentionItems.push(
        `⚠️ ${first.name} stock is low based on your current inventory (${first.stock} ${first.unit || 'units'} remaining, minimum is ${first.minStockLevel}). You may need to restock soon.`
      );
    }
  }

  // Customer debts
  if (customersOweTotal > 0) {
    const overdueList = debtorCustomers.filter((c) => c.isOverdue);
    if (overdueList.length > 0) {
      const topOverdue = overdueList[0];
      attentionItems.push(
        `⚠️ ${overdueList.length} customer debt(s) are overdue (e.g. ${topOverdue.name} owes ${formatCurrency(topOverdue.amountOwed, currency)}).`
      );
    } else {
      const topDebtor = debtorCustomers[0];
      attentionItems.push(
        `You have ${formatCurrency(customersOweTotal, currency)} in outstanding customer balances from ${debtorCustomers.length} customer(s) (${topDebtor.name} owes ${formatCurrency(topDebtor.amountOwed, currency)}).`
      );
    }
  }

  // Supplier payables
  if (suppliersOweTotal > 0) {
    const topSupplier = creditorSuppliers[0];
    attentionItems.push(
      `You currently owe suppliers ${formatCurrency(suppliersOweTotal, currency)} (e.g., ${topSupplier.name} is owed ${formatCurrency(topSupplier.amountOwed, currency)}).`
    );
  }

  // Potential duplicate sales
  if (potentialDuplicates.length > 0) {
    const firstDup = potentialDuplicates[0];
    attentionItems.push(
      `You recorded two identical ${formatCurrency(firstDup.amount, currency)} ${firstDup.productName} sales within ${firstDup.timeDiffMinutes} minute(s). Could one of these have been recorded by mistake?`
    );
  }

  // Increasing expenses
  if (hasPreviousPeriodData && trends.expenses.direction === 'up' && (trends.expenses.percent || 0) > 15) {
    attentionItems.push(
      `Operating expenses rose by ${trends.expenses.percent}% compared with ${prevLabel} (${formatCurrency(expensesTotal, currency)} vs ${formatCurrency(trends.expenses.previous, currency)}).`
    );
  }

  // Declining sales
  if (hasPreviousPeriodData && trends.sales.direction === 'down' && (trends.sales.percent || 0) < -15) {
    attentionItems.push(
      `Sales were down by ${Math.abs(trends.sales.percent || 0)}% compared with ${prevLabel}.`
    );
  }

  // Missing expense records
  if (salesTotal > 0 && expensesTotal === 0) {
    attentionItems.push(
      `No business expenses (e.g. transport, packaging, utilities) have been recorded for ${periodLabel.toLowerCase()} yet.`
    );
  }

  // Missing purchase costs
  if (hasEstimatedCosts) {
    attentionItems.push(
      `Some sold products did not have a buying cost recorded. Profit calculations for those items are estimated.`
    );
  }

  // Waste logs
  const periodWaste = wasteLogs.filter((w) => isInDateRange(w.date, start, end));
  if (periodWaste.length > 0) {
    const totalLoss = periodWaste.reduce((acc, w) => acc + (w.totalLoss || w.estimatedLoss || 0), 0);
    const topWaste = periodWaste[0];
    attentionItems.push(
      `Recorded ${periodWaste.length} waste incident(s) totaling ${formatCurrency(totalLoss, currency)} in losses (e.g. ${topWaste.productName}: ${topWaste.quantityWasted} wasted due to ${topWaste.reason}).`
    );
  }

  // 17. Practical Action Plan (2-5 real recommendations)
  const actionPlan: { id: string; text: string; type: 'stock' | 'debt' | 'expense' | 'duplicate' | 'supplier' | 'record'; targetId?: string }[] = [];

  if (lowStockProducts.length > 0) {
    actionPlan.push({
      id: 'act_stock',
      text: `Consider restocking ${lowStockProducts[0].name} soon (${lowStockProducts[0].stock} remaining).`,
      type: 'stock',
    });
  }

  if (potentialDuplicates.length > 0) {
    actionPlan.push({
      id: 'act_dup',
      text: `Review the possible duplicate sale of ${potentialDuplicates[0].productName} (${formatCurrency(potentialDuplicates[0].amount, currency)}).`,
      type: 'duplicate',
      targetId: potentialDuplicates[0].secondSaleId,
    });
  }

  if (debtorCustomers.length > 0) {
    const topD = debtorCustomers[0];
    actionPlan.push({
      id: 'act_debt',
      text: `Follow up on the ${formatCurrency(topD.amountOwed, currency)} customer balance from ${topD.name}.`,
      type: 'debt',
      targetId: topD.id,
    });
  }

  if (creditorSuppliers.length > 0) {
    const topS = creditorSuppliers[0];
    actionPlan.push({
      id: 'act_supplier',
      text: `Check the supplier balance of ${formatCurrency(topS.amountOwed, currency)} owed to ${topS.name}.`,
      type: 'supplier',
      targetId: topS.id,
    });
  }

  if (salesTotal > 0 && expensesTotal === 0) {
    actionPlan.push({
      id: 'act_expense',
      text: `Record today's transport, packaging, or utility expenses if not yet entered.`,
      type: 'expense',
    });
  }

  if (actionPlan.length < 2 && slowMovingProducts.length > 0) {
    actionPlan.push({
      id: 'act_slow_stock',
      text: `Review ${slowMovingProducts[0].name} stock (${slowMovingProducts[0].currentStock} units with no recent sales).`,
      type: 'stock',
      targetId: slowMovingProducts[0].id,
    });
  }

  return {
    hasEnoughData: true,
    period,
    periodLabel,
    prevPeriodLabel: prevLabel,
    hasPreviousPeriodData,
    salesTotal,
    cogsTotal,
    grossProfit,
    expensesTotal,
    netProfit,
    profitMarginPercent,
    unitsSoldTotal,
    customersOweTotal,
    suppliersOweTotal,
    trends,
    moneyReceived,
    narrativeSummary,
    profitExplanation,
    positiveHighlights,
    attentionItems,
    potentialDuplicates,
    topProductsByQuantity,
    topProductsByRevenue,
    slowMovingProducts,
    lowStockProducts,
    expenseCategories,
    debtorCustomers,
    creditorSuppliers,
    actionPlan: actionPlan.slice(0, 5),
    calculationDetails: {
      sales: { amount: salesTotal, label: 'Actual' },
      cogs: { amount: cogsTotal, label: hasEstimatedCosts ? 'Estimated' : 'Actual' },
      expenses: { amount: expensesTotal, label: 'Actual' },
      netProfit: { amount: netProfit, label: 'Actual' },
      hasEstimatedCosts,
    },
  };
}
