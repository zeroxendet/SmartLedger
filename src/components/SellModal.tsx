import React, { useState } from 'react';
import { Product, PaymentMethod, Sale, Customer, CurrencyCode, BusinessProfile } from '../types';
import { formatCurrency } from '../utils/calculations';
import { generateWhatsAppReceiptText, openWhatsAppReceipt } from '../utils/receiptUtils';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { ReceiptModal } from './ReceiptModal';
import { 
  X, 
  Search, 
  Plus, 
  Minus, 
  CheckCircle2, 
  AlertTriangle, 
  Printer, 
  Share2, 
  ArrowRight,
  UserPlus,
  Barcode,
  Send,
  FileText,
  Check
} from 'lucide-react';

interface SellModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  customers: Customer[];
  currency: CurrencyCode;
  allowCustomerCredit: boolean;
  profile?: BusinessProfile;
  onCompleteSale: (sale: Sale, restockQuantityIfProduced?: number) => void;
  onAddCustomer: (name: string, phone?: string) => string; // returns customerId
}

export const SellModal: React.FC<SellModalProps> = ({
  isOpen,
  onClose,
  products,
  customers,
  currency,
  allowCustomerCredit,
  profile,
  onCompleteSale,
  onAddCustomer,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [newCustomerName, setNewCustomerName] = useState<string>('');
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  
  // Scanner & Receipt modals state
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);

  // Stock Error Detection (Step 32)
  const [stockErrorState, setStockErrorState] = useState<{
    show: boolean;
    required: number;
    available: number;
  }>({ show: false, required: 0, available: 0 });

  // Completed sale confirmation & invoice view
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);

  if (!isOpen) return null;

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleProductScanned = (scannedProd: Product) => {
    setSelectedProduct(scannedProd);
    setQuantity(1);
    setStockErrorState({ show: false, required: 0, available: 0 });
    setIsScannerOpen(false);
  };

  const handleQuickWhatsApp = () => {
    if (!completedSale) return;
    const existingCustomer = customers.find(
      (c) => c.id === completedSale.customerId || c.name === completedSale.customerName
    );
    const receiptText = generateWhatsAppReceiptText(
      completedSale,
      profile?.name || 'SmartLedger Store',
      currency,
      profile?.phone
    );
    openWhatsAppReceipt(existingCustomer?.phone, receiptText);
  };

  const handleCopyReceipt = () => {
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

  const activeVariant = selectedProduct?.variants?.find((v) => v.id === selectedVariantId);
  const currentSellingPrice = activeVariant ? activeVariant.sellingPrice : (selectedProduct?.sellingPrice || 0);
  const currentAvailableStock = activeVariant ? activeVariant.stock : (selectedProduct?.stock || 0);

  const calculateTotal = () => {
    if (!selectedProduct) return 0;
    return currentSellingPrice * quantity;
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setQuantity(1);
    setSelectedVariantId(product.variants && product.variants.length > 0 ? product.variants[0].id : '');
    setStockErrorState({ show: false, required: 0, available: 0 });
  };

  const handleAttemptComplete = () => {
    if (!selectedProduct) return;

    // Step 32: Stock Error Detection
    if (quantity > currentAvailableStock) {
      setStockErrorState({
        show: true,
        required: quantity,
        available: currentAvailableStock,
      });
      return;
    }

    finalizeSale(0);
  };

  const finalizeSale = (restockAmount = 0) => {
    if (!selectedProduct) return;

    let custId = selectedCustomerId;
    let custName = customers.find((c) => c.id === selectedCustomerId)?.name;

    if (paymentMethod === 'Credit') {
      if (!custId && newCustomerName.trim()) {
        custId = onAddCustomer(newCustomerName.trim());
        custName = newCustomerName.trim();
      }
    }

    const totalAmount = calculateTotal();
    const unitCost = selectedProduct.buyingPrice || selectedProduct.costPrice || 0;
    const totalCost = unitCost * quantity;
    const profit = totalAmount - totalCost;
    const displayName = activeVariant 
      ? `${selectedProduct.name} (${activeVariant.name})` 
      : selectedProduct.name;

    const newSale: Sale = {
      id: `sale_${Date.now()}`,
      invoiceNumber: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
      items: [
        {
          productId: selectedProduct.id,
          productName: displayName,
          quantity,
          sellingPrice: currentSellingPrice,
          buyingPrice: unitCost,
          total: totalAmount,
        },
      ],
      totalAmount,
      totalCost,
      profit,
      paymentMethod,
      paymentStatus: paymentMethod === 'Credit' ? 'UNPAID' : 'PAID',
      customerId: paymentMethod === 'Credit' ? custId : undefined,
      customerName: paymentMethod === 'Credit' ? custName : undefined,
      date: new Date().toISOString(),
    };

    onCompleteSale(newSale, restockAmount);
    setCompletedSale(newSale);
  };

  const handleCloseAll = () => {
    setSelectedProduct(null);
    setSelectedVariantId('');
    setQuantity(1);
    setSearchTerm('');
    setCompletedSale(null);
    setStockErrorState({ show: false, required: 0, available: 0 });
    onClose();
  };

  return (
    <div 
      id="smartledger-sell-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-lg font-bold font-['Outfit',sans-serif]">
              {completedSale ? '✅ Sale Completed' : '🛒 Sell Product'}
            </h3>
            <p className="text-xs text-slate-400">
              {completedSale ? 'Invoice generated & stock updated' : 'Record sale and collect payment'}
            </p>
          </div>
          <button
            id="sell-modal-close-btn"
            onClick={handleCloseAll}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* SCREEN: SALE COMPLETED & INVOICE (Step 20 & 21) */}
          {completedSale ? (
            <div className="space-y-5 animate-fade-in text-slate-800" id="sale-complete-invoice-view">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-1">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h4 className="text-lg font-bold text-emerald-950">Sale Complete!</h4>
                <p className="text-xs text-emerald-700">
                  Stock reduced &bull; Profit added &bull; Cash/Ledger updated
                </p>
              </div>

              {/* Step 21 Automatic Invoice Sheet */}
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs space-y-3">
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="font-bold text-slate-900">INVOICE #{completedSale.invoiceNumber}</span>
                  <span className="text-slate-500">{new Date(completedSale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                <div className="space-y-1.5 py-1">
                  {completedSale.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between items-center">
                      <span className="font-sans font-medium text-slate-700">
                        {it.productName} &times; {it.quantity}
                      </span>
                      <span className="font-bold text-slate-900">
                        {formatCurrency(it.total, currency)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-2 flex justify-between items-center text-sm font-bold">
                  <span>TOTAL</span>
                  <span className="text-emerald-700">{formatCurrency(completedSale.totalAmount, currency)}</span>
                </div>

                <div className="flex justify-between items-center text-[11px] text-slate-500 pt-1">
                  <span>Payment Method:</span>
                  <span className="font-bold text-slate-700">
                    {completedSale.paymentMethod} &mdash; {completedSale.paymentStatus}
                  </span>
                </div>

                {completedSale.customerName && (
                  <div className="flex justify-between items-center text-[11px] text-amber-700 pt-1">
                    <span>Customer Debt:</span>
                    <span className="font-bold">{completedSale.customerName}</span>
                  </div>
                )}
              </div>

              {/* Invoice Actions */}
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* WhatsApp Instant Send */}
                  <button
                    id="invoice-whatsapp-btn"
                    onClick={handleQuickWhatsApp}
                    className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send via WhatsApp</span>
                  </button>

                  {/* 58mm / 80mm Thermal Receipt Preview */}
                  <button
                    id="invoice-receipt-preview-btn"
                    onClick={() => setIsReceiptModalOpen(true)}
                    className="py-2.5 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  >
                    <FileText className="w-3.5 h-3.5 text-indigo-600" />
                    <span>58/80mm Thermal Receipt</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    id="invoice-print-btn"
                    onClick={() => window.print()}
                    className="flex-1 py-2 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Direct</span>
                  </button>
                  <button
                    id="invoice-share-btn"
                    onClick={handleCopyReceipt}
                    className="flex-1 py-2 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {copiedToast ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
                    <span>{copiedToast ? 'Copied!' : 'Copy Summary'}</span>
                  </button>
                </div>
              </div>

              <button
                id="invoice-new-sale-btn"
                onClick={() => {
                  setCompletedSale(null);
                  setSelectedProduct(null);
                  setQuantity(1);
                }}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm tracking-wide transition-all cursor-pointer"
              >
                Start Another Sale
              </button>
            </div>
          ) : (
            <>
              {/* STEP 32: STOCK DEFICIT ERROR PROMPT */}
              {stockErrorState.show && selectedProduct && (
                <div 
                  id="stock-error-detection-box"
                  className="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl space-y-3 animate-fade-in text-amber-900"
                >
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-amber-900">
                        ⚠️ Stock Alert: Insufficient Quantity
                      </h4>
                      <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                        You currently have only <strong>{stockErrorState.available}</strong> {selectedProduct.name}.
                        <br />
                        Did you produce or receive more {selectedProduct.name} today?
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <button
                      id="stock-err-add-production"
                      onClick={() => {
                        const neededExtra = quantity - stockErrorState.available;
                        finalizeSale(neededExtra);
                      }}
                      className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      Yes, add production & sell
                    </button>
                    <button
                      id="stock-err-change-quantity"
                      onClick={() => {
                        setQuantity(stockErrorState.available);
                        setStockErrorState({ show: false, required: 0, available: 0 });
                      }}
                      className="flex-1 py-2 px-3 rounded-lg bg-amber-200 hover:bg-amber-300 text-amber-900 text-xs font-bold transition-colors cursor-pointer"
                    >
                      No, change quantity to {stockErrorState.available}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 18: CHOOSE WHAT YOU ARE SELLING */}
              {!selectedProduct ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                      What are you selling?
                    </label>
                    <span className="text-[11px] text-slate-400">
                      {products.length} products
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        id="sell-search-input"
                        type="text"
                        placeholder="Search or scan product..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                        autoFocus
                      />
                    </div>
                    <button
                      id="sell-open-barcode-btn"
                      type="button"
                      onClick={() => setIsScannerOpen(true)}
                      className="px-3 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-xl flex items-center gap-1.5 font-bold text-xs transition-all shadow-sm cursor-pointer whitespace-nowrap"
                      title="Scan barcode with camera or enter SKU"
                    >
                      <Barcode className="w-4 h-4 text-emerald-600" />
                      <span>Scan Code</span>
                    </button>
                  </div>

                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
                    {filteredProducts.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 text-xs">
                        No products found matching "{searchTerm}".
                      </div>
                    ) : (
                      filteredProducts.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          id={`select-product-${p.id}`}
                          onClick={() => handleSelectProduct(p)}
                          className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <div>
                            <p className="text-sm font-bold text-slate-900">{p.name}</p>
                            <p className="text-xs text-slate-500">
                              Stock: <span className={p.stock <= p.minStockLevel ? 'text-amber-600 font-bold' : 'text-slate-700'}>{p.stock}</span> {p.unit || 'units'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-extrabold text-emerald-600">
                              {formatCurrency(p.sellingPrice, currency)}
                            </p>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              p.stock <= p.minStockLevel ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {p.stock <= p.minStockLevel ? 'Low Stock' : 'In Stock'}
                            </span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                /* SELECTED PRODUCT QUANTITY & CALCULATION */
                <div className="space-y-4">
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500">Selected Product</p>
                      <h4 className="text-base font-bold text-slate-900">{selectedProduct.name}</h4>
                      <p className="text-xs text-slate-600">
                        In stock: <strong>{currentAvailableStock}</strong> &bull; Unit: {formatCurrency(currentSellingPrice, currency)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedProduct(null)}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 underline"
                    >
                      Change
                    </button>
                  </div>

                  {/* Product Variant Choice if available */}
                  {selectedProduct.variants && selectedProduct.variants.length > 0 && (
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                        Select Variant / Size / Pack
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedProduct.variants.map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => setSelectedVariantId(v.id)}
                            className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left cursor-pointer ${
                              selectedVariantId === v.id
                                ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-sm ring-1 ring-emerald-500'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span className="block font-bold">{v.name}</span>
                            <span className="text-[11px] text-emerald-700 font-extrabold">{formatCurrency(v.sellingPrice, currency)}</span>
                            <span className="text-[10px] text-slate-400 block">{v.stock} in stock</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quantity Selector */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                      Choose Quantity
                    </label>
                    <div className="flex items-center justify-center gap-4 py-2">
                      <button
                        type="button"
                        id="qty-minus-btn"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="w-10 h-10 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-700 font-bold cursor-pointer"
                      >
                        <Minus className="w-4 h-4" />
                      </button>

                      <div className="text-center min-w-[70px]">
                        <input
                          id="sell-quantity-input"
                          type="number"
                          min="1"
                          value={quantity}
                          onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                          className="text-2xl font-extrabold text-slate-900 text-center w-20 border-b-2 border-emerald-500 focus:outline-none"
                        />
                      </div>

                      <button
                        type="button"
                        id="qty-plus-btn"
                        onClick={() => setQuantity((q) => q + 1)}
                        className="w-10 h-10 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-700 font-bold cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Smart Calculation Card */}
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-950">
                    <div>
                      <p className="text-xs font-medium text-emerald-700">Total Calculation</p>
                      <p className="text-xs text-slate-600">
                        {quantity} &times; {formatCurrency(selectedProduct.sellingPrice, currency)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-extrabold text-emerald-800">
                        {formatCurrency(calculateTotal(), currency)}
                      </p>
                      <p className="text-[10px] text-emerald-600">
                        Est. Profit: {formatCurrency((selectedProduct.sellingPrice - selectedProduct.buyingPrice) * quantity, currency)}
                      </p>
                    </div>
                  </div>

                  {/* STEP 19: CHOOSE PAYMENT METHOD */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                      How did the customer pay?
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
                          id={`pay-method-${pm.method.toLowerCase().replace(/[^a-z]/g, '')}`}
                          onClick={() => setPaymentMethod(pm.method)}
                          className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                            paymentMethod === pm.method
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold shadow-sm'
                              : 'border-slate-200 hover:bg-slate-50 text-slate-700 font-medium'
                          }`}
                        >
                          <span className="text-xl block mb-0.5">{pm.icon}</span>
                          <span className="text-xs">{pm.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Customer Selection if Credit */}
                  {paymentMethod === 'Credit' && (
                    <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-2 animate-fade-in">
                      <label className="block text-xs font-bold text-amber-900">
                        Who is buying on credit?
                      </label>
                      <select
                        id="credit-customer-select"
                        value={selectedCustomerId}
                        onChange={(e) => setSelectedCustomerId(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-amber-300 bg-white text-xs font-medium text-slate-800 focus:outline-none"
                      >
                        <option value="">-- Choose Existing Customer --</option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} (Current Debt: {formatCurrency(c.amountOwed, currency)})
                          </option>
                        ))}
                      </select>

                      {!selectedCustomerId && (
                        <div>
                          <p className="text-[11px] text-amber-700 mb-1">Or enter new customer name:</p>
                          <input
                            id="new-credit-cust-name"
                            type="text"
                            placeholder="e.g. John Bizimana"
                            value={newCustomerName}
                            onChange={(e) => setNewCustomerName(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-amber-300 bg-white text-xs text-slate-800 focus:outline-none"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Complete Sale CTA */}
                  <button
                    id="complete-sale-btn"
                    type="button"
                    onClick={handleAttemptComplete}
                    className="w-full py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm tracking-wide shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Complete Sale &mdash; {formatCurrency(calculateTotal(), currency)}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Barcode & QR Code Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        products={products}
        currency={currency}
        onProductScanned={handleProductScanned}
      />

      {/* 58mm / 80mm Thermal Receipt & WhatsApp Modal */}
      {completedSale && (
        <ReceiptModal
          isOpen={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
          sale={completedSale}
          profile={profile || {
            id: 'temp',
            name: 'SmartLedger Store',
            type: 'Bakery',
            currency: currency,
            allowCustomerCredit: allowCustomerCredit,
            allowSupplierCredit: false,
            ownerName: 'Owner',
            ownerEmailOrPhone: '',
            isBakeryMode: false,
            beginnerMode: false,
            createdAt: new Date().toISOString()
          }}
          currency={currency}
          customers={customers}
        />
      )}
    </div>
  );
};
