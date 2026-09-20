import { Sale, CustomerReturn, PaymentSplit } from '../types';

export type SupportedPaymentMethod = 'Cash' | 'Mobile Money' | 'Bank';
export type PaymentReportTimeframe = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom';

export interface PaymentMethodSummary {
  method: SupportedPaymentMethod;
  amount: number; // Net amount (gross - refunds)
  grossAmount: number;
  refundedAmount: number;
  transactionCount: number;
  percentage: number;
}

export interface PaymentMethodTransactionDetail {
  id: string;
  saleId: string;
  date: string;
  invoiceNumber: string;
  customerName: string;
  productsSummary: string;
  method: SupportedPaymentMethod;
  methodAmount: number; // Amount paid with this specific method
  totalSaleAmount: number;
  isSplit: boolean;
  allSplits?: PaymentSplit[];
  status: 'Completed' | 'Refunded' | 'Partially Refunded' | 'Active';
  isRefundEntry?: boolean;
  refundReason?: string;
}

export interface PaymentMethodReportResult {
  timeframe: PaymentReportTimeframe;
  timeframeLabel: string;
  startDate: Date;
  endDate: Date;
  cash: PaymentMethodSummary;
  mobileMoney: PaymentMethodSummary;
  bank: PaymentMethodSummary;
  totalSales: number;
  totalTransactions: number;
  transactionsByMethod: {
    'Cash': PaymentMethodTransactionDetail[];
    'Mobile Money': PaymentMethodTransactionDetail[];
    'Bank': PaymentMethodTransactionDetail[];
  };
}

export interface TodayPaymentSummary {
  cash: number;
  mobileMoney: number;
  bank: number;
  total: number;
  transactionCount: number;
}

/**
 * Returns [start, end] date objects for the specified timeframe
 */
export function getDateRangeBounds(
  timeframe: PaymentReportTimeframe,
  customRange?: { startDate: string; endDate: string }
): { start: Date; end: Date; label: string } {
  const now = new Date();

  switch (timeframe) {
    case 'today': {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return { start, end, label: 'Today' };
    }
    case 'yesterday': {
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const start = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0, 0);
      const end = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999);
      return { start, end, label: 'Yesterday' };
    }
    case 'this_week': {
      // Find start of current week (Monday)
      const currentDay = now.getDay();
      const distanceToMonday = (currentDay + 6) % 7;
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - distanceToMonday, 0, 0, 0, 0);
      const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
      return { start, end, label: 'This Week' };
    }
    case 'this_month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { start, end, label: 'This Month' };
    }
    case 'custom': {
      if (customRange?.startDate && customRange?.endDate) {
        const startParts = customRange.startDate.split('-').map(Number);
        const endParts = customRange.endDate.split('-').map(Number);
        const start = new Date(startParts[0], startParts[1] - 1, startParts[2], 0, 0, 0, 0);
        const end = new Date(endParts[0], endParts[1] - 1, endParts[2], 23, 59, 59, 999);
        return { 
          start, 
          end, 
          label: `${customRange.startDate} to ${customRange.endDate}` 
        };
      }
      // Fallback to today if custom range is invalid
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return { start, end, label: 'Custom Range' };
    }
    default: {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return { start, end, label: 'Today' };
    }
  }
}

/**
 * Checks whether an ISO date string falls into the [start, end] window
 */
function isDateInRange(dateStr: string, start: Date, end: Date): boolean {
  try {
    const d = new Date(dateStr).getTime();
    return d >= start.getTime() && d <= end.getTime();
  } catch {
    return false;
  }
}

/**
 * Summarizes product names and quantities for transaction details
 */
function formatSaleProducts(sale: Sale): string {
  if (!sale.items || sale.items.length === 0) return 'Miscellaneous Sale';
  return sale.items.map((i) => `${i.productName} (×${i.quantity})`).join(', ');
}

/**
 * Calculates full payment method sales report for a specified timeframe
 */
export function calculatePaymentMethodReport(
  sales: Sale[],
  returns: CustomerReturn[] = [],
  timeframe: PaymentReportTimeframe = 'today',
  customRange?: { startDate: string; endDate: string }
): PaymentMethodReportResult {
  const { start, end, label } = getDateRangeBounds(timeframe, customRange);

  // Active, non-voided, non-cancelled sales within the selected range
  const validSales = sales.filter((s) => {
    if (s.isVoided) return false;
    if (s.status === 'CANCELLED' || s.status === 'VOIDED' || s.status === 'FAILED') return false;
    return isDateInRange(s.date, start, end);
  });

  // Track gross amounts, transaction sets, and transaction details for each method
  const gross = {
    'Cash': 0,
    'Mobile Money': 0,
    'Bank': 0,
  };

  const transactionIds = {
    'Cash': new Set<string>(),
    'Mobile Money': new Set<string>(),
    'Bank': new Set<string>(),
  };

  const totalDistinctSaleIds = new Set<string>();

  const transactionsByMethod: {
    'Cash': PaymentMethodTransactionDetail[];
    'Mobile Money': PaymentMethodTransactionDetail[];
    'Bank': PaymentMethodTransactionDetail[];
  } = {
    'Cash': [],
    'Mobile Money': [],
    'Bank': [],
  };

  validSales.forEach((sale) => {
    const productsSummary = formatSaleProducts(sale);
    const invoiceNum = sale.invoiceNumber || sale.receiptNumber || `INV-${sale.id.slice(-6)}`;
    const custName = sale.customerName || 'Walk-in Customer';

    // Case 1: Partial / Split Payment across multiple methods
    if (sale.paymentSplits && sale.paymentSplits.length > 0) {
      let contributed = false;
      sale.paymentSplits.forEach((split) => {
        const method = split.method;
        if (method === 'Cash' || method === 'Mobile Money' || method === 'Bank') {
          if (split.amount > 0) {
            gross[method] += split.amount;
            transactionIds[method].add(sale.id);
            contributed = true;

            transactionsByMethod[method].push({
              id: `${sale.id}_${method}`,
              saleId: sale.id,
              date: sale.date,
              invoiceNumber: invoiceNum,
              customerName: custName,
              productsSummary,
              method,
              methodAmount: split.amount,
              totalSaleAmount: sale.totalAmount,
              isSplit: true,
              allSplits: sale.paymentSplits,
              status: 'Completed',
            });
          }
        }
      });
      if (contributed) {
        totalDistinctSaleIds.add(sale.id);
      }
    } else {
      // Case 2: Single Payment Method
      const method = sale.paymentMethod;
      if (method === 'Cash' || method === 'Mobile Money' || method === 'Bank') {
        const amt = sale.totalAmount || 0;
        gross[method] += amt;
        transactionIds[method].add(sale.id);
        totalDistinctSaleIds.add(sale.id);

        transactionsByMethod[method].push({
          id: sale.id,
          saleId: sale.id,
          date: sale.date,
          invoiceNumber: invoiceNum,
          customerName: custName,
          productsSummary,
          method,
          methodAmount: amt,
          totalSaleAmount: amt,
          isSplit: false,
          status: 'Completed',
        });
      }
    }
  });

  // Calculate refunds/returns within the selected range
  const refunds = {
    'Cash': 0,
    'Mobile Money': 0,
    'Bank': 0,
  };

  const validReturns = returns.filter((r) => isDateInRange(r.date, start, end));

  validReturns.forEach((ret) => {
    const method = ret.refundMethod;
    if (method === 'Cash' || method === 'Mobile Money' || method === 'Bank') {
      const refundAmt = ret.refundAmount || 0;
      refunds[method] += refundAmt;

      // Add as negative / refund transaction entry in the list
      transactionsByMethod[method].push({
        id: `ret_${ret.id}`,
        saleId: ret.invoiceId || ret.id,
        date: ret.date,
        invoiceNumber: ret.invoiceNumber || `REF-${ret.id.slice(-5)}`,
        customerName: ret.customerName || 'Customer',
        productsSummary: `Refund / Return: ${ret.productName} (×${ret.quantity})`,
        method,
        methodAmount: -refundAmt,
        totalSaleAmount: refundAmt,
        isSplit: false,
        status: 'Refunded',
        isRefundEntry: true,
        refundReason: ret.reason,
      });
    }
  });

  // Sort transactions by date descending
  (['Cash', 'Mobile Money', 'Bank'] as SupportedPaymentMethod[]).forEach((m) => {
    transactionsByMethod[m].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  });

  // Net amounts (reversals deducted)
  const netCash = Math.max(0, gross['Cash'] - refunds['Cash']);
  const netMomo = Math.max(0, gross['Mobile Money'] - refunds['Mobile Money']);
  const netBank = Math.max(0, gross['Bank'] - refunds['Bank']);

  const totalSales = netCash + netMomo + netBank;

  const buildSummary = (method: SupportedPaymentMethod, netAmt: number, grossAmt: number, refAmt: number): PaymentMethodSummary => ({
    method,
    amount: netAmt,
    grossAmount: grossAmt,
    refundedAmount: refAmt,
    transactionCount: transactionIds[method].size,
    percentage: totalSales > 0 ? (netAmt / totalSales) * 100 : 0,
  });

  return {
    timeframe,
    timeframeLabel: label,
    startDate: start,
    endDate: end,
    cash: buildSummary('Cash', netCash, gross['Cash'], refunds['Cash']),
    mobileMoney: buildSummary('Mobile Money', netMomo, gross['Mobile Money'], refunds['Mobile Money']),
    bank: buildSummary('Bank', netBank, gross['Bank'], refunds['Bank']),
    totalSales,
    totalTransactions: totalDistinctSaleIds.size,
    transactionsByMethod,
  };
}

/**
 * Lightweight helper to calculate Today's Sales summary for Dashboard
 */
export function calculateTodayPaymentSummary(
  sales: Sale[],
  returns: CustomerReturn[] = []
): TodayPaymentSummary {
  const report = calculatePaymentMethodReport(sales, returns, 'today');
  return {
    cash: report.cash.amount,
    mobileMoney: report.mobileMoney.amount,
    bank: report.bank.amount,
    total: report.totalSales,
    transactionCount: report.totalTransactions,
  };
}
