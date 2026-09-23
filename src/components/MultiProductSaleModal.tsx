import React, { useState, useMemo, useEffect } from 'react';
import { Product, ProductVariant, Sale, SaleItem, CurrencyCode, BusinessProfile, Customer, PaymentMethod, PaymentSplit } from '../types';
import { formatCurrency } from '../utils/calculations';
import { generateWhatsAppReceiptText, openWhatsAppReceipt, downloadReceiptFile } from '../utils/receiptUtils';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { 
  X, 
  Search, 
  Camera, 
  ShoppingCart, 
  Trash2, 
  Minus, 
  Plus, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  User, 
  Printer, 
  Download, 
  Share2, 
  Copy, 
  Check, 
  FileText, 
  ArrowLeft,
  Tag,
  Sparkles,
  Layers,
  RotateCcw
} from 'lucide-react';

export interface CartItem {
  id: string; // unique cart entry key (e.g. productId or productId_variantId)
  product: Product;
  variantId?: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
}

interface MultiProductSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  customers: Customer[];
  currency: CurrencyCode;
  allowCustomerCredit: boolean;
  profile: BusinessProfile;
  onCompleteSale: (sale: Sale, restockIfProduced?: number) => void;
  onAddCustomer: (name: string, phone?: string) => string;
  onOpenReceiptModal?: (sale: Sale) => void;
  onAddNewProductWithBarcode?: (barcode: string) => void;
}

export const MultiProductSaleModal: React.FC<MultiProductSaleModalProps> = ({
  isOpen,
  onClose,
  products,
  customers,
  currency,
  allowCustomerCredit,
  profile,
  onCompleteSale,
  onAddCustomer,
  onOpenReceiptModal,
  onAddNewProductWithBarcode,
}) => {
  // Modal step: 'cart' (building cart) | 'checkout' (review & payment) | 'completed' (one invoice)
  const [step, setStep] = useState<'cart' | 'checkout' | 'completed'>('cart');
  
  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  // Checkout inputs
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [splitAmounts, setSplitAmounts] = useState<{ Cash?: number; 'Mobile Money'?: number; Bank?: number }>({});
  const [splitError, setSplitError] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [newCustomerName, setNewCustomerName] = useState<string>('');

  // Barcode scanner
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanToast, setScanToast] = useState<string | null>(null);

  // Stock alert banner
  const [stockAlert, setStockAlert] = useState<{ productName: string; required: number; available: number } | null>(null);

  // Completed sale state
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [copiedToast, setCopiedToast] = useState(false);

  // Reset when opened
  useEffect(() => {
    if (isOpen && step !== 'completed') {
      setSearchTerm('');
      setStockAlert(null);
    }
  }, [isOpen]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category && !p.isArchived && p.status !== 'archived') {
        set.add(p.category);
      }
    });
    return ['All', ...Array.from(set).sort()];
  }, [products]);

  // Filtered active products for search
  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return products
      .filter((p) => !p.isArchived && p.status !== 'archived')
      .filter((p) => {
        if (selectedCategory !== 'All' && p.category !== selectedCategory) return false;
        if (!term) return true;
        const matchesName = p.name.toLowerCase().includes(term);
        const matchesBarcode = p.barcode ? p.barcode.toLowerCase().includes(term) : false;
        const matchesCategory = p.category ? p.category.toLowerCase().includes(term) : false;
        const matchesSku = (p as any).sku ? String((p as any).sku).toLowerCase().includes(term) : false;
        return matchesName || matchesBarcode || matchesCategory || matchesSku;
      });
  }, [products, searchTerm, selectedCategory]);

  // Helper to get available stock of a product or variant
  const getItemAvailableStock = (prod: Product, variantId?: string): number => {
    if (variantId && prod.variants) {
      const v = prod.variants.find((item) => item.id === variantId);
      return v ? v.stock : prod.stock;
    }
    return prod.stock;
  };

  // Add product to cart
  const handleAddToCart = (prod: Product, variant?: ProductVariant) => {
    const cartItemId = variant ? `${prod.id}_${variant.id}` : prod.id;
    const availableStock = getItemAvailableStock(prod, variant?.id);
    const existing = cart.find((i) => i.id === cartItemId);
    const currentQty = existing ? existing.quantity : 0;
    const newQty = currentQty + 1;

    if (newQty > availableStock) {
      const name = variant ? `${prod.name} (${variant.name})` : prod.name;
      setStockAlert({
        productName: name,
        required: newQty,
        available: availableStock,
      });
      return;
    }

    setStockAlert(null);

    const unitPrice = variant?.sellingPrice ?? prod.sellingPrice;
    const unitCost = variant?.buyingPrice ?? prod.buyingPrice ?? prod.costPrice ?? 0;

    if (existing) {
      setCart((prev) =>
        prev.map((i) => (i.id === cartItemId ? { ...i, quantity: newQty } : i))
      );
    } else {
      setCart((prev) => [
        ...prev,
        {
          id: cartItemId,
          product: prod,
          variantId: variant?.id,
          variantName: variant?.name,
          quantity: 1,
          unitPrice,
          unitCost,
        },
      ]);
    }

    // Audio or toast feedback
    const itemName = variant ? `${prod.name} (${variant.name})` : prod.name;
    setScanToast(`Added ${itemName}`);
    setTimeout(() => setScanToast(null), 1500);
  };

  // Update item quantity in cart
  const handleUpdateQuantity = (itemId: string, newQtyRaw: number) => {
    const item = cart.find((i) => i.id === itemId);
    if (!item) return;

    if (newQtyRaw <= 0) {
      handleRemoveItem(itemId);
      return;
    }

    const available = getItemAvailableStock(item.product, item.variantId);
    if (newQtyRaw > available) {
      setStockAlert({
        productName: item.variantName ? `${item.product.name} (${item.variantName})` : item.product.name,
        required: newQtyRaw,
        available,
      });
    } else {
      setStockAlert(null);
    }

    setCart((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, quantity: newQtyRaw } : i))
    );
  };

  // Remove item from cart
  const handleRemoveItem = (itemId: string) => {
    setCart((prev) => prev.filter((i) => i.id !== itemId));
    setStockAlert(null);
  };

  // Clear entire cart
  const handleClearCart = () => {
    setCart([]);
    setDiscountAmount(0);
    setStockAlert(null);
  };

  // Barcode scanned
  const handleBarcodeScanned = (prod: Product, variant?: ProductVariant) => {
    handleAddToCart(prod, variant);
  };

  // Totals calculations
  const rawSubtotal = cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const totalCost = cart.reduce((sum, i) => sum + i.unitCost * i.quantity, 0);
  const safeDiscount = Math.max(0, Math.min(discountAmount || 0, rawSubtotal));
  const finalTotalAmount = Math.max(0, rawSubtotal - safeDiscount);
  const totalProfit = finalTotalAmount - totalCost;
  const totalItemCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  // Validate stock for all cart items
  const checkStockValidity = (): { isValid: boolean; errorProduct?: string; available?: number; required?: number } => {
    for (const item of cart) {
      const available = getItemAvailableStock(item.product, item.variantId);
      if (item.quantity > available) {
        return {
          isValid: false,
          errorProduct: item.variantName ? `${item.product.name} (${item.variantName})` : item.product.name,
          available,
          required: item.quantity,
        };
      }
    }
    return { isValid: true };
  };

  // Proceed from Cart to Checkout Review
  const handleProceedToCheckout = () => {
    if (cart.length === 0) return;

    const validation = checkStockValidity();
    if (!validation.isValid && validation.errorProduct) {
      setStockAlert({
        productName: validation.errorProduct,
        required: validation.required || 0,
        available: validation.available || 0,
      });
      return;
    }

    setStockAlert(null);
    setStep('checkout');
  };

  // Finalize Sale & Generate One Invoice
  const handleCompleteSale = () => {
    const validation = checkStockValidity();
    if (!validation.isValid && validation.errorProduct) {
      setStockAlert({
        productName: validation.errorProduct,
        required: validation.required || 0,
        available: validation.available || 0,
      });
      setStep('cart');
      return;
    }

    // Split payment validation
    if (paymentMethod === 'Split') {
      const allocated = (splitAmounts.Cash || 0) + (splitAmounts['Mobile Money'] || 0) + (splitAmounts.Bank || 0);
      if (allocated !== finalTotalAmount) {
        setSplitError(
          `Allocated ${formatCurrency(allocated, currency)} does not match total ${formatCurrency(finalTotalAmount, currency)}. Remaining: ${formatCurrency(finalTotalAmount - allocated, currency)}`
        );
        return;
      }
    }
    setSplitError(null);

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

    // Freeze snapshot data for each item
    const saleItems: SaleItem[] = cart.map((item) => {
      const name = item.variantName ? `${item.product.name} (${item.variantName})` : item.product.name;
      const itemSubtotal = item.unitPrice * item.quantity;
      const itemCost = item.unitCost * item.quantity;
      const itemProfit = itemSubtotal - itemCost;

      return {
        productId: item.product.id,
        productName: name,
        productNameSnapshot: name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        sellingPrice: item.unitPrice,
        buyingPrice: item.unitCost,
        costPriceSnapshot: item.unitCost,
        subtotal: itemSubtotal,
        total: itemSubtotal,
        profit: itemProfit,
        barcode: item.product.barcode,
        variantId: item.variantId,
        variantName: item.variantName,
      };
    });

    let paymentSplits: PaymentSplit[] | undefined = undefined;
    if (paymentMethod === 'Split') {
      paymentSplits = [
        { method: 'Cash' as const, amount: splitAmounts.Cash || 0 },
        { method: 'Mobile Money' as const, amount: splitAmounts['Mobile Money'] || 0 },
        { method: 'Bank' as const, amount: splitAmounts.Bank || 0 },
      ].filter((s) => s.amount > 0);
    } else if (paymentMethod === 'Cash' || paymentMethod === 'Mobile Money' || paymentMethod === 'Bank') {
      paymentSplits = [{ method: paymentMethod, amount: finalTotalAmount }];
    }

    // Unified Parent Sale Record with ONE Invoice
    const newSale: Sale = {
      id: `sale_${Date.now()}`,
      invoiceNumber: `INV-${Math.floor(100000 + Math.random() * 900000)}`,
      items: saleItems,
      totalAmount: finalTotalAmount,
      subtotal: rawSubtotal,
      discount: safeDiscount,
      totalCost,
      profit: totalProfit,
      paymentMethod,
      paymentSplits,
      paymentStatus: paymentMethod === 'Credit' ? 'UNPAID' : 'PAID',
      status: 'COMPLETED',
      customerId: custId || undefined,
      customerName: custName || 'Walk-in Customer',
      date: new Date().toISOString(),
    };

    // Atomic update of sales and stock
    onCompleteSale(newSale, 0);
    setCompletedSale(newSale);
    setStep('completed');
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

  const handleStartAnotherSale = () => {
    setCart([]);
    setDiscountAmount(0);
    setStockAlert(null);
    setCompletedSale(null);
    setStep('cart');
  };

  const handleCloseAll = () => {
    setCart([]);
    setDiscountAmount(0);
    setStockAlert(null);
    setCompletedSale(null);
    setStep('cart');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        id="multi-product-new-sale-modal"
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
      >
        <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[92vh]">
          {/* Header */}
          <div className="bg-slate-900 px-5 py-4 text-white flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-bold font-['Outfit',sans-serif]">
                    {step === 'completed'
                      ? 'Sale Completed'
                      : step === 'checkout'
                      ? 'Order Checkout'
                      : 'New Sale'}
                  </h3>
                  {step === 'cart' && cart.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                      {totalItemCount} units ({cart.length} items)
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  {step === 'completed'
                    ? `Invoice #${completedSale?.invoiceNumber} • One unified order`
                    : step === 'checkout'
                    ? 'Review order details and select payment method'
                    : 'Add multiple products to customer cart and generate one invoice'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {step === 'cart' && cart.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearCart}
                  title="Clear entire cart"
                  className="px-2.5 py-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Clear Cart</span>
                </button>
              )}
              <button
                onClick={handleCloseAll}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Toast feedback */}
          {scanToast && (
            <div className="bg-emerald-600 text-white text-xs px-4 py-2 font-bold flex items-center justify-between animate-fade-in shadow-xs">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                <span>{scanToast}</span>
              </span>
              <span className="text-[10px] text-emerald-200">Cart Updated</span>
            </div>
          )}

          {/* Stock Alert Warning Banner */}
          {stockAlert && (
            <div className="p-3.5 bg-rose-50 border-b border-rose-200 text-rose-900 text-xs flex items-center justify-between animate-fade-in">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>
                  <strong>Not enough stock:</strong> Only <strong>{stockAlert.available}</strong> {stockAlert.productName} units are available in inventory.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setStockAlert(null)}
                className="text-rose-700 hover:text-rose-900 font-bold ml-2"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* MAIN MODAL CONTENT */}
          <div className="flex-1 overflow-y-auto">
            {/* STEP 1: CART BUILDING (SEARCH & SELECT PRODUCTS + CART PANEL) */}
            {step === 'cart' && (
              <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* LEFT COLUMN: SEARCH & PRODUCT CATALOG (lg:col-span-7) */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Search Bar + Barcode Scanner Trigger */}
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        id="pos-multi-search-input"
                        type="text"
                        placeholder="Search product name, SKU, or barcode..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs bg-slate-50/50 text-slate-900"
                      />
                      {searchTerm && (
                        <button
                          type="button"
                          onClick={() => setSearchTerm('')}
                          className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      id="btn-pos-scan-camera"
                      onClick={() => setIsScannerOpen(true)}
                      className="px-3.5 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                    >
                      <Camera className="w-4 h-4 text-emerald-400" />
                      <span>📷 Scan</span>
                    </button>
                  </div>

                  {/* Category Pills */}
                  <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                          selectedCategory === cat
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Products Catalog Grid */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
                      <span>Available Products ({filteredProducts.length})</span>
                      <span className="text-[11px] text-slate-400">Tap [+ Add] to put in cart</span>
                    </div>

                    <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1">
                      {filteredProducts.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                          <p className="font-semibold text-slate-600">No matching products found</p>
                          <p className="mt-1">Try another search term or clear the filter.</p>
                        </div>
                      ) : (
                        filteredProducts.map((prod) => {
                          const isOutOfStock = prod.stock <= 0;
                          const isLowStock = prod.stock <= prod.minStockLevel && prod.stock > 0;
                          const inCartItem = cart.find((i) => i.product.id === prod.id);

                          return (
                            <div
                              key={prod.id}
                              className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                                isOutOfStock
                                  ? 'bg-slate-50/70 border-slate-200 opacity-60'
                                  : inCartItem
                                  ? 'bg-emerald-50/40 border-emerald-200 shadow-xs'
                                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="text-xs font-bold text-slate-900 truncate">
                                    {prod.name}
                                  </h4>
                                  {inCartItem && (
                                    <span className="px-1.5 py-0.2 rounded-md bg-emerald-600 text-white text-[10px] font-bold">
                                      {inCartItem.quantity} in cart
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1 flex-wrap">
                                  <span className="font-bold text-slate-900">
                                    {formatCurrency(prod.sellingPrice, currency)}
                                  </span>
                                  <span>&bull;</span>
                                  <span className={
                                    isOutOfStock 
                                      ? 'text-rose-600 font-bold' 
                                      : isLowStock 
                                      ? 'text-amber-600 font-bold' 
                                      : 'text-emerald-700 font-semibold'
                                  }>
                                    {isOutOfStock ? 'Out of stock' : `${prod.stock} in stock`}
                                  </span>
                                  {prod.barcode && (
                                    <>
                                      <span>&bull;</span>
                                      <span className="font-mono text-[10px] text-slate-400">
                                        [{prod.barcode}]
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Variants or Quick Add Button */}
                              {prod.variants && prod.variants.length > 0 ? (
                                <div className="flex items-center gap-1 shrink-0">
                                  <select
                                    onChange={(e) => {
                                      const v = prod.variants?.find((item) => item.id === e.target.value);
                                      if (v) handleAddToCart(prod, v);
                                      e.target.value = '';
                                    }}
                                    defaultValue=""
                                    className="py-1 px-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 cursor-pointer"
                                  >
                                    <option value="" disabled>+ Add Variant</option>
                                    {prod.variants.map((v) => (
                                      <option key={v.id} value={v.id} disabled={v.stock <= 0}>
                                        {v.name} ({formatCurrency(v.sellingPrice, currency)} • {v.stock} left)
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  disabled={isOutOfStock}
                                  onClick={() => handleAddToCart(prod)}
                                  className={`py-1.5 px-3 rounded-xl font-bold text-xs flex items-center gap-1 transition-all shrink-0 cursor-pointer ${
                                    isOutOfStock
                                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs active:scale-95'
                                  }`}
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Add</span>
                                </button>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: ACTIVE ORDER CART (lg:col-span-5) */}
                <div className="lg:col-span-5 flex flex-col justify-between space-y-4 bg-slate-50/70 p-4 rounded-3xl border border-slate-200">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                          Current Order Cart
                        </span>
                      </div>
                      <span className="text-xs font-bold text-slate-600">
                        {cart.length} line item(s)
                      </span>
                    </div>

                    {/* Cart Items List */}
                    {cart.length === 0 ? (
                      <div className="py-12 px-4 rounded-2xl bg-white border border-dashed border-slate-200 text-center space-y-2">
                        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                          <ShoppingCart className="w-5 h-5" />
                        </div>
                        <p className="text-xs font-bold text-slate-700">Your cart is empty</p>
                        <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                          Search products or tap 📷 Scan to add items. You can add as many different products as the customer wants!
                        </p>
                      </div>
                    ) : (
                      <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                        {cart.map((item) => {
                          const available = getItemAvailableStock(item.product, item.variantId);
                          const isExcess = item.quantity > available;

                          return (
                            <div
                              key={item.id}
                              className={`p-3 rounded-2xl border transition-all ${
                                isExcess
                                  ? 'bg-rose-50 border-rose-300'
                                  : 'bg-white border-slate-200 shadow-xs'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <h5 className="text-xs font-bold text-slate-900 truncate">
                                      {item.product.name}
                                    </h5>
                                    {item.variantName && (
                                      <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                                        {item.variantName}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                                    <span>{formatCurrency(item.unitPrice, currency)} / unit</span>
                                    <span>&bull;</span>
                                    <span className={isExcess ? 'text-rose-600 font-bold' : 'text-slate-500'}>
                                      Stock: {available}
                                    </span>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(item.id)}
                                  title="Remove item"
                                  className="text-slate-400 hover:text-rose-600 transition-colors p-1 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Quantity Controls & Line Subtotal */}
                              <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-100">
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center font-bold text-xs cursor-pointer"
                                  >
                                    <Minus className="w-3.5 h-3.5" />
                                  </button>

                                  <input
                                    type="number"
                                    min="1"
                                    max={available}
                                    value={item.quantity}
                                    onChange={(e) => handleUpdateQuantity(item.id, parseInt(e.target.value) || 1)}
                                    className={`w-12 py-1 text-center font-extrabold text-xs rounded-lg border text-slate-900 bg-white ${
                                      isExcess ? 'border-rose-400 ring-1 ring-rose-400' : 'border-slate-300'
                                    }`}
                                  />

                                  <button
                                    type="button"
                                    onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center font-bold text-xs cursor-pointer"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                <div className="text-right">
                                  <span className="text-xs font-extrabold text-slate-900">
                                    {formatCurrency(item.unitPrice * item.quantity, currency)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Cart Totals & Review Button */}
                  {cart.length > 0 && (
                    <div className="space-y-3 pt-3 border-t border-slate-200">
                      {/* Discount Input */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600 font-medium">Order Discount:</span>
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400 text-[11px]">-</span>
                          <input
                            type="number"
                            min="0"
                            max={rawSubtotal}
                            value={discountAmount || ''}
                            placeholder="0"
                            onChange={(e) => setDiscountAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                            className="w-24 p-1.5 rounded-lg border border-slate-300 bg-white text-right text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                          <span className="text-[11px] text-slate-500 font-mono">{currency}</span>
                        </div>
                      </div>

                      {/* Totals Box */}
                      <div className="p-3 bg-white rounded-2xl border border-slate-200 space-y-1">
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>Subtotal ({totalItemCount} items):</span>
                          <span>{formatCurrency(rawSubtotal, currency)}</span>
                        </div>
                        {safeDiscount > 0 && (
                          <div className="flex justify-between text-xs text-amber-700 font-medium">
                            <span>Discount:</span>
                            <span>-{formatCurrency(safeDiscount, currency)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-extrabold text-base text-slate-900 border-t border-slate-100 pt-1.5">
                          <span>Grand Total:</span>
                          <span className="text-emerald-700">{formatCurrency(finalTotalAmount, currency)}</span>
                        </div>
                      </div>

                      {/* Checkout Button */}
                      <button
                        type="button"
                        id="btn-proceed-to-checkout"
                        onClick={handleProceedToCheckout}
                        disabled={cart.length === 0 || !checkStockValidity().isValid}
                        className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99]"
                      >
                        <span>Checkout • {formatCurrency(finalTotalAmount, currency)}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 2: CHECKOUT REVIEW & PAYMENT */}
            {step === 'checkout' && (
              <div className="p-5 sm:p-6 space-y-5 max-w-2xl mx-auto">
                <button
                  type="button"
                  onClick={() => setStep('cart')}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Edit Cart</span>
                </button>

                {/* ORDER SUMMARY */}
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between font-bold text-slate-900 border-b border-slate-200 pb-2">
                    <span className="font-sans uppercase text-[11px] tracking-wider text-slate-600 font-extrabold">
                      ORDER SUMMARY ({cart.length} line items)
                    </span>
                    <span>Subtotal</span>
                  </div>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 divide-y divide-slate-100">
                    {cart.map((it) => (
                      <div key={it.id} className="pt-1.5 flex justify-between text-slate-700">
                        <span className="truncate max-w-[280px]">
                          {it.quantity} &times; {it.product.name} {it.variantName ? `(${it.variantName})` : ''}
                        </span>
                        <span className="font-bold text-slate-900">
                          {formatCurrency(it.unitPrice * it.quantity, currency)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-slate-200 pt-2 space-y-1">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(rawSubtotal, currency)}</span>
                    </div>
                    {safeDiscount > 0 && (
                      <div className="flex justify-between text-amber-700">
                        <span>Discount:</span>
                        <span>-{formatCurrency(safeDiscount, currency)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-base text-slate-900 pt-1 border-t border-slate-200">
                      <span>TOTAL:</span>
                      <span className="text-emerald-700">{formatCurrency(finalTotalAmount, currency)}</span>
                    </div>
                  </div>
                </div>

                {/* CUSTOMER INFORMATION */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Customer Information:
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
                      <option value="">Walk-in Customer (Default)</option>
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
                          placeholder="Or type customer name..."
                          value={newCustomerName}
                          onChange={(e) => setNewCustomerName(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* PAYMENT METHOD SELECTOR */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Select Payment Method:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[
                      { method: 'Cash' as PaymentMethod, icon: '💵', label: 'Cash' },
                      { method: 'Mobile Money' as PaymentMethod, icon: '📱', label: 'Mobile Money' },
                      { method: 'Bank' as PaymentMethod, icon: '🏦', label: 'Bank' },
                      ...(allowCustomerCredit ? [{ method: 'Credit' as PaymentMethod, icon: '📝', label: 'Credit (Pay Later)' }] : []),
                      { method: 'Split' as PaymentMethod, icon: '⚖️', label: 'Split Payment' },
                    ].map((pm) => (
                      <button
                        key={pm.method}
                        type="button"
                        onClick={() => setPaymentMethod(pm.method)}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                          paymentMethod === pm.method
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold shadow-xs'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-700 text-xs'
                        }`}
                      >
                        <span className="text-base block mb-0.5">{pm.icon}</span>
                        <span className="text-xs font-bold">{pm.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Split Payment Allocation Inputs */}
                  {paymentMethod === 'Split' && (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-800">Allocate Split Payment:</span>
                        <span className="text-emerald-700 font-extrabold">Total: {formatCurrency(finalTotalAmount, currency)}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="text-[11px] text-slate-600 block mb-1">Cash ({currency})</label>
                          <input
                            type="number"
                            min="0"
                            value={splitAmounts.Cash || ''}
                            onChange={(e) => setSplitAmounts({ ...splitAmounts, Cash: parseFloat(e.target.value) || 0 })}
                            placeholder="0"
                            className="w-full p-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-600 block mb-1">Mobile Money ({currency})</label>
                          <input
                            type="number"
                            min="0"
                            value={splitAmounts['Mobile Money'] || ''}
                            onChange={(e) => setSplitAmounts({ ...splitAmounts, 'Mobile Money': parseFloat(e.target.value) || 0 })}
                            placeholder="0"
                            className="w-full p-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-600 block mb-1">Bank ({currency})</label>
                          <input
                            type="number"
                            min="0"
                            value={splitAmounts.Bank || ''}
                            onChange={(e) => setSplitAmounts({ ...splitAmounts, Bank: parseFloat(e.target.value) || 0 })}
                            placeholder="0"
                            className="w-full p-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
                          />
                        </div>
                      </div>
                      {splitError && (
                        <p className="text-xs text-rose-600 font-medium">{splitError}</p>
                      )}
                    </div>
                  )}

                  {/* Credit Customer Warning */}
                  {paymentMethod === 'Credit' && !selectedCustomerId && !newCustomerName.trim() && (
                    <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                      ⚠️ Please select or enter a customer name to record this order as credit debt.
                    </p>
                  )}
                </div>

                {/* Complete Sale Confirmation Button */}
                <button
                  type="button"
                  id="btn-confirm-complete-multi-sale"
                  disabled={paymentMethod === 'Credit' && !selectedCustomerId && !newCustomerName.trim()}
                  onClick={handleCompleteSale}
                  className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-base shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99]"
                >
                  <span>Complete Sale • {formatCurrency(finalTotalAmount, currency)}</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* STEP 3: ONE INVOICE FOR THE WHOLE ORDER */}
            {step === 'completed' && completedSale && (
              <div className="p-5 sm:p-8 space-y-6 max-w-xl mx-auto text-center animate-fade-in">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto text-2xl font-bold">
                  ✓
                </div>
                <div>
                  <h4 className="text-2xl font-extrabold text-slate-900 font-['Outfit',sans-serif]">
                    Order Completed Successfully!
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Invoice <strong className="font-mono text-slate-900">{completedSale.invoiceNumber}</strong> &bull; All product stocks updated
                  </p>
                </div>

                {/* Itemized Invoice Box */}
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-3 font-mono text-xs">
                  <div className="text-center pb-2 border-b border-dashed border-slate-300">
                    <p className="font-bold text-sm text-slate-900 font-sans">{profile.name}</p>
                    <p className="text-[10px] text-slate-500">{new Date(completedSale.date).toLocaleString()}</p>
                  </div>

                  <div className="flex justify-between text-[11px] text-slate-600">
                    <span>Invoice #: <strong>{completedSale.invoiceNumber}</strong></span>
                    <span>Customer: <strong>{completedSale.customerName || 'Walk-in'}</strong></span>
                  </div>

                  <div className="border-t border-b border-slate-200 py-2 space-y-1.5 max-h-48 overflow-y-auto">
                    {completedSale.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between text-slate-700">
                        <span className="truncate max-w-[240px]">
                          {it.quantity} &times; {it.productName}
                        </span>
                        <span className="font-bold">
                          {formatCurrency(it.subtotal || it.total || 0, currency)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1 pt-1 text-xs">
                    {completedSale.subtotal && completedSale.discount && completedSale.discount > 0 && (
                      <>
                        <div className="flex justify-between text-slate-600">
                          <span>Subtotal:</span>
                          <span>{formatCurrency(completedSale.subtotal, currency)}</span>
                        </div>
                        <div className="flex justify-between text-amber-700">
                          <span>Discount:</span>
                          <span>-{formatCurrency(completedSale.discount, currency)}</span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between font-bold text-sm text-slate-950 pt-1">
                      <span>TOTAL:</span>
                      <span className="text-emerald-700">{formatCurrency(completedSale.totalAmount, currency)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                      <span>Payment Method:</span>
                      <span className="font-bold text-slate-800">{completedSale.paymentMethod}</span>
                    </div>
                  </div>
                </div>

                {/* INVOICE ACTIONS: [View Invoice], [Print Invoice], [Download Invoice], [Share Invoice (WhatsApp)] */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {onOpenReceiptModal && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenReceiptModal(completedSale);
                        handleCloseAll();
                      }}
                      className="p-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex flex-col items-center justify-center gap-1 cursor-pointer shadow-xs"
                    >
                      <FileText className="w-4 h-4 text-slate-600" />
                      <span>View Invoice</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handlePrint}
                    className="p-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex flex-col items-center justify-center gap-1 cursor-pointer shadow-xs"
                  >
                    <Printer className="w-4 h-4 text-slate-600" />
                    <span>Print Invoice</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownload}
                    className="p-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex flex-col items-center justify-center gap-1 cursor-pointer shadow-xs"
                  >
                    <Download className="w-4 h-4 text-slate-600" />
                    <span>Download</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleWhatsApp}
                    className="p-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex flex-col items-center justify-center gap-1 cursor-pointer shadow-xs"
                  >
                    <Share2 className="w-4 h-4 text-white" />
                    <span>WhatsApp</span>
                  </button>
                </div>

                {/* Secondary Actions: Copy & New Sale */}
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex-1 py-3 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {copiedToast ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
                    <span>{copiedToast ? 'Copied to Clipboard' : 'Copy Text Receipt'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleStartAnotherSale}
                    className="flex-1 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer shadow-sm"
                  >
                    + Start New Sale
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Embedded Barcode Scanner Camera */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        mode="sales"
        products={products}
        currency={currency}
        cartCount={cart.length}
        onProductScanned={(prod, variant) => {
          handleBarcodeScanned(prod, variant);
        }}
        onAddNewProductWithBarcode={(barcode) => {
          setIsScannerOpen(false);
          if (onAddNewProductWithBarcode) {
            onAddNewProductWithBarcode(barcode);
          }
        }}
      />
    </>
  );
};
