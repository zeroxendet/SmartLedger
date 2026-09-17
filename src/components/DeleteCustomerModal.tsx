import React, { useState } from 'react';
import { Customer, Sale, CustomerReturn, OtherIncome, CurrencyCode } from '../types';
import { formatCurrency } from '../utils/calculations';
import { 
  AlertTriangle, 
  Trash2, 
  Archive, 
  X, 
  ShieldAlert, 
  Lock, 
  User, 
  FileText, 
  DollarSign, 
  CheckCircle2,
  Receipt
} from 'lucide-react';

interface DeleteCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  sales: Sale[];
  customerReturns?: CustomerReturn[];
  otherIncomes?: OtherIncome[];
  currency: CurrencyCode;
  isCashierMode?: boolean;
  onUnlockCashierMode?: () => void;
  onConfirmDelete: (customerId: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  onConfirmArchive?: (customerId: string) => Promise<{ success: boolean; message?: string; error?: string }>;
}

export const DeleteCustomerModal: React.FC<DeleteCustomerModalProps> = ({
  isOpen,
  onClose,
  customer,
  sales,
  customerReturns = [],
  otherIncomes = [],
  currency,
  isCashierMode = false,
  onUnlockCashierMode,
  onConfirmDelete,
  onConfirmArchive,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  if (!isOpen || !customer) return null;

  // 1. Scan for connected financial records
  const customerNameLower = customer.name.trim().toLowerCase();

  const connectedSales = sales.filter((s) => {
    if (s.customerId && s.customerId === customer.id) return true;
    if (s.customerName && s.customerName.trim().toLowerCase() === customerNameLower) return true;
    return false;
  });
  const totalSalesAmount = connectedSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);

  const connectedReturns = customerReturns.filter((r) => {
    if (r.customerId && r.customerId === customer.id) return true;
    if (r.customerName && r.customerName.trim().toLowerCase() === customerNameLower) return true;
    return false;
  });

  const connectedRepayments = otherIncomes.filter((i) => {
    return i.description && i.description.toLowerCase().includes(customerNameLower);
  });
  const totalRepayments = connectedRepayments.reduce((sum, i) => sum + (i.amount || 0), 0);

  const currentDebt = customer.amountOwed || 0;

  const hasFinancialHistory =
    connectedSales.length > 0 ||
    connectedReturns.length > 0 ||
    connectedRepayments.length > 0 ||
    currentDebt > 0;

  const handleDelete = async () => {
    if (hasFinancialHistory) {
      setFeedback({
        type: 'error',
        text: 'This customer has active financial records. Please use Archive Customer instead of permanent deletion.',
      });
      return;
    }

    setIsDeleting(true);
    setFeedback(null);
    try {
      const res = await onConfirmDelete(customer.id);
      if (res.success) {
        setIsDeleting(false);
        onClose();
      } else {
        setIsDeleting(false);
        setFeedback({ type: 'error', text: res.error || res.message || 'Failed to delete customer.' });
      }
    } catch (err: any) {
      setIsDeleting(false);
      setFeedback({ type: 'error', text: err?.message || 'Unexpected error while deleting customer.' });
    }
  };

  const handleArchive = async () => {
    if (!onConfirmArchive) return;
    setIsArchiving(true);
    setFeedback(null);
    try {
      const res = await onConfirmArchive(customer.id);
      if (res.success) {
        setIsArchiving(false);
        onClose();
      } else {
        setIsArchiving(false);
        setFeedback({ type: 'error', text: res.error || res.message || 'Failed to archive customer.' });
      }
    } catch (err: any) {
      setIsArchiving(false);
      setFeedback({ type: 'error', text: err?.message || 'Unexpected error while archiving customer.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-5 sm:px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${hasFinancialHistory ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>
              {hasFinancialHistory ? <AlertTriangle className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold font-['Outfit',sans-serif]">
                Delete this customer?
              </h3>
              <p className="text-[11px] text-slate-400">
                Customer Directory &amp; Debtor Audit
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4">

          {/* Customer Summary Card */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-slate-200/80 flex items-center justify-center text-slate-700 font-bold text-sm shrink-0">
                {customer.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-slate-900 truncate">
                  {customer.name}
                </h4>
                <p className="text-[11px] text-slate-500 truncate">
                  {customer.phone ? `Phone: ${customer.phone}` : 'No phone recorded'}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[10px] text-slate-400 block font-medium">Debt Balance</span>
              <span className={`text-xs font-bold ${currentDebt > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                {formatCurrency(currentDebt, currency)}
              </span>
            </div>
          </div>

          {/* Core explanation required by user */}
          <p className="text-xs text-slate-600 leading-relaxed">
            This will remove this customer record from your business. If this customer has sales, invoices, debt records, payments, or other financial records connected to it, explain clearly what will happen before deletion.
          </p>

          {/* Cashier Mode Warning */}
          {isCashierMode && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-amber-900 text-xs">
              <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-amber-950">Cashier Mode Is Active</p>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Only the Business Owner is authorized to delete or archive customers.
                </p>
                {onUnlockCashierMode && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onUnlockCashierMode();
                    }}
                    className="mt-1 text-xs font-bold text-amber-900 underline hover:text-amber-950 cursor-pointer"
                  >
                    Unlock Owner Mode with PIN →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Financial History Analysis */}
          {hasFinancialHistory ? (
            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/90 space-y-2.5">
              <div className="flex items-center gap-2 text-amber-950 font-bold text-xs">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Financial History Connected ({connectedSales.length + connectedRepayments.length + connectedReturns.length + (currentDebt > 0 ? 1 : 0)} records)</span>
              </div>

              <div className="space-y-1.5 text-xs text-amber-900 bg-white/70 p-2.5 rounded-xl border border-amber-200/50">
                {connectedSales.length > 0 && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1.5">
                      <Receipt className="w-3.5 h-3.5 text-amber-700" />
                      Sales Invoices:
                    </span>
                    <span className="font-bold">
                      {connectedSales.length} ({formatCurrency(totalSalesAmount, currency)})
                    </span>
                  </div>
                )}

                {connectedRepayments.length > 0 && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-amber-700" />
                      Debt Repayments:
                    </span>
                    <span className="font-bold">
                      {connectedRepayments.length} ({formatCurrency(totalRepayments, currency)})
                    </span>
                  </div>
                )}

                {connectedReturns.length > 0 && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-amber-700" />
                      Customer Returns:
                    </span>
                    <span className="font-bold">{connectedReturns.length} records</span>
                  </div>
                )}

                {currentDebt > 0 && (
                  <div className="flex items-center justify-between text-[11px] text-red-700">
                    <span className="flex items-center gap-1.5 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                      Unpaid Debt Balance:
                    </span>
                    <span className="font-bold">
                      {formatCurrency(currentDebt, currency)}
                    </span>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-amber-900 leading-relaxed">
                <strong>Accounting Safeguard:</strong> Permanently deleting this customer would orphan sales transactions, revenue metrics, receipts, and unpaid credit balances.
              </p>

              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-900">
                <p className="font-semibold flex items-center gap-1">
                  <Archive className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  Recommended: Archive Customer
                </p>
                <p className="text-[10.5px] text-emerald-800 mt-0.5">
                  Archiving safely removes this customer from your active debtor list while keeping all sales receipts and transaction history 100% intact.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/90 space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>No Connected Financial History</span>
              </div>
              <p className="text-[11px] text-emerald-900 leading-relaxed">
                This customer has <strong>0 sales invoices</strong>, <strong>0 payments</strong>, and <strong>no debt balance</strong>. It is safe to permanently delete this mistaken or duplicate record from your business database.
              </p>
            </div>
          )}

          {/* Feedback message */}
          {feedback && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                feedback.type === 'error'
                  ? 'bg-red-50 text-red-800 border border-red-200'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              }`}
            >
              {feedback.type === 'error' ? (
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="px-5 sm:px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting || isArchiving}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          {hasFinancialHistory ? (
            <button
              type="button"
              onClick={handleArchive}
              disabled={isArchiving || isCashierMode}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>{isArchiving ? 'Archiving...' : 'Archive Customer'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting || isCashierMode}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isDeleting ? 'Deleting...' : 'Delete Customer'}</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
