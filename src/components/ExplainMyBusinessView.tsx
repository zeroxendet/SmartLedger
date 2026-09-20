import React, { useState } from 'react';
import {
  Product,
  Sale,
  Expense,
  Customer,
  Supplier,
  Purchase,
  CustomerReturn,
  WasteLog,
  CurrencyCode,
  BusinessProfile,
} from '../types';
import { formatCurrency } from '../utils/calculations';
import {
  ExplainerPeriod,
  generateBusinessSummary,
  BusinessSummaryData,
} from '../utils/businessExplainer';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Package,
  ArrowRight,
  Sparkles,
  Users,
  Truck,
  DollarSign,
  Smartphone,
  Building2,
  Receipt,
  Info,
  ExternalLink,
  MessageSquare,
} from 'lucide-react';

interface ExplainMyBusinessViewProps {
  profile: BusinessProfile;
  products: Product[];
  sales: Sale[];
  expenses: Expense[];
  customers: Customer[];
  suppliers: Supplier[];
  purchases?: Purchase[];
  returns?: CustomerReturn[];
  wasteLogs?: WasteLog[];
  currency: CurrencyCode;
  onAskAIQuestion: (prompt: string) => void;
  onNavigateTab?: (tab: 'dashboard' | 'products' | 'sales' | 'customers' | 'suppliers' | 'expenses' | 'reports') => void;
  onReviewSale?: (saleId: string) => void;
}

export const ExplainMyBusinessView: React.FC<ExplainMyBusinessViewProps> = ({
  profile,
  products,
  sales,
  expenses,
  customers,
  suppliers,
  purchases = [],
  returns = [],
  wasteLogs = [],
  currency,
  onAskAIQuestion,
  onNavigateTab,
  onReviewSale,
}) => {
  const [period, setPeriod] = useState<ExplainerPeriod>('this_week');
  const [showCalculationModal, setShowCalculationModal] = useState<boolean>(false);
  const [showDebtorDetails, setShowDebtorDetails] = useState<boolean>(false);
  const [showCreditorDetails, setShowCreditorDetails] = useState<boolean>(false);
  const [showExpenseDetails, setShowExpenseDetails] = useState<boolean>(false);
  const [showProductDetails, setShowProductDetails] = useState<boolean>(false);

  const summary: BusinessSummaryData = generateBusinessSummary(
    period,
    products,
    sales,
    expenses,
    customers,
    suppliers,
    purchases,
    returns,
    wasteLogs,
    currency
  );

  // If there's not enough data recorded in the system
  if (!summary.hasEnoughData) {
    return (
      <div className="p-6 text-center space-y-4 max-w-md mx-auto my-auto">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
          <Info className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-base font-bold font-['Outfit',sans-serif] text-slate-900">
            📊 Your Business Summary
          </h3>
          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
            {summary.emptyDataReason}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            SmartLedger only analyzes your real recorded activity and never invents missing information.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs space-y-2">
          <p className="font-bold text-slate-700">Quick ways to get started:</p>
          <ul className="list-disc list-inside text-slate-600 space-y-1">
            <li>Add your products with buying & selling prices</li>
            <li>Record customer sales or expenses</li>
            <li>Add customer credit balances or suppliers</li>
          </ul>
        </div>

        <div className="flex gap-2 justify-center pt-2">
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('products')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Add Products
            </button>
          )}
          <button
            onClick={() => onAskAIQuestion("How do I get started with SmartLedger?")}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Ask AI How
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="explain-my-business-container" className="space-y-5 pb-6">
      {/* Top Banner & Period Selector */}
      <div className="bg-gradient-to-r from-slate-900 to-emerald-950 text-white p-4 sm:p-5 rounded-2xl shadow-md border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 flex-shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold font-['Outfit',sans-serif]">
                  📊 Your Business Summary
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/30 text-emerald-300 border border-emerald-500/40">
                  {summary.periodLabel}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Clear, simple explanation of what is happening in {profile.name}
              </p>
            </div>
          </div>

          {/* Time Horizon Selector */}
          <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700 text-xs self-start sm:self-auto">
            {(
              [
                { id: 'today', label: 'Today' },
                { id: 'this_week', label: 'This Week' },
                { id: 'this_month', label: 'This Month' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                id={`explainer-period-${tab.id}`}
                onClick={() => setPeriod(tab.id)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  period === tab.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Narrative Executive Summary */}
        <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 text-xs leading-relaxed text-slate-200">
          <p className="font-medium">{summary.narrativeSummary}</p>
          <p className="text-[11px] text-slate-400 mt-1 italic">
            💡 {summary.profitExplanation}
          </p>
        </div>
      </div>

      {/* Primary Financial Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
        {/* Sales */}
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
            <span className="flex items-center gap-1">
              <span>💰</span> Sales
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
              Actual
            </span>
          </div>
          <p className="text-lg sm:text-xl font-extrabold text-slate-900 font-['Outfit',sans-serif]">
            {formatCurrency(summary.salesTotal, currency)}
          </p>
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            {summary.hasPreviousPeriodData && summary.trends.sales.percent !== null ? (
              <span
                className={`flex items-center font-bold ${
                  summary.trends.sales.direction === 'up'
                    ? 'text-emerald-700'
                    : summary.trends.sales.direction === 'down'
                    ? 'text-rose-700'
                    : 'text-slate-600'
                }`}
              >
                {summary.trends.sales.direction === 'up' ? '▲ +' : summary.trends.sales.direction === 'down' ? '▼ ' : ''}
                {summary.trends.sales.percent}% vs {summary.prevPeriodLabel}
              </span>
            ) : (
              <span className="text-slate-400">No previous period data</span>
            )}
          </div>
        </div>

        {/* Net Profit */}
        <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-emerald-800 text-[11px] font-bold">
            <span className="flex items-center gap-1">
              <span>📈</span> Net Profit
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 font-semibold">
              {summary.profitMarginPercent}% margin
            </span>
          </div>
          <p className="text-lg sm:text-xl font-extrabold text-emerald-900 font-['Outfit',sans-serif]">
            {formatCurrency(summary.netProfit, currency)}
          </p>
          <div className="text-[11px] text-emerald-700">
            {summary.hasPreviousPeriodData && summary.trends.netProfit.percent !== null ? (
              <span className="font-bold">
                {summary.trends.netProfit.direction === 'up' ? '▲ +' : summary.trends.netProfit.direction === 'down' ? '▼ ' : ''}
                {summary.trends.netProfit.percent}% vs {summary.prevPeriodLabel}
              </span>
            ) : (
              <span>Money in pocket after all costs</span>
            )}
          </div>
        </div>

        {/* Expenses */}
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
            <span className="flex items-center gap-1">
              <span>🧾</span> Expenses
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
              Actual
            </span>
          </div>
          <p className="text-lg sm:text-xl font-extrabold text-slate-900 font-['Outfit',sans-serif]">
            {formatCurrency(summary.expensesTotal, currency)}
          </p>
          <div className="text-[11px] text-slate-500">
            {summary.hasPreviousPeriodData && summary.trends.expenses.percent !== null ? (
              <span
                className={`font-bold ${
                  summary.trends.expenses.direction === 'down' ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {summary.trends.expenses.direction === 'down' ? '▼ -' : '▲ +'}
                {Math.abs(summary.trends.expenses.percent)}% vs {summary.prevPeriodLabel}
              </span>
            ) : (
              <span>Operating costs recorded</span>
            )}
          </div>
        </div>

        {/* Products Sold */}
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
            <span className="flex items-center gap-1">
              <span>📦</span> Products Sold
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
              Units
            </span>
          </div>
          <p className="text-lg sm:text-xl font-extrabold text-slate-900 font-['Outfit',sans-serif]">
            {summary.unitsSoldTotal.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-500">
            {summary.hasPreviousPeriodData && summary.trends.unitsSold.percent !== null ? (
              <span className="font-bold text-slate-700">
                {summary.trends.unitsSold.direction === 'up' ? '▲ +' : summary.trends.unitsSold.direction === 'down' ? '▼ ' : ''}
                {summary.trends.unitsSold.percent}% vs {summary.prevPeriodLabel}
              </span>
            ) : (
              <span>Items delivered to customers</span>
            )}
          </p>
        </div>

        {/* Customers Owe You */}
        <div className="p-3.5 bg-white rounded-xl border border-amber-200 bg-amber-50/40 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-amber-800 text-[11px] font-bold">
            <span className="flex items-center gap-1">
              <span>👥</span> Customers Owe
            </span>
            {summary.debtorCustomers.length > 0 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold">
                {summary.debtorCustomers.length} person(s)
              </span>
            )}
          </div>
          <p className="text-lg sm:text-xl font-extrabold text-amber-900 font-['Outfit',sans-serif]">
            {formatCurrency(summary.customersOweTotal, currency)}
          </p>
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-slate-500">Uncollected credit sales</span>
            {summary.debtorCustomers.length > 0 && (
              <button
                type="button"
                onClick={() => setShowDebtorDetails(!showDebtorDetails)}
                className="text-amber-800 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
              >
                <span>{showDebtorDetails ? 'Hide' : 'Who'}</span>
                {showDebtorDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
          </div>
        </div>

        {/* You Owe Suppliers */}
        <div className="p-3.5 bg-white rounded-xl border border-rose-200 bg-rose-50/40 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-rose-800 text-[11px] font-bold">
            <span className="flex items-center gap-1">
              <span>🚚</span> You Owe Suppliers
            </span>
            {summary.creditorSuppliers.length > 0 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-900 font-bold">
                {summary.creditorSuppliers.length} supplier(s)
              </span>
            )}
          </div>
          <p className="text-lg sm:text-xl font-extrabold text-rose-900 font-['Outfit',sans-serif]">
            {formatCurrency(summary.suppliersOweTotal, currency)}
          </p>
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-slate-500">Stock bought on credit</span>
            {summary.creditorSuppliers.length > 0 && (
              <button
                type="button"
                onClick={() => setShowCreditorDetails(!showCreditorDetails)}
                className="text-rose-800 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
              >
                <span>{showCreditorDetails ? 'Hide' : 'Who'}</span>
                {showCreditorDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Customer Debts Breakdown Expandable */}
      {showDebtorDetails && summary.debtorCustomers.length > 0 && (
        <div className="p-4 bg-amber-50/80 rounded-xl border border-amber-200 space-y-2 animate-fade-in text-xs">
          <div className="flex items-center justify-between font-bold text-amber-900">
            <span>Customer Balances:</span>
            <span>Total: {formatCurrency(summary.customersOweTotal, currency)}</span>
          </div>
          <div className="divide-y divide-amber-200/70">
            {summary.debtorCustomers.map((c) => (
              <div key={c.id} className="py-2 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800">{c.name}</span>
                  {c.phone && <span className="text-[11px] text-slate-500 ml-2">({c.phone})</span>}
                  {c.isOverdue && (
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-bold">
                      Overdue
                    </span>
                  )}
                </div>
                <span className="font-extrabold text-amber-900">
                  {formatCurrency(c.amountOwed, currency)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Supplier Debts Breakdown Expandable */}
      {showCreditorDetails && summary.creditorSuppliers.length > 0 && (
        <div className="p-4 bg-rose-50/80 rounded-xl border border-rose-200 space-y-2 animate-fade-in text-xs">
          <div className="flex items-center justify-between font-bold text-rose-900">
            <span>Supplier Balances:</span>
            <span>Total: {formatCurrency(summary.suppliersOweTotal, currency)}</span>
          </div>
          <div className="divide-y divide-rose-200/70">
            {summary.creditorSuppliers.map((s) => (
              <div key={s.id} className="py-2 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800">{s.name}</span>
                  {s.phone && <span className="text-[11px] text-slate-500 ml-2">({s.phone})</span>}
                </div>
                <span className="font-extrabold text-rose-900">
                  {formatCurrency(s.amountOwed, currency)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Money Received Breakdown (Section 10) */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <span>💵</span>
            <span>Money Received ({summary.periodLabel})</span>
          </h3>
          <span className="text-xs font-extrabold text-emerald-800">
            Total: {formatCurrency(summary.moneyReceived.total, currency)}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 block mb-1">💵 Cash</span>
            <span className="text-sm font-extrabold text-slate-900">
              {formatCurrency(summary.moneyReceived.cash, currency)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 block mb-1">📱 Mobile Money</span>
            <span className="text-sm font-extrabold text-slate-900">
              {formatCurrency(summary.moneyReceived.mobileMoney, currency)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 block mb-1">🏦 Bank</span>
            <span className="text-sm font-extrabold text-slate-900">
              {formatCurrency(summary.moneyReceived.bank, currency)}
            </span>
          </div>
        </div>
      </div>

      {/* Two-Column Section: What's Going Well & What Needs Attention */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 🟢 What's Going Well (Section 5) */}
        <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200 space-y-3">
          <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>What&apos;s Going Well</span>
          </h3>

          {summary.positiveHighlights.length > 0 ? (
            <ul className="space-y-2 text-xs text-emerald-950">
              {summary.positiveHighlights.map((hl, idx) => (
                <li key={idx} className="flex items-start gap-2 bg-white/70 p-2.5 rounded-xl border border-emerald-100">
                  <span className="text-emerald-600 font-bold mt-0.5">•</span>
                  <span className="leading-relaxed font-medium">{hl}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500 italic p-3 bg-white/60 rounded-xl">
              Not enough positive signals confirmed yet for this period.
            </p>
          )}
        </div>

        {/* ⚠️ What Needs Your Attention (Section 6 & 7) */}
        <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-200 space-y-3">
          <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>What Needs Your Attention</span>
          </h3>

          {summary.attentionItems.length > 0 ? (
            <ul className="space-y-2 text-xs text-amber-950">
              {summary.attentionItems.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 bg-white/80 p-2.5 rounded-xl border border-amber-200/80">
                  <span className="text-amber-600 font-bold mt-0.5">•</span>
                  <div className="flex-1">
                    <span className="leading-relaxed font-medium">{item}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-3 bg-white/60 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>No critical inventory alerts or overdue balances detected for this period.</span>
            </div>
          )}

          {/* Special Question Prompt for Potential Duplicate Sales (Section 7) */}
          {summary.potentialDuplicates.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-100/80 border border-amber-300 text-xs space-y-2 animate-fade-in">
              <p className="font-bold text-amber-900 flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-amber-700" />
                <span>Possible Duplicate Record Detected:</span>
              </p>
              <p className="text-amber-800 leading-relaxed">
                SmartLedger recorded two identical {formatCurrency(summary.potentialDuplicates[0].amount, currency)}{' '}
                sales of <strong>{summary.potentialDuplicates[0].productName}</strong> within {summary.potentialDuplicates[0].timeDiffMinutes} minute(s).
                Could one of these have been recorded by mistake?
              </p>
              <div className="flex items-center gap-2 pt-1">
                {onReviewSale ? (
                  <button
                    type="button"
                    onClick={() => onReviewSale(summary.potentialDuplicates[0].secondSaleId)}
                    className="px-3 py-1.5 rounded-lg bg-amber-800 hover:bg-amber-900 text-white font-bold text-[11px] transition-colors cursor-pointer"
                  >
                    Review Transaction
                  </button>
                ) : onNavigateTab ? (
                  <button
                    type="button"
                    onClick={() => onNavigateTab('sales')}
                    className="px-3 py-1.5 rounded-lg bg-amber-800 hover:bg-amber-900 text-white font-bold text-[11px] transition-colors cursor-pointer"
                  >
                    Review Sales
                  </button>
                ) : null}
                <span className="text-[10px] text-amber-700 italic">
                  (SmartLedger will never delete transactions automatically)
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top Products Section (Section 9) */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <span>🏆</span>
            <span>Top Products & Inventory Movement ({summary.periodLabel})</span>
          </h3>
          <button
            type="button"
            onClick={() => setShowProductDetails(!showProductDetails)}
            className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer flex items-center gap-1"
          >
            <span>{showProductDetails ? 'Simple View' : 'View Breakdown'}</span>
            {showProductDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {summary.topProductsByQuantity.length > 0 ? (
          <div className="divide-y divide-slate-100 text-xs">
            {summary.topProductsByQuantity.slice(0, showProductDetails ? 5 : 3).map((item, idx) => (
              <div key={item.id} className="py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-extrabold flex items-center justify-center text-[11px]">
                    {idx + 1}
                  </span>
                  <div>
                    <span className="font-bold text-slate-900">{item.name}</span>
                    <p className="text-[11px] text-slate-500">
                      Current stock: {item.currentStock} {item.unit || 'units'}
                      {item.currentStock <= item.minStockLevel && (
                        <span className="text-rose-600 font-bold ml-1.5">⚠️ Low</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-slate-900">
                    {item.quantitySold} {item.unit || 'units'} sold
                  </span>
                  <p className="text-[11px] text-emerald-700 font-bold">
                    {formatCurrency(item.revenue, currency)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic">
            No product sales recorded for this period yet.
          </p>
        )}

        {/* Slow Moving Stock Note if any */}
        {summary.slowMovingProducts.length > 0 && (
          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>
              <strong>Slow-moving stock:</strong> {summary.slowMovingProducts.slice(0, 2).map((p) => `${p.name} (${p.currentStock} in stock)`).join(', ')} had 0 sales {summary.periodLabel.toLowerCase()}.
            </span>
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('products')}
                className="text-emerald-700 font-bold hover:underline cursor-pointer flex-shrink-0 ml-2"
              >
                Manage Stock
              </button>
            )}
          </div>
        )}
      </div>

      {/* Expense Analysis (Section 14) */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <span>🧾</span>
              <span>Expenses Explanation ({summary.periodLabel})</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Total Recorded: <strong>{formatCurrency(summary.expensesTotal, currency)}</strong>
            </p>
          </div>
          {summary.expenseCategories.length > 0 && (
            <button
              type="button"
              onClick={() => setShowExpenseDetails(!showExpenseDetails)}
              className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
            >
              {showExpenseDetails ? 'Hide Details' : 'View Categories'}
            </button>
          )}
        </div>

        {summary.expenseCategories.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {summary.expenseCategories.slice(0, showExpenseDetails ? 12 : 4).map((cat) => (
              <div key={cat.category} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center text-[11px] text-slate-500 font-semibold mb-1">
                  <span>{cat.category}</span>
                  <span>{cat.percentage}%</span>
                </div>
                <p className="font-extrabold text-slate-900 text-xs">
                  {formatCurrency(cat.amount, currency)}
                </p>
                {cat.isIncreased && (
                  <span className="text-[10px] text-amber-700 font-bold mt-0.5 block">
                    ▲ Higher than {summary.prevPeriodLabel}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic">
            No expenses recorded for this period yet.
          </p>
        )}
      </div>

      {/* AI Transparency: "How was this calculated?" (Section 16) */}
      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-bold text-slate-800">
              How was this calculated?
            </span>
          </div>
          <button
            type="button"
            id="how-calculated-toggle-btn"
            onClick={() => setShowCalculationModal(!showCalculationModal)}
            className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer flex items-center gap-0.5"
          >
            <span>{showCalculationModal ? 'Hide Calculation' : 'View Formula & Records'}</span>
            {showCalculationModal ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {showCalculationModal && (
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-3 text-xs animate-fade-in">
            <p className="font-bold text-slate-800">
              Net Profit Formula for {summary.periodLabel}:
            </p>

            <div className="space-y-1.5 p-3 rounded-lg bg-slate-50 font-mono text-xs text-slate-800 border border-slate-200">
              <div className="flex justify-between">
                <span>+ Sales (Total Revenue):</span>
                <span className="font-bold">
                  {formatCurrency(summary.calculationDetails.sales.amount, currency)} [Actual]
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>− Cost of Products Sold:</span>
                <span className="font-bold">
                  {formatCurrency(summary.calculationDetails.cogs.amount, currency)} [{summary.calculationDetails.cogs.label}]
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>− Recorded Business Expenses:</span>
                <span className="font-bold">
                  {formatCurrency(summary.calculationDetails.expenses.amount, currency)} [Actual]
                </span>
              </div>
              <div className="pt-2 border-t border-slate-300 flex justify-between text-emerald-800 font-extrabold text-sm">
                <span>= Net Profit:</span>
                <span>{formatCurrency(summary.calculationDetails.netProfit.amount, currency)} [Actual]</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-slate-500">
              <div>
                <span className="font-bold text-slate-700">[Actual]</span>: Confirmed recorded transactions
              </div>
              <div>
                <span className="font-bold text-slate-700">[Compared]</span>: Compared to previous period
              </div>
              <div>
                <span className="font-bold text-slate-700">[Estimated]</span>: If purchase cost was unrecorded
              </div>
              <div>
                <span className="font-bold text-slate-700">[Not enough data]</span>: Missing historical base
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 🎯 What You Can Do Next (Action Plan) (Section 15) */}
      <div className="p-4 bg-emerald-900 text-white rounded-2xl shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-200 flex items-center gap-1.5">
            <span>🎯</span>
            <span>What You Can Do Next (Practical Suggestions)</span>
          </h3>
          <span className="text-[10px] text-emerald-300">Based strictly on real data</span>
        </div>

        <ul className="space-y-2 text-xs">
          {summary.actionPlan.map((action, idx) => (
            <li
              key={action.id}
              className="p-3 bg-emerald-950/70 border border-emerald-700/60 rounded-xl flex items-center justify-between gap-2"
            >
              <div className="flex items-start gap-2">
                <span className="text-emerald-400 font-extrabold">{idx + 1}.</span>
                <span className="text-slate-100 font-medium">{action.text}</span>
              </div>

              {action.type === 'stock' && onNavigateTab && (
                <button
                  type="button"
                  onClick={() => onNavigateTab('products')}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer flex-shrink-0"
                >
                  View Stock
                </button>
              )}

              {action.type === 'debt' && onNavigateTab && (
                <button
                  type="button"
                  onClick={() => onNavigateTab('customers')}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer flex-shrink-0"
                >
                  View Customers
                </button>
              )}

              {action.type === 'supplier' && onNavigateTab && (
                <button
                  type="button"
                  onClick={() => onNavigateTab('suppliers')}
                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer flex-shrink-0"
                >
                  View Suppliers
                </button>
              )}

              {action.type === 'duplicate' && onReviewSale && action.targetId && (
                <button
                  type="button"
                  onClick={() => onReviewSale(action.targetId!)}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer flex-shrink-0"
                >
                  Review Sale
                </button>
              )}

              {action.type === 'expense' && onNavigateTab && (
                <button
                  type="button"
                  onClick={() => onNavigateTab('expenses')}
                  className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer flex-shrink-0"
                >
                  Record Expense
                </button>
              )}
            </li>
          ))}
        </ul>

        {/* Bottom Interactive Action Buttons */}
        <div className="pt-2 border-t border-emerald-800 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            id="explainer-ask-question-btn"
            onClick={() => onAskAIQuestion(`Explain my ${summary.periodLabel.toLowerCase()} net profit of ${formatCurrency(summary.netProfit, currency)} in more detail`)}
            className="px-3 py-2 rounded-xl bg-white text-emerald-950 hover:bg-emerald-50 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-700" />
            <span>Ask AI a Question about this</span>
          </button>

          <div className="flex items-center gap-2">
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('reports')}
                className="px-3 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-emerald-100 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
              >
                <span>Full Reports</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
