import React, { useState, useMemo } from 'react';
import { Sale, CustomerReturn, CurrencyCode } from '../types';
import { formatCurrency } from '../utils/calculations';
import { 
  calculatePaymentMethodReport, 
  SupportedPaymentMethod, 
  PaymentReportTimeframe,
  PaymentMethodTransactionDetail 
} from '../utils/paymentReports';
import { 
  Banknote, 
  Smartphone, 
  Building2, 
  Calendar, 
  ChevronRight, 
  ArrowRight,
  TrendingUp, 
  Receipt, 
  User, 
  Package, 
  X, 
  CheckCircle2, 
  RotateCcw,
  Layers,
  FileSpreadsheet,
  Clock,
  Filter
} from 'lucide-react';

interface PaymentMethodSalesReportProps {
  sales: Sale[];
  returns?: CustomerReturn[];
  currency: CurrencyCode;
  onNavigateToSales?: () => void;
  className?: string;
  defaultTimeframe?: PaymentReportTimeframe;
}

export const PaymentMethodSalesReport: React.FC<PaymentMethodSalesReportProps> = ({
  sales,
  returns = [],
  currency,
  onNavigateToSales,
  className = '',
  defaultTimeframe = 'today',
}) => {
  const [timeframe, setTimeframe] = useState<PaymentReportTimeframe>(defaultTimeframe);
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [selectedMethodDetail, setSelectedMethodDetail] = useState<SupportedPaymentMethod | null>(null);

  // Compute live report data
  const report = useMemo(() => {
    return calculatePaymentMethodReport(
      sales,
      returns,
      timeframe,
      timeframe === 'custom' ? { startDate: customStartDate, endDate: customEndDate } : undefined
    );
  }, [sales, returns, timeframe, customStartDate, customEndDate]);

  const activeTransactions = selectedMethodDetail 
    ? report.transactionsByMethod[selectedMethodDetail] 
    : [];

  const getMethodIcon = (method: SupportedPaymentMethod) => {
    switch (method) {
      case 'Cash':
        return <Banknote className="w-5 h-5 text-emerald-600" />;
      case 'Mobile Money':
        return <Smartphone className="w-5 h-5 text-amber-600" />;
      case 'Bank':
        return <Building2 className="w-5 h-5 text-indigo-600" />;
    }
  };

  const getMethodTheme = (method: SupportedPaymentMethod) => {
    switch (method) {
      case 'Cash':
        return {
          bg: 'bg-emerald-50/60',
          border: 'border-emerald-200',
          hover: 'hover:border-emerald-400 hover:bg-emerald-50',
          text: 'text-emerald-950',
          subtext: 'text-emerald-700',
          badgeBg: 'bg-emerald-100 text-emerald-800',
          activeRing: 'ring-2 ring-emerald-500',
        };
      case 'Mobile Money':
        return {
          bg: 'bg-amber-50/60',
          border: 'border-amber-200',
          hover: 'hover:border-amber-400 hover:bg-amber-50',
          text: 'text-amber-950',
          subtext: 'text-amber-700',
          badgeBg: 'bg-amber-100 text-amber-800',
          activeRing: 'ring-2 ring-amber-500',
        };
      case 'Bank':
        return {
          bg: 'bg-indigo-50/60',
          border: 'border-indigo-200',
          hover: 'hover:border-indigo-400 hover:bg-indigo-50',
          text: 'text-indigo-950',
          subtext: 'text-indigo-700',
          badgeBg: 'bg-indigo-100 text-indigo-800',
          activeRing: 'ring-2 ring-indigo-500',
        };
    }
  };

  return (
    <div 
      id="payment-method-sales-report-container"
      className={`p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6 ${className}`}
    >
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <Banknote className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-lg font-bold font-['Outfit',sans-serif] text-slate-900">
                Sales by Payment Method
              </h3>
              <p className="text-xs text-slate-500">
                Automatic separation of cash, mobile money, and bank deposits
              </p>
            </div>
          </div>
        </div>

        {/* DATE RANGE FILTER BUTTONS */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/80 p-1.5 rounded-xl border border-slate-200 text-xs font-semibold">
          {[
            { id: 'today' as PaymentReportTimeframe, label: 'Today' },
            { id: 'yesterday' as PaymentReportTimeframe, label: 'Yesterday' },
            { id: 'this_week' as PaymentReportTimeframe, label: 'This Week' },
            { id: 'this_month' as PaymentReportTimeframe, label: 'This Month' },
            { id: 'custom' as PaymentReportTimeframe, label: 'Custom Range' },
          ].map((item) => (
            <button
              key={item.id}
              id={`filter-payment-report-${item.id}`}
              type="button"
              onClick={() => setTimeframe(item.id)}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                timeframe === item.id
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* CUSTOM DATE RANGE PICKER (WHEN 'CUSTOM' SELECTED) */}
      {timeframe === 'custom' && (
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center gap-3 text-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <label htmlFor="payment-report-start-date" className="font-bold text-slate-700">
              From:
            </label>
            <input
              id="payment-report-start-date"
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs font-medium"
            />
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="payment-report-end-date" className="font-bold text-slate-700">
              To:
            </label>
            <input
              id="payment-report-end-date"
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs font-medium"
            />
          </div>

          <span className="text-slate-400 text-[11px]">
            &bull; Showing transactions between {customStartDate} and {customEndDate}
          </span>
        </div>
      )}

      {/* 4 PRIMARY REPORT CARDS: Cash, Mobile Money, Bank, Total Sales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. CASH CARD */}
        <div
          id="report-method-card-cash"
          onClick={() => setSelectedMethodDetail(selectedMethodDetail === 'Cash' ? null : 'Cash')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
            getMethodTheme('Cash').bg
          } ${getMethodTheme('Cash').border} ${getMethodTheme('Cash').hover} ${
            selectedMethodDetail === 'Cash' ? getMethodTheme('Cash').activeRing : ''
          }`}
          title="Tap to view all Cash transactions"
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">💵</span>
                <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                  Cash
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                {report.cash.percentage.toFixed(1)}%
              </span>
            </div>

            <div className="mt-3">
              <p className="text-xs text-slate-500 font-medium">Amount</p>
              <p className="text-2xl font-extrabold text-slate-900 font-['Outfit',sans-serif]">
                {formatCurrency(report.cash.amount, currency)}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-emerald-200/60 flex items-center justify-between text-xs text-emerald-800 font-semibold">
            <span>
              Number of transactions: <strong>{report.cash.transactionCount}</strong>
            </span>
            <span className="flex items-center gap-0.5 text-[11px] text-emerald-700 font-bold hover:underline">
              <span>{selectedMethodDetail === 'Cash' ? 'Hide' : 'Details'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* 2. MOBILE MONEY CARD */}
        <div
          id="report-method-card-mobile-money"
          onClick={() => setSelectedMethodDetail(selectedMethodDetail === 'Mobile Money' ? null : 'Mobile Money')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
            getMethodTheme('Mobile Money').bg
          } ${getMethodTheme('Mobile Money').border} ${getMethodTheme('Mobile Money').hover} ${
            selectedMethodDetail === 'Mobile Money' ? getMethodTheme('Mobile Money').activeRing : ''
          }`}
          title="Tap to view all Mobile Money transactions"
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">📱</span>
                <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                  Mobile Money
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                {report.mobileMoney.percentage.toFixed(1)}%
              </span>
            </div>

            <div className="mt-3">
              <p className="text-xs text-slate-500 font-medium">Amount</p>
              <p className="text-2xl font-extrabold text-slate-900 font-['Outfit',sans-serif]">
                {formatCurrency(report.mobileMoney.amount, currency)}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-amber-200/60 flex items-center justify-between text-xs text-amber-800 font-semibold">
            <span>
              Number of transactions: <strong>{report.mobileMoney.transactionCount}</strong>
            </span>
            <span className="flex items-center gap-0.5 text-[11px] text-amber-700 font-bold hover:underline">
              <span>{selectedMethodDetail === 'Mobile Money' ? 'Hide' : 'Details'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* 3. BANK CARD */}
        <div
          id="report-method-card-bank"
          onClick={() => setSelectedMethodDetail(selectedMethodDetail === 'Bank' ? null : 'Bank')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
            getMethodTheme('Bank').bg
          } ${getMethodTheme('Bank').border} ${getMethodTheme('Bank').hover} ${
            selectedMethodDetail === 'Bank' ? getMethodTheme('Bank').activeRing : ''
          }`}
          title="Tap to view all Bank transactions"
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🏦</span>
                <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                  Bank
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                {report.bank.percentage.toFixed(1)}%
              </span>
            </div>

            <div className="mt-3">
              <p className="text-xs text-slate-500 font-medium">Amount</p>
              <p className="text-2xl font-extrabold text-slate-900 font-['Outfit',sans-serif]">
                {formatCurrency(report.bank.amount, currency)}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-indigo-200/60 flex items-center justify-between text-xs text-indigo-800 font-semibold">
            <span>
              Number of transactions: <strong>{report.bank.transactionCount}</strong>
            </span>
            <span className="flex items-center gap-0.5 text-[11px] text-indigo-700 font-bold hover:underline">
              <span>{selectedMethodDetail === 'Bank' ? 'Hide' : 'Details'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* 4. TOTAL SALES CARD */}
        <div
          id="report-method-card-total"
          className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 text-white border border-slate-800 shadow-md flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">📊</span>
                <span className="text-xs font-extrabold text-slate-200 uppercase tracking-wider">
                  Total Sales
                </span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {report.timeframeLabel}
              </span>
            </div>

            <div className="mt-3">
              <p className="text-xs text-slate-400 font-medium">Total Revenue</p>
              <p className="text-2xl font-extrabold text-white font-['Outfit',sans-serif]">
                {formatCurrency(report.totalSales, currency)}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300 font-semibold">
            <span>
              Total Transactions: <strong>{report.totalTransactions}</strong>
            </span>
            <span className="text-[11px] text-emerald-400 font-bold">
              100% Tracked
            </span>
          </div>
        </div>
      </div>

      {/* TRANSACTION DRILLDOWN DETAILS PANEL (WHEN A METHOD IS TAPPED) */}
      {selectedMethodDetail && (
        <div 
          id="payment-method-drilldown-panel"
          className="p-4 sm:p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 animate-fade-in"
        >
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-white border border-slate-200 shadow-xs">
                {getMethodIcon(selectedMethodDetail)}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  {selectedMethodDetail} Transactions ({report.timeframeLabel})
                </h4>
                <p className="text-xs text-slate-500">
                  Total {selectedMethodDetail} collected:{' '}
                  <strong className="text-slate-900 font-extrabold">
                    {formatCurrency(
                      selectedMethodDetail === 'Cash'
                        ? report.cash.amount
                        : selectedMethodDetail === 'Mobile Money'
                        ? report.mobileMoney.amount
                        : report.bank.amount,
                      currency
                    )}
                  </strong>{' '}
                  &bull; {activeTransactions.length} transaction record(s)
                </p>
              </div>
            </div>

            <button
              id="close-method-drilldown-btn"
              type="button"
              onClick={() => setSelectedMethodDetail(null)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              title="Close details"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* TRANSACTIONS LIST */}
          {activeTransactions.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs space-y-2">
              <p className="font-semibold text-slate-600">
                No {selectedMethodDetail} transactions found for {report.timeframeLabel.toLowerCase()}.
              </p>
              <p className="text-[11px]">
                When customers pay via {selectedMethodDetail}, they will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Date / Time</th>
                    <th className="py-2.5 px-3">Invoice Number</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Products Sold</th>
                    <th className="py-2.5 px-3 text-right">Amount ({selectedMethodDetail})</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80">
                  {activeTransactions.map((tx) => (
                    <tr 
                      key={tx.id} 
                      className={`hover:bg-white transition-colors ${
                        tx.isRefundEntry ? 'bg-rose-50/50' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                        <span className="font-medium text-slate-900 block">
                          {new Date(tx.date).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(tx.date).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                        {tx.invoiceNumber}
                      </td>

                      <td className="py-3 px-3 font-medium text-slate-800 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{tx.customerName}</span>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-slate-700 max-w-xs">
                        <div className="flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="truncate" title={tx.productsSummary}>
                            {tx.productsSummary}
                          </span>
                        </div>
                        {tx.isSplit && (
                          <span className="inline-block mt-1 text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Split Payment (Total: {formatCurrency(tx.totalSaleAmount, currency)})
                          </span>
                        )}
                        {tx.refundReason && (
                          <span className="inline-block mt-1 text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800">
                            Reason: {tx.refundReason}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <span className={`font-extrabold ${
                          tx.isRefundEntry ? 'text-rose-600' : 'text-slate-900'
                        }`}>
                          {tx.isRefundEntry ? '-' : '+'}
                          {formatCurrency(Math.abs(tx.methodAmount), currency)}
                        </span>
                        {tx.isSplit && (
                          <span className="block text-[10px] text-slate-400">
                            of {formatCurrency(tx.totalSaleAmount, currency)}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          tx.isRefundEntry
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {tx.isRefundEntry ? (
                            <RotateCcw className="w-3 h-3" />
                          ) : (
                            <CheckCircle2 className="w-3 h-3" />
                          )}
                          <span>{tx.status}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
