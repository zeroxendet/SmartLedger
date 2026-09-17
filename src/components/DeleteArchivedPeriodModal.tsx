import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Trash2, 
  X, 
  Lock, 
  Unlock, 
  ShieldAlert, 
  CheckCircle2, 
  Package, 
  TrendingUp, 
  Receipt, 
  Loader2 
} from 'lucide-react';
import { ArchivedBusinessPeriod, BusinessProfile } from '../types';
import { formatCurrency } from '../utils/calculations';

interface DeleteArchivedPeriodModalProps {
  isOpen: boolean;
  onClose: () => void;
  period: ArchivedBusinessPeriod | null;
  profile: BusinessProfile;
  isCashierMode?: boolean;
  onUnlockCashierMode?: () => void;
  onConfirmDelete: (period: ArchivedBusinessPeriod) => Promise<{ success: boolean; message?: string; error?: string }>;
}

export const DeleteArchivedPeriodModal: React.FC<DeleteArchivedPeriodModalProps> = ({
  isOpen,
  onClose,
  period,
  profile,
  isCashierMode = false,
  onUnlockCashierMode,
  onConfirmDelete,
}) => {
  const [securityInput, setSecurityInput] = useState('');
  const [hasAcknowledged, setHasAcknowledged] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !period) return null;

  // Safeguard: Never allow deleting the active current business period
  const isCurrentActivePeriod = 
    period.id === profile.currentPeriodId || 
    period.periodNumber === profile.periodNumber;

  const hasPin = Boolean(profile.cashierPin && profile.cashierPin.length >= 4);

  // Security validation:
  // If owner PIN exists, accept either matching owner PIN OR typing "DELETE"
  // If no PIN exists, require typing "DELETE"
  const isSecurityValid = hasPin
    ? (securityInput === profile.cashierPin || securityInput.trim().toUpperCase() === 'DELETE')
    : (securityInput.trim().toUpperCase() === 'DELETE');

  const canSubmit = !isCashierMode && !isCurrentActivePeriod && isSecurityValid && hasAcknowledged && !isDeleting;

  const handleDelete = async () => {
    if (!canSubmit) return;
    setErrorMessage(null);
    setIsDeleting(true);

    try {
      const res = await onConfirmDelete(period);
      if (res.success) {
        // Reset and close
        setSecurityInput('');
        setHasAcknowledged(false);
        setIsDeleting(false);
        onClose();
      } else {
        setErrorMessage(res.error || res.message || 'Failed to delete archived period.');
        setIsDeleting(false);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'An unexpected error occurred while deleting.');
      setIsDeleting(false);
    }
  };

  return (
    <div 
      id="delete-archived-period-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-archived-period-title"
    >
      <div 
        id="delete-archived-period-modal-card"
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-red-200 overflow-hidden my-6 flex flex-col"
      >
        {/* Header with strong warning banner */}
        <div className="bg-red-600 text-white px-6 py-4 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-red-200">
                Owner Security Authorization
              </span>
              <h3 id="delete-archived-period-title" className="text-base font-bold text-white leading-snug">
                Permanently delete this archived business data?
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="p-1.5 rounded-xl text-red-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 text-xs text-slate-700 overflow-y-auto max-h-[75vh]">
          {/* Primary User Explanation Requirement */}
          <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-950 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-red-900 text-xs">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>Irreversible Database Action</span>
            </div>
            <p className="text-xs text-red-800 leading-relaxed">
              This will permanently delete all records stored in this archived period, including sales, expenses, products, profit records, and related business data. This action cannot be undone.
            </p>
          </div>

          {/* Target Archived Period Snapshot Card */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-slate-900 text-sm">
                {period.periodLabel}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-bold text-[10px]">
                Period #{period.periodNumber}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <div className="p-2 rounded-xl bg-white border border-slate-200 text-center">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Sales Total</span>
                <span className="font-extrabold text-emerald-700 text-xs">
                  {formatCurrency(period.summary.totalSales, period.currency)}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-white border border-slate-200 text-center">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Net Profit</span>
                <span className="font-extrabold text-teal-700 text-xs">
                  {formatCurrency(period.summary.totalProfit, period.currency)}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-white border border-slate-200 text-center">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Expenses</span>
                <span className="font-extrabold text-rose-700 text-xs">
                  {formatCurrency(period.summary.totalExpenses, period.currency)}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-white border border-slate-200 text-center">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Products</span>
                <span className="font-extrabold text-slate-800 text-xs">
                  {period.summary.productsCount}
                </span>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 pt-1 flex items-center justify-between">
              <span>Recorded: {new Date(period.startedAt).toLocaleDateString()} &mdash; {new Date(period.archivedAt).toLocaleDateString()}</span>
              <span>{period.sales.length} sales &bull; {period.expenses.length} expenses</span>
            </div>
          </div>

          {/* Active Period Guard */}
          {isCurrentActivePeriod && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Safety protection active: This period matches your currently active business period. Active periods cannot be permanently deleted.
              </span>
            </div>
          )}

          {/* Cashier Mode Role Protection */}
          {isCashierMode ? (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-950">
                <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Owner Permission Required</span>
              </div>
              <p className="text-xs text-amber-800">
                Cashier mode is currently active. Cashiers, managers, or other staff do not have permission to delete archived business records.
              </p>
              {onUnlockCashierMode && (
                <button
                  type="button"
                  onClick={onUnlockCashierMode}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Unlock Owner Mode</span>
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Additional Owner Security Step */}
              <div className="space-y-2 pt-1">
                <label className="block font-bold text-slate-900">
                  {hasPin ? 'Owner Security Verification (PIN or Type DELETE)' : 'Owner Security Confirmation (Type DELETE)'}
                </label>
                <p className="text-[11px] text-slate-500">
                  {hasPin 
                    ? `To prevent accidental loss of financial records, enter your 4-digit Owner PIN or type "DELETE" below:`
                    : `To verify you intend to permanently destroy this archived period, type "DELETE" below:`}
                </p>
                <div className="relative">
                  <input
                    type={hasPin ? 'text' : 'text'}
                    value={securityInput}
                    onChange={(e) => {
                      setSecurityInput(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder={hasPin ? 'Enter Owner PIN or type DELETE' : 'Type DELETE to confirm'}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold tracking-wider outline-none transition-all ${
                      isSecurityValid
                        ? 'border-emerald-500 bg-emerald-50/40 text-emerald-950 ring-2 ring-emerald-500/20'
                        : 'border-slate-300 focus:border-red-500 bg-white text-slate-900'
                    }`}
                  />
                  {isSecurityValid && (
                    <span className="absolute right-3 top-2.5 text-emerald-600 flex items-center gap-1 font-bold text-[11px]">
                      <CheckCircle2 className="w-4 h-4" /> Verified
                    </span>
                  )}
                </div>
              </div>

              {/* Acknowledgment Checkbox */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/70 transition-colors">
                <input
                  type="checkbox"
                  checked={hasAcknowledged}
                  onChange={(e) => setHasAcknowledged(e.target.checked)}
                  className="mt-0.5 rounded text-red-600 focus:ring-red-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-[11px] text-slate-700 leading-snug">
                  I understand that this action is permanent, will delete all records in this archived period from the database, and cannot be restored.
                </span>
              </label>
            </>
          )}

          {/* Error display */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          
          <button
            type="button"
            onClick={handleDelete}
            disabled={!canSubmit}
            className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
              canSubmit
                ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/30'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
            }`}
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Deleting Permanently...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Delete Permanently</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
