import React, { useState } from 'react';
import { X, AlertCircle, HelpCircle, Send } from 'lucide-react';
import { Sale, SaleCorrectionRequest, CurrencyCode } from '../types';

interface SaleCorrectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  currency: CurrencyCode;
  staffId: string;
  staffName: string;
  businessId: string;
  onSubmitRequest: (request: Omit<SaleCorrectionRequest, 'id' | 'requestedAt' | 'status'>) => void;
}

export const SaleCorrectionModal: React.FC<SaleCorrectionModalProps> = ({
  isOpen,
  onClose,
  sale,
  currency,
  staffId,
  staffName,
  businessId,
  onSubmitRequest,
}) => {
  const [reason, setReason] = useState('Duplicate sale recorded');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen || !sale) return null;

  const itemsSummary = sale.items
    ? sale.items.map((i) => `${i.quantity}x ${i.name || i.productName || 'Item'}`).join(', ')
    : 'Items';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitRequest({
      businessId,
      saleId: sale.id,
      invoiceNumber: sale.invoiceNumber || sale.receiptNumber || sale.id.slice(-6),
      staffId,
      staffName,
      reason,
      notes: notes.trim(),
      saleAmount: sale.totalAmount || 0,
      saleItemsSummary: itemsSummary,
      paymentMethod: sale.paymentMethod,
    });
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-['Outfit',sans-serif]">
                Request Sale Correction
              </h3>
              <p className="text-xs text-slate-500">
                Need help correcting this transaction?
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="py-8 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              ✓
            </div>
            <h4 className="text-base font-bold text-slate-800">Correction Request Sent</h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Your business owner or manager will review and approve this correction.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Transaction:</span>
                <span className="font-bold text-slate-800 font-mono">
                  #{sale.invoiceNumber || sale.receiptNumber || sale.id.slice(-6)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount:</span>
                <span className="font-extrabold text-slate-900">
                  {sale.totalAmount.toLocaleString()} {currency}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Items:</span>
                <span className="font-medium text-slate-700 truncate max-w-[200px]">
                  {itemsSummary}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Reason for Correction:
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                <option value="Duplicate sale recorded">Duplicate sale recorded</option>
                <option value="Wrong product or quantity entered">Wrong product or quantity entered</option>
                <option value="Incorrect payment method selected">Incorrect payment method selected</option>
                <option value="Customer returned items">Customer returned items</option>
                <option value="Accidental transaction entry">Accidental transaction entry</option>
                <option value="Other error">Other error</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Additional Details (Optional):
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Scanned twice at the counter"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none resize-none"
              />
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 flex items-start gap-2 text-[11px] text-amber-800">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                To protect business financial integrity, sale deletions require Owner/Manager review and approval.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm shadow-amber-200 flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Request Correction</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
