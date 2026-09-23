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
  currentPeriodId?: string;
  currentPeriodStartedAt?: string;
  periodNumber?: number;
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
  status?: 'active' | 'archived';
  isArchived?: boolean;
  archivedAt?: string;
  archivedBy?: string;
  archivedReason?: string;
  restoredAt?: string;
  restoredBy?: string;
  deletedAt?: string;
  deletedBy?: string;
}

export type PaymentMethod = 'Cash' | 'Mobile Money' | 'Bank' | 'Credit' | 'Split';

export interface PaymentSplit {
  method: 'Cash' | 'Mobile Money' | 'Bank';
  amount: number;
}

export interface SaleItem {
  productId: string;
  productName: string;
  productNameSnapshot?: string; // Frozen name at time of sale
  quantity: number;
  sellingPrice?: number;
  buyingPrice?: number;
  unitPrice?: number; // Snapshot unit price
  costPriceSnapshot?: number; // Frozen buying cost per unit at time of sale
  subtotal?: number;  // Frozen item subtotal (quantity * unitPrice)
  total?: number;
  profit?: number;    // Frozen item profit
  barcode?: string;
  variantId?: string;
  variantName?: string;
}

export interface Sale {
  id: string;
  invoiceNumber?: string;
  receiptNumber?: string;
  items: SaleItem[];
  totalAmount: number;
  subtotal?: number;
  discount?: number;
  totalCost?: number;
  profit?: number;
  paymentMethod: PaymentMethod;
  paymentSplits?: PaymentSplit[]; // Supports multiple payment methods for partial payments
  paymentStatus?: 'PAID' | 'UNPAID' | 'PARTIAL';
  status?: string;
  customerId?: string;
  customerName?: string;
  date: string; // ISO string
  notes?: string;
  isVoided?: boolean;
  voidedAt?: string;
  voidedBy?: string;
  staffId?: string;
  staffName?: string;
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
  isArchived?: boolean;
  archivedAt?: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  amountOwed: number;
  productsSupplied?: string[];
  createdAt: string;
  isArchived?: boolean;
  archivedAt?: string;
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
  relatedId?: string;
  deletedBy?: string;
  deletedAt?: string;
  isVoided?: boolean;
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

export interface ArchivedPeriodSummary {
  totalSales: number;
  totalProfit: number;
  totalExpenses: number;
  totalPurchases: number;
  totalIncome: number;
  productsCount: number;
  customersCount: number;
  suppliersCount: number;
  salesCount: number;
  expensesCount: number;
  purchasesCount: number;
}

export interface ArchivedBusinessPeriod {
  id: string;
  periodNumber: number;
  periodLabel: string;
  startedAt: string;
  archivedAt: string;
  currency: CurrencyCode;
  summary: ArchivedPeriodSummary;
  products: Product[];
  sales: Sale[];
  expenses: Expense[];
  purchases: Purchase[];
  income: OtherIncome[];
  customers: Customer[];
  suppliers: Supplier[];
  productionLogs: ProductionLog[];
  wasteLogs: WasteLog[];
  shifts: CashRegisterShift[];
  customerReturns: CustomerReturn[];
  activityLogs?: BusinessActivityLogEntry[];
}

export type StaffRole = 'Cashier' | 'Staff' | 'Accountant' | 'Manager' | 'Owner';

export interface StaffInvitation {
  invitationId: string;
  token: string;
  tokenHash?: string;
  businessId: string;
  businessName: string;
  invitedByUserId?: string;
  invitedByUserName?: string;
  invitedByUserEmail?: string;
  invitedBy?: {
    uid: string;
    name: string;
    email?: string;
    role?: string;
  };
  invitedRole: StaffRole;
  assignedRole: StaffRole; // Maintained for backward compatibility
  permissions: StaffPermissions;
  workerName?: string;
  workerEmail?: string;
  createdAt: string;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'cancelled' | 'expired' | 'revoked';
  acceptedAt?: string;
  acceptedByUserId?: string;
  acceptedByEmail?: string;
  cancelledAt?: string;
  cancelledByUserId?: string;
  usedBy?: string; // Legacy fallback
  usedAt?: string; // Legacy fallback
}

export interface BusinessMember {
  id: string; // `${businessId}_${userId}`
  businessId: string;
  businessName: string;
  userId: string;
  userEmail: string;
  userName: string;
  role: StaffRole;
  permissions: StaffPermissions;
  status: 'active' | 'disabled';
  invitedBy: {
    uid?: string;
    userId?: string;
    name: string;
    email?: string;
  };
  invitationId: string;
  joinedAt: string;
  updatedAt?: string;
}

export interface StaffPermissions {
  // Core Requirement 7 High-Level Permissions
  createSales: boolean;
  viewProducts: boolean;
  editProducts: boolean;
  viewProfit: boolean;
  viewExpenses: boolean;
  manageStaff: boolean;
  businessSettings: boolean;

  // Granular Cashier & Operations Permissions
  canRecordSales: boolean;
  canViewProductsForSelling: boolean;
  canViewStockAvailability: boolean;
  canCreateViewReceipts: boolean;
  canSelectPaymentMethod: boolean;
  canSelectCustomerForSale: boolean;

  // Transaction control
  canDeleteSales: boolean;
  canEditCompletedSales: boolean;
  canDeleteCustomers: boolean;
  canDeleteProducts: boolean;
  canArchiveProducts?: boolean;
  canRestoreProducts?: boolean;
  canChangeProductPrices: boolean;
  canChangeStock: boolean;
  canDeleteExpenses: boolean;
  canDeleteSupplierRecords: boolean;

  // Owner-only information & Reporting
  canViewProfit?: boolean;
  canViewExpenses?: boolean;
  canViewReports: boolean;
  canViewSupplierBalances: boolean;
  canManageSuppliers?: boolean;
  canViewBusinessFinancialSummary: boolean;
  canViewAIBusinessAnalysis: boolean;
  canAccessBusinessSettings: boolean;
}

export interface StaffMember {
  id: string;
  name: string;
  role: StaffRole;
  status: 'ACTIVE' | 'DISABLED';
  cashierPinHash: string; // Stored securely (hashed, never exposed plain text)
  hasPin: boolean;
  pinMasked?: string; // Display e.g. "••••"
  permissions: StaffPermissions;
  businessId: string;
  businessName: string;
  ownerId: string;
  createdAt: string;
  updatedAt?: string;
  lastActiveAt?: string;
  accessToken: string; // Secure token for link / QR code access
}

export interface SaleCorrectionRequest {
  id: string;
  businessId: string;
  saleId: string;
  invoiceNumber?: string;
  staffId: string;
  staffName: string;
  requestedAt: string;
  reason: string;
  notes?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  saleAmount: number;
  saleItemsSummary: string;
  paymentMethod?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
}

export interface StaffActivityLogEntry {
  id: string;
  businessId: string;
  staffId: string;
  staffName: string;
  staffRole: StaffRole;
  action: 
    | 'sale_recorded' 
    | 'receipt_issued' 
    | 'shift_opened' 
    | 'shift_closed' 
    | 'correction_requested' 
    | 'correction_approved' 
    | 'login' 
    | 'lock' 
    | 'staff_updated' 
    | 'staff_removed' 
    | 'staff_enabled' 
    | 'staff_disabled' 
    | 'session_started';
  title: string;
  details: string;
  amount?: number;
  paymentMethod?: string;
  timestamp: string; // ISO string
  relatedId?: string;
}

export interface StaffSession {
  staffId: string;
  staffName: string;
  role: StaffRole;
  businessId: string;
  ownerId: string;
  businessName: string;
  permissions: StaffPermissions;
  authenticatedAt: string;
  expiresAt: string;
  isLocked?: boolean;
}

export const DEFAULT_CASHIER_PERMISSIONS: StaffPermissions = {
  createSales: true,
  viewProducts: true,
  editProducts: false,
  viewProfit: false,
  viewExpenses: false,
  manageStaff: false,
  businessSettings: false,

  canRecordSales: true,
  canViewProductsForSelling: true,
  canViewStockAvailability: true,
  canCreateViewReceipts: true,
  canSelectPaymentMethod: true,
  canSelectCustomerForSale: true,

  canDeleteSales: false,
  canEditCompletedSales: false,
  canDeleteCustomers: false,
  canDeleteProducts: false,
  canArchiveProducts: false,
  canRestoreProducts: false,
  canChangeProductPrices: false,
  canChangeStock: false,
  canDeleteExpenses: false,
  canDeleteSupplierRecords: false,

  canViewProfit: false,
  canViewReports: false,
  canViewExpenses: false,
  canViewSupplierBalances: false,
  canViewBusinessFinancialSummary: false,
  canViewAIBusinessAnalysis: false,
  canAccessBusinessSettings: false,
};

export const DEFAULT_STAFF_PERMISSIONS: StaffPermissions = {
  createSales: true,
  viewProducts: true,
  editProducts: false,
  viewProfit: false,
  viewExpenses: false,
  manageStaff: false,
  businessSettings: false,

  canRecordSales: true,
  canViewProductsForSelling: true,
  canViewStockAvailability: true,
  canCreateViewReceipts: true,
  canSelectPaymentMethod: true,
  canSelectCustomerForSale: true,

  canDeleteSales: false,
  canEditCompletedSales: false,
  canDeleteCustomers: false,
  canDeleteProducts: false,
  canArchiveProducts: false,
  canRestoreProducts: false,
  canChangeProductPrices: false,
  canChangeStock: false,
  canDeleteExpenses: false,
  canDeleteSupplierRecords: false,

  canViewProfit: false,
  canViewReports: false,
  canViewExpenses: false,
  canViewSupplierBalances: false,
  canViewBusinessFinancialSummary: false,
  canViewAIBusinessAnalysis: false,
  canAccessBusinessSettings: false,
};

export const DEFAULT_ACCOUNTANT_PERMISSIONS: StaffPermissions = {
  createSales: false,
  viewProducts: true,
  editProducts: false,
  viewProfit: true,
  viewExpenses: true,
  manageStaff: false,
  businessSettings: false,

  canRecordSales: false,
  canViewProductsForSelling: true,
  canViewStockAvailability: true,
  canCreateViewReceipts: true,
  canSelectPaymentMethod: true,
  canSelectCustomerForSale: true,

  canDeleteSales: false,
  canEditCompletedSales: false,
  canDeleteCustomers: false,
  canDeleteProducts: false,
  canArchiveProducts: false,
  canRestoreProducts: false,
  canChangeProductPrices: false,
  canChangeStock: false,
  canDeleteExpenses: false,
  canDeleteSupplierRecords: false,

  canViewProfit: true,
  canViewReports: true,
  canViewExpenses: true,
  canViewSupplierBalances: true,
  canViewBusinessFinancialSummary: true,
  canViewAIBusinessAnalysis: false,
  canAccessBusinessSettings: false,
};

export const DEFAULT_MANAGER_PERMISSIONS: StaffPermissions = {
  createSales: true,
  viewProducts: true,
  editProducts: true,
  viewProfit: true,
  viewExpenses: true,
  manageStaff: true,
  businessSettings: false,

  canRecordSales: true,
  canViewProductsForSelling: true,
  canViewStockAvailability: true,
  canCreateViewReceipts: true,
  canSelectPaymentMethod: true,
  canSelectCustomerForSale: true,

  canDeleteSales: false,
  canEditCompletedSales: true,
  canDeleteCustomers: false,
  canDeleteProducts: false,
  canArchiveProducts: true,
  canRestoreProducts: true,
  canChangeProductPrices: true,
  canChangeStock: true,
  canDeleteExpenses: false,
  canDeleteSupplierRecords: false,

  canViewProfit: true,
  canViewReports: true,
  canViewExpenses: true,
  canViewSupplierBalances: true,
  canViewBusinessFinancialSummary: true,
  canViewAIBusinessAnalysis: false,
  canAccessBusinessSettings: false,
};

export const DEFAULT_OWNER_PERMISSIONS: StaffPermissions = {
  createSales: true,
  viewProducts: true,
  editProducts: true,
  viewProfit: true,
  viewExpenses: true,
  manageStaff: true,
  businessSettings: true,

  canRecordSales: true,
  canViewProductsForSelling: true,
  canViewStockAvailability: true,
  canCreateViewReceipts: true,
  canSelectPaymentMethod: true,
  canSelectCustomerForSale: true,

  canDeleteSales: true,
  canEditCompletedSales: true,
  canDeleteCustomers: true,
  canDeleteProducts: true,
  canArchiveProducts: true,
  canRestoreProducts: true,
  canChangeProductPrices: true,
  canChangeStock: true,
  canDeleteExpenses: true,
  canDeleteSupplierRecords: true,

  canViewProfit: true,
  canViewReports: true,
  canViewExpenses: true,
  canViewSupplierBalances: true,
  canViewBusinessFinancialSummary: true,
  canViewAIBusinessAnalysis: true,
  canAccessBusinessSettings: true,
};
