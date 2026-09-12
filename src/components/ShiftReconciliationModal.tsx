import React, { useState, useMemo } from 'react';
import { CashRegisterShift, Sale, Expense, OtherIncome, CurrencyCode, CustomerReturn } from '../types';
import { formatCurrency } from '../utils/calculations';
import { 
  X, 
  DollarSign, 
  Coins, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Printer, 
  Share2, 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  Lock, 
  Unlock,
  History,
  Check
} from 'lucide-react';

interface ShiftReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency: CurrencyCode;
  businessName: string;
  activeShift: CashRegisterShift | null;
  shiftHistory: CashRegisterShift[];
  sales: Sale[];
  expenses: Expense[];
  otherIncomes: OtherIncome[];
  returns: CustomerReturn[];
  onOpenShift: (startingFloat: number, cashierName: string) => void;
  onCloseShift: (closedShift: CashRegisterShift) => void;
}

export const ShiftReconciliationModal: React.FC<ShiftReconciliationModalProps> = ({
  isOpen,
  onClose,
  currency,
  businessName,
  activeShift,
  shiftHistory,
  sales,
  expenses,
  otherIncomes,
  returns,
  onOpenShift,
  onCloseShift,
}) => {
  const [tab, setTab] = useState<'current' | 'history' | 'zreport'>('current');
  
  // Open shift form
  const [startingFloatInput, setStartingFloatInput] = useState<string>('0');
  const [cashierNameInput, setCashierNameInput] = useState<string>('Cashier');

  // Close shift form
  const [countedCashInput, setCountedCashInput] = useState<string>('');
  const [closingNotes, setClosingNotes] = useState<string>('');
  const [selectedHistoricalShift, setSelectedHistoricalShift] = useState<CashRegisterShift | null>(null);
  const [copiedToast, setCopiedToast] = useState(false);

  // Calculate live shift statistics if shift is currently OPEN
  const shiftStats = useMemo(() => {
    if (!activeShift) {
      return {
        cashSales: 0,
        momoSales: 0,
        bankSales: 0,
        creditSales: 0,
        totalSales: 0,
        salesCount: 0,
        cashExpenses: 0,
        cashCustomerRepayments: 0,
        cashRefunds: 0,
        expectedCash: 0,
      };
    }

    const shiftStartTime = new Date(activeShift.openedAt).getTime();

    // Sales made after shift opened
    const shiftSales = sales.filter((s) => new Date(s.date).getTime() >= shiftStartTime);
    const cashSales = shiftSales
      .filter((s) => s.paymentMethod === 'Cash')
      .reduce((sum, s) => sum + s.totalAmount, 0);
    const momoSales = shiftSales
      .filter((s) => s.paymentMethod === 'Mobile Money')
      .reduce((sum, s) => sum + s.totalAmount, 0);
    const bankSales = shiftSales
      .filter((s) => s.paymentMethod === 'Bank')
      .reduce((sum, s) => sum + s.totalAmount, 0);
    const creditSales = shiftSales
      .filter((s) => s.paymentMethod === 'Credit')
      .reduce((sum, s) => sum + s.totalAmount, 0);
    const totalSales = shiftSales.reduce((sum, s) => sum + s.totalAmount, 0);

    // Cash expenses during shift
    const shiftExpenses = expenses.filter((e) => {
      const time = new Date(e.date).getTime();
      return time >= shiftStartTime && (e.paidVia === 'Cash' || !e.paidVia);
    });
    const cashExpenses = shiftExpenses.reduce((sum, e) => sum + e.amount, 0);

    // Cash repayments received during shift
    const shiftRepayments = otherIncomes.filter((inc) => {
      const time = new Date(inc.date).getTime();
      return time >= shiftStartTime && inc.description?.toLowerCase().includes('customer debt repayment');
    });
    const cashCustomerRepayments = shiftRepayments.reduce((sum, inc) => sum + inc.amount, 0);

    // Cash refunds during shift
    const shiftRefunds = returns.filter((r) => {
      const time = new Date(r.date).getTime();
      return time >= shiftStartTime && r.refundMethod === 'Cash';
    });
    const cashRefunds = shiftRefunds.reduce((sum, r) => sum + r.refundAmount, 0);

    const expectedCash = activeShift.startingFloat + cashSales + cashCustomerRepayments - cashExpenses - cashRefunds;

    return {
      cashSales,
      momoSales,
      bankSales,
      creditSales,
      totalSales,
      salesCount: shiftSales.length,
      cashExpenses,
      cashCustomerRepayments,
      cashRefunds,
      expectedCash,
    };
  }, [activeShift, sales, expenses, otherIncomes, returns]);

  if (!isOpen) return null;

  const countedCashNumber = parseFloat(countedCashInput) || 0;
  const variance = activeShift ? countedCashNumber - shiftStats.expectedCash : 0;

  const handleStartShiftSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const float = parseFloat(startingFloatInput) || 0;
    onOpenShift(float, cashierNameInput.trim() || 'Cashier');
  };

  const handleCloseShiftSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift) return;

    const closed: CashRegisterShift = {
      ...activeShift,
      closedAt: new Date().toISOString(),
      expectedCash: shiftStats.expectedCash,
      actualCashCounted: countedCashNumber,
      cashVariance: variance,
      status: 'CLOSED',
      notes: closingNotes.trim(),
      totalSalesAmount: shiftStats.totalSales,
      cashSales: shiftStats.cashSales,
      momoSales: shiftStats.momoSales,
      bankSales: shiftStats.bankSales,
      creditSales: shiftStats.creditSales,
      totalExpensesCash: shiftStats.cashExpenses,
      totalCustomerRepaymentsCash: shiftStats.cashCustomerRepayments,
      refundsTotal: shiftStats.cashRefunds,
    };

    onCloseShift(closed);
    setSelectedHistoricalShift(closed);
    setTab('zreport');
    setCountedCashInput('');
    setClosingNotes('');
  };

  const zReportData = selectedHistoricalShift || activeShift;

  const generateZReportText = (shift: CashRegisterShift) => {
    const isClosed = shift.status === 'CLOSED';
    return `
========================================
       ${businessName.toUpperCase()}
          ${isClosed ? 'Z-REPORT (DAILY CLOSING)' : 'X-REPORT (MID-SHIFT AUDIT)'}
========================================
Shift ID: ${shift.id}
Cashier: ${shift.cashierName}
Opened: ${new Date(shift.openedAt).toLocaleString()}
${shift.closedAt ? `Closed: ${new Date(shift.closedAt).toLocaleString()}` : 'Status: IN PROGRESS'}
----------------------------------------
SALES BREAKDOWN
- Cash Sales: ${formatCurrency(shift.cashSales, currency)}
- Mobile Money: ${formatCurrency(shift.momoSales, currency)}
- Bank / Card: ${formatCurrency(shift.bankSales, currency)}
- Credit Sales: ${formatCurrency(shift.creditSales, currency)}
TOTAL SALES: ${formatCurrency(shift.totalSalesAmount, currency)}
----------------------------------------
CASH DRAWER RECONCILIATION
- Starting Float: ${formatCurrency(shift.startingFloat, currency)}
+ Cash Sales: ${formatCurrency(shift.cashSales, currency)}
+ Cash Repayments: ${formatCurrency(shift.totalCustomerRepaymentsCash, currency)}
- Cash Payouts/Expenses: ${formatCurrency(shift.totalExpensesCash, currency)}
- Cash Refunds: ${formatCurrency(shift.refundsTotal, currency)}
EXPECTED CASH IN TILL: ${formatCurrency(shift.expectedCash, currency)}
${isClosed ? `ACTUAL CASH COUNTED: ${formatCurrency(shift.actualCashCounted ?? 0, currency)}
VARIANCE: ${shift.cashVariance === 0 ? 'BALANCED ($0.00)' : shift.cashVariance! > 0 ? `OVERAGE (+${formatCurrency(shift.cashVariance!, currency)})` : `SHORTAGE (${formatCurrency(shift.cashVariance!, currency)})`}` : ''}
----------------------------------------
${shift.notes ? `Notes: ${shift.notes}\n----------------------------------------` : ''}
Cashier Signature: ______________________
Manager Signature: ______________________
========================================
`.trim();
  };

  const handleCopyZReport = (shift: CashRegisterShift) => {
    const text = generateZReportText(shift);
    navigator.clipboard.writeText(text);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2000);
  };

  const handlePrintZReport = () => {
    window.print();
  };

  return (
    <div 
      id="shift-reconciliation-modal" 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${activeShift ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold font-['Outfit',sans-serif] text-slate-900 flex items-center gap-2">
                <span>Cash Register & Shift Reconciliation</span>
                {activeShift ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    SHIFT OPEN
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-200 text-slate-700">
                    REGISTER CLOSED
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500">
                End-of-day cash drawer balancing, float tracking & Z-Report
              </p>
            </div>
          </div>

          <button
            id="close-shift-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-100/70 px-6 pt-2 gap-2 text-xs font-bold">
          <button
            onClick={() => setTab('current')}
            className={`pb-2 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              tab === 'current'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Coins className="w-4 h-4" />
            <span>Active Register</span>
          </button>

          <button
            onClick={() => setTab('history')}
            className={`pb-2 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              tab === 'history'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Shift History ({shiftHistory.length})</span>
          </button>

          {(selectedHistoricalShift || activeShift) && (
            <button
              onClick={() => setTab('zreport')}
              className={`pb-2 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                tab === 'zreport'
                  ? 'border-emerald-600 text-emerald-800'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Z-Report Receipt</span>
            </button>
          )}
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {tab === 'current' && (
            <>
              {!activeShift ? (
                /* STATE 1: REGISTER IS CLOSED - OPEN SHIFT */
                <form onSubmit={handleStartShiftSubmit} className="space-y-5">
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
                    <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-amber-950 text-sm">Register is currently closed</h4>
                      <p className="mt-0.5 text-amber-800">
                        Opening a shift sets your starting cash float (the physical change in your till) and begins tracking all cash sales, expenses, and payments for daily reconciliation.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Cashier / Operator Name
                      </label>
                      <input
                        id="start-shift-cashier-input"
                        type="text"
                        required
                        value={cashierNameInput}
                        onChange={(e) => setCashierNameInput(e.target.value)}
                        placeholder="e.g. John / Morning Shift"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Starting Cash Float ({currency})
                      </label>
                      <input
                        id="start-shift-float-input"
                        type="number"
                        min="0"
                        step="any"
                        required
                        value={startingFloatInput}
                        onChange={(e) => setStartingFloatInput(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                      <span className="text-[11px] text-slate-400">Cash in drawer at start of shift</span>
                    </div>
                  </div>

                  <button
                    id="open-register-submit-btn"
                    type="submit"
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>Open Register & Start Shift</span>
                  </button>
                </form>
              ) : (
                /* STATE 2: REGISTER IS OPEN - RECONCILE & CLOSE SHIFT */
                <div className="space-y-6">
                  {/* Shift Info Banner */}
                  <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-400">
                          Active Shift
                        </span>
                        <span className="text-xs text-slate-400">&bull;</span>
                        <span className="text-xs font-bold text-slate-200">{activeShift.cashierName}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Opened at: {new Date(activeShift.openedAt).toLocaleTimeString()} ({new Date(activeShift.openedAt).toLocaleDateString()})
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedHistoricalShift(null);
                        setTab('zreport');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>View Current X-Report</span>
                    </button>
                  </div>

                  {/* Cash Flow Summary Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-[10px] font-bold uppercase text-slate-500 block">Starting Float</span>
                      <p className="text-base font-extrabold text-slate-800 mt-1">
                        {formatCurrency(activeShift.startingFloat, currency)}
                      </p>
                    </div>

                    <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                      <span className="text-[10px] font-bold uppercase text-emerald-700 block">Cash Sales (+)</span>
                      <p className="text-base font-extrabold text-emerald-900 mt-1">
                        {formatCurrency(shiftStats.cashSales, currency)}
                      </p>
                      <span className="text-[10px] text-emerald-700">{shiftStats.salesCount} total sales</span>
                    </div>

                    <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
                      <span className="text-[10px] font-bold uppercase text-amber-700 block">Cash Payouts (-)</span>
                      <p className="text-base font-extrabold text-amber-900 mt-1">
                        {formatCurrency(shiftStats.cashExpenses + shiftStats.cashRefunds, currency)}
                      </p>
                      <span className="text-[10px] text-amber-700">Expenses & refunds</span>
                    </div>

                    <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl">
                      <span className="text-[10px] font-bold uppercase text-indigo-700 block">Digital Sales</span>
                      <p className="text-base font-extrabold text-indigo-900 mt-1">
                        {formatCurrency(shiftStats.momoSales + shiftStats.bankSales, currency)}
                      </p>
                      <span className="text-[10px] text-indigo-700">MoMo / Bank / Card</span>
                    </div>
                  </div>

                  {/* Expected Cash in Drawer Callout */}
                  <div className="p-4 rounded-xl bg-emerald-50 border-2 border-emerald-300 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                        Expected Physical Cash in Drawer
                      </span>
                      <p className="text-2xl font-extrabold font-['Outfit',sans-serif] text-emerald-950 mt-0.5">
                        {formatCurrency(shiftStats.expectedCash, currency)}
                      </p>
                      <p className="text-[11px] text-emerald-700 mt-0.5">
                        Float ({formatCurrency(activeShift.startingFloat, currency)}) + Cash In ({formatCurrency(shiftStats.cashSales + shiftStats.cashCustomerRepayments, currency)}) - Cash Out ({formatCurrency(shiftStats.cashExpenses + shiftStats.cashRefunds, currency)})
                      </p>
                    </div>
                    <DollarSign className="w-8 h-8 text-emerald-600 opacity-80" />
                  </div>

                  {/* Closing Cash Count Form */}
                  <form onSubmit={handleCloseShiftSubmit} className="space-y-4 pt-2 border-t border-slate-200">
                    <h4 className="text-sm font-bold font-['Outfit',sans-serif] text-slate-900 flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-slate-700" />
                      <span>Reconcile Drawer & Close Shift (Z-Report)</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Actual Physical Cash Counted ({currency}) *
                        </label>
                        <input
                          id="closing-cash-counted-input"
                          type="number"
                          step="any"
                          required
                          value={countedCashInput}
                          onChange={(e) => setCountedCashInput(e.target.value)}
                          placeholder="Count your notes & coins"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-extrabold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                        <span className="text-[11px] text-slate-500">Total counted in till</span>
                      </div>

                      {/* Live Variance Calculation */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Variance (Discrepancy)
                        </label>
                        <div className={`px-3.5 py-2 rounded-xl border flex items-center justify-between ${
                          !countedCashInput 
                            ? 'bg-slate-50 border-slate-200 text-slate-400'
                            : variance === 0
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                            : variance > 0
                            ? 'bg-blue-50 border-blue-300 text-blue-800'
                            : 'bg-red-50 border-red-300 text-red-800'
                        }`}>
                          <div>
                            <span className="text-sm font-extrabold">
                              {!countedCashInput ? 'Enter count...' : formatCurrency(variance, currency)}
                            </span>
                            <p className="text-[10px] font-semibold">
                              {!countedCashInput
                                ? 'Awaiting cash count'
                                : variance === 0
                                ? 'Perfect Match! Exact 0 variance'
                                : variance > 0
                                ? 'Cash Overage (+extra cash)'
                                : 'Cash Shortage (-missing cash)'}
                            </p>
                          </div>
                          {countedCashInput && (
                            variance === 0 ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> :
                            variance > 0 ? <TrendingUp className="w-5 h-5 text-blue-600" /> :
                            <TrendingDown className="w-5 h-5 text-red-600" />
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Shift Closing Notes / Explanation (Optional)
                      </label>
                      <input
                        id="closing-notes-input"
                        type="text"
                        value={closingNotes}
                        onChange={(e) => setClosingNotes(e.target.value)}
                        placeholder="e.g. 500 RWF short due to broken change coin, verified by manager"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <button
                      id="close-shift-submit-btn"
                      type="submit"
                      className="w-full py-3 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Lock className="w-4 h-4 text-emerald-400" />
                      <span>Close Shift & Generate Z-Report</span>
                    </button>
                  </form>
                </div>
              )}
            </>
          )}

          {/* TAB 2: SHIFT HISTORY */}
          {tab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-800">Completed Shift Records</h4>
                <span className="text-xs text-slate-500">{shiftHistory.length} recorded shift(s)</span>
              </div>

              {shiftHistory.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <History className="w-8 h-8 mx-auto opacity-50" />
                  <p className="text-xs">No closed shifts yet. Complete a shift to see Z-Reports here.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {shiftHistory.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => {
                        setSelectedHistoricalShift(s);
                        setTab('zreport');
                      }}
                      className="p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{s.cashierName}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-mono">
                            {new Date(s.openedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Sales: {formatCurrency(s.totalSalesAmount, currency)} &bull; Cash Expected: {formatCurrency(s.expectedCash, currency)}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className={`text-xs font-bold ${
                          (s.cashVariance || 0) === 0
                            ? 'text-emerald-700'
                            : (s.cashVariance || 0) > 0
                            ? 'text-blue-700'
                            : 'text-red-700'
                        }`}>
                          {(s.cashVariance || 0) === 0 
                            ? 'Balanced' 
                            : (s.cashVariance || 0) > 0 
                            ? `+${formatCurrency(s.cashVariance!, currency)}` 
                            : formatCurrency(s.cashVariance!, currency)}
                        </span>
                        <span className="block text-[10px] text-emerald-600 font-semibold">View Z-Report &rarr;</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Z-REPORT RECEIPT */}
          {tab === 'zreport' && zReportData && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    {zReportData.status === 'CLOSED' ? 'Official Z-Report (Daily Closing)' : 'Mid-Shift X-Report (Audit)'}
                  </h4>
                  <p className="text-xs text-slate-500">
                    Timestamp: {new Date(zReportData.closedAt || zReportData.openedAt).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopyZReport(zReportData)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-colors"
                  >
                    {copiedToast ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
                    <span>{copiedToast ? 'Copied!' : 'Copy'}</span>
                  </button>
                  <button
                    onClick={handlePrintZReport}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print</span>
                  </button>
                </div>
              </div>

              {/* Thermal paper style printout */}
              <div className="bg-slate-50 border-2 border-dashed border-slate-300 p-6 rounded-2xl font-mono text-xs text-slate-800 space-y-4 max-w-md mx-auto shadow-inner">
                <div className="text-center pb-3 border-b border-dashed border-slate-300">
                  <h2 className="text-base font-bold uppercase">{businessName}</h2>
                  <p className="text-[11px] text-slate-600">
                    {zReportData.status === 'CLOSED' ? '*** Z-REPORT (DAILY CLOSING) ***' : '*** X-REPORT (INTERIM AUDIT) ***'}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">Shift ID: {zReportData.id}</p>
                </div>

                <div className="text-[11px] space-y-1">
                  <div className="flex justify-between">
                    <span>Cashier:</span>
                    <span className="font-bold">{zReportData.cashierName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Opened:</span>
                    <span>{new Date(zReportData.openedAt).toLocaleTimeString()}</span>
                  </div>
                  {zReportData.closedAt && (
                    <div className="flex justify-between">
                      <span>Closed:</span>
                      <span>{new Date(zReportData.closedAt).toLocaleTimeString()}</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-dashed border-slate-300 pt-2 space-y-1 text-[11px]">
                  <p className="font-bold text-slate-900 pb-1">SALES BY PAYMENT METHOD</p>
                  <div className="flex justify-between">
                    <span>Cash Sales:</span>
                    <span className="font-bold">{formatCurrency(zReportData.cashSales, currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Mobile Money:</span>
                    <span className="font-bold">{formatCurrency(zReportData.momoSales, currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Bank / POS Card:</span>
                    <span className="font-bold">{formatCurrency(zReportData.bankSales, currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Customer Credit (Debt):</span>
                    <span className="font-bold">{formatCurrency(zReportData.creditSales, currency)}</span>
                  </div>
                  <div className="flex justify-between font-bold pt-1 border-t border-slate-200">
                    <span>TOTAL SALES:</span>
                    <span>{formatCurrency(zReportData.totalSalesAmount, currency)}</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-300 pt-2 space-y-1 text-[11px]">
                  <p className="font-bold text-slate-900 pb-1">CASH DRAWER RECONCILIATION</p>
                  <div className="flex justify-between">
                    <span>Starting Float:</span>
                    <span>{formatCurrency(zReportData.startingFloat, currency)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700">
                    <span>+ Cash Sales:</span>
                    <span>+{formatCurrency(zReportData.cashSales, currency)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700">
                    <span>+ Customer Repayments:</span>
                    <span>+{formatCurrency(zReportData.totalCustomerRepaymentsCash, currency)}</span>
                  </div>
                  <div className="flex justify-between text-amber-700">
                    <span>- Cash Payouts:</span>
                    <span>-{formatCurrency(zReportData.totalExpensesCash, currency)}</span>
                  </div>
                  <div className="flex justify-between text-amber-700">
                    <span>- Cash Refunds:</span>
                    <span>-{formatCurrency(zReportData.refundsTotal, currency)}</span>
                  </div>
                  <div className="flex justify-between font-bold pt-1 border-t border-slate-200">
                    <span>EXPECTED IN TILL:</span>
                    <span>{formatCurrency(zReportData.expectedCash, currency)}</span>
                  </div>
                  {zReportData.status === 'CLOSED' && (
                    <>
                      <div className="flex justify-between font-bold">
                        <span>ACTUAL CASH COUNTED:</span>
                        <span>{formatCurrency(zReportData.actualCashCounted ?? 0, currency)}</span>
                      </div>
                      <div className={`flex justify-between font-extrabold pt-1 border-t border-slate-200 ${
                        (zReportData.cashVariance || 0) === 0 ? 'text-emerald-700' : (zReportData.cashVariance || 0) > 0 ? 'text-blue-700' : 'text-red-700'
                      }`}>
                        <span>VARIANCE:</span>
                        <span>
                          {(zReportData.cashVariance || 0) === 0 ? 'BALANCED ($0)' :
                           (zReportData.cashVariance || 0) > 0 ? `+${formatCurrency(zReportData.cashVariance!, currency)} (OVER)` :
                           `${formatCurrency(zReportData.cashVariance!, currency)} (SHORT)`}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {zReportData.notes && (
                  <div className="border-t border-dashed border-slate-300 pt-2 text-[10px] text-slate-600">
                    <span className="font-bold">Note:</span> {zReportData.notes}
                  </div>
                )}

                <div className="border-t border-dashed border-slate-300 pt-6 space-y-4 text-[10px] text-slate-500">
                  <div className="flex justify-between">
                    <span>Cashier: ____________________</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Manager: ____________________</span>
                  </div>
                  <p className="text-center italic pt-2">Generated by SmartLedger POS</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
