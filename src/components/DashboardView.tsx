import React from 'react';
import { Product, Sale, Expense, Customer, Supplier, BusinessProfile, CashRegisterShift } from '../types';
import { formatCurrency, calculateDashboardMetrics } from '../utils/calculations';
import { 
  ShoppingCart, 
  PackagePlus, 
  Receipt, 
  Coins, 
  Bot, 
  Wheat, 
  ArrowRight,
  Sparkles,
  ChevronRight,
  Activity,
  HeartPulse,
  PackageCheck,
  AlertTriangle,
  Lock,
  Unlock,
  FileSpreadsheet,
  RotateCcw,
  Clock,
  KeyRound,
  ShieldCheck,
  Share2,
  Settings as SettingsIcon
} from 'lucide-react';

interface DashboardViewProps {
  profile: BusinessProfile;
  products: Product[];
  sales: Sale[];
  expenses: Expense[];
  customers: Customer[];
  suppliers: Supplier[];
  isCashierMode?: boolean;
  onUnlockCashierMode?: () => void;
  onLockCashierMode?: () => void;
  onChangeCashierPin?: () => void;
  onOpenShareApp?: () => void;
  onOpenSettings?: () => void;
  onOpenPurchaseOrder?: () => void;
  onOpenShiftReconciliation?: () => void;
  onOpenReturns?: () => void;
  activeShift?: CashRegisterShift | null;
  onOpenSell: () => void;
  onOpenBuyStock: () => void;
  onOpenSpendMoney: () => void;
  onOpenReceiveMoney: () => void;
  onOpenAI: () => void;
  onOpenBakery: () => void;
  onNavigateTab: (tab: 'products' | 'customers' | 'suppliers' | 'reports' | 'feed') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  profile,
  products,
  sales,
  expenses,
  customers,
  suppliers,
  isCashierMode = false,
  onUnlockCashierMode,
  onLockCashierMode,
  onChangeCashierPin,
  onOpenShareApp,
  onOpenSettings,
  onOpenPurchaseOrder,
  onOpenShiftReconciliation,
  onOpenReturns,
  activeShift,
  onOpenSell,
  onOpenBuyStock,
  onOpenSpendMoney,
  onOpenReceiveMoney,
  onOpenAI,
  onOpenBakery,
  onNavigateTab,
}) => {
  const metrics = calculateDashboardMetrics(products, sales, expenses, [], customers, suppliers);
  const currency = profile.currency;

  const lowStockProducts = products.filter((p) => p.stock <= p.minStockLevel);
  const debtors = customers.filter((c) => c.amountOwed > 0);
  const creditors = suppliers.filter((s) => s.amountOwed > 0);
  const totalProductsLeft = products.reduce((acc, p) => acc + p.stock, 0);

  // Dynamic Greeting based on time of day
  const hour = new Date().getHours();
  let timeGreeting = 'Good Morning';
  if (hour >= 12 && hour < 17) timeGreeting = 'Good Afternoon';
  else if (hour >= 17) timeGreeting = 'Good Evening';

  const ownerFirstName = profile.ownerName ? profile.ownerName.split(' ')[0] : 'Partner';

  return (
    <div id="smartledger-dashboard-view" className="space-y-6 animate-fade-in">
      {/* Cashier Mode Banner */}
      {isCashierMode ? (
        <div className="p-4 bg-amber-500 text-slate-950 font-bold rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-950/10">
              <Lock className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold font-['Outfit',sans-serif]">
                  Cashier POS Mode (Staff Protected)
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-950/15 text-slate-950 border border-slate-950/20">
                  PIN Active
                </span>
              </div>
              <p className="text-xs font-medium text-slate-900 mt-0.5">
                Reports, profit margins, and supplier debt are locked. Cashiers can ring up sales and manage stock.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onChangeCashierPin && (
              <button
                id="cashier-change-pin-btn"
                onClick={onChangeCashierPin}
                title="Change or set your custom 4-digit Cashier PIN"
                className="flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-slate-950/15 hover:bg-slate-950/25 text-slate-950 text-xs font-extrabold transition-colors cursor-pointer flex items-center justify-center gap-1.5 border border-slate-950/20"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Choose PIN</span>
              </button>
            )}
            {onUnlockCashierMode && (
              <button
                id="unlock-owner-mode-btn"
                onClick={onUnlockCashierMode}
                className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-slate-950 text-amber-400 text-xs font-extrabold hover:bg-slate-900 transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Unlock Owner</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-end gap-2 flex-wrap">
          {onOpenSettings && (
            <button
              id="dashboard-settings-btn"
              onClick={onOpenSettings}
              title="Business Settings & Restart Business"
              className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <SettingsIcon className="w-3.5 h-3.5 text-slate-600" />
              <span>Settings</span>
            </button>
          )}
          {onOpenShareApp && (
            <button
              id="dashboard-share-app-btn"
              onClick={onOpenShareApp}
              title="Share app link or QR code with cashiers and staff"
              className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-indigo-200 shadow-xs"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share App / Link</span>
            </button>
          )}
          {onChangeCashierPin && (
            <button
              id="owner-set-cashier-pin-btn"
              onClick={onChangeCashierPin}
              title="Configure or change the 4-digit Cashier Protection PIN"
              className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
              <span>Set Cashier PIN</span>
            </button>
          )}
          {onLockCashierMode && (
            <button
              id="lock-cashier-mode-btn"
              onClick={onLockCashierMode}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span>Switch to Cashier POS</span>
            </button>
          )}
        </div>
      )}

      {/* Dynamic Greeting & User Business Identity Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-['Outfit',sans-serif] text-slate-900 tracking-tight flex items-center gap-2">
            <span>{timeGreeting}, {ownerFirstName}</span>
            <span>👋</span>
          </h2>
          <p className="text-base sm:text-lg font-bold text-emerald-600 mt-0.5 font-['Outfit',sans-serif]">
            {profile.name}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800">
              <HeartPulse className="w-3.5 h-3.5 text-emerald-600" />
              <span>Business Health: {metrics.healthScore}/100</span>
            </div>
            <span className="text-xs text-slate-400">&bull;</span>
            <span className="text-xs font-semibold text-slate-500">{profile.type}</span>
            <span className="text-xs text-slate-400">&bull;</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              Period #{profile.periodNumber || 1}
            </span>
          </div>
        </div>

        {/* AI Assistant Quick Pill */}
        <div className="flex items-center gap-2">
          <button
            id="dashboard-ask-ai-pill-btn"
            onClick={onOpenAI}
            className="w-full sm:w-auto px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-950/20 hover:shadow-lg transition-all cursor-pointer"
          >
            <Bot className="w-4 h-4" />
            <span>Ask AI Assistant</span>
            <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
          </button>
        </div>
      </div>

      {/* METRIC CARDS: Today's Sales, Today's Profit, Today's Expenses, Products Left, Cash Available */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Today's Sales */}
        <div 
          id="card-todays-sales"
          onClick={() => onNavigateTab('feed')}
          className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Today's Sales
            </span>
            <span className="text-lg">💰</span>
          </div>
          <div className="my-2">
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900 font-['Outfit',sans-serif]">
              {formatCurrency(metrics.salesToday, currency)}
            </p>
          </div>
          <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
            <span>{sales.length} sale(s)</span>
            <ChevronRight className="w-3 h-3" />
          </p>
        </div>

        {/* Card 2: Today's Profit */}
        <div 
          id="card-todays-profit"
          onClick={() => {
            if (isCashierMode && onUnlockCashierMode) {
              onUnlockCashierMode();
            } else {
              onNavigateTab('reports');
            }
          }}
          className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 shadow-sm hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
              Today's Profit
            </span>
            <span className="text-lg">{isCashierMode ? '🔒' : '🟢'}</span>
          </div>
          <div className="my-2">
            <p className="text-xl sm:text-2xl font-extrabold text-emerald-900 font-['Outfit',sans-serif]">
              {isCashierMode ? '••••••' : formatCurrency(metrics.profitToday, currency)}
            </p>
          </div>
          <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
            <span>{isCashierMode ? 'Owner PIN required' : 'Real profit today'}</span>
            <ChevronRight className="w-3 h-3" />
          </p>
        </div>

        {/* Card 3: Today's Expenses */}
        <div 
          id="card-todays-expenses"
          onClick={onOpenSpendMoney}
          className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Today's Expenses
            </span>
            <span className="text-lg">💸</span>
          </div>
          <div className="my-2">
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900 font-['Outfit',sans-serif]">
              {formatCurrency(metrics.expensesToday, currency)}
            </p>
          </div>
          <p className="text-[11px] text-slate-500 flex items-center gap-1">
            <span>{expenses.length} record(s)</span>
            <ChevronRight className="w-3 h-3" />
          </p>
        </div>

        {/* Card 4: Products Left */}
        <div 
          id="card-products-left"
          onClick={() => onNavigateTab('products')}
          className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Products Left
            </span>
            <PackageCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="my-2">
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900 font-['Outfit',sans-serif]">
              {totalProductsLeft.toLocaleString()} <span className="text-xs font-normal text-slate-500">items</span>
            </p>
          </div>
          <p className="text-[11px] text-slate-500 flex items-center gap-1">
            <span>{products.length} product line(s)</span>
            <ChevronRight className="w-3 h-3" />
          </p>
        </div>

        {/* Card 5: Cash Available */}
        <div 
          id="card-cash-available"
          onClick={() => onNavigateTab('reports')}
          className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Cash Available
            </span>
            <span className="text-lg">💵</span>
          </div>
          <div className="my-2">
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900 font-['Outfit',sans-serif]">
              {formatCurrency(metrics.cashAvailable, currency)}
            </p>
          </div>
          <p className="text-[11px] text-slate-500 flex items-center gap-1">
            <span>In hand & bank</span>
            <ChevronRight className="w-3 h-3" />
          </p>
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Quick Actions (Instant Record)
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Action 1: SELL */}
          <button
            id="action-btn-sell"
            type="button"
            onClick={onOpenSell}
            className="p-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold shadow-md shadow-emerald-900/20 hover:shadow-lg transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center group"
          >
            <span className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ShoppingCart className="w-5 h-5 text-white" />
            </span>
            <span className="text-xs sm:text-sm tracking-wide">🛒 SELL</span>
            <span className="text-[10px] text-emerald-100 font-normal">Record sale</span>
          </button>

          {/* Action 2: BUY STOCK */}
          <button
            id="action-btn-buy-stock"
            type="button"
            onClick={onOpenBuyStock}
            className="p-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold shadow-md shadow-blue-900/20 hover:shadow-lg transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center group"
          >
            <span className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <PackagePlus className="w-5 h-5 text-white" />
            </span>
            <span className="text-xs sm:text-sm tracking-wide">📦 BUY STOCK</span>
            <span className="text-[10px] text-blue-100 font-normal">Restock items</span>
          </button>

          {/* Action 3: SPEND MONEY */}
          <button
            id="action-btn-spend-money"
            type="button"
            onClick={onOpenSpendMoney}
            className="p-3.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold shadow-md shadow-amber-900/20 hover:shadow-lg transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center group"
          >
            <span className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Receipt className="w-5 h-5 text-white" />
            </span>
            <span className="text-xs sm:text-sm tracking-wide">💸 SPEND</span>
            <span className="text-[10px] text-amber-100 font-normal">Expense or bill</span>
          </button>

          {/* Action 4: RECEIVE MONEY */}
          <button
            id="action-btn-receive-money"
            type="button"
            onClick={onOpenReceiveMoney}
            className="p-3.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold shadow-md shadow-purple-900/20 hover:shadow-lg transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center group"
          >
            <span className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Coins className="w-5 h-5 text-white" />
            </span>
            <span className="text-xs sm:text-sm tracking-wide">💰 RECEIVE</span>
            <span className="text-[10px] text-purple-100 font-normal">Extra income</span>
          </button>

          {/* Action 5: CASH DRAWER & SHIFT (Feature 1) */}
          {onOpenShiftReconciliation && (
            <button
              id="action-btn-shift-reconcile"
              type="button"
              onClick={onOpenShiftReconciliation}
              className={`p-3.5 rounded-2xl text-white font-extrabold shadow-md hover:shadow-lg transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center group ${
                activeShift
                  ? 'bg-teal-700 hover:bg-teal-600 shadow-teal-900/20'
                  : 'bg-slate-800 hover:bg-slate-700 shadow-slate-900/20'
              }`}
            >
              <span className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform relative">
                <Clock className="w-5 h-5 text-white" />
                {activeShift && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-slate-900" />
                )}
              </span>
              <span className="text-xs sm:text-sm tracking-wide">
                {activeShift ? '🟢 SHIFT TILL' : '🔒 OPEN TILL'}
              </span>
              <span className="text-[10px] text-teal-100 font-normal">
                {activeShift ? 'Z-Report / Count' : 'Start register float'}
              </span>
            </button>
          )}

          {/* Action 6: RETURNS & REFUNDS (Feature 2) */}
          {onOpenReturns && (
            <button
              id="action-btn-returns"
              type="button"
              onClick={onOpenReturns}
              className="p-3.5 rounded-2xl bg-rose-700 hover:bg-rose-600 text-white font-extrabold shadow-md shadow-rose-900/20 hover:shadow-lg transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center group"
            >
              <span className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <RotateCcw className="w-5 h-5 text-white" />
              </span>
              <span className="text-xs sm:text-sm tracking-wide">🔄 RETURNS</span>
              <span className="text-[10px] text-rose-100 font-normal">Refund or restock</span>
            </button>
          )}
        </div>
      </div>

      {/* DEBT OVERVIEW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Debt Card 1: Customers Owe You */}
        <div
          id="card-customers-owe-you"
          onClick={() => onNavigateTab('customers')}
          className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md transition-all cursor-pointer flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Customers Owe You
            </span>
            <p className="text-2xl font-extrabold text-amber-700 font-['Outfit',sans-serif] mt-1">
              {formatCurrency(metrics.totalReceivables, currency)}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {debtors.length} customer(s) with unpaid balances
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400" />
        </div>

        {/* Debt Card 2: You Owe Suppliers */}
        <div
          id="card-you-owe-suppliers"
          onClick={() => onNavigateTab('suppliers')}
          className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md transition-all cursor-pointer flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              You Owe Suppliers
            </span>
            <p className="text-2xl font-extrabold text-red-700 font-['Outfit',sans-serif] mt-1">
              {formatCurrency(metrics.totalPayables, currency)}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {creditors.length} supplier(s) awaiting payment
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400" />
        </div>
      </div>

      {/* BUSINESS FEED & INVENTORY WARNINGS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Business Feed Preview Card */}
        <div 
          id="dashboard-business-feed-preview"
          onClick={() => onNavigateTab('feed')}
          className="lg:col-span-2 p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-slate-300 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Business Feed
              </h4>
            </div>
            <span className="text-xs font-semibold text-emerald-600 hover:underline flex items-center gap-1">
              <span>Open full feed</span>
              <ArrowRight className="w-3 h-3" />
            </span>
          </div>

          {sales.length === 0 && expenses.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              <p className="font-semibold text-slate-600">No transactions recorded yet.</p>
              <p className="mt-1">Tap 🛒 SELL or 💸 SPEND to record your first business activity.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sales.slice(0, 3).map((sale) => (
                <div key={sale.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900">Sale: {sale.invoiceNumber}</span>
                    <p className="text-[11px] text-slate-500">{sale.customerName || 'Walk-in customer'} &bull; {sale.paymentMethod}</p>
                  </div>
                  <span className="font-extrabold text-emerald-600">
                    +{formatCurrency(sale.totalAmount, currency)}
                  </span>
                </div>
              ))}
              {expenses.slice(0, 2).map((exp) => (
                <div key={exp.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900">Expense: {exp.category}</span>
                    <p className="text-[11px] text-slate-500">{exp.notes || 'Operating cost'}</p>
                  </div>
                  <span className="font-extrabold text-amber-600">
                    -{formatCurrency(exp.amount, currency)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock Alerts */}
        <div 
          id="dashboard-low-stock-preview"
          onClick={() => onNavigateTab('products')}
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-slate-300 transition-all cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Stock Status
              </h4>
            </div>

            {lowStockProducts.length === 0 ? (
              <p className="text-xs text-slate-500">
                {products.length === 0 ? 'No products added yet. Tap BUY STOCK to add inventory.' : 'All items are adequately stocked.'}
              </p>
            ) : (
              <div className="space-y-2">
                {lowStockProducts.slice(0, 3).map((p) => (
                  <div key={p.id} className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-xs flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-900">{p.name}</p>
                      <p className="text-[10px] text-amber-800">{p.stock} left (min {p.minStockLevel})</p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-900">Low</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Total Catalog: {products.length} products</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
};
