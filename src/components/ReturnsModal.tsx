import React, { useState } from 'react';
import { Sale, CustomerReturn, Product, Customer, CurrencyCode, PaymentMethod } from '../types';
import { formatCurrency } from '../utils/calculations';
import { 
  X, 
  RotateCcw, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  Package, 
  ArrowRight, 
  Receipt, 
  Printer, 
  Check, 
  Share2,
  Trash2,
  Undo2
} from 'lucide-react';

interface ReturnsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sales: Sale[];
  products: Product[];
  customers: Customer[];
  currency: CurrencyCode;
  businessName: string;
  onProcessReturn: (returnData: {
    customerReturn: CustomerReturn;
    restock: boolean;
    wasteReason?: string;
  }) => void;
}

export const ReturnsModal: React.FC<ReturnsModalProps> = ({
  isOpen,
  onClose,
  sales,
  products,
  customers,
  currency,
  businessName,
  onProcessReturn,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  
  // Return form states
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [returnQty, setReturnQty] = useState<number>(1);
  const [refundAmount, setRefundAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('Defective / Damaged');
  const [restock, setRestock] = useState<boolean>(true);
  const [refundMethod, setRefundMethod] = useState<PaymentMethod | 'Store Credit'>('Cash');
  const [notes, setNotes] = useState<string>('');
  
  // Success receipt state
  const [completedReturn, setCompletedReturn] = useState<CustomerReturn | null>(null);
  const [copiedToast, setCopiedToast] = useState(false);

  if (!isOpen) return null;

  // Filter sales matching invoice or customer
  const filteredSales = sales.filter((s) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      (s.invoiceNumber && s.invoiceNumber.toLowerCase().includes(term)) ||
      (s.customerName && s.customerName.toLowerCase().includes(term)) ||
      s.items.some((i) => i.productName.toLowerCase().includes(term))
    );
  }).slice(0, 15);

  const currentSaleItem = selectedSale?.items.find((i) => i.productId === selectedProductId);

  const handleSelectSale = (sale: Sale) => {
    setSelectedSale(sale);
    if (sale.items.length > 0) {
      const first = sale.items[0];
      setSelectedProductId(first.productId);
      setReturnQty(1);
      const price = first.sellingPrice || first.unitPrice || (first.total ? first.total / first.quantity : 0);
      setRefundAmount(price.toString());
      setRefundMethod(sale.paymentMethod);
    }
  };

  const handleSelectProduct = (prodId: string) => {
    setSelectedProductId(prodId);
    const item = selectedSale?.items.find((i) => i.productId === prodId);
    if (item) {
      setReturnQty(1);
      const price = item.sellingPrice || item.unitPrice || (item.total ? item.total / item.quantity : 0);
      setRefundAmount(price.toString());
    }
  };

  const handleQtyChange = (qty: number) => {
    if (!currentSaleItem) return;
    const bounded = Math.max(1, Math.min(qty, currentSaleItem.quantity));
    setReturnQty(bounded);
    const unitPrice = currentSaleItem.sellingPrice || currentSaleItem.unitPrice || (currentSaleItem.total ? currentSaleItem.total / currentSaleItem.quantity : 0);
    setRefundAmount((unitPrice * bounded).toString());
  };

  const handleSubmitReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSale || !currentSaleItem) return;

    const refundAmt = parseFloat(refundAmount) || 0;
    const newReturn: CustomerReturn = {
      id: `ret_${Date.now()}`,
      invoiceId: selectedSale.id,
      invoiceNumber: selectedSale.invoiceNumber || selectedSale.id,
      productId: currentSaleItem.productId,
      productName: currentSaleItem.productName,
      quantity: returnQty,
      refundAmount: refundAmt,
      restocked: restock,
      refundMethod,
      customerName: selectedSale.customerName,
      customerId: selectedSale.customerId,
      reason: `${reason}${notes ? ` - ${notes}` : ''}`,
      date: new Date().toISOString(),
    };

    onProcessReturn({
      customerReturn: newReturn,
      restock,
      wasteReason: restock ? undefined : reason,
    });

    setCompletedReturn(newReturn);
  };

  const handleReset = () => {
    setSelectedSale(null);
    setSelectedProductId('');
    setCompletedReturn(null);
    setSearchTerm('');
  };

  const generateReturnReceiptText = (ret: CustomerReturn) => {
    return `
========================================
       ${businessName.toUpperCase()}
       RETURN & REFUND VOUCHER
========================================
Voucher #: ${ret.id}
Date: ${new Date(ret.date).toLocaleString()}
Original Invoice: #${ret.invoiceNumber}
Customer: ${ret.customerName || 'Walk-in Customer'}
----------------------------------------
ITEM RETURNED:
${ret.productName}
Quantity Returned: ${ret.quantity}
Refund Amount: ${formatCurrency(ret.refundAmount, currency)}
Refund Method: ${ret.refundMethod}
Inventory Action: ${ret.restocked ? 'Restocked into Inventory' : 'Marked as Damaged/Waste'}
Reason: ${ret.reason}
----------------------------------------
Customer Signature: ____________________
Authorized By: _________________________
========================================
`.trim();
  };

  const handleCopyReceipt = () => {
    if (!completedReturn) return;
    const text = generateReturnReceiptText(completedReturn);
    navigator.clipboard.writeText(text);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2000);
  };

  return (
    <div 
      id="returns-refunds-modal" 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto"
    >
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold font-['Outfit',sans-serif] text-slate-900">
                Customer Returns & Refunds
              </h3>
              <p className="text-xs text-slate-500">
                Reverse sales, restock merchandise or write-off damaged goods
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {completedReturn ? (
            /* SUCCESS VOUCHER STATE */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-1">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <h4 className="text-base font-bold text-emerald-950 font-['Outfit',sans-serif]">
                  Refund Processed Successfully!
                </h4>
                <p className="text-xs text-emerald-800">
                  {formatCurrency(completedReturn.refundAmount, currency)} refunded via {completedReturn.refundMethod}.
                  {completedReturn.restocked ? ' Item returned to inventory stock.' : ' Item logged to damaged/waste write-offs.'}
                </p>
              </div>

              {/* Thermal Receipt Slip */}
              <div className="bg-slate-50 border-2 border-dashed border-slate-300 p-5 rounded-2xl font-mono text-xs text-slate-800 space-y-3 shadow-inner">
                <div className="text-center pb-2 border-b border-dashed border-slate-300">
                  <h3 className="font-bold text-sm uppercase">{businessName}</h3>
                  <p className="text-[10px] text-slate-500">RETURN / REFUND RECEIPT</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">#{completedReturn.id}</p>
                </div>

                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span>Original Invoice:</span>
                    <span className="font-bold">#{completedReturn.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Customer:</span>
                    <span>{completedReturn.customerName || 'Walk-in'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span>{new Date(completedReturn.date).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-300 pt-2 space-y-1 text-[11px]">
                  <div className="flex justify-between font-bold">
                    <span>{completedReturn.productName}</span>
                    <span>x{completedReturn.quantity}</span>
                  </div>
                  <div className="flex justify-between text-amber-800 font-extrabold text-sm pt-1">
                    <span>REFUND AMOUNT:</span>
                    <span>{formatCurrency(completedReturn.refundAmount, currency)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-600">
                    <span>Refund Method:</span>
                    <span>{completedReturn.refundMethod}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-600">
                    <span>Inventory Action:</span>
                    <span>{completedReturn.restocked ? 'Restocked (+Stock)' : 'Damaged (Scrapped)'}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-600">
                    <span>Reason:</span>
                    <span>{completedReturn.reason}</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-300 pt-4 space-y-3 text-[10px] text-slate-500">
                  <div className="flex justify-between">
                    <span>Customer: ________________</span>
                    <span>Cashier: ________________</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCopyReceipt}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                >
                  {copiedToast ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
                  <span>{copiedToast ? 'Copied to Clipboard!' : 'Share / Copy Slip'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
                >
                  Another Return
                </button>
              </div>
            </div>
          ) : !selectedSale ? (
            /* STEP 1: SEARCH & SELECT INVOICE */
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Find Original Sale / Receipt
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    placeholder="Search by invoice #, customer name, or product..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Recent Invoices ({filteredSales.length})
                </span>

                {filteredSales.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                    No sales matching your search term.
                  </div>
                ) : (
                  <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                    {filteredSales.map((sale) => (
                      <div
                        key={sale.id}
                        onClick={() => handleSelectSale(sale)}
                        className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-emerald-50/50 hover:border-emerald-300 transition-all cursor-pointer flex items-center justify-between group"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold font-mono text-slate-900">
                              #{sale.invoiceNumber || sale.id.slice(-6)}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-semibold">
                              {sale.paymentMethod}
                            </span>
                            {sale.customerName && (
                              <span className="text-xs font-semibold text-emerald-800">
                                {sale.customerName}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1">
                            {sale.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}
                          </p>
                          <span className="text-[10px] text-slate-400">
                            {new Date(sale.date).toLocaleString()}
                          </span>
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-extrabold text-slate-900 font-['Outfit',sans-serif]">
                            {formatCurrency(sale.totalAmount, currency)}
                          </p>
                          <span className="text-[11px] font-bold text-emerald-600 group-hover:underline flex items-center justify-end gap-1 mt-1">
                            Select Sale &rarr;
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* STEP 2: CONFIGURE RETURN LINE ITEM & REFUND */
            <form onSubmit={handleSubmitReturn} className="space-y-4">
              {/* Selected Invoice Banner */}
              <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Selected Invoice</span>
                  <p className="text-xs font-bold text-slate-900">
                    #{selectedSale.invoiceNumber || selectedSale.id.slice(-6)} &bull; {selectedSale.customerName || 'Walk-in'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSale(null)}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 underline cursor-pointer"
                >
                  Change Sale
                </button>
              </div>

              {/* Choose Product to Return */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Item Being Returned *
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => handleSelectProduct(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                >
                  {selectedSale.items.map((item) => (
                    <option key={item.productId} value={item.productId}>
                      {item.productName} (Bought: {item.quantity} units @ {formatCurrency(item.sellingPrice || 0, currency)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity & Refund Amount */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Return Quantity (Max: {currentSaleItem?.quantity || 1})
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={currentSaleItem?.quantity || 1}
                    value={returnQty}
                    onChange={(e) => handleQtyChange(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Refund Total ({currency}) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-extrabold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Reason for return */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason for Return
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Defective / Damaged">Defective / Damaged Item</option>
                  <option value="Wrong item purchased">Wrong item purchased</option>
                  <option value="Expired / Bad Taste">Expired / Quality Issue</option>
                  <option value="Customer changed mind">Customer changed mind</option>
                  <option value="Overcharged in error">Pricing error</option>
                </select>
              </div>

              {/* Restock Toggle */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-slate-700" />
                    <div>
                      <span className="text-xs font-bold text-slate-900">Restock into Inventory?</span>
                      <p className="text-[11px] text-slate-500">
                        {restock
                          ? `Will add +${returnQty} back into your shelf stock.`
                          : 'Will NOT restock. Automatically recorded as damaged/waste write-off.'}
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={restock}
                    onChange={(e) => setRestock(e.target.checked)}
                    className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* Refund Method */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  How will you refund the customer?
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['Cash', 'Mobile Money', 'Bank', 'Store Credit'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setRefundMethod(method)}
                      className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                        refundMethod === method
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedSale(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Process Return & Issue Refund</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
