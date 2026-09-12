import React, { useState, useMemo } from 'react';
import { Sale, Expense, CurrencyCode, TaxReportSummary } from '../types';
import { formatCurrency } from '../utils/calculations';
import { exportTaxReportData } from '../utils/exportUtils';
import { 
  ReceiptText, 
  FileSpreadsheet, 
  Download, 
  Printer, 
  Percent, 
  Calendar, 
  TrendingUp, 
  CreditCard,
  ShieldCheck,
  HelpCircle
} from 'lucide-react';

interface TaxSummaryReportProps {
  sales: Sale[];
  expenses: Expense[];
  currency: CurrencyCode;
  initialTaxRate?: number;
}

export const TaxSummaryReport: React.FC<TaxSummaryReportProps> = ({
  sales,
  expenses,
  currency,
  initialTaxRate = 18,
}) => {
  const [taxRate, setTaxRate] = useState<number>(initialTaxRate);
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'quarter' | 'year' | 'all'>('month');

  // Filter sales and expenses by date period
  const filteredData = useMemo(() => {
    const now = new Date();
    let startDate = new Date(0); // Epoch

    if (period === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === 'week') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'quarter') {
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    } else if (period === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
    }

    const periodSales = sales.filter((s) => new Date(s.date) >= startDate);
    const periodExpenses = expenses.filter((e) => new Date(e.date) >= startDate);

    return {
      periodSales,
      periodExpenses,
      startDate: startDate.toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0],
    };
  }, [sales, expenses, period]);

  // Tax calculations
  const taxSummary: TaxReportSummary = useMemo(() => {
    const grossSalesTaxInclusive = filteredData.periodSales.reduce((acc, s) => acc + s.totalAmount, 0);
    const totalExpenses = filteredData.periodExpenses.reduce((acc, e) => acc + e.amount, 0);

    const rateFactor = 1 + (taxRate / 100);
    // Subtotal before tax
    const netSalesTaxExclusive = taxRate > 0 ? grossSalesTaxInclusive / rateFactor : grossSalesTaxInclusive;
    // Output tax collected from customers
    const outputTaxAmount = grossSalesTaxInclusive - netSalesTaxExclusive;

    // Deductible input tax on expenses
    const estimatedInputTaxAmount = taxRate > 0 ? (totalExpenses - (totalExpenses / rateFactor)) : 0;

    // Net payable to revenue authority
    const netTaxPayable = Math.max(0, outputTaxAmount - estimatedInputTaxAmount);

    const periodLabels: Record<string, string> = {
      today: 'Today',
      week: 'Last 7 Days',
      month: 'This Month',
      quarter: 'This Quarter (90 Days)',
      year: 'This Year to Date',
      all: 'All Time Records',
    };

    return {
      periodLabel: periodLabels[period],
      startDate: filteredData.startDate,
      endDate: filteredData.endDate,
      taxRatePercent: taxRate,
      grossSalesTaxInclusive,
      netSalesTaxExclusive,
      outputTaxAmount,
      totalExpenses,
      estimatedInputTaxAmount,
      netTaxPayable,
      transactionsCount: filteredData.periodSales.length,
    };
  }, [filteredData, taxRate, period]);

  const handleExportExcel = () => {
    exportTaxReportData(taxSummary, currency, 'xlsx');
  };

  const handleExportCSV = () => {
    exportTaxReportData(taxSummary, currency, 'csv');
  };

  return (
    <div id="tax-summary-report-card" className="space-y-6">
      {/* Configuration Header */}
      <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ReceiptText className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold font-['Outfit',sans-serif] text-slate-900">
              Tax Summary & VAT Report
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            Automated sales tax (output VAT) and expense deductible tax (input VAT) calculation
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Period selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as any)}
              className="bg-transparent text-slate-700 font-semibold focus:outline-none pr-2 py-1 cursor-pointer"
            >
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
              <option value="all">All Time</option>
            </select>
          </div>

          {/* Tax Rate setting */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
            <Percent className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-600">Tax Rate:</span>
            <input
              type="number"
              min="0"
              max="100"
              value={taxRate}
              onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
              className="w-12 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-center font-bold text-slate-800"
            />
            <span className="text-slate-500">%</span>
          </div>

          {/* Export Actions */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleExportExcel}
              className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              title="Download Excel spreadsheet"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Excel</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              title="Download CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>CSV</span>
            </button>
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tax Report KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Sales */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex justify-between items-center text-xs text-slate-500">
            <span>Gross Sales (Tax Incl.)</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-extrabold text-slate-900 font-['Outfit',sans-serif]">
            {formatCurrency(taxSummary.grossSalesTaxInclusive, currency)}
          </p>
          <p className="text-[11px] text-slate-400">
            From {taxSummary.transactionsCount} sales transactions
          </p>
        </div>

        {/* Output Tax (Collected) */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex justify-between items-center text-xs text-slate-500">
            <span>Output Sales Tax ({taxRate}%)</span>
            <ReceiptText className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-xl font-extrabold text-indigo-600 font-['Outfit',sans-serif]">
            {formatCurrency(taxSummary.outputTaxAmount, currency)}
          </p>
          <p className="text-[11px] text-slate-400">
            Net Subtotal: {formatCurrency(taxSummary.netSalesTaxExclusive, currency)}
          </p>
        </div>

        {/* Input Tax (Expense Credit) */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex justify-between items-center text-xs text-slate-500">
            <span>Deductible Input Tax</span>
            <CreditCard className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xl font-extrabold text-amber-600 font-['Outfit',sans-serif]">
            -{formatCurrency(taxSummary.estimatedInputTaxAmount, currency)}
          </p>
          <p className="text-[11px] text-slate-400">
            Expenses: {formatCurrency(taxSummary.totalExpenses, currency)}
          </p>
        </div>

        {/* Net Tax Payable */}
        <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-2xl border border-slate-800 shadow-md space-y-1">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span>Net Tax Due</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xl font-extrabold text-emerald-400 font-['Outfit',sans-serif]">
            {formatCurrency(taxSummary.netTaxPayable, currency)}
          </p>
          <p className="text-[11px] text-slate-400">
            Output Tax minus Input Deductions
          </p>
        </div>
      </div>

      {/* Official Tax Computation Breakdown Sheet */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-900 font-['Outfit',sans-serif]">
            Formal Tax Breakdown Schedule &bull; {taxSummary.periodLabel}
          </h4>
          <span className="text-xs text-slate-500 font-mono">
            {taxSummary.startDate} &mdash; {taxSummary.endDate}
          </span>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          <div className="p-4 flex items-center justify-between hover:bg-slate-50">
            <div>
              <span className="font-bold text-slate-800">1. Total Revenue / Gross Sales</span>
              <p className="text-[11px] text-slate-400">Total customer receipts collected in period</p>
            </div>
            <span className="font-bold font-mono text-slate-900 text-sm">
              {formatCurrency(taxSummary.grossSalesTaxInclusive, currency)}
            </span>
          </div>

          <div className="p-4 flex items-center justify-between hover:bg-slate-50">
            <div>
              <span className="font-bold text-slate-800">2. Net Taxable Sales Base (Subtotal)</span>
              <p className="text-[11px] text-slate-400">Gross Sales &divide; (1 + {taxRate}%)</p>
            </div>
            <span className="font-bold font-mono text-slate-900 text-sm">
              {formatCurrency(taxSummary.netSalesTaxExclusive, currency)}
            </span>
          </div>

          <div className="p-4 flex items-center justify-between hover:bg-slate-50">
            <div>
              <span className="font-bold text-indigo-700">3. Output Tax Liability ({taxRate}%)</span>
              <p className="text-[11px] text-slate-400">Tax charged to customers on taxable sales</p>
            </div>
            <span className="font-bold font-mono text-indigo-700 text-sm">
              +{formatCurrency(taxSummary.outputTaxAmount, currency)}
            </span>
          </div>

          <div className="p-4 flex items-center justify-between hover:bg-slate-50">
            <div>
              <span className="font-bold text-amber-700">4. Input Tax Deduction on Qualified Expenses</span>
              <p className="text-[11px] text-slate-400">Allowable business expense tax offset</p>
            </div>
            <span className="font-bold font-mono text-amber-700 text-sm">
              -{formatCurrency(taxSummary.estimatedInputTaxAmount, currency)}
            </span>
          </div>

          <div className="p-4 bg-emerald-50/50 flex items-center justify-between font-bold text-sm">
            <div className="text-emerald-950">
              <span>5. NET TAX PAYABLE TO REVENUE AUTHORITY</span>
              <p className="text-[11px] font-normal text-emerald-700">Line 3 minus Line 4</p>
            </div>
            <span className="font-mono text-base text-emerald-700">
              {formatCurrency(taxSummary.netTaxPayable, currency)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
