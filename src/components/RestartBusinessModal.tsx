import React, { useState } from 'react';
import { 
  AlertTriangle, 
  RotateCcw, 
  Archive, 
  CheckCircle2, 
  ShieldAlert, 
  X, 
  Sparkles,
  Lock
} from 'lucide-react';
import { CurrencyCode } from '../types';

interface RestartBusinessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmRestart: () => Promise<void> | void;
  businessName: string;
  currency: CurrencyCode;
  currentPeriodNumber: number;
  totalSalesCount: number;
  totalProductsCount: number;
  isCashierMode?: boolean;
}

export const RestartBusinessModal: React.FC<RestartBusinessModalProps> = ({
  isOpen,
  onClose,
  onConfirmRestart,
  businessName,
  currency,
  currentPeriodNumber,
  totalSalesCount,
  totalProductsCount,
  isCashierMode = false,
}) => {
  const [confirmInput, setConfirmInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const isMatched = confirmInput.trim() === 'START FRESH';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMatched || isSubmitting) return;

    if (isCashierMode) {
      setErrorMsg('Cashier mode is active. Only the business owner can restart the business.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await onConfirmRestart();
      setConfirmInput('');
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to restart business. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      id="restart-business-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-fadeIn"
    >
      <div 
        id="restart-business-modal-container"
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="restart-business-title"
      >
        {/* Top Warning Banner */}
        <div className="bg-rose-50 border-b border-rose-100 px-6 py-5 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-600/30 shrink-0">
              <RotateCcw className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                Business Period #{currentPeriodNumber}
              </span>
              <h2 id="restart-business-title" className="text-xl font-black text-slate-900 mt-0.5">
                Start Fresh?
              </h2>
            </div>
          </div>
          <button
            id="btn-close-restart-modal"
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Exact Required Warning Copy */}
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-950 text-sm leading-relaxed">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-amber-900 text-sm">
                  This will hide your previous business records and give you a clean new starting point. Your account will remain active.
                </p>
                <p className="text-xs text-amber-800 mt-1.5">
                  All past sales ({totalSalesCount}), inventory items ({totalProductsCount}), expenses, and customers will be safely sealed into <strong className="font-bold">Archived Business Data</strong>. You will start fresh with zeroed balances.
                </p>
              </div>
            </div>
          </div>

          {/* Simple Breakdown for non-accounting owners */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>What Stays Intact</span>
              </div>
              <ul className="text-slate-600 space-y-1 pl-5 list-disc text-[11px]">
                <li>SmartLedger login &amp; password</li>
                <li>Business profile &amp; name ({businessName})</li>
                <li>Currency ({currency}) &amp; settings</li>
                <li>All archived historical records</li>
              </ul>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="flex items-center gap-1.5 text-rose-700 font-bold">
                <Sparkles className="w-4 h-4 text-rose-600" />
                <span>New Clean Slate (0)</span>
              </div>
              <ul className="text-slate-600 space-y-1 pl-5 list-disc text-[11px]">
                <li>Sales = 0 {currency}</li>
                <li>Profit &amp; Expenses = 0 {currency}</li>
                <li>Products, Customers, Suppliers = 0</li>
                <li>Cash Available = 0 {currency}</li>
                <li>Clean dashboard &amp; Business Feed</li>
              </ul>
            </div>
          </div>

          {/* Archive Reassurance Banner */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-900 text-xs">
            <Archive className="w-5 h-5 text-indigo-600 shrink-0" />
            <p>
              Previous records are <span className="font-bold">never deleted</span>. You can inspect or export them anytime in <span className="font-bold">Settings &rarr; Business &rarr; Archived Business Data</span>.
            </p>
          </div>

          {/* Confirmation Type Input */}
          <div className="space-y-2 pt-1">
            <label 
              htmlFor="restart-confirm-input"
              className="block text-xs font-bold text-slate-800"
            >
              To confirm, type <span className="text-rose-600 font-mono font-black bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">START FRESH</span> below:
            </label>
            <input
              id="restart-confirm-input"
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder="Type START FRESH"
              autoComplete="off"
              disabled={isSubmitting || isCashierMode}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none text-sm font-semibold tracking-wider transition-all placeholder:text-slate-400 uppercase"
            />
            {confirmInput.length > 0 && !isMatched && (
              <p className="text-[11px] text-amber-600 font-medium">
                Must match exact text: <span className="font-bold font-mono">START FRESH</span>
              </p>
            )}
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {isCashierMode && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Cashier Mode is active. Only the business owner can perform a restart. Unlock with owner PIN first.</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2.5">
            <button
              id="btn-cancel-restart"
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs transition-colors cursor-pointer text-center"
            >
              Cancel &amp; Keep Current Period
            </button>
            <button
              id="btn-confirm-restart-fresh"
              type="submit"
              disabled={!isMatched || isSubmitting || isCashierMode}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-extrabold text-xs shadow-md shadow-rose-600/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Archiving &amp; Starting Fresh...</span>
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4" />
                  <span>Restart Business &amp; Start Fresh</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
