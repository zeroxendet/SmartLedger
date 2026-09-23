import React, { useState, useEffect, useMemo } from 'react';
import { 
  Product, 
  CurrencyCode, 
  ProductVariant, 
  Sale, 
  Purchase, 
  ProductionLog, 
  WasteLog, 
  CustomerReturn, 
  SupplierReturn, 
  StaffPermissions 
} from '../types';
import { formatCurrency } from '../utils/calculations';
import { 
  cleanBarcode, 
  checkBarcodeUniqueness, 
  findProductByBarcode 
} from '../utils/barcodeUtils';
import { 
  checkProductHistory, 
  canUserArchiveProduct, 
  canUserRestoreProduct, 
  canUserPermanentlyDeleteProduct,
  ProductHistorySummary 
} from '../utils/productHistoryUtils';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { 
  Search, 
  Plus, 
  Package, 
  Edit, 
  ArrowUpRight, 
  TrendingUp, 
  X, 
  ShoppingCart, 
  Calendar, 
  AlertTriangle, 
  Layers, 
  Clock, 
  Trash2, 
  Check,
  Tag,
  Barcode,
  Camera,
  Copy,
  Archive,
  RotateCcw,
  ShieldCheck,
  ShieldAlert,
  Info,
  Lock
} from 'lucide-react';

interface ProductsViewProps {
  products: Product[];
  currency: CurrencyCode;
  isBeginner: boolean;
  canSell?: boolean;
  userRole?: 'Owner' | 'Manager' | 'Cashier' | string;
  staffPermissions?: StaffPermissions;
  currentUserName?: string;
  sales?: Sale[];
  purchases?: Purchase[];
  productionLogs?: ProductionLog[];
  wasteLogs?: WasteLog[];
  customerReturns?: CustomerReturn[];
  supplierReturns?: SupplierReturn[];
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
  onArchiveProduct?: (product: Product, reason?: string) => Promise<boolean>;
  onRestoreProduct?: (product: Product) => Promise<boolean>;
  onPermanentDeleteProduct?: (product: Product) => Promise<boolean>;
  onQuickSell: (product?: Product, quantity?: number, variant?: ProductVariant) => void;
  onOpenNewSale?: () => void;
  onWriteOffExpired?: (product: Product, quantity: number, reason: string) => void;
  initialBarcodeToAdd?: string | null;
  onClearInitialBarcodeToAdd?: () => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  products,
  currency,
  isBeginner,
  canSell = true,
  userRole = 'Owner',
  staffPermissions,
  currentUserName = 'Business Owner',
  sales = [],
  purchases = [],
  productionLogs = [],
  wasteLogs = [],
  customerReturns = [],
  supplierReturns = [],
  onAddProduct,
  onUpdateProduct,
  onArchiveProduct,
  onRestoreProduct,
  onPermanentDeleteProduct,
  onQuickSell,
  onOpenNewSale,
  onWriteOffExpired,
  initialBarcodeToAdd,
  onClearInitialBarcodeToAdd,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeFilterTab, setActiveFilterTab] = useState<'all' | 'low_stock' | 'expiring_soon'>('all');
  
  // Active vs Archived Catalog View Switcher (Requirement 6)
  const [catalogSubView, setCatalogSubView] = useState<'active' | 'archived'>('active');
  const [archivedSearchTerm, setArchivedSearchTerm] = useState('');

  // Delete, Archive, Restore & Explainer Modals State
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isPermanentDeleteModalOpen, setIsPermanentDeleteModalOpen] = useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [isProtectedExplainerOpen, setIsProtectedExplainerOpen] = useState(false);
  const [targetProduct, setTargetProduct] = useState<Product | null>(null);
  const [productHistory, setProductHistory] = useState<ProductHistorySummary | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionToast, setActionToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (actionToast) {
      const timer = setTimeout(() => setActionToast(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [actionToast]);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedProductDetails, setSelectedProductDetails] = useState<Product | null>(null);
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [restockAmount, setRestockAmount] = useState(10);
  const [isWriteOffModalOpen, setIsWriteOffModalOpen] = useState(false);
  const [writeOffQty, setWriteOffQty] = useState(1);
  const [writeOffReason, setWriteOffReason] = useState('Expired / Spoiled');

  // Edit Product Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editSellingPrice, setEditSellingPrice] = useState('');
  const [editBuyingPrice, setEditBuyingPrice] = useState('');
  const [editStock, setEditStock] = useState('');
  const [editMinStock, setEditMinStock] = useState('');
  const [editBarcode, setEditBarcode] = useState('');
  const [editUnit, setEditUnit] = useState('units');
  const [editNotes, setEditNotes] = useState('');
  const [editBarcodeError, setEditBarcodeError] = useState<{ conflictingProduct: Product } | null>(null);
  const [isEditBarcodeCaptureOpen, setIsEditBarcodeCaptureOpen] = useState(false);

  // New product form
  const [name, setName] = useState('');
  const [category, setCategory] = useState('General');
  const [buyingPrice, setBuyingPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [stock, setStock] = useState('');
  const [minStockLevel, setMinStockLevel] = useState('15');
  const [unit, setUnit] = useState('units');
  const [notes, setNotes] = useState('');
  const [barcode, setBarcode] = useState('');
  const [barcodeDuplicateError, setBarcodeDuplicateError] = useState<{ existingProduct: Product } | null>(null);
  const [isBarcodeCaptureOpen, setIsBarcodeCaptureOpen] = useState(false);
  const [expiryDate, setExpiryDate] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  
  // Barcode quick lookup from catalog
  const [isCatalogScannerOpen, setIsCatalogScannerOpen] = useState(false);
  const [copiedBarcodeToast, setCopiedBarcodeToast] = useState(false);

  // Variants in new product form
  const [variantsList, setVariantsList] = useState<{ name: string; price: number; stock: number }[]>([]);
  const [newVarName, setNewVarName] = useState('');
  const [newVarPrice, setNewVarPrice] = useState('');
  const [newVarStock, setNewVarStock] = useState('');

  // Handle auto-open Add Product when barcode was scanned in POS (Requirement 11)
  useEffect(() => {
    if (initialBarcodeToAdd) {
      setBarcode(initialBarcodeToAdd);
      setIsAddModalOpen(true);
      setBarcodeDuplicateError(null);
      if (onClearInitialBarcodeToAdd) {
        onClearInitialBarcodeToAdd();
      }
    }
  }, [initialBarcodeToAdd, onClearInitialBarcodeToAdd]);

  // Active and Archived product partitions
  const activeProducts = useMemo(
    () => products.filter((p) => !p.isArchived && p.status !== 'archived'),
    [products]
  );

  const archivedProducts = useMemo(
    () => products.filter((p) => p.isArchived || p.status === 'archived'),
    [products]
  );

  const categories = ['All', ...Array.from(new Set(activeProducts.map((p) => p.category)))];

  // Expiration calculator
  const getExpiryStatus = (expDateStr?: string) => {
    if (!expDateStr) return null;
    const expDate = new Date(expDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { label: `Expired (${Math.abs(diffDays)}d ago)`, isExpired: true, isExpiringSoon: false, days: diffDays };
    } else if (diffDays <= 3) {
      return { label: `Expires in ${diffDays === 0 ? 'Today' : `${diffDays}d`}`, isExpired: false, isExpiringSoon: true, days: diffDays };
    }
    return { label: `Exp: ${expDateStr}`, isExpired: false, isExpiringSoon: false, days: diffDays };
  };

  const filtered = activeProducts.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.batchNumber && p.batchNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.barcode && p.barcode.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;

    if (!matchesSearch || !matchesCategory) return false;

    if (activeFilterTab === 'low_stock') {
      return p.stock <= p.minStockLevel;
    }
    if (activeFilterTab === 'expiring_soon') {
      const exp = getExpiryStatus(p.expiryDate);
      return exp && (exp.isExpired || exp.isExpiringSoon);
    }

    return true;
  });

  const filteredArchived = archivedProducts.filter((p) => {
    return (
      p.name.toLowerCase().includes(archivedSearchTerm.toLowerCase()) ||
      (p.batchNumber && p.batchNumber.toLowerCase().includes(archivedSearchTerm.toLowerCase())) ||
      (p.barcode && p.barcode.toLowerCase().includes(archivedSearchTerm.toLowerCase())) ||
      (p.category && p.category.toLowerCase().includes(archivedSearchTerm.toLowerCase()))
    );
  });

  // Safe Deletion Handlers
  const handleInitiateDeleteAction = (prod: Product) => {
    const canArchive = canUserArchiveProduct(userRole, staffPermissions);
    const canDelete = canUserPermanentlyDeleteProduct(userRole, staffPermissions);

    if (!canArchive && !canDelete) {
      setActionToast({
        message: 'Access Denied: You do not have permission to delete or archive products.',
        type: 'error',
      });
      return;
    }

    // Comprehensive transaction history check across all collections (Requirement 2)
    const history = checkProductHistory(prod, {
      sales,
      purchases,
      productionLogs,
      wasteLogs,
      customerReturns,
      supplierReturns,
    });

    setTargetProduct(prod);
    setProductHistory(history);
    setSelectedProductDetails(null); // Close details modal

    if (history.hasHistory) {
      // PRODUCT WITH HISTORY -> Show Archive confirmation modal (Requirement 4)
      setIsArchiveModalOpen(true);
    } else {
      // PRODUCT WITH NO HISTORY -> Show Permanent Delete confirmation modal (Requirement 3)
      setIsPermanentDeleteModalOpen(true);
    }
  };

  const handleConfirmArchive = async () => {
    if (!targetProduct || !onArchiveProduct) return;
    setActionLoading(true);
    try {
      const ok = await onArchiveProduct(targetProduct, 'Archived from products catalog');
      if (ok) {
        setIsArchiveModalOpen(false);
        setActionToast({
          message: `"${targetProduct.name}" has been archived successfully. Historical sales and profits remain completely intact.`,
          type: 'success',
        });
        setTargetProduct(null);
        setProductHistory(null);
      } else {
        setActionToast({
          message: 'Something went wrong. Your product and financial records were not changed.',
          type: 'error',
        });
      }
    } catch {
      setActionToast({
        message: 'Something went wrong. Your product and financial records were not changed.',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmPermanentDelete = async () => {
    if (!targetProduct || !onPermanentDeleteProduct) return;
    setActionLoading(true);
    try {
      const ok = await onPermanentDeleteProduct(targetProduct);
      if (ok) {
        setIsPermanentDeleteModalOpen(false);
        setActionToast({
          message: `"${targetProduct.name}" has been permanently deleted from your business.`,
          type: 'success',
        });
        setTargetProduct(null);
        setProductHistory(null);
      } else {
        setActionToast({
          message: 'Something went wrong. Your product and financial records were not changed.',
          type: 'error',
        });
      }
    } catch {
      setActionToast({
        message: 'Something went wrong. Your product and financial records were not changed.',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleInitiateRestore = (prod: Product) => {
    if (!canUserRestoreProduct(userRole, staffPermissions)) {
      setActionToast({
        message: 'Access Denied: You do not have permission to restore products.',
        type: 'error',
      });
      return;
    }
    setTargetProduct(prod);
    setIsRestoreModalOpen(true);
  };

  const handleConfirmRestore = async () => {
    if (!targetProduct || !onRestoreProduct) return;
    setActionLoading(true);
    try {
      const ok = await onRestoreProduct(targetProduct);
      if (ok) {
        setIsRestoreModalOpen(false);
        setActionToast({
          message: `"${targetProduct.name}" has been restored to your active products catalog.`,
          type: 'success',
        });
        setTargetProduct(null);
      } else {
        setActionToast({
          message: 'Something went wrong. Your product and financial records were not changed.',
          type: 'error',
        });
      }
    } catch {
      setActionToast({
        message: 'Something went wrong. Your product and financial records were not changed.',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleInitiateArchivedPermanentDelete = (prod: Product) => {
    const history = checkProductHistory(prod, {
      sales,
      purchases,
      productionLogs,
      wasteLogs,
      customerReturns,
      supplierReturns,
    });

    if (history.hasHistory) {
      setTargetProduct(prod);
      setProductHistory(history);
      setIsProtectedExplainerOpen(true);
      return;
    }

    if (!canUserPermanentlyDeleteProduct(userRole, staffPermissions)) {
      setActionToast({
        message: 'Access Denied: You do not have permission to permanently delete products.',
        type: 'error',
      });
      return;
    }

    setTargetProduct(prod);
    setProductHistory(history);
    setIsPermanentDeleteModalOpen(true);
  };

  const handleAddVariant = () => {
    if (!newVarName.trim() || !newVarPrice) return;
    setVariantsList((prev) => [
      ...prev,
      {
        name: newVarName.trim(),
        price: parseFloat(newVarPrice) || 0,
        stock: parseInt(newVarStock) || 0,
      },
    ]);
    setNewVarName('');
    setNewVarPrice('');
    setNewVarStock('');
  };

  const handleRemoveVariant = (index: number) => {
    setVariantsList((prev) => prev.filter((_, i) => i !== index));
  };

  /**
   * Save New Product
   * Checks uniqueness per business (Requirement 2, 3, 6)
   */
  const handleSaveNewProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Validate barcode uniqueness if entered
    const clean = cleanBarcode(barcode);
    if (clean) {
      const uniqueness = checkBarcodeUniqueness(products, clean);
      if (!uniqueness.isUnique && uniqueness.conflictingProduct) {
        setBarcodeDuplicateError({ existingProduct: uniqueness.conflictingProduct });
        return;
      }
    }

    const formattedVariants: ProductVariant[] = variantsList.map((v, i) => ({
      id: `var_${Date.now()}_${i}`,
      name: v.name,
      sellingPrice: v.price,
      stock: v.stock,
    }));

    const newProd: Product = {
      id: `prod_${Date.now()}`,
      name: name.trim(),
      category: category.trim() || 'General',
      buyingPrice: parseFloat(buyingPrice) || 0,
      costPrice: parseFloat(buyingPrice) || 0,
      sellingPrice: parseFloat(sellingPrice) || 0,
      stock: parseInt(stock) || 0,
      minStockLevel: parseInt(minStockLevel) || 10,
      unit: unit || 'units',
      notes: notes.trim(),
      barcode: clean || undefined, // Stored as STRING preserving leading zeros!
      ...(expiryDate ? { expiryDate } : {}),
      ...(batchNumber.trim() ? { batchNumber: batchNumber.trim() } : {}),
      ...(formattedVariants.length > 0 ? { variants: formattedVariants } : {}),
    };

    onAddProduct(newProd);
    setName('');
    setBuyingPrice('');
    setSellingPrice('');
    setStock('');
    setBarcode('');
    setBarcodeDuplicateError(null);
    setExpiryDate('');
    setBatchNumber('');
    setVariantsList([]);
    setIsAddModalOpen(false);
  };

  // Open Edit Product Modal
  const handleOpenEditModal = (prod: Product) => {
    setEditName(prod.name);
    setEditCategory(prod.category);
    setEditSellingPrice(String(prod.sellingPrice));
    setEditBuyingPrice(String(prod.buyingPrice || prod.costPrice || 0));
    setEditStock(String(prod.stock));
    setEditMinStock(String(prod.minStockLevel));
    setEditBarcode(prod.barcode || '');
    setEditUnit(prod.unit || 'units');
    setEditNotes(prod.notes || '');
    setEditBarcodeError(null);
    setIsEditModalOpen(true);
  };

  // Save Edited Product
  const handleSaveEditedProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductDetails || !editName.trim()) return;

    const clean = cleanBarcode(editBarcode);
    if (clean) {
      const uniqueness = checkBarcodeUniqueness(products, clean, selectedProductDetails.id);
      if (!uniqueness.isUnique && uniqueness.conflictingProduct) {
        setEditBarcodeError({ conflictingProduct: uniqueness.conflictingProduct });
        return;
      }
    }

    const updated: Product = {
      ...selectedProductDetails,
      name: editName.trim(),
      category: editCategory.trim() || 'General',
      sellingPrice: parseFloat(editSellingPrice) || 0,
      buyingPrice: parseFloat(editBuyingPrice) || 0,
      costPrice: parseFloat(editBuyingPrice) || 0,
      stock: parseInt(editStock) || 0,
      minStockLevel: parseInt(editMinStock) || 10,
      barcode: clean || undefined,
      unit: editUnit || 'units',
      notes: editNotes.trim(),
      updatedAt: new Date().toISOString(),
    };

    onUpdateProduct(updated);
    setSelectedProductDetails(updated);
    setIsEditModalOpen(false);
  };

  const handleApplyRestock = () => {
    if (!selectedProductDetails) return;
    const updated = {
      ...selectedProductDetails,
      stock: selectedProductDetails.stock + restockAmount,
    };
    onUpdateProduct(updated);
    setSelectedProductDetails(updated);
    setIsRestockModalOpen(false);
  };

  const handleApplyWriteOff = () => {
    if (!selectedProductDetails || !onWriteOffExpired) return;
    onWriteOffExpired(selectedProductDetails, writeOffQty, writeOffReason);
    const updated = {
      ...selectedProductDetails,
      stock: Math.max(0, selectedProductDetails.stock - writeOffQty),
    };
    setSelectedProductDetails(updated);
    setIsWriteOffModalOpen(false);
  };

  const lowStockCount = activeProducts.filter((p) => p.stock <= p.minStockLevel).length;

  return (
    <div id="smartledger-products-view" className="space-y-6">
      {/* Toast Notification Banner */}
      {actionToast && (
        <div className={`p-4 rounded-2xl flex items-center justify-between text-xs font-bold shadow-md animate-fade-in ${
          actionToast.type === 'success' 
            ? 'bg-emerald-600 text-white shadow-emerald-200' 
            : 'bg-rose-600 text-white shadow-rose-200'
        }`}>
          <div className="flex items-center gap-2.5">
            {actionToast.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
            <span className="leading-snug">{actionToast.message}</span>
          </div>
          <button 
            type="button"
            onClick={() => setActionToast(null)} 
            className="opacity-80 hover:opacity-100 p-1 cursor-pointer shrink-0 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-['Outfit',sans-serif] text-slate-900">
            Product Catalog & Inventory
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage your retail inventory, manufacturer barcodes, pricing, and stock levels.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Method 2: Multi-Product Cart New Sale */}
          {onOpenNewSale && (
            <button
              id="catalog-new-sale-btn"
              type="button"
              onClick={onOpenNewSale}
              className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-950/20 active:scale-95 transition-all cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4 text-emerald-200" />
              <span>🛒 New Sale</span>
            </button>
          )}

          {/* Scan Barcode to find product in catalog */}
          <button
            id="catalog-scan-barcode-btn"
            onClick={() => setIsCatalogScannerOpen(true)}
            className="py-2.5 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Camera className="w-4 h-4 text-emerald-400" />
            <span>Scan Barcode</span>
          </button>

          <button
            id="add-product-open-btn"
            onClick={() => {
              setBarcode('');
              setBarcodeDuplicateError(null);
              setIsAddModalOpen(true);
            }}
            className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Product</span>
          </button>
        </div>
      </div>

      {/* Primary Catalog Switcher (Requirement 6: Active Products vs Archived Products) */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          id="btn-tab-active-catalog"
          onClick={() => setCatalogSubView('active')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            catalogSubView === 'active'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Active Products ({activeProducts.length})</span>
        </button>

        <button
          type="button"
          id="btn-tab-archived-catalog"
          onClick={() => setCatalogSubView('archived')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            catalogSubView === 'archived'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Archive className="w-4 h-4 text-amber-400" />
          <span>Archived Products ({archivedProducts.length})</span>
        </button>
      </div>

      {/* ACTIVE PRODUCTS SECTION */}
      {catalogSubView === 'active' && (
        <div className="space-y-4">
          {/* Smart Filter Tabs */}
          <div className="flex flex-wrap gap-2 text-xs font-bold">
            <button
              onClick={() => setActiveFilterTab('all')}
              className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
                activeFilterTab === 'all'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              All Items ({activeProducts.length})
            </button>

        <button
          onClick={() => setActiveFilterTab('low_stock')}
          className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            activeFilterTab === 'low_stock'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-white text-amber-800 border border-amber-200 hover:bg-amber-50'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Low Stock ({lowStockCount})</span>
        </button>

        <button
          onClick={() => setActiveFilterTab('expiring_soon')}
          className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            activeFilterTab === 'expiring_soon'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'bg-white text-rose-800 border border-rose-200 hover:bg-rose-50'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Batch & Expiry Dates</span>
        </button>
      </div>

      {/* Search, Scan, and Category Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            id="products-search-input"
            type="text"
            placeholder="Search products by name, barcode number, or batch..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs bg-white"
          />
        </div>

        {/* Prominent 📷 Scan button near search controls (Requirement 5) */}
        <button
          id="btn-scan-products-top"
          type="button"
          onClick={() => setIsCatalogScannerOpen(true)}
          className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer shrink-0"
        >
          <Camera className="w-4 h-4 text-emerald-400" />
          <span>📷 Scan</span>
        </button>

        <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                selectedCategory === cat
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filtered.map((prod) => {
          const isLowStock = prod.stock <= prod.minStockLevel;
          const profitPerUnit = prod.sellingPrice - (prod.buyingPrice || prod.costPrice || 0);
          const expStatus = getExpiryStatus(prod.expiryDate);

          return (
            <div
              key={prod.id}
              id={`product-card-${prod.id}`}
              className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 font-['Outfit',sans-serif]">
                      {prod.name}
                    </h3>
                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                      <span className="text-[11px] text-slate-400 font-medium">
                        {prod.category}
                      </span>
                      {prod.barcode && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono flex items-center gap-1 border border-slate-200">
                          <Barcode className="w-2.5 h-2.5 text-emerald-600" />
                          <span>{prod.barcode}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                        isLowStock
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {isLowStock ? '⚠️ Low stock' : '🟢 In stock'}
                    </span>
                  </div>
                </div>

                <div className="flex items-baseline justify-between mt-3 text-xs">
                  <span className="text-slate-500">Stock Count:</span>
                  <span className={`font-bold ${isLowStock ? 'text-amber-700 font-extrabold' : 'text-slate-800'}`}>
                    {prod.stock} {prod.unit || 'units'}
                  </span>
                </div>

                <div className="flex items-baseline justify-between text-xs mt-1">
                  <span className="text-slate-500">Selling Price:</span>
                  <span className="font-extrabold text-emerald-700">
                    {formatCurrency(prod.sellingPrice, currency)}
                  </span>
                </div>

                <div className="flex items-baseline justify-between text-xs mt-1">
                  <span className="text-slate-500">Est. profit:</span>
                  <span className="font-semibold text-slate-700">
                    {formatCurrency(profitPerUnit, currency)}
                  </span>
                </div>
              </div>

              {/* Bottom Action Area (Requirement 1 & 10): View Details on LEFT, Sell on RIGHT */}
              <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <button
                  type="button"
                  id={`btn-view-details-${prod.id}`}
                  onClick={() => setSelectedProductDetails(prod)}
                  className="text-emerald-700 hover:text-emerald-800 font-bold text-xs flex items-center gap-1 py-1.5 px-2 -ml-1 rounded-xl hover:bg-emerald-50 transition-colors cursor-pointer"
                >
                  <span>View Details</span>
                  <span>&rarr;</span>
                </button>

                <button
                  type="button"
                  id={`btn-sell-${prod.id}`}
                  disabled={!canSell}
                  onClick={() => {
                    if (!canSell) return;
                    onQuickSell(prod, 1);
                  }}
                  className={`py-1.5 px-4 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all ${
                    !canSell
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                      : prod.stock <= 0
                      ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 cursor-pointer'
                      : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white shadow-emerald-200 cursor-pointer'
                  }`}
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>Sell</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  )}

  {/* ARCHIVED PRODUCTS SECTION (Requirement 6, 7, 8) */}
      {catalogSubView === 'archived' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <Archive className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-950 font-['Outfit',sans-serif]">
                  Archived Products Vault
                </h3>
                <p className="text-xs text-amber-800 mt-0.5">
                  Products safely removed from active sales. All past financial, sales, and profit records remain 100% intact.
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-amber-900 bg-amber-200/60 px-3 py-1.5 rounded-xl shrink-0 self-start sm:self-center">
              {archivedProducts.length} Archived Items
            </span>
          </div>

          {/* Archived Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              id="archived-search-input"
              type="text"
              placeholder="Search archived products by name, category, or barcode..."
              value={archivedSearchTerm}
              onChange={(e) => setArchivedSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs bg-white"
            />
          </div>

          {/* Archived Cards List */}
          {filteredArchived.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-300">
              <Archive className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800 font-['Outfit',sans-serif]">
                No Archived Products
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {archivedSearchTerm
                  ? `No archived items match "${archivedSearchTerm}".`
                  : 'You do not have any archived products yet. Products removed with sales history will appear here safely.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredArchived.map((prod) => {
                const history = checkProductHistory(prod, {
                  sales,
                  purchases,
                  productionLogs,
                  wasteLogs,
                  customerReturns,
                  supplierReturns,
                });

                return (
                  <div
                    key={prod.id}
                    id={`archived-card-${prod.id}`}
                    className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all space-y-3.5"
                  >
                    <div>
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              {prod.category}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1">
                              <Archive className="w-3 h-3" />
                              <span>Archived</span>
                            </span>
                          </div>
                          <h3 className="text-base font-bold text-slate-900 font-['Outfit',sans-serif] mt-1.5">
                            {prod.name}
                          </h3>
                          {prod.barcode && (
                            <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                              Barcode: {prod.barcode}
                            </p>
                          )}
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block">Prev. Price</span>
                          <span className="text-sm font-extrabold text-slate-700">
                            {formatCurrency(prod.sellingPrice, currency)}
                          </span>
                        </div>
                      </div>

                      {/* Archival Metadata Box */}
                      <div className="mt-3 p-3 rounded-xl bg-amber-50/60 border border-amber-100 text-xs space-y-1">
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="text-[11px] text-slate-500">Archived Date:</span>
                          <span className="font-semibold text-slate-800">
                            {prod.archivedAt ? new Date(prod.archivedAt).toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'Previously archived'}
                          </span>
                        </div>
                        {prod.archivedBy && (
                          <div className="flex items-center justify-between text-slate-600">
                            <span className="text-[11px] text-slate-500">Archived By:</span>
                            <span className="font-semibold text-slate-800">{prod.archivedBy}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="text-[11px] text-slate-500">Last Stock:</span>
                          <span className="font-bold text-slate-800">{prod.stock} {prod.unit || 'units'}</span>
                        </div>
                      </div>

                      {/* Historical Activity Summary (Requirement 6) */}
                      <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Product History</span>
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            {history.summaryText}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-slate-200">
                          <div>
                            <span className="text-[10px] text-slate-400 block">Sales</span>
                            <span className="font-bold text-slate-800">{history.salesCount}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">Units</span>
                            <span className="font-bold text-slate-800">{history.unitsSold}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">Revenue</span>
                            <span className="font-bold text-emerald-700">{formatCurrency(history.totalRevenue, currency)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Area (Requirement 7 & 8) */}
                    <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        {/* Restore Product Button (Requirement 7) */}
                        <button
                          type="button"
                          id={`btn-restore-${prod.id}`}
                          onClick={() => handleInitiateRestore(prod)}
                          className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Restore Product</span>
                        </button>

                        {/* Permanent delete or Protected Explainer (Requirement 8) */}
                        {history.hasHistory ? (
                          <button
                            type="button"
                            onClick={() => {
                              setTargetProduct(prod);
                              setProductHistory(history);
                              setIsProtectedExplainerOpen(true);
                            }}
                            className="py-2 px-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-bold text-xs flex items-center gap-1 cursor-pointer"
                            title="Why can't I delete permanently?"
                          >
                            <Lock className="w-3.5 h-3.5 text-amber-600" />
                            <span>Protected</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            id={`btn-perm-delete-${prod.id}`}
                            onClick={() => handleInitiateArchivedPermanentDelete(prod)}
                            className="py-2 px-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs flex items-center gap-1 cursor-pointer"
                            title="Delete permanently (no transaction history)"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>

                      {history.hasHistory && (
                        <p className="text-[10px] text-slate-500 text-center flex items-center justify-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          <span>Financial history preserved</span>
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* PRODUCT DETAILS MODAL (Requirement 8) */}
      {selectedProductDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-5 sm:p-6 space-y-4 border border-slate-200 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                  {selectedProductDetails.category}
                </span>
                <h3 className="text-xl font-bold font-['Outfit',sans-serif] text-slate-900">
                  {selectedProductDetails.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedProductDetails(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {/* BARCODE / PRODUCT CODE SECTION (Requirement 8) */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 shadow-xs">
                    <Barcode className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Barcode / Product Code
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-900">
                      {selectedProductDetails.barcode ? selectedProductDetails.barcode : 'No barcode assigned'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {selectedProductDetails.barcode ? (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(selectedProductDetails.barcode!);
                        setCopiedBarcodeToast(true);
                        setTimeout(() => setCopiedBarcodeToast(false), 2000);
                      }}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      title="Copy Barcode"
                    >
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>{copiedBarcodeToast ? 'Copied!' : 'Copy'}</span>
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(selectedProductDetails)}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{selectedProductDetails.barcode ? 'Edit' : 'Assign'}</span>
                  </button>
                </div>
              </div>

              {/* Price and Stock Stats */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 block">Selling Price</span>
                  <span className="text-base font-bold text-emerald-700">
                    {formatCurrency(selectedProductDetails.sellingPrice, currency)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 block">Current Stock</span>
                  <span className="text-base font-bold text-slate-900">
                    {selectedProductDetails.stock} {selectedProductDetails.unit || 'units'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  id="prod-detail-sell-btn"
                  disabled={!canSell}
                  onClick={() => {
                    const prod = selectedProductDetails;
                    setSelectedProductDetails(null);
                    onQuickSell(prod, 1);
                  }}
                  className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all ${
                    !canSell
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                      : selectedProductDetails.stock <= 0
                      ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 cursor-pointer'
                      : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white shadow-emerald-200 cursor-pointer'
                  }`}
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Sell Product</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRestockAmount(10);
                    setIsRestockModalOpen(true);
                  }}
                  className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Stock</span>
                </button>

                <button
                  id="prod-detail-edit-btn"
                  onClick={() => handleOpenEditModal(selectedProductDetails)}
                  className="py-2.5 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              </div>

              {/* Safe Deletion Action Button (Requirement 1) */}
              <div className="pt-3 border-t border-slate-200 mt-2">
                <button
                  type="button"
                  id="prod-detail-delete-btn"
                  onClick={() => handleInitiateDeleteAction(selectedProductDetails)}
                  className="w-full py-2.5 px-4 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-98"
                >
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  <span>Delete Product</span>
                </button>
                <p className="text-[10px] text-slate-500 text-center mt-1.5 leading-tight">
                  Safe deletion: Products with past sales history will be archived to protect historical reports, profits, and receipts.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT PRODUCT MODAL (Requirement 7) */}
      {isEditModalOpen && selectedProductDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-5 sm:p-6 space-y-4 border border-slate-200 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold font-['Outfit',sans-serif] text-slate-900">
                Edit Product
              </h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedProduct} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Product Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900"
                  required
                />
              </div>

              {/* Barcode / Product Code Editor */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <Barcode className="w-4 h-4 text-emerald-600" />
                    <span>Barcode / Product Code</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditBarcodeCaptureOpen(true)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <Camera className="w-3 h-3" />
                    <span>Scan</span>
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="e.g. 1234567890123"
                  value={editBarcode}
                  onChange={(e) => {
                    setEditBarcode(e.target.value);
                    setEditBarcodeError(null);
                  }}
                  className="w-full px-3 py-1.5 font-mono text-xs rounded-lg border border-slate-300 bg-white"
                />

                {/* Duplicate Barcode Warning */}
                {editBarcodeError && (
                  <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-1">
                    <p className="font-bold">Barcode already used</p>
                    <p className="text-[11px]">
                      This barcode is already assigned to <strong>{editBarcodeError.conflictingProduct.name}</strong>.
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Selling Price ({currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editSellingPrice}
                    onChange={(e) => setEditSellingPrice(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Cost / Buying Price
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editBuyingPrice}
                    onChange={(e) => setEditBuyingPrice(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editStock}
                    onChange={(e) => setEditStock(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Low Stock Alert
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editMinStock}
                    onChange={(e) => setEditMinStock(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restock Mini Modal */}
      {isRestockModalOpen && selectedProductDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xs bg-white rounded-2xl p-5 space-y-4 border border-slate-200 shadow-2xl">
            <h4 className="text-sm font-bold text-slate-900">
              Add Stock: {selectedProductDetails.name}
            </h4>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Add Quantity</label>
              <input
                type="number"
                min="1"
                value={restockAmount}
                onChange={(e) => setRestockAmount(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-base font-bold"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsRestockModalOpen(false)}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyRestock}
                className="flex-1 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold"
              >
                Apply Restock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD PRODUCT MODAL (Requirement 1, 2, 6) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl p-5 sm:p-6 space-y-4 border border-slate-200 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold font-['Outfit',sans-serif] text-slate-900">
                  + Add New Product
                </h3>
                <p className="text-xs text-slate-400">
                  Create a new product record for your store
                </p>
              </div>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setBarcodeDuplicateError(null);
                }}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Product Name *
                </label>
                <input
                  id="new-product-name-input"
                  type="text"
                  placeholder="e.g. Orange Fanta, Sliced Milk Bread"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Drinks, Bakery, Snacks"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Unit of Measure
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. bottles, loaves, pcs"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Selling Price ({currency}) *
                  </label>
                  <input
                    id="new-product-price-input"
                    type="number"
                    min="0"
                    placeholder="e.g. 500"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Buying / Cost Price ({currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 350"
                    value={buyingPrice}
                    onChange={(e) => setBuyingPrice(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Initial Stock Count
                  </label>
                  <input
                    id="new-product-stock-input"
                    type="number"
                    min="0"
                    placeholder="e.g. 10"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Low Stock Alert Level
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 15"
                    value={minStockLevel}
                    onChange={(e) => setMinStockLevel(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
              </div>

              {/* Batch & Expiry Date */}
              <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200/80 space-y-2">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                  <span>Batch & Expiration Tracking (Optional)</span>
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Expiry Date
                    </label>
                    <input
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Batch / Lot #
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. LOT-2026-09A"
                      value={batchNumber}
                      onChange={(e) => setBatchNumber(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* FEATURE: BARCODE / PRODUCT CODE (Requirement 1, 2, 6) */}
              {/* Placed DIRECTLY below Batch & Expiration Tracking and before Product Variants */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Barcode className="w-4 h-4 text-emerald-600" />
                      <span>Barcode / Product Code</span>
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Scan or enter the barcode number to identify this product quickly.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsBarcodeCaptureOpen(true)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Scan Barcode</span>
                  </button>
                </div>

                <div className="space-y-1">
                  <div className="relative">
                    <input
                      id="new-product-barcode-input"
                      type="text"
                      placeholder="e.g. 1234567890123"
                      value={barcode}
                      onChange={(e) => {
                        setBarcode(e.target.value);
                        setBarcodeDuplicateError(null);
                      }}
                      className="w-full px-3.5 py-2 font-mono text-xs rounded-xl border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500 uppercase"
                    />
                    {barcode && (
                      <button
                        type="button"
                        onClick={() => {
                          setBarcode('');
                          setBarcodeDuplicateError(null);
                        }}
                        className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Optional &bull; Manufacturer barcode (EAN-13, EAN-8, UPC-A, Code 128)
                  </p>
                </div>

                {/* Duplicate Barcode Warning Dialog (Requirement 2 & 6) */}
                {barcodeDuplicateError && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 space-y-2 text-xs animate-fade-in">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Barcode already used</p>
                        <p className="text-[11px] text-amber-800 mt-0.5">
                          This barcode is already assigned to <strong>{barcodeDuplicateError.existingProduct.name}</strong>.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProductDetails(barcodeDuplicateError.existingProduct);
                          setIsAddModalOpen(false);
                          setBarcodeDuplicateError(null);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-amber-200 hover:bg-amber-300 text-amber-900 font-bold text-[11px] cursor-pointer"
                      >
                        View Product
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setBarcode('');
                          setBarcodeDuplicateError(null);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-amber-800 font-semibold text-[11px] cursor-pointer"
                      >
                        Use a Different Barcode
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Product Variants (Feature 6) */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-600" />
                  <span>Product Variants / Sizes / Packs (Optional)</span>
                </span>

                {variantsList.length > 0 && (
                  <div className="space-y-1.5">
                    {variantsList.map((v, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 text-xs">
                        <span className="font-bold">{v.name}</span>
                        <div className="flex items-center gap-2">
                          <span>{formatCurrency(v.price, currency)}</span>
                          <span className="text-slate-400">({v.stock} pcs)</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveVariant(idx)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-3 gap-1.5">
                  <input
                    type="text"
                    placeholder="Size (e.g. Large / 1kg)"
                    value={newVarName}
                    onChange={(e) => setNewVarName(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                  />
                  <input
                    type="number"
                    placeholder={`Price (${currency})`}
                    value={newVarPrice}
                    onChange={(e) => setNewVarPrice(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                  />
                  <div className="flex gap-1">
                    <input
                      type="number"
                      placeholder="Stock"
                      value={newVarStock}
                      onChange={(e) => setNewVarStock(e.target.value)}
                      className="w-16 px-2 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleAddVariant}
                      className="flex-1 px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Notes / Supplier (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Stored on shelf B / ABC Supplier"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <button
                id="save-product-btn"
                type="submit"
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
              >
                Save Product
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Barcode Capture Camera Modal for Add Product */}
      <BarcodeScannerModal
        isOpen={isBarcodeCaptureOpen}
        onClose={() => setIsBarcodeCaptureOpen(false)}
        mode="capture"
        onBarcodeCaptured={(scannedCode) => {
          setBarcode(scannedCode);
          setBarcodeDuplicateError(null);
        }}
        title="Scan Barcode for New Product"
        subtitle="Point camera at product barcode"
      />

      {/* Barcode Capture Camera Modal for Edit Product */}
      <BarcodeScannerModal
        isOpen={isEditBarcodeCaptureOpen}
        onClose={() => setIsEditBarcodeCaptureOpen(false)}
        mode="capture"
        onBarcodeCaptured={(scannedCode) => {
          setEditBarcode(scannedCode);
          setEditBarcodeError(null);
        }}
        title="Scan Barcode to Update Product"
        subtitle="Point camera at product barcode"
      />

      {/* Barcode Scanner Modal for Catalog Quick Lookup & Direct Sell */}
      <BarcodeScannerModal
        isOpen={isCatalogScannerOpen}
        onClose={() => setIsCatalogScannerOpen(false)}
        mode="sales"
        products={products}
        currency={currency}
        onSellProduct={(prod, quantity, variant) => {
          setIsCatalogScannerOpen(false);
          onQuickSell(prod, quantity, variant);
        }}
        onAddNewProductWithBarcode={(scannedCode) => {
          setIsCatalogScannerOpen(false);
          setBarcode(scannedCode);
          setBarcodeDuplicateError(null);
          setIsAddModalOpen(true);
        }}
        title="📷 Scan Product Barcode"
        subtitle="Align camera with barcode to view inventory and sell"
      />

      {/* 1. ARCHIVE CONFIRMATION MODAL (Requirement 4) */}
      {isArchiveModalOpen && targetProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-5 sm:p-6 space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Archive className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-['Outfit',sans-serif] text-slate-900">
                  Archive Product?
                </h3>
                <p className="text-xs text-slate-500">
                  Preserve historical records while hiding from sales
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed font-medium">
              <span className="font-bold">{targetProduct.name}</span> has transaction history, so it cannot be permanently deleted. Archiving will remove it from your active products while keeping all previous transactions and financial records.
            </div>

            {productHistory && (
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                <div className="font-bold text-slate-700 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Historical Activity Preserved:</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 text-slate-600">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Sales Recorded</span>
                    <span className="font-bold text-slate-800">{productHistory.salesCount} sales</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Units Sold</span>
                    <span className="font-bold text-slate-800">{productHistory.unitsSold} units</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Total Revenue</span>
                    <span className="font-bold text-emerald-700">{formatCurrency(productHistory.totalRevenue, currency)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Estimated Profit</span>
                    <span className="font-bold text-emerald-700">{formatCurrency(productHistory.totalProfit, currency)}</span>
                  </div>
                </div>
              </div>
            )}

            <ul className="text-[11px] text-slate-600 space-y-1 list-disc pl-4">
              <li>Product disappears from active selling catalog</li>
              <li>All previous sales, receipts, and reports stay 100% accurate</li>
              <li>You can view or restore this product anytime in Archived Products</li>
            </ul>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsArchiveModalOpen(false);
                  setTargetProduct(null);
                  setProductHistory(null);
                }}
                disabled={actionLoading}
                className="py-2.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-archive-product"
                onClick={handleConfirmArchive}
                disabled={actionLoading}
                className="py-2.5 px-5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
              >
                <Archive className="w-4 h-4" />
                <span>{actionLoading ? 'Archiving...' : 'Archive Product'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. PERMANENT DELETE CONFIRMATION MODAL (Requirement 3 & 8) */}
      {isPermanentDeleteModalOpen && targetProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-5 sm:p-6 space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-['Outfit',sans-serif] text-slate-900">
                  Delete Product?
                </h3>
                <p className="text-xs text-slate-500">
                  Permanent removal from business records
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 leading-relaxed font-medium">
              <span className="font-bold">{targetProduct.name}</span> has no transaction history. It will be permanently deleted from your business.
            </div>

            <p className="text-xs text-slate-600">
              Because this item was never sold or recorded in any financial transaction, it is completely safe to delete without affecting your ledger.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsPermanentDeleteModalOpen(false);
                  setTargetProduct(null);
                  setProductHistory(null);
                }}
                disabled={actionLoading}
                className="py-2.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-permanent-delete"
                onClick={handleConfirmPermanentDelete}
                disabled={actionLoading}
                className="py-2.5 px-5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{actionLoading ? 'Deleting...' : 'Delete Permanently'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. RESTORE PRODUCT CONFIRMATION MODAL (Requirement 7) */}
      {isRestoreModalOpen && targetProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-5 sm:p-6 space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-['Outfit',sans-serif] text-slate-900">
                  Restore Product?
                </h3>
                <p className="text-xs text-slate-500">
                  Return product to active inventory & sales
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">
              Restore <span className="font-bold text-slate-900">{targetProduct.name}</span> to your active products?
            </p>

            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 space-y-1">
              <p className="font-semibold">✓ Preserves original product ID and barcode</p>
              <p>✓ All previous transaction links remain connected</p>
              <p>✓ Available for cashier/staff sales immediately</p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsRestoreModalOpen(false);
                  setTargetProduct(null);
                }}
                disabled={actionLoading}
                className="py-2.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-restore-product"
                onClick={handleConfirmRestore}
                disabled={actionLoading}
                className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{actionLoading ? 'Restoring...' : 'Restore Product'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. PROTECTED PRODUCT EXPLAINER MODAL (Requirement 8) */}
      {isProtectedExplainerOpen && targetProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-5 sm:p-6 space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-['Outfit',sans-serif] text-slate-900">
                  Protected by SmartLedger
                </h3>
                <p className="text-xs text-slate-500">
                  Financial history integrity protection
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 leading-relaxed font-semibold">
              This product has historical transactions and cannot be permanently deleted because doing so could damage your financial history.
            </div>

            {productHistory && (
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                <div className="text-slate-500 text-[11px]">Associated historical records:</div>
                <div className="font-bold text-slate-800">
                  {productHistory.salesCount} Sales • {productHistory.unitsSold} Units Sold • {formatCurrency(productHistory.totalRevenue, currency)} Revenue
                </div>
                <div className="text-[11px] text-slate-500 pt-1">
                  Permanently deleting this record would break past invoices, customer purchase histories, and tax reporting.
                </div>
              </div>
            )}

            <p className="text-xs text-slate-600">
              Archiving safely keeps this product off your active sales list while keeping all your past financial records 100% accurate. You can also restore it at any time.
            </p>

            <div className="pt-2 flex items-center justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsProtectedExplainerOpen(false);
                  setTargetProduct(null);
                  setProductHistory(null);
                }}
                className="py-2.5 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
