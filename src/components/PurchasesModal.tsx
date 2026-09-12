import React, { useState } from 'react';
import { Product, Supplier, Purchase, CurrencyCode } from '../types';
import { formatCurrency } from '../utils/calculations';
import { X, ArrowRight, PackagePlus } from 'lucide-react';

interface PurchasesModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  suppliers: Supplier[];
  currency: CurrencyCode;
  allowSupplierCredit: boolean;
  onAddPurchase: (purchase: Purchase) => void;
  onAddSupplier: (name: string) => string;
}

export const PurchasesModal: React.FC<PurchasesModalProps> = ({
  isOpen,
  onClose,
  products,
  suppliers,
  currency,
  allowSupplierCredit,
  onAddPurchase,
  onAddSupplier,
}) => {
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');
  const [customItemName, setCustomItemName] = useState('');
  const [quantity, setQuantity] = useState<number>(5);
  const [costPerUnit, setCostPerUnit] = useState<number>(25000);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(suppliers[0]?.id || '');
  const [newSupplierName, setNewSupplierName] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<'PAID' | 'PAY_LATER'>('PAY_LATER');

  if (!isOpen) return null;

  const totalCost = quantity * costPerUnit;

  const handleProductChange = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = products.find((p) => p.id === prodId);
    if (prod) {
      setCostPerUnit(prod.buyingPrice);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let prodName = products.find((p) => p.id === selectedProductId)?.name || customItemName;
    if (!prodName) prodName = 'Stock Item';

    let suppId = selectedSupplierId;
    let suppName = suppliers.find((s) => s.id === selectedSupplierId)?.name;

    if (!suppId && newSupplierName.trim()) {
      suppId = onAddSupplier(newSupplierName.trim());
      suppName = newSupplierName.trim();
    } else if (!suppName) {
      suppName = 'ABC Suppliers';
    }

    const purchase: Purchase = {
      id: `purch_${Date.now()}`,
      productId: selectedProductId,
      productName: prodName,
      quantity,
      costPerUnit,
      totalCost,
      supplierId: suppId,
      supplierName: suppName,
      paymentStatus,
      date: new Date().toISOString(),
    };

    onAddPurchase(purchase);
    onClose();
  };

  return (
    <div 
      id="smartledger-purchases-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-lg font-bold font-['Outfit',sans-serif]">📦 Buy Stock</h3>
              <p className="text-xs text-slate-400">Restock inventory & track supplier payables</p>
            </div>
          </div>
          <button
            id="purchases-modal-close-btn"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {/* Product selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              What did you buy?
            </label>
            <select
              id="purchase-product-select"
              value={selectedProductId}
              onChange={(e) => handleProductChange(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (Current Stock: {p.stock})
                </option>
              ))}
              <option value="custom">+ Other / New Item</option>
            </select>
          </div>

          {selectedProductId === 'custom' && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Item Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Yeast 500g"
                value={customItemName}
                onChange={(e) => setCustomItemName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm"
              />
            </div>
          )}

          {/* Quantity & Unit Cost */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Quantity
              </label>
              <input
                id="purchase-qty-input"
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Cost Per Unit ({currency})
              </label>
              <input
                id="purchase-cost-input"
                type="number"
                min="0"
                required
                value={costPerUnit}
                onChange={(e) => setCostPerUnit(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-bold"
              />
            </div>
          </div>

          {/* Total Cost Display */}
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-950">
            <span className="text-xs font-semibold">Total Stock Cost:</span>
            <span className="text-base font-extrabold text-emerald-700">
              {formatCurrency(totalCost, currency)}
            </span>
          </div>

          {/* Supplier */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Supplier
            </label>
            <select
              id="purchase-supplier-select"
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.amountOwed > 0 ? `(Owed: ${formatCurrency(s.amountOwed, currency)})` : ''}
                </option>
              ))}
              <option value="">+ New Supplier</option>
            </select>
          </div>

          {!selectedSupplierId && (
            <div>
              <input
                type="text"
                placeholder="Supplier name (e.g. ABC Flour Supplier)"
                value={newSupplierName}
                onChange={(e) => setNewSupplierName(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>
          )}

          {/* Payment Status */}
          {allowSupplierCredit && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Payment Status
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  id="purchase-pay-paid"
                  onClick={() => setPaymentStatus('PAID')}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    paymentStatus === 'PAID'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-sm'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Paid Now (Cash/Bank)
                </button>
                <button
                  type="button"
                  id="purchase-pay-later"
                  onClick={() => setPaymentStatus('PAY_LATER')}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    paymentStatus === 'PAY_LATER'
                      ? 'border-amber-600 bg-amber-50 text-amber-900 shadow-sm'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Pay Later (Supplier Debt)
                </button>
              </div>
            </div>
          )}

          <button
            id="save-purchase-btn"
            type="submit"
            className="w-full py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm tracking-wide shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Save Purchase & Restock</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
