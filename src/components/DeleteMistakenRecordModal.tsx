import React from 'react';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';

export interface RecordCorrectionDetail {
  label: string;
  effect: string;
  isWarning?: boolean;
}

export interface DeleteMistakenRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  recordTitle?: string;
  recordTypeLabel?: string;
  recordAmountFormatted?: string;
  recordDateFormatted?: string;
  corrections?: RecordCorrectionDetail[];
  isDeleting?: boolean;
}

export const DeleteMistakenRecordModal: React.FC<DeleteMistakenRecordModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  recordTitle,
  recordTypeLabel,
  recordAmountFormatted,
  recordDateFormatted,
  corrections = [],
  isDeleting = false,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="delete-mistaken-record-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-red-100 overflow-hidden">
        {/* Header Banner */}
        <div className="bg-red-50 border-b border-red-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 border border-red-200 flex items-center justify-center text-red-600 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 id="delete-modal-title" className="text-base font-bold text-red-950 font-['Outfit',sans-serif]">
                Delete this record?
              </h3>
              <p className="text-[11px] text-red-700 font-medium">
                Safe Transaction Reversal
              </p>
            </div>
          </div>
          <button
            type="button"
            id="delete-modal-close-btn"
            onClick={onClose}
            disabled={isDeleting}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-red-100/50 transition-colors disabled:opacity-50 cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {/* Explicit User Warning Prompt */}
          <p className="text-sm font-medium text-slate-700 leading-relaxed">
            Are you sure this transaction was recorded by mistake? Deleting it will correct the related business records.
          </p>

          {/* Record Summary Box */}
          {(recordTitle || recordAmountFormatted) && (
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex items-center justify-between text-slate-500 font-medium">
                <span>{recordTypeLabel || 'Transaction'}</span>
                {recordDateFormatted && <span>{recordDateFormatted}</span>}
              </div>
              <div className="flex items-baseline justify-between font-bold">
                <span className="text-slate-900 truncate pr-2 text-sm">{recordTitle || 'Record'}</span>
                {recordAmountFormatted && (
                  <span className="text-slate-900 shrink-0 font-extrabold text-sm">
                    {recordAmountFormatted}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Corrections Breakdown */}
          {corrections.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Automatic Balance & Stock Adjustments:
              </span>
              <ul className="space-y-1 text-xs">
                {corrections.map((c, idx) => (
                  <li
                    key={idx}
                    className="p-2 rounded-lg bg-emerald-50/70 border border-emerald-100 text-emerald-900 flex items-start gap-2"
                  >
                    <span className="font-bold text-emerald-700 shrink-0">✓</span>
                    <div>
                      <span className="font-semibold">{c.label}: </span>
                      <span className="text-emerald-800">{c.effect}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-[11px] text-slate-500 italic">
            Note: Only mistaken entries belonging to your business workspace are deleted. An audit record of this reversal will be safely logged.
          </p>
        </div>

        {/* Modal Actions */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            id="delete-modal-cancel-btn"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            id="delete-modal-confirm-btn"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Deleting Record...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Record</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
