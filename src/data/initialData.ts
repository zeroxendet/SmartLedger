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
  Purchase 
} from '../types';

export const initialBusinessProfile: BusinessProfile | null = null;

export const initialProducts: Product[] = [];
export const initialSales: Sale[] = [];
export const initialExpenses: Expense[] = [];
export const initialCustomers: Customer[] = [];
export const initialSuppliers: Supplier[] = [];
export const initialPurchases: Purchase[] = [];
export const initialTimelineEvents: TimelineEvent[] = [];
export const initialNotifications: NotificationItem[] = [];
export const initialProductionLogs: ProductionLog[] = [];
export const initialWasteLogs: WasteLog[] = [];

export const initialGoals: BusinessGoals = {
  salesTarget: 0,
  profitTarget: 0,
  savingsTarget: 0,
  expenseReductionTarget: 0,
};
