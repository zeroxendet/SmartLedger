import React, { useState, useMemo } from 'react';
import { Product, Supplier, CurrencyCode, PurchaseOrder, PurchaseOrderItem } from '../types';
import { formatCurrency } from '../utils/calculations';
import { exportPurchaseOrder } from '../utils/exportUtils';
import { 
  X, 
  ShoppingCart, 
  Send, 
  Download, 
  Printer, 
  AlertTriangle, 
  CheckCircle2, 
  FileSpreadsheet,
  Building2,
  Plus,
  Trash2
} from 'lucide-react';

interface PurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  suppliers: Supplier[];
  currency: CurrencyCode;
  businessName: string;
  businessPhone?: string;
  onRecordPurchases?: (purchases: {
    productId: string;
    productName: string;
    quantity: number;
    costPerUnit: number;
    totalCost: number;
    supplierId?: string;
    supplierName: string;
    paymentStatus: 'PAID' | 'PAY_LATER';
    date: string;
  }[]) => void;
}

export const PurchaseOrderModal: React.FC<PurchaseOrderModalProps> = ({
  isOpen,
  onClose,
  products,
  suppliers,
  currency,
  businessName,
  businessPhone,
  onRecordPurchases,
}) => {
  // Filter for products that are low in stock
  const lowStockProducts = useMemo(() => {
    return products.filter((p) => p.stock <= p.minStockLevel);
  }, [products]);

  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(
    suppliers.length > 0 ? suppliers[0].id : 'all'
  );
  const [poItems, setPoItems] = useState<PurchaseOrderItem[]>([]);
  const [poNumber, setPoNumber] = useState(`PO-${Date.now().toString().slice(-5)}`);
  const [notes, setNotes] = useState('Please supply the items listed above as soon as possible.');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isRecorded, setIsRecorded] = useState(false);

  // Initialize PO items from low stock products
  React.useEffect(() => {
    if (lowStockProducts.length > 0) {
      const initialItems: PurchaseOrderItem[] = lowStockProducts.map((p) => {
        const cost = p.buyingPrice ?? p.costPrice ?? 0;
        const reorderQty = Math.max(1, (p.minStockLevel * 2) - p.stock);
        return {
          productId: p.id,
          productName: p.name,
          currentStock: p.stock,
          minStockLevel: p.minStockLevel,
          recommendedOrder: reorderQty,
          unitCost: cost,
          totalCost: reorderQty * cost,
        };
      });
      setPoItems(initialItems);
    } else {
      setPoItems([]);
    }
    setIsRecorded(false);
  }, [lowStockProducts, isOpen]);

  if (!isOpen) return null;

  const currentSupplier = suppliers.find((s) => s.id === selectedSupplierId);

  const handleQuantityChange = (productId: string, qty: number) => {
    setPoItems((prev) =>
      prev.map((item) => {
        if (item.productId === productId) {
          const newQty = Math.max(1, qty);
          return {
            ...item,
            recommendedOrder: newQty,
            totalCost: newQty * item.unitCost,
          };
        }
        return item;
      })
    );
  };

  const handleUnitCostChange = (productId: string, cost: number) => {
    setPoItems((prev) =>
      prev.map((item) => {
        if (item.productId === productId) {
          const newCost = Math.max(0, cost);
          return {
            ...item,
            unitCost: newCost,
            totalCost: item.recommendedOrder * newCost,
          };
        }
        return item;
      })
    );
  };

  const handleRemoveItem = (productId: string) => {
    setPoItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  const handleAddAnyProduct = (productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod || poItems.some((i) => i.productId === productId)) return;

    const cost = prod.buyingPrice ?? prod.costPrice ?? 0;
    const reorderQty = Math.max(1, prod.minStockLevel || 5);
    setPoItems((prev) => [
      ...prev,
      {
        productId: prod.id,
        productName: prod.name,
        currentStock: prod.stock,
        minStockLevel: prod.minStockLevel,
        recommendedOrder: reorderQty,
        unitCost: cost,
        totalCost: reorderQty * cost,
      },
    ]);
  };

  const totalPoCost = poItems.reduce((acc, i) => acc + i.totalCost, 0);

  const currentPoObject: PurchaseOrder = {
    id: `po_${Date.now()}`,
    poNumber,
    supplierId: currentSupplier?.id,
    supplierName: currentSupplier?.name || 'Preferred Supplier',
    supplierPhone: currentSupplier?.phone,
    items: poItems,
    totalCost: totalPoCost,
    status: 'DRAFT',
    createdAt: new Date().toISOString(),
    notes,
  };

  const generateWhatsAppPoText = () => {
    const divider = '--------------------------------';
    const lines: string[] = [];
    lines.push(`📦 *PURCHASE ORDER #${poNumber}*`);
    lines.push(`🏢 *From:* ${businessName}`);
    if (businessPhone) lines.push(`📞 Contact: ${businessPhone}`);
    lines.push(`🤝 *To Supplier:* ${currentSupplier?.name || 'Supplier'}`);
    lines.push(`📅 Date: ${new Date().toLocaleDateString()}`);
    lines.push(divider);
    lines.push('*REQUIRED RESTOCK ITEMS:*');

    poItems.forEach((it, idx) => {
      lines.push(`${idx + 1}. *${it.productName}*`);
      lines.push(`   Order Qty: *${it.recommendedOrder} units* @ ${formatCurrency(it.unitCost, currency)}`);
      lines.push(`   Subtotal: ${formatCurrency(it.totalCost, currency)}`);
    });

    lines.push(divider);
    lines.push(`*ESTIMATED TOTAL: ${formatCurrency(totalPoCost, currency)}*`);
    if (notes) {
      lines.push(`📝 Notes: ${notes}`);
    }
    lines.push('');
    lines.push('Please confirm availability and estimated delivery time. Thank you!');
    return lines.join('\n');
  };

  const handleSendWhatsApp = () => {
    const text = encodeURIComponent(generateWhatsAppPoText());
    let phone = (currentSupplier?.phone || '').replace(/[^0-9+]/g, '');
    if (phone.startsWith('+')) phone = phone.substring(1);
    else if (phone.startsWith('0') && phone.length === 10) phone = '250' + phone.substring(1);

    const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleExportExcel = () => {
    exportPurchaseOrder(currentPoObject, currency, 'xlsx');
    setToastMsg('Purchase order exported as Excel file!');
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleRecordPurchases = () => {
    if (!onRecordPurchases || poItems.length === 0) return;
    const purchasesPayload = poItems.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      quantity: item.recommendedOrder,
      costPerUnit: item.unitCost,
      totalCost: item.totalCost,
      supplierId: currentSupplier?.id,
      supplierName: currentSupplier?.name || 'General Supplier',
      paymentStatus: 'PAY_LATER' as const,
      date: new Date().toISOString(),
    }));

    onRecordPurchases(purchasesPayload);
    setIsRecorded(true);
    setToastMsg('Purchase order recorded to accounts payable & stock updated!');
    setTimeout(() => setToastMsg(null), 3000);
  };

  return (
    <div 
      id="purchase-order-generator-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold font-['Outfit',sans-serif]">
                Auto Purchase Order Generator
              </h3>
              <p className="text-xs text-slate-400">
                Generate restock orders for low-inventory items
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Supplier and Order Meta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Select Supplier:
              </label>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.phone ? `(${s.phone})` : ''}
                  </option>
                ))}
                {suppliers.length === 0 && <option value="none">No supplier created yet</option>}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Purchase Order #:
              </label>
              <input
                type="text"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Low Stock Items Table */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Items to Reorder ({poItems.length})
              </span>
              {/* Add item dropdown if needed */}
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddAnyProduct(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-slate-700 cursor-pointer"
              >
                <option value="">+ Add other product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Stock: {p.stock})
                  </option>
                ))}
              </select>
            </div>

            {poItems.length === 0 ? (
              <div className="p-8 text-center bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-1">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <h4 className="text-sm font-bold text-emerald-950">All Stock Healthy!</h4>
                <p className="text-xs text-emerald-700">
                  No products are currently at or below minimum reorder levels.
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-3">Product</th>
                        <th className="p-3 text-center">In Stock / Min</th>
                        <th className="p-3 text-center">Order Qty</th>
                        <th className="p-3 text-right">Unit Cost</th>
                        <th className="p-3 text-right">Subtotal</th>
                        <th className="p-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {poItems.map((item) => (
                        <tr key={item.productId} className="hover:bg-slate-50">
                          <td className="p-3 font-semibold text-slate-900">
                            {item.productName}
                          </td>
                          <td className="p-3 text-center text-slate-600 font-mono">
                            <span className="text-rose-600 font-bold">{item.currentStock}</span> / {item.minStockLevel}
                          </td>
                          <td className="p-3 text-center">
                            <input
                              type="number"
                              min="1"
                              value={item.recommendedOrder}
                              onChange={(e) => handleQuantityChange(item.productId, parseInt(e.target.value) || 1)}
                              className="w-16 bg-white border border-slate-300 rounded px-2 py-1 text-center font-bold text-slate-800"
                            />
                          </td>
                          <td className="p-3 text-right">
                            <input
                              type="number"
                              min="0"
                              value={item.unitCost}
                              onChange={(e) => handleUnitCostChange(item.productId, parseFloat(e.target.value) || 0)}
                              className="w-20 bg-white border border-slate-300 rounded px-2 py-1 text-right font-mono text-slate-800"
                            />
                          </td>
                          <td className="p-3 text-right font-bold text-slate-900">
                            {formatCurrency(item.totalCost, currency)}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleRemoveItem(item.productId)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-slate-900">
                      <tr>
                        <td colSpan={4} className="p-3 text-right uppercase text-[11px] text-slate-600">
                          Estimated PO Total:
                        </td>
                        <td className="p-3 text-right text-sm text-amber-700">
                          {formatCurrency(totalPoCost, currency)}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Instructions / Notes for Supplier:
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Please deliver by Friday morning..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              disabled={poItems.length === 0}
              className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Excel Export</span>
            </button>
            <button
              onClick={() => window.print()}
              disabled={poItems.length === 0}
              className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Print</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {onRecordPurchases && !isRecorded && (
              <button
                onClick={handleRecordPurchases}
                disabled={poItems.length === 0}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition-all disabled:opacity-50 cursor-pointer"
              >
                Mark Ordered & Bill
              </button>
            )}
            <button
              id="send-po-whatsapp-btn"
              onClick={handleSendWhatsApp}
              disabled={poItems.length === 0}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer shadow-md"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send via WhatsApp</span>
            </button>
          </div>
        </div>

        {/* In-app toast */}
        {toastMsg && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-full shadow-lg border border-slate-700 animate-fade-in z-50">
            {toastMsg}
          </div>
        )}
      </div>
    </div>
  );
};
