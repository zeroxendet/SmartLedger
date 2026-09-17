import React, { useState } from 'react';
import { Supplier, Purchase, Expense, CurrencyCode } from '../types';
import { formatCurrency } from '../utils/calculations';
import { 
  Truck, 
  Plus, 
  DollarSign, 
  X, 
  MoreVertical, 
  Trash2, 
  Archive, 
  RotateCcw, 
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { DeleteSupplierModal } from './DeleteSupplierModal';

interface SuppliersViewProps {
  suppliers: Supplier[];
  purchases: Purchase[];
  expenses?: Expense[];
  currency: CurrencyCode;
  isBeginner: boolean;
  isCashierMode?: boolean;
  onUnlockCashierMode?: () => void;
  onAddSupplier: (name: string, phone?: string, productsSupplied?: string[]) => void;
  onRecordSupplierPayment: (supplierId: string, amount: number) => void;
  onDeleteSupplier?: (supplierId: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  onArchiveSupplier?: (supplierId: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  onUnarchiveSupplier?: (supplierId: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  onOpenPurchaseOrder?: () => void;
}

export const SuppliersView: React.FC<SuppliersViewProps> = ({
  suppliers,
  purchases,
  expenses = [],
  currency,
  isBeginner,
  isCashierMode = false,
  onUnlockCashierMode,
  onAddSupplier,
  onRecordSupplierPayment,
  onDeleteSupplier,
  onArchiveSupplier,
  onUnarchiveSupplier,
  onOpenPurchaseOrder,
}) => {
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [openMenuSupplierId, setOpenMenuSupplierId] = useState<string | null>(null);
  const [viewFilter, setViewFilter] = useState<'active' | 'archived'>('active');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [isPayOpen, setIsPayOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const [payAmount, setPayAmount] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [productsText, setProductsText] = useState('');

  const activeSuppliers = suppliers.filter((s) => !s.isArchived);
  const archivedSuppliers = suppliers.filter((s) => s.isArchived);
  const displayedSuppliers = viewFilter === 'archived' ? archivedSuppliers : activeSuppliers;

  const totalOwedToSuppliers = activeSuppliers.reduce((acc, s) => acc + (s.amountOwed || 0), 0);
  const pendingCount = activeSuppliers.filter((s) => (s.amountOwed || 0) > 0).length;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier) return;
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) return;

    onRecordSupplierPayment(selectedSupplier.id, amount);
    setIsPayOpen(false);
    setSelectedSupplier(null);
    setPayAmount('');
    showToast(`Payment of ${formatCurrency(amount, currency)} recorded.`);
  };

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const prodList = productsText.split(',').map((p) => p.trim()).filter(Boolean);
    onAddSupplier(name.trim(), phone.trim(), prodList);
    setName('');
    setPhone('');
    setProductsText('');
    setIsAddOpen(false);
    showToast(`Supplier "${name.trim()}" added to directory.`);
  };

  const handleConfirmDelete = async (supplierId: string) => {
    if (!onDeleteSupplier) return { success: false, error: 'Delete handler not configured.' };
    const res = await onDeleteSupplier(supplierId);
    if (res.success) {
      showToast(res.message || 'Supplier deleted successfully.');
    }
    return res;
  };

  const handleConfirmArchive = async (supplierId: string) => {
    if (!onArchiveSupplier) return { success: false, error: 'Archive handler not configured.' };
    const res = await onArchiveSupplier(supplierId);
    if (res.success) {
      showToast(res.message || 'Supplier archived successfully.');
    }
    return res;
  };

  const handleUnarchive = async (supplierId: string) => {
    if (!onUnarchiveSupplier) return;
    const res = await onUnarchiveSupplier(supplierId);
    if (res.success) {
      showToast(res.message || 'Supplier restored to active list.');
    }
  };

  return (
    <div id="smartledger-suppliers-view" className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3.5 bg-slate-900 text-white rounded-2xl shadow-xl flex items-center justify-between gap-3 text-xs animate-fade-in border border-slate-700">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-['Outfit',sans-serif] text-slate-900">
            {isBeginner ? 'People You Need to Pay' : 'Suppliers (Accounts Payable)'}
          </h2>
          <p className="text-xs text-slate-500">
            {isBeginner ? 'Suppliers who gave you stock and expect payment' : 'Vendor liabilities, payment terms and history'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenPurchaseOrder && (
            <button
              onClick={onOpenPurchaseOrder}
              className="py-2.5 px-3.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Truck className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Purchase Order &amp; Receive</span>
              <span className="sm:hidden">Receive Stock</span>
            </button>
          )}

          <button
            onClick={() => setIsAddOpen(true)}
            className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Supplier</span>
          </button>
        </div>
      </div>

      {/* Summary card */}
      <div className="p-4 bg-slate-100 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs font-semibold text-slate-600">Total Money You Owe to Suppliers</span>
          <p className="text-2xl font-extrabold text-slate-900 font-['Outfit',sans-serif]">
            {formatCurrency(totalOwedToSuppliers, currency)}
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-600">
          <div>
            <span className="font-bold text-slate-900">{pendingCount}</span> suppliers pending payment
          </div>
          <div className="h-4 w-px bg-slate-300 hidden sm:block" />
          <div>
            <span className="font-bold text-slate-900">{activeSuppliers.length}</span> active vendors
          </div>
        </div>
      </div>

      {/* Filter Tabs (Active vs Archived) */}
      {archivedSuppliers.length > 0 && (
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            type="button"
            onClick={() => {
              setViewFilter('active');
              setOpenMenuSupplierId(null);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewFilter === 'active'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            Active Suppliers ({activeSuppliers.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setViewFilter('archived');
              setOpenMenuSupplierId(null);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewFilter === 'archived'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Archived ({archivedSuppliers.length})</span>
          </button>
        </div>
      )}

      {/* Supplier Cards List */}
      {displayedSuppliers.length === 0 ? (
        <div className="p-8 text-center bg-white border border-slate-200 rounded-3xl space-y-2.5">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <Truck className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">
            {viewFilter === 'archived' ? 'No Archived Suppliers' : 'No Suppliers Registered'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {viewFilter === 'archived'
              ? 'Suppliers archived to protect financial history will appear here.'
              : 'Add your vendors to manage inventory deliveries, credit orders, and accounts payable.'}
          </p>
          {viewFilter === 'active' && (
            <button
              type="button"
              onClick={() => setIsAddOpen(true)}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Your First Supplier</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {displayedSuppliers.map((s) => {
            const hasDebt = (s.amountOwed || 0) > 0;
            const isMenuOpen = openMenuSupplierId === s.id;

            return (
              <div
                key={s.id}
                className={`p-4 rounded-2xl bg-white border ${
                  s.isArchived ? 'border-slate-200/80 bg-slate-50/50' : 'border-slate-200'
                } shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
                        <Truck className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 truncate">{s.name}</h4>
                        {s.phone && <p className="text-[11px] text-slate-400 truncate">{s.phone}</p>}
                      </div>
                    </div>

                    {/* Badge & Actions Dropdown Menu */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          s.isArchived
                            ? 'bg-slate-200 text-slate-700'
                            : hasDebt
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {s.isArchived ? 'Archived' : hasDebt ? 'You Owe Money' : 'Paid In Full'}
                      </span>

                      {/* Small ⋮ Menu for Supplier Actions */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuSupplierId(isMenuOpen ? null : s.id);
                          }}
                          title="Supplier Actions (Delete / Manage)"
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {isMenuOpen && (
                          <div 
                            className="absolute right-0 top-full mt-1 w-44 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-30 animate-fade-in"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {hasDebt && !s.isArchived && (
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuSupplierId(null);
                                  setSelectedSupplier(s);
                                  setIsPayOpen(true);
                                }}
                                className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors cursor-pointer"
                              >
                                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Record Payment</span>
                              </button>
                            )}

                            {s.isArchived ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuSupplierId(null);
                                  handleUnarchive(s.id);
                                }}
                                className="w-full px-3 py-2 text-left text-xs font-semibold text-indigo-700 hover:bg-indigo-50 flex items-center gap-2 transition-colors cursor-pointer"
                              >
                                <RotateCcw className="w-3.5 h-3.5 text-indigo-600" />
                                <span>Restore to Active</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuSupplierId(null);
                                  setSupplierToDelete(s);
                                }}
                                className="w-full px-3 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-600" />
                                <span>Delete Supplier</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-baseline justify-between">
                    <span className="text-xs text-slate-500">You owe:</span>
                    <span className={`text-base font-extrabold ${hasDebt ? 'text-amber-700' : 'text-slate-400'}`}>
                      {formatCurrency(s.amountOwed || 0, currency)}
                    </span>
                  </div>

                  {s.productsSupplied && s.productsSupplied.length > 0 && (
                    <p className="text-[11px] text-slate-500 mt-2 truncate">
                      Supplies: {s.productsSupplied.join(', ')}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-2 flex items-center gap-2">
                  {!s.isArchived ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSupplier(s);
                        setIsPayOpen(true);
                      }}
                      className="w-full py-2 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Record Payment</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleUnarchive(s.id)}
                      className="w-full py-2 rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-800 border border-slate-200 hover:border-indigo-300 font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Restore to Active</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pay Supplier Modal */}
      {isPayOpen && selectedSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="text-base font-bold font-['Outfit',sans-serif]">
                Pay {selectedSupplier.name}
              </h3>
              <button
                onClick={() => setIsPayOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="p-5 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Owed Amount:</span>
                  <span className="font-bold text-amber-700">{formatCurrency(selectedSupplier.amountOwed || 0, currency)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Amount Paying ({currency})
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedSupplier.amountOwed || undefined}
                  required
                  placeholder="e.g. 50000"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-bold text-base"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md cursor-pointer"
              >
                Confirm Supplier Paid
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="text-base font-bold font-['Outfit',sans-serif]">+ Add Supplier</h3>
              <button
                onClick={() => setIsAddOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Supplier Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ABC Flour Supplier"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 0789 000 111"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Products Supplied (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Baking Wheat Flour, Yeast"
                  value={productsText}
                  onChange={(e) => setProductsText(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md cursor-pointer"
              >
                Save Supplier
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete / Archive Supplier Confirmation Dialog Modal */}
      <DeleteSupplierModal
        isOpen={Boolean(supplierToDelete)}
        onClose={() => setSupplierToDelete(null)}
        supplier={supplierToDelete}
        purchases={purchases}
        expenses={expenses}
        currency={currency}
        isCashierMode={isCashierMode}
        onUnlockCashierMode={onUnlockCashierMode}
        onConfirmDelete={handleConfirmDelete}
        onConfirmArchive={handleConfirmArchive}
      />
    </div>
  );
};
