import React from 'react';
import { 
  X, 
  Trash2, 
  Calendar, 
  Clock, 
  FileText, 
  User, 
  Package, 
  Tag, 
  CreditCard, 
  DollarSign, 
  AlertTriangle 
} from 'lucide-react';
import { CurrencyCode, Sale, Expense, Purchase, WasteLog, ProductionLog, OtherIncome } from '../types';
import { formatCurrency } from '../utils/calculations';
import { DisplayFeedItem } from './BusinessFeedView';

export interface ActivityDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: DisplayFeedItem | null;
  currency: CurrencyCode;
  underlyingRecord?: {
    type: 'sale' | 'expense' | 'purchase' | 'customer_payment' | 'waste' | 'return' | 'production' | 'activity_only';
    record: any;
  } | null;
  onOpenDelete: () => void;
}

export const ActivityDetailsModal: React.FC<ActivityDetailsModalProps> = ({
  isOpen,
  onClose,
  item,
  currency,
  underlyingRecord,
  onOpenDelete,
}) => {
  if (!isOpen || !item) return null;

  const formattedDate = item.timestamp
    ? new Date(item.timestamp).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Unknown Date';

  // Badge configuration based on item type
  let typeLabel = 'Activity';
  let badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
  let iconEmoji = '📄';

  if (item.type === 'sale') {
    typeLabel = 'Sales Transaction';
    badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    iconEmoji = '🛒';
  } else if (item.type === 'expense') {
    typeLabel = 'Business Expense';
    badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
    iconEmoji = '💸';
  } else if (item.type === 'purchase') {
    typeLabel = 'Supplier Restock / Purchase';
    badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
    iconEmoji = '📦';
  } else if (item.type === 'waste') {
    typeLabel = 'Waste / Damaged Goods';
    badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
    iconEmoji = '⚠️';
  } else if (item.type === 'debt') {
    typeLabel = 'Customer Debt Payment';
    badgeColor = 'bg-indigo-50 text-indigo-700 border-indigo-200';
    iconEmoji = '👤';
  } else if (item.type === 'production') {
    typeLabel = 'Production Batch';
    badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
    iconEmoji = '🥖';
  }

  const saleRecord = underlyingRecord?.type === 'sale' ? (underlyingRecord.record as Sale) : null;
  const expenseRecord = underlyingRecord?.type === 'expense' ? (underlyingRecord.record as Expense) : null;
  const purchaseRecord = underlyingRecord?.type === 'purchase' ? (underlyingRecord.record as Purchase) : null;
  const wasteRecord = underlyingRecord?.type === 'waste' ? (underlyingRecord.record as WasteLog) : null;
  const prodRecord = underlyingRecord?.type === 'production' ? (underlyingRecord.record as ProductionLog) : null;

  return (
    <div
      id="activity-details-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/75">
          <div className="flex items-center gap-3">
            <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg border ${badgeColor}`}>
              {iconEmoji}
            </span>
            <div>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${badgeColor}`}>
                {typeLabel}
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-0.5 font-['Outfit',sans-serif]">
                Transaction Details
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close details"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
          {/* Main Title & Amount Banner */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
              {item.subtitle && <p className="text-slate-500 mt-0.5">{item.subtitle}</p>}
            </div>
            {item.amountFormatted && (
              <div className="text-right sm:text-right shrink-0">
                <span className={`text-xl font-extrabold ${item.amountClass || 'text-slate-900'}`}>
                  {item.amountFormatted}
                </span>
              </div>
            )}
          </div>

          {/* Timing Info */}
          <div className="grid grid-cols-2 gap-3 text-slate-600">
            <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Recorded At</span>
                <span className="font-semibold text-slate-800">{formattedDate}</span>
              </div>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Relative Time</span>
                <span className="font-semibold text-slate-800">{item.relativeTime}</span>
              </div>
            </div>
          </div>

          {/* Sale Specific Breakdown */}
          {saleRecord && (
            <div className="space-y-3">
              <div className="flex items-center justify-between font-bold text-slate-900 border-b border-slate-100 pb-1">
                <span>Invoice Information</span>
                <span className="text-slate-500">#{saleRecord.invoiceNumber || saleRecord.id}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-slate-50 p-2.5 rounded-lg">
                  <span className="text-slate-400 block">Customer</span>
                  <span className="font-bold text-slate-800">{saleRecord.customerName || 'Walk-in Customer'}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg">
                  <span className="text-slate-400 block">Payment Method</span>
                  <span className="font-bold text-slate-800">{saleRecord.paymentMethod}</span>
                </div>
              </div>

              {saleRecord.items && saleRecord.items.length > 0 && (
                <div>
                  <span className="font-bold text-slate-800 block mb-1.5">Purchased Items:</span>
                  <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
                    {saleRecord.items.map((it, idx) => (
                      <div key={idx} className="p-2.5 flex items-center justify-between text-xs bg-white">
                        <div>
                          <span className="font-semibold text-slate-900">{it.productName}</span>
                          <span className="text-slate-400 ml-2">
                            {it.quantity} &times; {formatCurrency(it.sellingPrice, currency)}
                          </span>
                        </div>
                        <span className="font-bold text-slate-900">
                          {formatCurrency(it.total ?? (it.sellingPrice * it.quantity), currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Purchase Specific Breakdown */}
          {purchaseRecord && (
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <span className="font-bold text-slate-900 block">Purchase Details</span>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-slate-50 p-2.5 rounded-lg">
                  <span className="text-slate-400 block">Supplier</span>
                  <span className="font-bold text-slate-800">{purchaseRecord.supplierName}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg">
                  <span className="text-slate-400 block">Status</span>
                  <span className="font-bold text-slate-800">
                    {purchaseRecord.paymentStatus === 'PAID' ? 'Paid Immediately' : 'Pay Later (Debt)'}
                  </span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg">
                  <span className="text-slate-400 block">Item Restocked</span>
                  <span className="font-bold text-slate-800">{purchaseRecord.productName}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg">
                  <span className="text-slate-400 block">Quantity Restocked</span>
                  <span className="font-bold text-slate-800">{purchaseRecord.quantity} units</span>
                </div>
              </div>
            </div>
          )}

          {/* Expense Specific Breakdown */}
          {expenseRecord && (
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <span className="font-bold text-slate-900 block">Expense Breakdown</span>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-slate-50 p-2.5 rounded-lg">
                  <span className="text-slate-400 block">Category</span>
                  <span className="font-bold text-slate-800">{expenseRecord.category}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg">
                  <span className="text-slate-400 block">Paid Via</span>
                  <span className="font-bold text-slate-800">{expenseRecord.paidVia || 'Cash'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Waste Specific Breakdown */}
          {wasteRecord && (
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <span className="font-bold text-slate-900 block">Waste Report</span>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-slate-50 p-2.5 rounded-lg">
                  <span className="text-slate-400 block">Product</span>
                  <span className="font-bold text-slate-800">{wasteRecord.productName}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg">
                  <span className="text-slate-400 block">Quantity Wasted</span>
                  <span className="font-bold text-slate-800">{wasteRecord.quantityWasted} units</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg col-span-2">
                  <span className="text-slate-400 block">Reason</span>
                  <span className="font-bold text-slate-800">{wasteRecord.reason}</span>
                </div>
              </div>
            </div>
          )}

          {/* Voided Audit Notice */}
          {item.isVoided && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Audit Record:</strong> This transaction was previously deleted or reversed to correct mistaken business records.
              </span>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>

          {!item.isVoided && (
            <button
              type="button"
              id="feed-details-delete-btn"
              onClick={() => {
                onClose();
                onOpenDelete();
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Mistaken Record</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
