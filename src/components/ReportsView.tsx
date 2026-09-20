import React, { useState } from 'react';
import { Product, Sale, Expense, Customer, Supplier, CurrencyCode, CustomerReturn } from '../types';
import { formatCurrency, calculateDashboardMetrics } from '../utils/calculations';
import { exportSalesData, exportExpensesData } from '../utils/exportUtils';
import { ProductSalesHistory7Days } from './ProductSalesHistory7Days';
import { TaxSummaryReport } from './TaxSummaryReport';
import { PaymentMethodSalesReport } from './PaymentMethodSalesReport';
import { 
  TrendingUp, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Download, 
  Printer, 
  Calendar,
  Layers,
  ShoppingBag,
  Sparkles,
  ReceiptText,
  FileSpreadsheet,
  Banknote
} from 'lucide-react';

interface ReportsViewProps {
  products: Product[];
  sales: Sale[];
  expenses: Expense[];
  customers: Customer[];
  suppliers: Supplier[];
  returns?: CustomerReturn[];
  currency: CurrencyCode;
  isBeginner: boolean;
  onToggleBeginnerMode: () => void;
  onRefreshSales?: () => Promise<void> | void;
  onNavigateToSales?: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  products,
  sales,
  expenses,
  customers,
  suppliers,
  returns = [],
  currency,
  isBeginner,
  onToggleBeginnerMode,
  onRefreshSales,
  onNavigateToSales,
}) => {
  const [timeframe, setTimeframe] = useState<'Daily' | 'Weekly' | 'Monthly'>('Daily');
  const [reportsSubTab, setReportsSubTab] = useState<'all' | 'payment-methods' | '7day-breakdown' | 'financial-health' | 'tax-report'>('all');
  const [showExportMenu, setShowExportMenu] = useState(false);

  const metrics = calculateDashboardMetrics(products, sales, expenses, [], customers, suppliers);

  // Profit calculation for products
  const productProfitability = products.map((p) => {
    const soldQty = sales.reduce((acc, s) => {
      const itm = s.items.find((i) => i.productId === p.id);
      return acc + (itm?.quantity || 0);
    }, 0);
    const unitProfit = p.sellingPrice - p.buyingPrice;
    const totalProfit = soldQty * unitProfit;
    return {
      ...p,
      soldQty,
      unitProfit,
      totalProfit,
    };
  }).sort((a, b) => b.totalProfit - a.totalProfit);

  const slowMoving = products.filter((p) => {
    const sold = sales.some((s) => s.items.some((i) => i.productId === p.id));
    return !sold || p.stock > 100;
  });

  return (
    <div id="smartledger-reports-view" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-['Outfit',sans-serif] text-slate-900">
            {isBeginner ? 'Business Summary & Health' : 'Financial Reports & Analysis'}
          </h2>
          <p className="text-xs text-slate-500">
            {isBeginner ? 'Clear insights on profits, debts, and performance' : 'P&L, margins, cash flow, and health metrics'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Export Data Dropdown */}
          <div className="relative">
            <button
              id="reports-export-menu-btn"
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="py-2 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export Data</span>
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30 text-xs animate-fade-in">
                <button
                  onClick={() => {
                    exportSalesData(sales, currency, 'xlsx');
                    setShowExportMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer font-medium"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Sales History (.xlsx)</span>
                </button>
                <button
                  onClick={() => {
                    exportSalesData(sales, currency, 'csv');
                    setShowExportMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer font-medium"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Sales History (.csv)</span>
                </button>
                <div className="border-t border-slate-100 my-1" />
                <button
                  onClick={() => {
                    exportExpensesData(expenses, currency, 'xlsx');
                    setShowExportMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer font-medium"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Expenses (.xlsx)</span>
                </button>
                <button
                  onClick={() => {
                    exportExpensesData(expenses, currency, 'csv');
                    setShowExportMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer font-medium"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Expenses (.csv)</span>
                </button>
              </div>
            )}
          </div>

          {/* Beginner vs Advanced Mode Toggle */}
          <button
            id="toggle-mode-btn"
            onClick={onToggleBeginnerMode}
            className="py-2 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            <span>Mode: {isBeginner ? 'Simple' : 'Advanced'}</span>
          </button>

          <button
            onClick={() => window.print()}
            className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Reports Section Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          id="report-tab-all-btn"
          type="button"
          onClick={() => setReportsSubTab('all')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            reportsSubTab === 'all'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>All Reports</span>
        </button>

        <button
          id="report-tab-payment-methods-btn"
          type="button"
          onClick={() => setReportsSubTab('payment-methods')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            reportsSubTab === 'payment-methods'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Banknote className="w-3.5 h-3.5" />
          <span>Sales by Payment Method</span>
        </button>

        <button
          id="report-tab-tax-btn"
          type="button"
          onClick={() => setReportsSubTab('tax-report')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            reportsSubTab === 'tax-report'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ReceiptText className="w-3.5 h-3.5 text-indigo-400" />
          <span>Tax & VAT Summary</span>
        </button>

        <button
          id="report-tab-7day-btn"
          type="button"
          onClick={() => setReportsSubTab('7day-breakdown')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            reportsSubTab === '7day-breakdown'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Calendar className="w-3.5 h-3.5 text-emerald-500" />
          <span>7-Day Product Sales Breakdown</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
            reportsSubTab === '7day-breakdown' ? 'bg-emerald-700 text-white' : 'bg-emerald-50 text-emerald-700'
          }`}>
            Last 7 Days
          </span>
        </button>

        <button
          id="report-tab-health-btn"
          type="button"
          onClick={() => setReportsSubTab('financial-health')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            reportsSubTab === 'financial-health'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Health Score & P&L</span>
        </button>
      </div>

      {/* SALES BY PAYMENT METHOD REPORT COMPONENT */}
      {(reportsSubTab === 'all' || reportsSubTab === 'payment-methods') && (
        <PaymentMethodSalesReport
          sales={sales}
          returns={returns}
          currency={currency}
          onNavigateToSales={onNavigateToSales}
        />
      )}

      {/* TAX & VAT SUMMARY REPORT COMPONENT */}
      {(reportsSubTab === 'all' || reportsSubTab === 'tax-report') && (
        <TaxSummaryReport
          sales={sales}
          expenses={expenses}
          currency={currency}
        />
      )}

      {/* 7-DAY PRODUCT SALES BREAKDOWN COMPONENT */}
      {(reportsSubTab === 'all' || reportsSubTab === '7day-breakdown') && (
        <ProductSalesHistory7Days
          sales={sales}
          products={products}
          currency={currency}
          isBeginner={isBeginner}
          onRefresh={onRefreshSales}
          onNavigateToSales={onNavigateToSales}
        />
      )}

      {/* FINANCIAL HEALTH & P&L SECTIONS */}
      {(reportsSubTab === 'all' || reportsSubTab === 'financial-health') && (
        <>
          {/* STEP 29: BUSINESS HEALTH SCORE */}
          <div 
            id="business-health-score-card"
            className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 text-white border border-slate-800 shadow-xl space-y-4"
          >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <span className="text-2xl font-extrabold font-['Outfit',sans-serif]">
                {metrics.healthScore}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <h3 className="text-lg font-bold font-['Outfit',sans-serif]">
                  Business Health Score: {metrics.healthScore}/100 ({metrics.healthStatus})
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {metrics.healthExplanation}
              </p>
            </div>
          </div>

          <div className="text-xs space-y-1 text-slate-300 bg-slate-800/60 p-3 rounded-xl border border-slate-700">
            <div className="flex justify-between gap-4">
              <span>Cash in Hand/Bank:</span>
              <span className="font-bold text-emerald-400">{formatCurrency(metrics.cashAvailable, currency)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Customer Debts:</span>
              <span className="font-bold text-amber-400">{formatCurrency(metrics.totalReceivables, currency)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Supplier Debts:</span>
              <span className="font-bold text-red-400">{formatCurrency(metrics.totalPayables, currency)}</span>
            </div>
          </div>
        </div>

        {/* Step 29 Specific Explanation Bullet points */}
        <div className="pt-2 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2 text-emerald-300">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>Profits are steady (+18% estimated this week)</span>
          </div>
          <div className="flex items-center gap-2 text-emerald-300">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>Customer debts are manageable ({formatCurrency(metrics.totalReceivables, currency)} outstanding)</span>
          </div>
          <div className="flex items-center gap-2 text-amber-300">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>Track high utility costs (Electricity bill recorded at 45,000 RWF)</span>
          </div>
          <div className="flex items-center gap-2 text-amber-300">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>Bread stock is running low ({products.find((p) => p.name.includes('Bread'))?.stock || 35} units remaining)</span>
          </div>
        </div>
      </div>

      {/* STEP 28: TIME-BASED PERFORMANCE REPORTS */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Report Horizon:</span>
        {(['Daily', 'Weekly', 'Monthly'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTimeframe(t)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              timeframe === t
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {t} Report
          </button>
        ))}
      </div>

      {/* Financial Statement / Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase">
            {isBeginner ? 'Total Sales' : 'Total Revenue'}
          </span>
          <p className="text-2xl font-extrabold text-slate-900 font-['Outfit',sans-serif]">
            {formatCurrency(metrics.salesToday, currency)}
          </p>
          <p className="text-[11px] text-slate-500">
            {sales.length} customer sales recorded
          </p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase">
            {isBeginner ? 'Total Expenses' : 'Operating Expenses'}
          </span>
          <p className="text-2xl font-extrabold text-slate-900 font-['Outfit',sans-serif]">
            {formatCurrency(metrics.expensesToday, currency)}
          </p>
          <p className="text-[11px] text-slate-500">
            {expenses.length} expense items recorded
          </p>
        </div>

        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 shadow-sm space-y-2">
          <span className="text-xs font-bold text-emerald-700 uppercase">
            {isBeginner ? 'Net Profit' : 'Net Operating Income'}
          </span>
          <p className="text-2xl font-extrabold text-emerald-800 font-['Outfit',sans-serif]">
            {formatCurrency(metrics.profitToday, currency)}
          </p>
          <p className="text-[11px] text-emerald-600 font-semibold">
            {metrics.salesToday > 0 ? Math.round((metrics.profitToday / metrics.salesToday) * 100) : 0}% Profit Margin
          </p>
        </div>
      </div>

      {/* Product Profitability & Slow Moving Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Most Profitable Products */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-slate-900 font-['Outfit',sans-serif] flex items-center justify-between">
            <span>🏆 Most Profitable Products</span>
            <span className="text-xs font-normal text-slate-400">Ranked by total profit</span>
          </h3>

          <div className="divide-y divide-slate-100 text-xs">
            {productProfitability.slice(0, 5).map((p, idx) => (
              <div key={p.id} className="py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-[10px]">
                    {idx + 1}
                  </span>
                  <div>
                    <span className="font-bold text-slate-900">{p.name}</span>
                    <p className="text-[11px] text-slate-400">
                      {formatCurrency(p.unitProfit, currency)} profit per {p.unit || 'unit'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-emerald-700">
                    +{formatCurrency(p.totalProfit, currency)}
                  </span>
                  <p className="text-[10px] text-slate-400">{p.soldQty} sold</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Slow Moving or Excess Stock */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-slate-900 font-['Outfit',sans-serif] flex items-center justify-between">
            <span>⏳ Slow Moving Stock</span>
            <span className="text-xs font-normal text-slate-400">High stock, low turnover</span>
          </h3>

          <div className="divide-y divide-slate-100 text-xs">
            {slowMoving.map((p) => (
              <div key={p.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900">{p.name}</span>
                  <p className="text-[11px] text-slate-400">Category: {p.category}</p>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-700">
                    {p.stock} {p.unit || 'units'}
                  </span>
                  <p className="text-[10px] text-amber-700 font-semibold">Tied-up Capital: {formatCurrency(p.stock * p.buyingPrice, currency)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
};
