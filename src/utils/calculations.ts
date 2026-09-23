import { Product, Sale, Expense, OtherIncome, Customer, Supplier, CurrencyCode } from '../types';

export function formatCurrency(amount: number, currency: CurrencyCode = 'RWF'): string {
  const formatted = Math.round(amount).toLocaleString();
  if (currency === 'USD') return `$${formatted}`;
  if (currency === 'EUR') return `€${formatted}`;
  if (currency === 'GBP') return `£${formatted}`;
  return `${formatted} ${currency}`;
}

export function getBeginnerTerms(isBeginner: boolean) {
  if (isBeginner) {
    return {
      revenue: 'Money Earned',
      expenses: 'Money Spent',
      receivables: 'People Who Owe You',
      payables: 'People You Need to Pay',
      inventory: 'Products',
      cogs: 'Cost of Products Sold',
      grossProfit: 'Sale Margin',
      netProfit: 'Real Profit Made',
      cashFlow: 'Cash in Pocket',
      inventoryValuation: 'Value of Your Goods',
      modeTitle: 'Beginner Mode (Simple Words)',
      modeBadge: 'Simple Terms Active',
    };
  }
  return {
    revenue: 'Revenue',
    expenses: 'Operating Expenses',
    receivables: 'Accounts Receivable',
    payables: 'Accounts Payable',
    inventory: 'Inventory & Assets',
    cogs: 'Cost of Goods Sold (COGS)',
    grossProfit: 'Gross Profit',
    netProfit: 'Net Profit',
    cashFlow: 'Cash Flow Statement',
    inventoryValuation: 'Inventory Valuation',
    modeTitle: 'Expert Mode (Standard Accounting)',
    modeBadge: 'Standard GAAP/IFRS Active',
  };
}

export interface DashboardMetrics {
  salesToday: number;
  expensesToday: number;
  profitToday: number;
  cashAvailable: number;
  totalReceivables: number;
  totalPayables: number;
  totalStockValue: number;
  totalItemsCount: number;
  healthScore: number;
  healthStatus: 'Excellent' | 'Good' | 'Needs Attention' | 'Critical';
  healthBreakdown: {
    sales: 'Excellent' | 'Good' | 'Fair';
    profit: 'Excellent' | 'Good' | 'Fair';
    expenses: 'Excellent' | 'Good' | 'Needs Attention';
    stock: 'Excellent' | 'Good' | 'Needs Attention';
    cashFlow: 'Excellent' | 'Good' | 'Needs Attention';
  };
  healthExplanation: string;
  bestSellingProduct?: { name: string; soldCount: number };
  lowStockCount: number;
}

export function calculateDashboardMetrics(
  products: Product[],
  sales: Sale[],
  expenses: Expense[],
  otherIncomes: OtherIncome[],
  customers: Customer[],
  suppliers: Supplier[],
  baseCash = 0
): DashboardMetrics {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  // Filter today's sales
  const salesTodayList = sales.filter((s) => {
    const saleTime = new Date(s.date).getTime();
    return saleTime >= startOfDay;
  });

  const salesToday = salesTodayList.reduce((acc, s) => acc + s.totalAmount, 0);
  const profitToday = salesTodayList.reduce((acc, s) => acc + s.profit, 0);

  // Expenses today
  const expensesTodayList = expenses.filter((e) => {
    const expTime = new Date(e.date).getTime();
    return expTime >= startOfDay;
  });
  const expensesToday = expensesTodayList.reduce((acc, e) => acc + e.amount, 0);

  // Other income today
  const otherIncomeTodayList = otherIncomes.filter((i) => {
    const time = new Date(i.date).getTime();
    return time >= startOfDay;
  });
  const otherIncomeToday = otherIncomeTodayList.reduce((acc, i) => acc + i.amount, 0);

  // Customer debt (Receivables)
  const totalReceivables = customers
    .filter((c) => !c.isArchived)
    .reduce((acc, c) => acc + (c.amountOwed || 0), 0);

  // Supplier debt (Payables)
  const totalPayables = suppliers
    .filter((s) => !s.isArchived)
    .reduce((acc, s) => acc + (s.amountOwed || 0), 0);

  // Total inventory valuation
  const totalStockValue = products.reduce((acc, p) => acc + p.stock * p.buyingPrice, 0);
  const totalItemsCount = products.reduce((acc, p) => acc + p.stock, 0);

  // Cash calculation
  // Base + Cash Sales + Other Income - Expenses
  const paidSales = sales.filter((s) => s.paymentStatus === 'PAID').reduce((acc, s) => acc + s.totalAmount, 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  const totalIncomes = otherIncomes.reduce((acc, i) => acc + i.amount, 0);

  // Dynamic cash available strictly from user transactions
  const cashAvailable = Math.max(0, baseCash + paidSales - totalExpenses + totalIncomes);

  // Best selling product
  const productSalesMap: Record<string, { name: string; count: number }> = {};
  for (const sale of sales) {
    for (const item of sale.items) {
      if (!productSalesMap[item.productId]) {
        productSalesMap[item.productId] = { name: item.productName, count: 0 };
      }
      productSalesMap[item.productId].count += item.quantity;
    }
  }

  let bestSelling: { name: string; soldCount: number } | undefined;
  for (const item of Object.values(productSalesMap)) {
    if (!bestSelling || item.count > bestSelling.soldCount) {
      bestSelling = { name: item.name, soldCount: item.count };
    }
  }

  // Low stock products count
  const lowStockCount = products.filter((p) => p.stock <= p.minStockLevel).length;

  // Health Score calculation (0 - 100)
  const isFreshBusiness = products.length === 0 && sales.length === 0 && expenses.length === 0;
  let healthScore = isFreshBusiness ? 100 : 95;
  const hasLowStock = lowStockCount > 0;
  const isProfitable = profitToday >= expensesToday;

  let stockStatus: 'Excellent' | 'Good' | 'Needs Attention' = 'Excellent';
  if (lowStockCount > 2) stockStatus = 'Needs Attention';
  else if (lowStockCount > 0) stockStatus = 'Good';

  let expenseStatus: 'Excellent' | 'Good' | 'Needs Attention' = 'Good';
  if (expensesToday > salesToday && salesToday > 0) expenseStatus = 'Needs Attention';

  let salesStatus: 'Excellent' | 'Good' | 'Fair' = salesToday > 0 ? 'Excellent' : 'Good';
  let profitStatus: 'Excellent' | 'Good' | 'Fair' = profitToday >= 0 ? 'Excellent' : 'Good';
  let cashStatus: 'Excellent' | 'Good' | 'Needs Attention' = 'Good';

  if (!isFreshBusiness) {
    if (stockStatus === 'Needs Attention') healthScore -= 12;
    if (stockStatus === 'Good') healthScore -= 5;
    if (expenseStatus === 'Needs Attention') healthScore -= 15;
    if (profitToday < 0) healthScore -= 15;
  }

  healthScore = Math.max(25, Math.min(100, healthScore));

  let healthStatus: 'Excellent' | 'Good' | 'Needs Attention' | 'Critical' = 'Excellent';
  if (healthScore < 50) healthStatus = 'Critical';
  else if (healthScore < 75) healthStatus = 'Needs Attention';
  else if (healthScore < 88) healthStatus = 'Good';

  let healthExplanation = 'Your business is running in great health today.';
  if (isFreshBusiness) {
    healthExplanation = 'Your clean business ledger is set up. Add your first product or record a sale to start tracking business performance.';
  } else if (hasLowStock) {
    const lowItem = products.find((p) => p.stock <= p.minStockLevel);
    healthExplanation = `Your business is healthy and generating profit, but ${lowItem ? lowItem.name : 'stock'} is running low. Restock soon to prevent missed sales.`;
  } else if (!isProfitable && expensesToday > 0) {
    healthExplanation = 'Today’s expenses exceed gross profit so far. Complete more sales to turn the day profitable.';
  } else {
    healthExplanation = 'Strong cash flow, healthy margins, and inventory levels are balanced.';
  }

  return {
    salesToday,
    expensesToday,
    profitToday,
    cashAvailable,
    totalReceivables,
    totalPayables,
    totalStockValue,
    totalItemsCount,
    healthScore,
    healthStatus,
    healthBreakdown: {
      sales: salesStatus,
      profit: profitStatus,
      expenses: expenseStatus,
      stock: stockStatus,
      cashFlow: cashStatus,
    },
    healthExplanation,
    bestSellingProduct: bestSelling,
    lowStockCount,
  };
}

export function detectExpenseAnomaly(category: string, enteredAmount: number, existingExpenses: Expense[]): {
  isAnomaly: boolean;
  typicalAmount: number;
  message?: string;
  suggestedValues?: number[];
} {
  const sameCategory = existingExpenses.filter((e) => e.category === category);
  if (sameCategory.length === 0) {
    // Check general large amount
    if (enteredAmount >= 300000) {
      return {
        isAnomaly: true,
        typicalAmount: Math.round(enteredAmount / 10),
        message: `⚠️ This expense (${enteredAmount.toLocaleString()}) looks unusually high. Did you mean ${Math.round(enteredAmount / 10).toLocaleString()} or ${enteredAmount.toLocaleString()}?`,
        suggestedValues: [Math.round(enteredAmount / 10), enteredAmount],
      };
    }
    return { isAnomaly: false, typicalAmount: enteredAmount };
  }

  const avg = sameCategory.reduce((acc, e) => acc + e.amount, 0) / sameCategory.length;
  if (enteredAmount >= avg * 4 && enteredAmount >= 100000) {
    const typoCorrection = Math.round(enteredAmount / 10);
    return {
      isAnomaly: true,
      typicalAmount: Math.round(avg),
      message: `⚠️ This ${category} expense (${enteredAmount.toLocaleString()}) is much higher than your usual ${category} expenses (~${Math.round(avg).toLocaleString()}). Did you mean ${typoCorrection.toLocaleString()} or ${enteredAmount.toLocaleString()}?`,
      suggestedValues: [typoCorrection, enteredAmount],
    };
  }

  return { isAnomaly: false, typicalAmount: Math.round(avg) };
}

export function generateWhatsAppReceiptText(
  sale: Sale,
  businessName: string,
  currency: CurrencyCode = 'RWF',
  businessPhone?: string
): string {
  const dateFormatted = new Date(sale.date).toLocaleDateString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const lines = [
    `🧾 *RECEIPT: ${businessName.toUpperCase()}*`,
    `Invoice: #${sale.invoiceNumber || sale.id.slice(-6)}`,
    `Date: ${dateFormatted}`,
    `--------------------------------`,
  ];

  sale.items.forEach((item) => {
    lines.push(
      `${item.quantity}x ${item.productName} @ ${formatCurrency(item.sellingPrice, currency)} = ${formatCurrency(item.total, currency)}`
    );
  });

  lines.push(`--------------------------------`);
  lines.push(`*GRAND TOTAL: ${formatCurrency(sale.totalAmount, currency)}*`);
  lines.push(`Payment: ${sale.paymentMethod}`);
  if (sale.customerName) {
    lines.push(`Customer: ${sale.customerName}`);
  }
  if (businessPhone) {
    lines.push(`Tel: ${businessPhone}`);
  }
  lines.push(`Thank you for your business!`);

  return lines.join('\n');
}

export function openWhatsAppReceipt(phoneNumber?: string, receiptText?: string): void {
  if (!receiptText) return;
  const encodedText = encodeURIComponent(receiptText);
  const cleanPhone = phoneNumber ? phoneNumber.replace(/[^0-9]/g, '') : '';
  const url = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodedText}`
    : `https://wa.me/?text=${encodedText}`;
  window.open(url, '_blank');
}
