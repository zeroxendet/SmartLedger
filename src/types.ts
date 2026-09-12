export type CurrencyCode = 'RWF' | 'USD' | 'EUR' | 'GBP' | 'KES' | 'UGX' | 'NGN' | 'ZAR';

export type BusinessType = 
  | 'Bakery'
  | 'Grocery'
  | 'Restaurant'
  | 'Boutique'
  | 'Pharmacy'
  | 'Electronics'
  | 'Hardware'
  | 'Salon/Barbershop'
  | 'Other';

export interface BusinessProfile {
  id: string;
  userId?: string;
  name: string;
  type: BusinessType;
  currency: CurrencyCode;
  allowCustomerCredit: boolean;
  allowSupplierCredit: boolean;
  ownerName: string;
  ownerEmailOrPhone: string;
  phone?: string;
  email?: string;
  address?: string;
  logoUrl?: string;
  isBakeryMode: boolean;
  beginnerMode: boolean;
  cashierPin?: string;
  isCashierModeEnabled?: boolean;
  taxRate?: number;
  createdAt: string;
}

export interface ProductVariant {
  id: string;
  name: string; // e.g. "Small", "Large", "500g", "1kg", "Pack of 6"
  sellingPrice: number;
  buyingPrice?: number;
  stock: number;
  barcode?: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  buyingPrice?: number;
  sellingPrice: number;
  costPrice?: number; // Optional alias for buyingPrice
  stock: number;
  minStockLevel: number;
  barcode?: string;
  supplier?: string;
  notes?: string;
  unit?: string; // e.g. loaves, bags, pieces
  expiryDate?: string; // YYYY-MM-DD
  batchNumber?: string;
  variants?: ProductVariant[];
}

export type PaymentMethod = 'Cash' | 'Mobile Money' | 'Bank' | 'Credit';

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  sellingPrice?: number;
  buyingPrice?: number;
  unitPrice?: number; // Optional alias for sellingPrice
  subtotal?: number;  // Optional alias for total
  total?: number;
}

export interface Sale {
  id: string;
  invoiceNumber?: string;
  receiptNumber?: string;
  items: SaleItem[];
  totalAmount: number;
  totalCost?: number;
  profit?: number;
  paymentMethod: PaymentMethod;
  paymentStatus?: 'PAID' | 'UNPAID' | 'PARTIAL';
  status?: string;
  customerId?: string;
  customerName?: string;
  date: string; // ISO string
  notes?: string;
}

export type ExpenseCategory = 
  | 'Rent'
  | 'Electricity'
  | 'Water'
  | 'Transport'
  | 'Salary'
  | 'Marketing'
  | 'Fuel'
  | 'Cleaning'
  | 'Packaging'
  | 'Maintenance'
  | 'Other';

export interface Expense {
  id: string;
  category: ExpenseCategory;
  amount: number;
  notes: string;
  date: string;
  paidVia?: string;
  paymentMethod?: string;
}

export type IncomeSource = 'Service' | 'Investment' | 'Loan' | 'Other';

export interface OtherIncome {
  id: string;
  source: IncomeSource;
  amount: number;
  description: string;
  date: string;
}

export interface Purchase {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  costPerUnit: number;
  totalCost: number;
  supplierId?: string;
  supplierName: string;
  paymentStatus: 'PAID' | 'PAY_LATER';
  date: string;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  amountOwed: number;
  dueDate?: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  amountOwed: number;
  productsSupplied?: string[];
  createdAt: string;
}

export interface CustomerReturn {
  id: string;
  invoiceId?: string;
  invoiceNumber?: string;
  productId: string;
  productName: string;
  quantity: number;
  refundAmount: number;
  restocked: boolean; // whether item was added back to stock
  refundMethod: PaymentMethod | 'Store Credit';
  customerName?: string;
  customerId?: string;
  reason: string;
  date: string;
}

export interface CashRegisterShift {
  id: string;
  openedAt: string;
  closedAt?: string;
  cashierName: string;
  startingFloat: number;
  expectedCash: number;
  actualCashCounted?: number;
  cashVariance?: number;
  status: 'OPEN' | 'CLOSED';
  notes?: string;
  totalSalesAmount: number;
  cashSales: number;
  momoSales: number;
  bankSales: number;
  creditSales: number;
  totalExpensesCash: number;
  totalCustomerRepaymentsCash: number;
  refundsTotal: number;
}

export interface SupplierReturn {
  id: string;
  supplierId: string;
  supplierName: string;
  productId: string;
  productName: string;
  quantity: number;
  debitAmount: number;
  reason: string;
  date: string;
}

export interface ProductionLog {
  id: string;
  productId: string;
  productName: string;
  quantityProduced: number;
  unitCost?: number;
  totalCost?: number;
  notes?: string;
  date: string;
}

export interface WasteLog {
  id: string;
  productId: string;
  productName: string;
  quantityWasted: number;
  reason: 'Burned' | 'Unsold' | 'Damaged' | 'Expired' | 'Other' | string;
  estimatedLoss?: number;
  totalLoss?: number;
  date: string;
}

export interface TimelineEvent {
  id: string;
  type: 'sale' | 'purchase' | 'expense' | 'income' | 'customer_payment' | 'supplier_payment' | 'production' | 'waste' | 'return';
  title: string;
  description: string;
  amount?: number;
  timestamp: string;
  iconType: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'warning' | 'info' | 'success';
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

export interface BusinessGoals {
  salesTarget: number;
  profitTarget: number;
  savingsTarget: number;
  expenseReductionTarget: number;
}

export interface BusinessActivityLogEntry {
  id: string;
  workspaceId: string;
  type: 'sale' | 'waste' | 'expense' | 'debt' | 'production' | 'purchase';
  title: string;
  subtitle?: string;
  amount?: number;
  quantity?: number;
  customerName?: string;
  productName?: string;
  timestamp: string; // ISO string
}

export interface PurchaseOrderItem {
  productId: string;
  productName: string;
  currentStock: number;
  minStockLevel: number;
  recommendedOrder: number;
  unitCost: number;
  totalCost: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId?: string;
  supplierName: string;
  supplierPhone?: string;
  items: PurchaseOrderItem[];
  totalCost: number;
  status: 'DRAFT' | 'SENT' | 'RECEIVED';
  createdAt: string;
  notes?: string;
}

export interface TaxReportSummary {
  periodLabel: string;
  startDate: string;
  endDate: string;
  taxRatePercent: number;
  grossSalesTaxInclusive: number;
  netSalesTaxExclusive: number;
  outputTaxAmount: number;
  totalExpenses: number;
  estimatedInputTaxAmount: number;
  netTaxPayable: number;
  transactionsCount: number;
}


