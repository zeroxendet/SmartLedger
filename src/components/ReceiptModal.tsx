import React, { useState } from 'react';
import { Sale, CurrencyCode, BusinessProfile, Customer } from '../types';
import { formatCurrency } from '../utils/calculations';
import { generateWhatsAppReceiptText, openWhatsAppReceipt } from '../utils/receiptUtils';
import { 
  X, 
  Printer, 
  Share2, 
  Send, 
  Check, 
  Smartphone, 
  FileText,
  Copy
} from 'lucide-react';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale;
  profile: BusinessProfile;
  currency: CurrencyCode;
  customers: Customer[];
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  sale,
  profile,
  currency,
  customers,
}) => {
  const [paperFormat, setPaperFormat] = useState<'58mm' | '80mm'>('58mm');
  const [copied, setCopied] = useState(false);
  
  // Find customer phone if available
  const existingCustomer = customers.find((c) => c.id === sale.customerId || c.name === sale.customerName);
  const [targetPhone, setTargetPhone] = useState(existingCustomer?.phone || '');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const receiptText = generateWhatsAppReceiptText(
    sale,
    profile.name,
    currency,
    profile.phone
  );

  const handleWhatsAppSend = () => {
    openWhatsAppReceipt(targetPhone, receiptText);
    showToast('Opening WhatsApp with formatted receipt...');
  };

  const handleCopyText = () => {
    navigator.clipboard?.writeText(receiptText);
    setCopied(true);
    showToast('Receipt text copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  return (
    <div 
      id="receipt-preview-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in"
    >
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-base font-bold font-['Outfit',sans-serif]">
                Receipt #{sale.invoiceNumber || sale.id.substring(0, 8)}
              </h3>
              <p className="text-xs text-slate-400">Thermal Print & WhatsApp E-Receipt</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Controls & Format Selector */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600">Paper Format:</span>
            <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5">
              <button
                onClick={() => setPaperFormat('58mm')}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  paperFormat === '58mm'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                58mm Thermal
              </button>
              <button
                onClick={() => setPaperFormat('80mm')}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  paperFormat === '80mm'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                80mm Thermal
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Print</span>
            </button>
            <button
              onClick={handleCopyText}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-600" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 bg-slate-100/50 flex flex-col items-center">
          {/* WhatsApp Direct Send Box */}
          <div className="w-full bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                Send Instant E-Receipt via WhatsApp
              </span>
              <span className="text-[11px] text-emerald-700">One-click delivery</span>
            </div>
            <div className="flex gap-2">
              <input
                type="tel"
                placeholder="Enter customer WhatsApp number (+250...)"
                value={targetPhone}
                onChange={(e) => setTargetPhone(e.target.value)}
                className="flex-1 bg-white border border-emerald-300 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                id="whatsapp-direct-send-btn"
                onClick={handleWhatsAppSend}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-all shadow-sm cursor-pointer whitespace-nowrap"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send WhatsApp</span>
              </button>
            </div>
          </div>

          {/* Thermal Paper Container */}
          <div 
            id="printable-thermal-receipt"
            className={`bg-white border border-slate-300 shadow-md p-5 rounded-md font-mono text-slate-900 transition-all ${
              paperFormat === '58mm' ? 'w-[280px] text-[11px]' : 'w-[360px] text-[12px]'
            }`}
          >
            {/* Store Header */}
            <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-400">
              <h4 className="font-bold text-sm tracking-tight text-slate-950 font-sans">
                {profile.name}
              </h4>
              {profile.address && (
                <p className="text-[10px] text-slate-600 leading-tight">{profile.address}</p>
              )}
              {profile.phone && (
                <p className="text-[10px] text-slate-600">Tel: {profile.phone}</p>
              )}
              <div className="text-[10px] font-bold text-slate-700 pt-1">
                *** SALES RECEIPT ***
              </div>
            </div>

            {/* Receipt Meta */}
            <div className="py-2.5 border-b border-dashed border-slate-400 space-y-1 text-[10px] text-slate-600">
              <div className="flex justify-between">
                <span>INVOICE #:</span>
                <span className="font-bold text-slate-900">{sale.invoiceNumber || sale.id.substring(0, 8)}</span>
              </div>
              <div className="flex justify-between">
                <span>DATE:</span>
                <span>{new Date(sale.date).toLocaleDateString()} {new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              {sale.customerName && (
                <div className="flex justify-between">
                  <span>CUSTOMER:</span>
                  <span className="font-bold text-slate-800">{sale.customerName}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>PAYMENT:</span>
                <span className="font-bold text-slate-800">{sale.paymentMethod}</span>
              </div>
            </div>

            {/* Itemized Table */}
            <div className="py-2.5 space-y-2 border-b border-dashed border-slate-400">
              <div className="flex justify-between font-bold text-[10px] text-slate-700 uppercase">
                <span>Item</span>
                <span>Total</span>
              </div>
              {sale.items.map((it, idx) => {
                const itemTotal = it.total ?? ((it.sellingPrice || 0) * it.quantity);
                return (
                  <div key={idx} className="space-y-0.5">
                    <div className="flex justify-between font-semibold">
                      <span className="truncate max-w-[180px]">{it.productName}</span>
                      <span>{formatCurrency(itemTotal, currency)}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 pl-2">
                      {it.quantity} &times; {formatCurrency(it.sellingPrice || 0, currency)}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total Section */}
            <div className="py-2.5 space-y-1.5 border-b border-dashed border-slate-400 text-xs">
              <div className="flex justify-between font-bold text-sm text-slate-950">
                <span>TOTAL:</span>
                <span>{formatCurrency(sale.totalAmount, currency)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-600">
                <span>Status:</span>
                <span className="font-bold uppercase">{sale.paymentStatus || 'PAID'}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center pt-4 space-y-1 text-[10px] text-slate-500">
              <p>Thank you for your business!</p>
              <p>Please keep this receipt for returns</p>
              {/* Fake barcode graphic */}
              <div className="pt-2 flex flex-col items-center justify-center">
                <div className="h-7 w-4/5 bg-slate-900 flex items-center justify-between px-2">
                  <div className="h-full w-1 bg-white" />
                  <div className="h-full w-2 bg-slate-900" />
                  <div className="h-full w-1 bg-white" />
                  <div className="h-full w-3 bg-slate-900" />
                  <div className="h-full w-1 bg-white" />
                  <div className="h-full w-1 bg-white" />
                  <div className="h-full w-2 bg-slate-900" />
                  <div className="h-full w-1 bg-white" />
                </div>
                <span className="text-[9px] tracking-widest text-slate-400 mt-0.5">
                  *{sale.invoiceNumber || sale.id.substring(0, 8)}*
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info & Dismiss */}
        <div className="p-4 bg-white border-t border-slate-200 flex justify-between items-center text-xs">
          <span className="text-slate-500">Press Print or use browser print dialog</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>

        {/* Floating in-app toast */}
        {toastMsg && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-full shadow-lg border border-slate-700 animate-fade-in z-50">
            {toastMsg}
          </div>
        )}
      </div>
    </div>
  );
};
