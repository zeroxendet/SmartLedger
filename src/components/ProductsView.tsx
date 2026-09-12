import React, { useState } from 'react';
import { Product, CurrencyCode, ProductVariant } from '../types';
import { formatCurrency } from '../utils/calculations';
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
  Tag
} from 'lucide-react';

interface ProductsViewProps {
  products: Product[];
  currency: CurrencyCode;
  isBeginner: boolean;
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
  onQuickSell: (product: Product) => void;
  onWriteOffExpired?: (product: Product, quantity: number, reason: string) => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  products,
  currency,
  isBeginner,
  onAddProduct,
  onUpdateProduct,
  onQuickSell,
  onWriteOffExpired,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeFilterTab, setActiveFilterTab] = useState<'all' | 'low_stock' | 'expiring_soon'>('all');
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedProductDetails, setSelectedProductDetails] = useState<Product | null>(null);
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [restockAmount, setRestockAmount] = useState(10);
  const [isWriteOffModalOpen, setIsWriteOffModalOpen] = useState(false);
  const [writeOffQty, setWriteOffQty] = useState(1);
  const [writeOffReason, setWriteOffReason] = useState('Expired / Spoiled');

  // New product form
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Baked Goods');
  const [buyingPrice, setBuyingPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [stock, setStock] = useState('');
  const [minStockLevel, setMinStockLevel] = useState('15');
  const [unit, setUnit] = useState('units');
  const [notes, setNotes] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  
  // Variants in new product form
  const [variantsList, setVariantsList] = useState<{ name: string; price: number; stock: number }[]>([]);
  const [newVarName, setNewVarName] = useState('');
  const [newVarPrice, setNewVarPrice] = useState('');
  const [newVarStock, setNewVarStock] = useState('');

  const categories = ['All', ...Array.from(new Set(products.map((p) => p.category)))];

  // Helper to compute expiration status
  const getExpiryStatus = (expDateStr?: string) => {
    if (!expDateStr) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const exp = new Date(expDateStr);
    exp.setHours(0, 0, 0, 0);
    const diffTime = exp.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { label: `Expired (${Math.abs(diffDays)}d ago)`, isExpired: true, isExpiringSoon: false, days: diffDays };
    } else if (diffDays <= 3) {
      return { label: `Expires in ${diffDays === 0 ? 'Today' : `${diffDays}d`}`, isExpired: false, isExpiringSoon: true, days: diffDays };
    }
    return { label: `Exp: ${expDateStr}`, isExpired: false, isExpiringSoon: false, days: diffDays };
  };

  const filtered = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.batchNumber && p.batchNumber.toLowerCase().includes(searchTerm.toLowerCase()));
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

  const handleAddVariant = () => {
    if (!newVarName.trim()) return;
    const p = parseFloat(newVarPrice) || parseFloat(sellingPrice) || 0;
    const s = parseInt(newVarStock) || 0;
    setVariantsList((prev) => [...prev, { name: newVarName.trim(), price: p, stock: s }]);
    setNewVarName('');
    setNewVarPrice('');
    setNewVarStock('');
  };

  const handleRemoveVariant = (index: number) => {
    setVariantsList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveNewProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

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
      sellingPrice: parseFloat(sellingPrice) || 0,
      stock: parseInt(stock) || 0,
      minStockLevel: parseInt(minStockLevel) || 10,
      unit: unit || 'units',
      notes: notes.trim(),
      expiryDate: expiryDate || undefined,
      batchNumber: batchNumber.trim() || undefined,
      variants: formattedVariants.length > 0 ? formattedVariants : undefined,
    };

    onAddProduct(newProd);
    setName('');
    setBuyingPrice('');
    setSellingPrice('');
    setStock('');
    setExpiryDate('');
    setBatchNumber('');
    setVariantsList([]);
    setIsAddModalOpen(false);
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

  const expiringCount = products.filter((p) => {
    const status = getExpiryStatus(p.expiryDate);
    return status && (status.isExpired || status.isExpiringSoon);
  }).length;

  const lowStockCount = products.filter((p) => p.stock <= p.minStockLevel).length;

  return (
    <div id="smartledger-products-view" className="space-y-6">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-['Outfit',sans-serif] text-slate-900">
            {isBeginner ? 'My Products' : 'Inventory & Products'}
          </h2>
          <p className="text-xs text-slate-500">
            {isBeginner ? 'All goods you sell, batch shelf-life & sizes' : 'Stock control, margins, batches, variants & valuation'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="add-product-open-btn"
            onClick={() => setIsAddModalOpen(true)}
            className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Product</span>
          </button>
        </div>
      </div>

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
          All Items ({products.length})
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
          <span>Expiring / Spoilage ({expiringCount})</span>
        </button>
      </div>

      {/* Search & Category filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            id="products-search-input"
            type="text"
            placeholder="Search by name, barcode, or batch #..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Category filter pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
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
              onClick={() => setSelectedProductDetails(prod)}
              className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 font-['Outfit',sans-serif]">
                      {prod.name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[11px] text-slate-400 font-medium">
                        {prod.category}
                      </span>
                      {prod.batchNumber && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-mono">
                          Lot: {prod.batchNumber}
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

                    {expStatus && (
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        expStatus.isExpired
                          ? 'bg-red-100 text-red-800 animate-pulse'
                          : expStatus.isExpiringSoon
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {expStatus.label}
                      </span>
                    )}
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
                  <span className="font-extrabold text-slate-900">
                    {formatCurrency(prod.sellingPrice, currency)}
                  </span>
                </div>

                {prod.variants && prod.variants.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-1 flex-wrap">
                    <span className="text-[10px] text-slate-400 font-medium">Variants:</span>
                    {prod.variants.map((v) => (
                      <span key={v.id} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                        {v.name} ({formatCurrency(v.sellingPrice, currency)})
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-emerald-700 font-bold">
                  +{formatCurrency(profitPerUnit, currency)} profit/unit
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onQuickSell(prod);
                  }}
                  className="px-3 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <ShoppingCart className="w-3 h-3" />
                  <span>Sell</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* PRODUCT DETAILS MODAL */}
      {selectedProductDetails && (
        <div 
          id="product-details-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
        >
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold font-['Outfit',sans-serif]">
                  {selectedProductDetails.name}
                </h3>
                <p className="text-xs text-slate-400">{selectedProductDetails.category}</p>
              </div>
              <button
                onClick={() => setSelectedProductDetails(null)}
                className="p-1 rounded-full text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block mb-0.5">Current Stock</span>
                  <span className="text-xl font-extrabold text-slate-900">
                    {selectedProductDetails.stock} {selectedProductDetails.unit || 'units'}
                  </span>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <span className="text-emerald-700 block mb-0.5">Profit Per Unit</span>
                  <span className="text-xl font-extrabold text-emerald-800">
                    {formatCurrency(
                      selectedProductDetails.sellingPrice - (selectedProductDetails.buyingPrice || selectedProductDetails.costPrice || 0),
                      currency
                    )}
                  </span>
                </div>
              </div>

              {/* Expiry & Batch info */}
              {(selectedProductDetails.expiryDate || selectedProductDetails.batchNumber) && (
                <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs space-y-1.5">
                  <span className="font-bold text-amber-950 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-amber-700" />
                    <span>Perishable Batch & Expiration Info</span>
                  </span>
                  {selectedProductDetails.batchNumber && (
                    <div className="flex justify-between text-slate-700">
                      <span>Batch / Lot #:</span>
                      <span className="font-mono font-bold">{selectedProductDetails.batchNumber}</span>
                    </div>
                  )}
                  {selectedProductDetails.expiryDate && (
                    <div className="flex justify-between text-slate-700">
                      <span>Expiration Date:</span>
                      <span className="font-bold">{selectedProductDetails.expiryDate}</span>
                    </div>
                  )}
                  {onWriteOffExpired && selectedProductDetails.stock > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setWriteOffQty(Math.min(selectedProductDetails.stock, 5));
                        setIsWriteOffModalOpen(true);
                      }}
                      className="mt-2 w-full py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Write-Off Spoilage / Expired Stock</span>
                    </button>
                  )}
                </div>
              )}

              {/* Variants Section if available */}
              {selectedProductDetails.variants && selectedProductDetails.variants.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-slate-600" />
                    <span>Product Variants & Sizes</span>
                  </span>
                  <div className="space-y-1.5">
                    {selectedProductDetails.variants.map((v) => (
                      <div key={v.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800">{v.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-slate-500">{v.stock} in stock</span>
                          <span className="font-bold text-emerald-700">{formatCurrency(v.sellingPrice, currency)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRestockAmount(10);
                    setIsRestockModalOpen(true);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Stock</span>
                </button>

                <button
                  id="prod-detail-edit-btn"
                  onClick={() => {
                    const newPrice = prompt('Enter new selling price:', String(selectedProductDetails.sellingPrice));
                    if (newPrice && !isNaN(Number(newPrice))) {
                      const updated = { ...selectedProductDetails, sellingPrice: Number(newPrice) };
                      onUpdateProduct(updated);
                      setSelectedProductDetails(updated);
                    }
                  }}
                  className="py-2.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit Price</span>
                </button>
              </div>
            </div>
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

      {/* Write-off Spoilage Modal */}
      {isWriteOffModalOpen && selectedProductDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-2xl p-5 space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>Write-Off Damaged / Expired</span>
              </h4>
              <button onClick={() => setIsWriteOffModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Deducts spoiled or expired items from shelf stock and records the loss in your Waste Log.
            </p>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Quantity to Write-Off (Max: {selectedProductDetails.stock})
              </label>
              <input
                type="number"
                min="1"
                max={selectedProductDetails.stock}
                value={writeOffQty}
                onChange={(e) => setWriteOffQty(Math.min(selectedProductDetails.stock, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Reason
              </label>
              <select
                value={writeOffReason}
                onChange={(e) => setWriteOffReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
              >
                <option value="Expired">Past Expiry Date</option>
                <option value="Damaged / Broken">Damaged / Broken in Store</option>
                <option value="Burned / Bad Batch">Burned / Quality Defect</option>
                <option value="Unsold Perishable">End of Day Unsold</option>
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsWriteOffModalOpen(false)}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyWriteOff}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Confirm Write-Off
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD PRODUCT MODAL */}
      {isAddModalOpen && (
        <div 
          id="add-product-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
        >
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold font-['Outfit',sans-serif]">+ Add Product</h3>
                <p className="text-xs text-slate-400">Add an item with optional batch expiry & variants</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewProduct} className="p-5 sm:p-6 space-y-3.5 overflow-y-auto">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Product Name *
                </label>
                <input
                  id="add-prod-name"
                  type="text"
                  required
                  placeholder="e.g. Sliced Milk Bread"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Baked Goods"
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
                    placeholder="e.g. loaves, pcs, kg, box"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Cost / Buying Price ({currency})
                  </label>
                  <input
                    id="add-prod-buy-price"
                    type="number"
                    min="0"
                    step="any"
                    required
                    placeholder="e.g. 300"
                    value={buyingPrice}
                    onChange={(e) => setBuyingPrice(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Selling Price ({currency}) *
                  </label>
                  <input
                    id="add-prod-sell-price"
                    type="number"
                    min="0"
                    step="any"
                    required
                    placeholder="e.g. 500"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Initial Stock Count
                  </label>
                  <input
                    id="add-prod-qty"
                    type="number"
                    min="0"
                    required
                    placeholder="e.g. 50"
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

              {/* Batch & Expiry Date (Feature 3) */}
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
                  placeholder="e.g. Baked fresh daily / ABC Supplier"
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
    </div>
  );
};
