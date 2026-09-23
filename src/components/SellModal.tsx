import React, { useState, useEffect } from 'react';
import { 
  Product, 
  Sale, 
  SaleItem, 
  Customer, 
  CurrencyCode, 
  PaymentMethod, 
  PaymentSplit,
  BusinessProfile,
  ProductVariant
} from '../types';
import { formatCurrency, generateWhatsAppReceiptText, openWhatsAppReceipt } from '../utils/calculations';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { 
  findProductByBarcode, 
  useBarcodeKeyboardScanner,
  playBarcodeSuccessFeedback 
} from '../utils/barcodeUtils';
import { 
  X, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  CheckCircle2, 
  Share2, 
  Copy, 
  AlertTriangle, 
  Barcode, 
  Camera, 
  ShoppingBag,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Layers
} from 'lucide-react';

export interface CartItem {
  id: string; // unique item id in cart
  product: Product;
  variantId?: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
}

interface SellModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  customers: Customer[];
  currency: CurrencyCode;
  allowCustomerCredit: boolean;
  profile?: BusinessProfile;
  initialProduct?: Product | null;
  initialQuantity?: number;
  initialVariant?: ProductVariant | null;
  onCompleteSale: (sale: Sale, restockQuantityIfProduced?: number) => void;
  onAddCustomer: (name: string, phone?: string) => string;
  onAddNewProductWithBarcode?: (barcode: string) => void;
}

export const SellModal: React.FC<SellModalProps> = ({
  isOpen,
  onClose,
  products,
  customers,
  currency,
  allowCustomerCredit,
  profile,
  initialProduct,
  initialQuantity,
  initialVariant,
  onCompleteSale,
  onAddCustomer,
  onAddNewProductWithBarcode,
}) => {
  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [newCustomerName, setNewCustomerName] = useState<string>('');

  // Scanner & Modals state
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [unknownBarcodePrompt, setUnknownBarcodePrompt] = useState<string | null>(null);
  const [copiedToast, setCopiedToast] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);

  // Split payment state
  const [splitAmounts, setSplitAmounts] = useState<{
    Cash: number;
    'Mobile Money': number;
    Bank: number;
  }>({ Cash: 0, 'Mobile Money': 0, Bank: 0 });
  const [splitAllocationError, setSplitAllocationError] = useState<string | null>(null);

  // Stock Error Alert
  const [stockAlert, setStockAlert] = useState<{
    productName: string;
    required: number;
    available: number;
  } | null>(null);

  // Auto-scan feedback banner
  const [scanToast, setScanToast] = useState<string | null>(null);

  // Reset modal state when closed, or initialize with preselected product when opened
  useEffect(() => {
    if (!isOpen) {
      setCart([]);
      setSearchTerm('');
      setStockAlert(null);
      setUnknownBarcodePrompt(null);
      setCompletedSale(null);
      setPaymentMethod('Cash');
      setSelectedCustomerId('');
      setNewCustomerName('');
      setSplitAllocationError(null);
    } else if (initialProduct) {
      if (initialProduct.isArchived || initialProduct.status === 'archived') {
        setCart([]);
        showScanToast(`Product "${initialProduct.name}" is archived and cannot be sold. Please restore it first.`);
        return;
      }
      const variant = initialVariant;
      const initialQty = initialQuantity && initialQuantity > 0 ? initialQuantity : 1;
      const price = variant ? variant.sellingPrice : initialProduct.sellingPrice;
      const cost = variant
        ? (variant.costPrice || initialProduct.buyingPrice || initialProduct.costPrice || 0)
        : (initialProduct.buyingPrice || initialProduct.costPrice || 0);
      const stock = variant ? variant.stock : initialProduct.stock;
      const safeQty = stock > 0 ? Math.min(initialQty, stock) : initialQty;

      setCart([
        {
          id: variant ? `${initialProduct.id}_${variant.id}` : initialProduct.id,
          product: initialProduct,
          variantId: variant?.id,
          variantName: variant?.name,
          quantity: safeQty,
          unitPrice: price,
          unitCost: cost,
        },
      ]);
    }
  }, [isOpen, initialProduct, initialQuantity, initialVariant]);

  // Support USB and Bluetooth barcode scanners
  useBarcodeKeyboardScanner({
    onScan: (scannedCode) => {
      if (isOpen && !completedSale) {
        handleProcessBarcode(scannedCode);
      }
    },
    enabled: isOpen && !isScannerOpen && !completedSale,
  });

  if (!isOpen) return null;

  const showScanToast = (msg: string) => {
    setScanToast(msg);
    setTimeout(() => setScanToast(null), 2500);
  };

  /**
   * Core Barcode Processing & Repeated Scanning Logic
   * Requirement 4: Repeated scanning increments quantity of the existing line item
   * Requirement 5: Manual quantity adjustment (+/-, direct input)
   * Requirement 7: Prevent selling more than available stock
   */
  const handleProductScanned = (scannedProd: Product, variant?: ProductVariant) => {
    const availableStock = variant ? variant.stock : scannedProd.stock;

    // Check if product (or variant) is ALREADY in the cart
    const existingIndex = cart.findIndex((item) => 
      item.product.id === scannedProd.id && 
      (variant ? item.variantId === variant.id : !item.variantId)
    );

    if (existingIndex >= 0) {
      const existing = cart[existingIndex];
      const newQty = existing.quantity + 1;

      if (newQty > availableStock) {
        setStockAlert({
          productName: scannedProd.name + (variant ? ` (${variant.name})` : ''),
          required: newQty,
          available: availableStock,
        });
        return;
      }

      const nextCart = [...cart];
      nextCart[existingIndex] = {
        ...existing,
        quantity: newQty,
      };
      setCart(nextCart);
      setStockAlert(null);
      showScanToast(`Scanned: ${scannedProd.name} × ${newQty}`);
    } else {
      // New item to add to cart
      if (availableStock <= 0) {
        setStockAlert({
          productName: scannedProd.name + (variant ? ` (${variant.name})` : ''),
          required: 1,
          available: 0,
        });
        return;
      }

      const unitPrice = variant ? variant.sellingPrice : scannedProd.sellingPrice;
      const unitCost = scannedProd.buyingPrice || scannedProd.costPrice || 0;

      setCart((prev) => [
        ...prev,
        {
          id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          product: scannedProd,
          variantId: variant?.id,
          variantName: variant?.name,
          quantity: 1,
          unitPrice,
          unitCost,
        },
      ]);
      setStockAlert(null);
      showScanToast(`Added: ${scannedProd.name} × 1`);
    }

    playBarcodeSuccessFeedback();
  };

  const handleProcessBarcode = (code: string) => {
    const match = findProductByBarcode(products, code);
    if (match) {
      if (match.product.isArchived || match.product.status === 'archived') {
        showScanToast(`Product "${match.product.name}" is archived and cannot be sold.`);
        return;
      }
      handleProductScanned(match.product, match.variant);
      setUnknownBarcodePrompt(null);
    } else {
      setUnknownBarcodePrompt(code);
    }
  };

  // Adjust item quantity via buttons or direct input
  const handleUpdateItemQuantity = (itemId: string, newQtyRaw: number) => {
    const item = cart.find((i) => i.id === itemId);
    if (!item) return;

    if (newQtyRaw <= 0) {
      handleRemoveItem(itemId);
      return;
    }

    const availableStock = item.variantId 
      ? (item.product.variants?.find((v) => v.id === item.variantId)?.stock ?? item.product.stock)
      : item.product.stock;

    if (newQtyRaw > availableStock) {
      setStockAlert({
        productName: item.product.name + (item.variantName ? ` (${item.variantName})` : ''),
        required: newQtyRaw,
        available: availableStock,
      });
      return;
    }

    setStockAlert(null);
    setCart((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, quantity: newQtyRaw } : i))
    );
  };

  const handleRemoveItem = (itemId: string) => {
    setCart((prev) => prev.filter((i) => i.id !== itemId));
    setStockAlert(null);
  };

  // Calculate cart totals
  const totalAmount = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const totalCost = cart.reduce((sum, item) => sum + item.unitCost * item.quantity, 0);
  const totalProfit = totalAmount - totalCost;
  const totalItemUnits = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Search filter for product catalog picker (active products only)
  const filteredProducts = products
    .filter((p) => !p.isArchived && p.status !== 'archived')
    .filter((p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.barcode && p.barcode.toLowerCase().includes(searchTerm.toLowerCase()))
    );

  const handleAttemptCheckout = () => {
    if (cart.length === 0) return;

    // Final stock verification before checkout
    for (const item of cart) {
      const available = item.variantId
        ? (item.product.variants?.find((v) => v.id === item.variantId)?.stock ?? item.product.stock)
        : item.product.stock;

      if (item.quantity > available) {
        setStockAlert({
          productName: item.product.name + (item.variantName ? ` (${item.variantName})` : ''),
          required: item.quantity,
          available,
        });
        return;
      }
    }

    // Split Payment Validation
    if (paymentMethod === 'Split') {
      const allocated = (splitAmounts.Cash || 0) + (splitAmounts['Mobile Money'] || 0) + (splitAmounts.Bank || 0);
      if (allocated !== totalAmount) {
        setSplitAllocationError(
          `Allocated ${formatCurrency(allocated, currency)} does not match total ${formatCurrency(totalAmount, currency)}. Remaining: ${formatCurrency(totalAmount - allocated, currency)}`
        );
        return;
      }
    }

    setSplitAllocationError(null);
    finalizeSale();
  };

  const finalizeSale = () => {
    let custId = selectedCustomerId;
    let custName = customers.find((c) => c.id === selectedCustomerId)?.name;

    if (paymentMethod === 'Credit') {
      if (!custId && newCustomerName.trim()) {
        custId = onAddCustomer(newCustomerName.trim());
        custName = newCustomerName.trim();
      }
    }

    // Format Sale Items with barcode and variant metadata
    const saleItems: SaleItem[] = cart.map((item) => ({
      productId: item.product.id,
      productName: item.variantName ? `${item.product.name} (${item.variantName})` : item.product.name,
      quantity: item.quantity,
      sellingPrice: item.unitPrice,
      buyingPrice: item.unitCost,
      unitPrice: item.unitPrice,
      total: item.unitPrice * item.quantity,
      barcode: item.product.barcode,
      variantId: item.variantId,
      variantName: item.variantName,
    }));

    // Payment splits
    let paymentSplits: PaymentSplit[] | undefined = undefined;
    if (paymentMethod === 'Split') {
      paymentSplits = [
        { method: 'Cash' as const, amount: splitAmounts.Cash || 0 },
        { method: 'Mobile Money' as const, amount: splitAmounts['Mobile Money'] || 0 },
        { method: 'Bank' as const, amount: splitAmounts.Bank || 0 },
      ].filter((s) => s.amount > 0);
    } else if (paymentMethod === 'Cash' || paymentMethod === 'Mobile Money' || paymentMethod === 'Bank') {
      paymentSplits = [{ method: paymentMethod, amount: totalAmount }];
    }

    const newSale: Sale = {
      id: `sale_${Date.now()}`,
      invoiceNumber: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
      items: saleItems,
      totalAmount,
      totalCost,
      profit: totalProfit,
      paymentMethod,
      paymentSplits,
      paymentStatus: paymentMethod === 'Credit' ? 'UNPAID' : 'PAID',
      customerId: paymentMethod === 'Credit' ? custId : undefined,
      customerName: paymentMethod === 'Credit' ? custName : undefined,
      date: new Date().toISOString(),
    };

    // Stock decreases only upon sale completion (Requirement 6)
    onCompleteSale(newSale, 0);
    setCompletedSale(newSale);
  };

  const handleCloseAll = () => {
    setCart([]);
    setCompletedSale(null);
    onClose();
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

  return (
    <>
      <div 
        id="smartledger-sell-modal"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
      >
        <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
          {/* Header */}
          <div className="bg-slate-900 px-5 py-4 text-white flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold font-['Outfit',sans-serif]">
                  {completedSale ? 'Sale Completed' : 'Point of Sale • Ring-up'}
                </h3>
                <p className="text-xs text-slate-400">
                  {completedSale
                    ? `Invoice #${completedSale.invoiceNumber}`
                    : 'Scan barcodes or select items to ring up'}
                </p>
              </div>
            </div>
            <button
              onClick={handleCloseAll}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
            {/* Scan Toast Feedback */}
            {scanToast && (
              <div className="p-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center justify-between animate-fade-in shadow-md">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  <span>{scanToast}</span>
                </span>
                <span className="text-[10px] text-emerald-200 font-mono">BEEP</span>
              </div>
            )}

            {/* COMPLETED SALE CONFIRMATION VIEW */}
            {completedSale ? (
              <div className="space-y-5 text-center py-2 animate-fade-in">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto text-2xl font-bold">
                  ✓
                </div>
                <div>
                  <h4 className="text-xl font-bold text-slate-900 font-['Outfit',sans-serif]">
                    Sale Recorded Successfully!
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Invoice #{completedSale.invoiceNumber} &bull; Inventory stock updated
                  </p>
                </div>

                {/* Receipt Details Box */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-3 font-mono text-xs">
                  <div className="flex justify-between font-bold text-slate-900 border-b pb-2">
                    <span>Item</span>
                    <span>Total</span>
                  </div>
                  {completedSale.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between text-slate-700">
                      <span>{it.quantity}x {it.productName}</span>
                      <span>{formatCurrency(it.total || 0, currency)}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 flex justify-between font-bold text-sm text-slate-900">
                    <span>Grand Total:</span>
                    <span className="text-emerald-700">{formatCurrency(completedSale.totalAmount, currency)}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex justify-between">
                    <span>Payment Method:</span>
                    <span className="font-semibold">{completedSale.paymentMethod}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                  <button
                    onClick={handleQuickWhatsApp}
                    className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Send WhatsApp Receipt</span>
                  </button>
                  <button
                    onClick={handleCopyReceipt}
                    className="py-3 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Copy className="w-4 h-4 text-slate-500" />
                    <span>{copiedToast ? 'Copied to Clipboard!' : 'Copy Text Receipt'}</span>
                  </button>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      setCompletedSale(null);
                      setCart([]);
                    }}
                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Start New Sale
                  </button>
                </div>
              </div>
            ) : (
              /* ACTIVE POS SALE VIEW */
              <div className="space-y-4">
                {/* PROMINENT SCAN BARCODE ACTION (Requirement 3 & 4) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    id="btn-pos-scan-barcode"
                    type="button"
                    onClick={() => setIsScannerOpen(true)}
                    className="py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2.5 shadow-md shadow-emerald-600/20 active:scale-[0.99] transition-all cursor-pointer"
                  >
                    <Camera className="w-5 h-5" />
                    <span>📷 Scan Barcode</span>
                  </button>

                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      id="pos-search-input"
                      type="text"
                      placeholder="Search name or type barcode..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && searchTerm.trim()) {
                          handleProcessBarcode(searchTerm.trim());
                        }
                      }}
                      className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs text-slate-900 bg-slate-50/50"
                    />
                  </div>
                </div>

                {/* INSUFFICIENT STOCK WARNING (Requirement 7) */}
                {stockAlert && (
                  <div className="p-3.5 bg-rose-50 border-2 border-rose-300 rounded-2xl text-rose-900 text-xs space-y-1 animate-fade-in">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span className="font-bold text-sm">Insufficient Stock</span>
                    </div>
                    <p className="text-[11px] text-rose-800 pl-6">
                      Only <strong>{stockAlert.available}</strong> {stockAlert.productName} units are available in inventory.
                    </p>
                  </div>
                )}

                {/* UNKNOWN BARCODE PROMPT (Requirement 11) */}
                {unknownBarcodePrompt && (
                  <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl text-amber-900 text-xs space-y-2 animate-fade-in">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-sm text-amber-950">Product Not Found</h4>
                        <p className="text-[11px] text-amber-800 mt-0.5">
                          SmartLedger couldn't find a product with barcode: <strong className="font-mono bg-amber-200/70 px-1.5 py-0.5 rounded">{unknownBarcodePrompt}</strong>
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1 pl-7">
                      {onAddNewProductWithBarcode && (
                        <button
                          type="button"
                          onClick={() => {
                            const code = unknownBarcodePrompt;
                            setUnknownBarcodePrompt(null);
                            onAddNewProductWithBarcode(code);
                          }}
                          className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add New Product</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setUnknownBarcodePrompt(null);
                          setIsScannerOpen(true);
                        }}
                        className="px-3.5 py-2 bg-white border border-amber-300 text-amber-900 font-bold text-xs rounded-xl hover:bg-amber-100 cursor-pointer"
                      >
                        Scan Again
                      </button>
                    </div>
                  </div>
                )}

                {/* CURRENT SALE CART ITEMS (Requirement 4 & 5) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
                    <span>Cart Items ({totalItemUnits} units)</span>
                    {cart.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setCart([])}
                        className="text-slate-400 hover:text-rose-600 text-[11px]"
                      >
                        Clear Cart
                      </button>
                    )}
                  </div>

                  {cart.length === 0 ? (
                    <div className="py-8 px-4 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 text-center space-y-2">
                      <Barcode className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-xs font-bold text-slate-600">Cart is empty</p>
                      <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                        Tap "Scan Barcode" above to scan bottles/packages, or choose a product from the list below.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {cart.map((item) => {
                        const available = item.variantId
                          ? (item.product.variants?.find((v) => v.id === item.variantId)?.stock ?? item.product.stock)
                          : item.product.stock;

                        return (
                          <div
                            key={item.id}
                            className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-3 hover:border-slate-300 transition-all"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <h4 className="text-xs font-bold text-slate-900 truncate">
                                  {item.product.name}
                                </h4>
                                {item.variantName && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-bold">
                                    {item.variantName}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                                <span>{formatCurrency(item.unitPrice, currency)} / unit</span>
                                <span>&bull;</span>
                                <span className={available < 5 ? 'text-amber-600 font-bold' : 'text-slate-500'}>
                                  Stock: {available}
                                </span>
                                {item.product.barcode && (
                                  <>
                                    <span>&bull;</span>
                                    <span className="font-mono text-[10px] text-slate-400">
                                      {item.product.barcode}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* QUANTITY CONTROLS (Requirement 5) */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleUpdateItemQuantity(item.id, item.quantity - 1)}
                                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs cursor-pointer"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>

                              <input
                                type="number"
                                min="1"
                                max={available}
                                value={item.quantity}
                                onChange={(e) => handleUpdateItemQuantity(item.id, parseInt(e.target.value) || 1)}
                                className="w-12 py-1 text-center font-extrabold text-xs rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />

                              <button
                                type="button"
                                onClick={() => handleUpdateItemQuantity(item.id, item.quantity + 1)}
                                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Item Subtotal & Remove */}
                            <div className="text-right shrink-0 min-w-[70px]">
                              <p className="text-xs font-extrabold text-emerald-700">
                                {formatCurrency(item.unitPrice * item.quantity, currency)}
                              </p>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item.id)}
                                className="text-[10px] text-slate-400 hover:text-rose-600 mt-0.5 cursor-pointer"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* PRODUCT QUICK SELECTOR LIST (if searching or looking up) */}
                {searchTerm && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Catalog Matches ({filteredProducts.length})
                    </p>
                    <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-2xl bg-white shadow-xs">
                      {filteredProducts.length === 0 ? (
                        <div className="p-4 text-center text-slate-400 text-xs">
                          No matching products found.
                        </div>
                      ) : (
                        filteredProducts.map((p) => (
                          <div
                            key={p.id}
                            className="p-2.5 flex items-center justify-between hover:bg-slate-50 text-xs"
                          >
                            <div>
                              <p className="font-bold text-slate-900">{p.name}</p>
                              <p className="text-[10px] text-slate-500">
                                In stock: {p.stock} &bull; Price: {formatCurrency(p.sellingPrice, currency)}
                                {p.barcode && <span className="font-mono text-slate-400 ml-1">[{p.barcode}]</span>}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                handleProductScanned(p);
                                setSearchTerm('');
                              }}
                              className="px-3 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs cursor-pointer"
                            >
                              + Add
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* TOTAL SUMMARY CARD */}
                {cart.length > 0 && (
                  <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-center justify-between text-emerald-950">
                    <div>
                      <p className="text-xs font-semibold text-emerald-700">Total Sale Amount</p>
                      <p className="text-xs text-slate-600">
                        {totalItemUnits} items in cart &bull; Est. Profit: {formatCurrency(totalProfit, currency)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-extrabold text-emerald-800 font-['Outfit',sans-serif]">
                        {formatCurrency(totalAmount, currency)}
                      </p>
                    </div>
                  </div>
                )}

                {/* PAYMENT METHOD SELECTOR */}
                {cart.length > 0 && (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                      Payment Method
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
                          <span className="text-lg block mb-0.5">{pm.icon}</span>
                          <span className="text-xs font-bold">{pm.label}</span>
                        </button>
                      ))}
                    </div>

                    {/* Credit Customer Selector if Credit */}
                    {paymentMethod === 'Credit' && (
                      <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 text-xs space-y-2">
                        <label className="font-bold text-amber-900 block">Select Customer for Credit:</label>
                        <select
                          value={selectedCustomerId}
                          onChange={(e) => setSelectedCustomerId(e.target.value)}
                          className="w-full p-2 rounded-lg border border-slate-300 bg-white text-xs"
                        >
                          <option value="">-- Choose existing customer --</option>
                          {customers.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} {c.phone ? `(${c.phone})` : ''}
                            </option>
                          ))}
                        </select>
                        {!selectedCustomerId && (
                          <input
                            type="text"
                            placeholder="Or enter new customer name..."
                            value={newCustomerName}
                            onChange={(e) => setNewCustomerName(e.target.value)}
                            className="w-full p-2 rounded-lg border border-slate-300 bg-white text-xs"
                          />
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* COMPLETE SALE BUTTON */}
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={handleAttemptCheckout}
                    className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-base shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99]"
                  >
                    <span>Complete Sale • {formatCurrency(totalAmount, currency)}</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Embedded Barcode Scanner Camera Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        mode="sales"
        products={products}
        currency={currency}
        cartCount={cart.length}
        onProductScanned={(prod, variant) => {
          handleProductScanned(prod, variant);
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
