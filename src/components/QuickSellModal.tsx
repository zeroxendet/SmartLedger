import React, { useState, useEffect } from 'react';
import { Product, ProductVariant, Sale, SaleItem, CurrencyCode, BusinessProfile, Customer, PaymentMethod } from '../types';
import { formatCurrency } from '../utils/calculations';
import { generateWhatsAppReceiptText, openWhatsAppReceipt, downloadReceiptFile } from '../utils/receiptUtils';
import { 
  X, 
  ShoppingCart, 
  Minus, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  Printer, 
  Download, 
  Share2, 
  Copy, 
  Check, 
  ArrowRight,
  User,
  Package
} from 'lucide-react';

interface QuickSellModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  variant?: ProductVariant | null;
  initialQuantity?: number;
  currency: CurrencyCode;
  customers: Customer[];
  allowCustomerCredit: boolean;
  profile: BusinessProfile;
  onCompleteSale: (sale: Sale, restockIfProduced?: number) => void;
  onAddCustomer: (name: string, phone?: string) => string;
  onOpenReceiptModal?: (sale: Sale) => void;
}

export const QuickSellModal: React.FC<QuickSellModalProps> = ({
  isOpen,
  onClose,
  product,
  variant,
  initialQuantity = 1,
  currency,
  customers,
  allowCustomerCredit,
  profile,
  onCompleteSale,
  onAddCustomer,
  onOpenReceiptModal,
}) => {
  const [quantity, setQuantity] = useState<number>(initialQuantity);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(variant || null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [newCustomerName, setNewCustomerName] = useState<string>('');
  const [stockError, setStockError] = useState<string | null>(null);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [copiedToast, setCopiedToast] = useState(false);

  useEffect(() => {
    if (isOpen && product) {
      setQuantity(initialQuantity > 0 ? initialQuantity : 1);
      setSelectedVariant(variant || (product.variants && product.variants.length > 0 ? product.variants[0] : null));
      setPaymentMethod('Cash');
      setSelectedCustomerId('');
      setNewCustomerName('');
      setStockError(null);
      setCompletedSale(null);
    }
  }, [isOpen, product, variant, initialQuantity]);

  if (!isOpen || !product) return null;

  const currentVariant = selectedVariant;
  const unitPrice = currentVariant?.sellingPrice ?? product.sellingPrice;
  const unitCost = currentVariant?.buyingPrice ?? product.buyingPrice ?? product.costPrice ?? 0;
  const availableStock = currentVariant?.stock ?? product.stock;
  const subtotal = unitPrice * quantity;
  const totalCost = unitCost * quantity;
  const profit = subtotal - totalCost;

  const handleQuantityChange = (newQty: number) => {
    if (newQty < 1) return;
    if (newQty > availableStock) {
      setStockError(`Not enough stock. Only ${availableStock} units available.`);
      setQuantity(newQty);
      return;
    }
    setStockError(null);
    setQuantity(newQty);
  };

  const handleCompleteSale = () => {
    if (quantity > availableStock) {
      setStockError(`Cannot complete sale. Only ${availableStock} units available.`);
      return;
    }
    if (quantity <= 0) {
      setStockError('Quantity must be at least 1.');
      return;
    }

    let custId = selectedCustomerId;
    let custName = customers.find((c) => c.id === selectedCustomerId)?.name;

    if (paymentMethod === 'Credit') {
      if (!custId && newCustomerName.trim()) {
        custId = onAddCustomer(newCustomerName.trim());
        custName = newCustomerName.trim();
      }
    } else if (selectedCustomerId) {
      custName = customers.find((c) => c.id === selectedCustomerId)?.name;
    } else if (newCustomerName.trim()) {
      custName = newCustomerName.trim();
    }

    const itemName = currentVariant ? `${product.name} (${currentVariant.name})` : product.name;

    // Snapshot pricing rule: Freeze historical prices & costs
    const saleItem: SaleItem = {
      productId: product.id,
      productName: itemName,
      productNameSnapshot: itemName,
      quantity,
      unitPrice,
      sellingPrice: unitPrice,
      buyingPrice: unitCost,
      costPriceSnapshot: unitCost,
      subtotal,
      total: subtotal,
      profit,
      barcode: product.barcode,
      variantId: currentVariant?.id,
      variantName: currentVariant?.name,
    };

    const newSale: Sale = {
      id: `sale_${Date.now()}`,
      invoiceNumber: `INV-${Math.floor(100000 + Math.random() * 900000)}`,
      items: [saleItem],
      totalAmount: subtotal,
      subtotal,
      discount: 0,
      totalCost,
      profit,
      paymentMethod,
      paymentStatus: paymentMethod === 'Credit' ? 'UNPAID' : 'PAID',
      status: 'COMPLETED',
      customerId: custId || undefined,
      customerName: custName || 'Walk-in Customer',
      date: new Date().toISOString(),
    };

    onCompleteSale(newSale, 0);
    setCompletedSale(newSale);
  };

  const handleWhatsApp = () => {
    if (!completedSale) return;
    const existingCust = customers.find((c) => c.id === completedSale.customerId || c.name === completedSale.customerName);
    const receiptText = generateWhatsAppReceiptText(
      completedSale,
      profile?.name || 'SmartLedger Store',
      currency,
      profile?.phone
    );
    openWhatsAppReceipt(existingCust?.phone, receiptText);
  };

  const handleDownload = () => {
    if (!completedSale) return;
    const receiptText = generateWhatsAppReceiptText(
      completedSale,
      profile?.name || 'SmartLedger Store',
      currency,
      profile?.phone
    );
    downloadReceiptFile(completedSale, receiptText);
  };

  const handleCopy = () => {
    if (!completedSale) return;
    const receiptText = generateWhatsAppReceiptText(
      completedSale,
      profile?.name || 'SmartLedger Store',
      currency,
      profile?.phone
    );
    navigator.clipboard?.writeText(receiptText);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleClose = () => {
    setCompletedSale(null);
    onClose();
  };

  return (
    <div 
      id="quick-sell-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in"
    >
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 px-5 py-4 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold font-['Outfit',sans-serif]">
                {completedSale ? 'Sale Completed' : 'Quick Individual Sale'}
              </h3>
              <p className="text-xs text-slate-400">
                {completedSale ? `Invoice #${completedSale.invoiceNumber}` : 'Fast checkout for single product'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {completedSale ? (
            /* COMPLETED SALE CONFIRMATION VIEW */
            <div className="space-y-5 text-center py-2 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto text-2xl font-bold">
                ✓
              </div>
              <div>
                <h4 className="text-xl font-bold text-slate-900 font-['Outfit',sans-serif]">
                  Sale Recorded Successfully!
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Invoice <strong className="font-mono text-slate-800">{completedSale.invoiceNumber}</strong> &bull; Stock updated immediately
                </p>
              </div>

              {/* Invoice Breakdown Summary */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2.5 font-mono text-xs">
                <div className="flex justify-between font-bold text-slate-900 border-b border-slate-200 pb-2">
                  <span>Product</span>
                  <span>Subtotal</span>
                </div>
                {completedSale.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between text-slate-700">
                    <span>{it.quantity} &times; {it.productName}</span>
                    <span className="font-bold">{formatCurrency(it.subtotal || it.total || 0, currency)}</span>
                  </div>
                ))}
                <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-sm text-slate-900">
                  <span>TOTAL:</span>
                  <span className="text-emerald-700">{formatCurrency(completedSale.totalAmount, currency)}</span>
                </div>
                <div className="text-[11px] text-slate-500 flex justify-between pt-1">
                  <span>Payment Method:</span>
                  <span className="font-bold text-slate-800">{completedSale.paymentMethod}</span>
                </div>
                <div className="text-[11px] text-slate-500 flex justify-between">
                  <span>Customer:</span>
                  <span className="font-bold text-slate-800">{completedSale.customerName || 'Walk-in Customer'}</span>
                </div>
              </div>

              {/* Action Buttons: View, Print, Download, Share, Copy */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {onOpenReceiptModal && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenReceiptModal(completedSale);
                      handleClose();
                    }}
                    className="p-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex flex-col items-center justify-center gap-1 cursor-pointer"
                  >
                    <Package className="w-4 h-4 text-slate-600" />
                    <span>View Invoice</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handlePrint}
                  className="p-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex flex-col items-center justify-center gap-1 cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-slate-600" />
                  <span>Print Invoice</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownload}
                  className="p-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex flex-col items-center justify-center gap-1 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-slate-600" />
                  <span>Download</span>
                </button>

                <button
                  type="button"
                  onClick={handleWhatsApp}
                  className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex flex-col items-center justify-center gap-1 cursor-pointer shadow-xs"
                >
                  <Share2 className="w-4 h-4 text-white" />
                  <span>WhatsApp</span>
                </button>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {copiedToast ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
                  <span>{copiedToast ? 'Copied Receipt' : 'Copy Text'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* SALE IN PROGRESS VIEW */
            <div className="space-y-5">
              {/* Product Info Banner */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="text-base font-extrabold text-slate-900 truncate font-['Outfit',sans-serif]">
                    {product.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-1 text-xs">
                    <span className="font-semibold text-slate-600">
                      Selling Price: <strong className="text-slate-900 font-bold">{formatCurrency(unitPrice, currency)}</strong>
                    </span>
                    <span>&bull;</span>
                    <span className={`font-bold px-2 py-0.5 rounded-full text-[11px] ${
                      availableStock <= 0 
                        ? 'bg-rose-100 text-rose-800' 
                        : availableStock <= product.minStockLevel 
                        ? 'bg-amber-100 text-amber-800' 
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      Stock: {availableStock} units
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Category</span>
                  <span className="text-xs font-semibold text-slate-700">{product.category}</span>
                </div>
              </div>

              {/* Variants Selector (if product has variants) */}
              {product.variants && product.variants.length > 0 && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Select Variant / Size:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {product.variants.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSelectedVariant(v)}
                        className={`p-2 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                          selectedVariant?.id === v.id
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold shadow-xs'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <p className="font-bold truncate">{v.name}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {formatCurrency(v.sellingPrice, currency)} &bull; {v.stock} left
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Quantity to Sell:
                  </label>
                  <span className="text-xs text-slate-500">
                    Available: <strong className="text-slate-800">{availableStock}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(quantity - 1)}
                    disabled={quantity <= 1}
                    className="w-12 h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-slate-800 flex items-center justify-center font-extrabold text-base transition-all cursor-pointer"
                  >
                    <Minus className="w-5 h-5" />
                  </button>

                  <input
                    type="number"
                    min="1"
                    max={availableStock}
                    value={quantity}
                    onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                    className="flex-1 py-3 text-center font-extrabold text-xl rounded-2xl border-2 border-slate-300 focus:border-emerald-500 focus:outline-none bg-white text-slate-900 shadow-inner"
                  />

                  <button
                    type="button"
                    onClick={() => handleQuantityChange(quantity + 1)}
                    disabled={quantity >= availableStock}
                    className="w-12 h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-slate-800 flex items-center justify-center font-extrabold text-base transition-all cursor-pointer"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                {stockError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2 animate-fade-in">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{stockError}</span>
                  </div>
                )}
              </div>

              {/* Subtotal & Profit Summary */}
              <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-center justify-between text-emerald-950">
                <div>
                  <p className="text-xs font-semibold text-emerald-700">Subtotal Amount</p>
                  <p className="text-xs text-slate-600">
                    {quantity} &times; {formatCurrency(unitPrice, currency)} &bull; Est. Profit: {formatCurrency(profit, currency)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-extrabold text-emerald-800 font-['Outfit',sans-serif]">
                    {formatCurrency(subtotal, currency)}
                  </p>
                </div>
              </div>

              {/* Customer Selector (Walk-in or registered) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Customer (Optional):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => {
                      setSelectedCustomerId(e.target.value);
                      if (e.target.value) setNewCustomerName('');
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-800"
                  >
                    <option value="">Walk-in Customer</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.phone ? `(${c.phone})` : ''}
                      </option>
                    ))}
                  </select>

                  {!selectedCustomerId && (
                    <div className="relative">
                      <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        placeholder="Or enter customer name..."
                        value={newCustomerName}
                        onChange={(e) => setNewCustomerName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Payment Method:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { method: 'Cash' as PaymentMethod, icon: '💵', label: 'Cash' },
                    { method: 'Mobile Money' as PaymentMethod, icon: '📱', label: 'Mobile Money' },
                    { method: 'Bank' as PaymentMethod, icon: '🏦', label: 'Bank' },
                    ...(allowCustomerCredit ? [{ method: 'Credit' as PaymentMethod, icon: '📝', label: 'Credit (Pay Later)' }] : []),
                  ].map((pm) => (
                    <button
                      key={pm.method}
                      type="button"
                      onClick={() => setPaymentMethod(pm.method)}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        paymentMethod === pm.method
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold shadow-xs'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700 text-xs'
                      }`}
                    >
                      <span className="text-base block mb-0.5">{pm.icon}</span>
                      <span className="text-xs font-bold">{pm.label}</span>
                    </button>
                  ))}
                </div>

                {paymentMethod === 'Credit' && !selectedCustomerId && !newCustomerName.trim() && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                    ⚠️ Please select an existing customer or enter a customer name for credit tracking.
                  </p>
                )}
              </div>

              {/* Complete Sale Button */}
              <button
                id="btn-complete-quick-sale"
                type="button"
                disabled={quantity <= 0 || quantity > availableStock || (paymentMethod === 'Credit' && !selectedCustomerId && !newCustomerName.trim())}
                onClick={handleCompleteSale}
                className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-base shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99]"
              >
                <span>Complete Sale • {formatCurrency(subtotal, currency)}</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
