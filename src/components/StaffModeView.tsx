import React, { useState } from 'react';
import { 
  Plus, 
  Package, 
  Receipt, 
  Users, 
  Lock, 
  Search, 
  ShieldCheck, 
  HelpCircle, 
  Printer, 
  Share2, 
  ChevronRight,
  LogOut,
  AlertCircle
} from 'lucide-react';
import { 
  StaffSession, 
  Product, 
  Sale, 
  Customer, 
  CurrencyCode 
} from '../types';
import { formatCurrency } from '../utils/calculations';

interface StaffModeViewProps {
  session: StaffSession;
  products: Product[];
  sales: Sale[];
  customers: Customer[];
  currency: CurrencyCode;
  onOpenNewSale: () => void;
  onOpenReceiptDetails: (sale: Sale) => void;
  onRequestCorrection: (sale: Sale) => void;
  onLockStaffMode: () => void;
  onExitStaffMode: () => void;
}

export const StaffModeView: React.FC<StaffModeViewProps> = ({
  session,
  products,
  sales,
  customers,
  currency,
  onOpenNewSale,
  onOpenReceiptDetails,
  onRequestCorrection,
  onLockStaffMode,
  onExitStaffMode,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'sales' | 'products' | 'receipts' | 'customers'>('sales');
  const [productSearch, setProductSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [receiptSearch, setReceiptSearch] = useState('');

  // Filter products for selling
  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      (p.category && p.category.toLowerCase().includes(productSearch.toLowerCase())) ||
      (p.barcode && p.barcode.includes(productSearch))
  );

  // Filter sales recorded today or during shift
  const todayStr = new Date().toISOString().split('T')[0];
  const staffSales = sales.filter((s) => {
    const saleDateStr = s.date ? s.date.split('T')[0] : '';
    // If sale has staffId, show match or today's sales
    return (
      (s.staffId === session.staffId || saleDateStr === todayStr) &&
      (!receiptSearch || 
        (s.invoiceNumber && s.invoiceNumber.toLowerCase().includes(receiptSearch.toLowerCase())) ||
        (s.customerName && s.customerName.toLowerCase().includes(receiptSearch.toLowerCase())))
    );
  });

  // Filter customers (limited customer search for sales, no sensitive credit analytics)
  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      (c.phone && c.phone.includes(customerSearch))
  );

  return (
    <div id="staff-mode-workstation" className="space-y-5 animate-in fade-in">
      {/* 🧾 STAFF MODE HEADER BANNER */}
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 text-white shadow-lg border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-xl shadow-md">
            🧾
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-widest text-indigo-400 uppercase">
                STAFF MODE
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black font-['Outfit',sans-serif] text-white">
              {session.staffName}
            </h1>
            <p className="text-xs text-slate-400">
              Role: <span className="font-semibold text-slate-200">{session.role}</span> • {session.businessName}
            </p>
          </div>
        </div>

        {/* Quick workstation controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            id="btn-staff-lock"
            onClick={onLockStaffMode}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-colors"
            title="Lock Staff Mode immediately"
          >
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Lock</span>
          </button>

          <button
            id="btn-staff-exit"
            onClick={onExitStaffMode}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors"
            title="Return to Owner login"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Exit</span>
          </button>
        </div>
      </div>

      {/* Primary Action: Big + New Sale Button */}
      <button
        id="btn-staff-new-sale"
        onClick={onOpenNewSale}
        className="w-full py-4 px-6 rounded-3xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-extrabold text-lg sm:text-xl shadow-md shadow-emerald-200 flex items-center justify-center gap-3 transition-all"
      >
        <Plus className="w-6 h-6 stroke-[3]" />
        <span>+ New Sale</span>
      </button>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
        <button
          onClick={() => setActiveSubTab('sales')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeSubTab === 'sales'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Receipts ({staffSales.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('products')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeSubTab === 'products'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Products ({products.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('customers')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeSubTab === 'customers'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Customers</span>
        </button>
      </div>

      {/* SUB-TAB 1: RECEIPTS & SALE HISTORY */}
      {activeSubTab === 'sales' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search receipts by #INV or customer..."
                value={receiptSearch}
                onChange={(e) => setReceiptSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {staffSales.length === 0 ? (
            <div className="text-center py-12 rounded-3xl bg-white border border-dashed border-slate-200 p-6">
              <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-800">No Sales Recorded This Shift</h4>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Click "+ New Sale" above to ring up customer items and print receipts.
              </p>
              <button
                onClick={onOpenNewSale}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
              >
                Start First Sale
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {staffSales.map((sale) => (
                <div
                  key={sale.id}
                  className={`p-4 rounded-2xl border bg-white shadow-sm transition-all space-y-3 ${
                    sale.isVoided ? 'border-rose-200 bg-rose-50/40 opacity-75' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 font-mono">
                          #{sale.invoiceNumber || sale.receiptNumber || sale.id.slice(-6)}
                        </span>
                        {sale.isVoided ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                            VOIDED
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                            {sale.paymentMethod}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Customer: {sale.customerName || 'Walk-in'}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className={`text-base font-black font-['Outfit',sans-serif] ${
                        sale.isVoided ? 'line-through text-slate-400' : 'text-slate-900'
                      }`}>
                        {formatCurrency(sale.totalAmount, currency)}
                      </span>
                    </div>
                  </div>

                  {/* Items summary */}
                  <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between">
                    <span className="truncate max-w-[260px]">
                      {sale.items?.map((i) => `${i.quantity}x ${i.name || i.productName || 'Item'}`).join(', ') || 'Sale items'}
                    </span>
                    <button
                      onClick={() => onOpenReceiptDetails(sale)}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 shrink-0 ml-2"
                    >
                      View Receipt
                    </button>
                  </div>

                  {/* Correction request trigger for cashiers */}
                  {!sale.isVoided && (
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                      <span className="text-slate-400 text-[11px]">
                        Made an accidental entry?
                      </span>
                      <button
                        onClick={() => onRequestCorrection(sale)}
                        className="text-amber-700 hover:text-amber-900 font-bold flex items-center gap-1 hover:underline text-[11px]"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>Request Correction</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: PRODUCTS NEEDED FOR SELLING */}
      {activeSubTab === 'products' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search products by name or barcode..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredProducts.map((p) => (
              <div
                key={p.id}
                className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between gap-3"
              >
                <div>
                  <h4 className="text-sm font-bold text-slate-900 font-['Outfit',sans-serif]">
                    {p.name}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {p.category || 'General'}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      p.stock <= (p.minStockAlert || 5)
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      Stock: {p.stock} {p.unit || 'units'}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-base font-extrabold text-indigo-950 font-['Outfit',sans-serif] block">
                    {formatCurrency(p.sellingPrice, currency)}
                  </span>
                  <span className="text-[10px] text-slate-400">selling price</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: LIMITED CUSTOMERS FOR SALE */}
      {activeSubTab === 'customers' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search customers by name or phone..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredCustomers.map((c) => (
              <div
                key={c.id}
                className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between"
              >
                <div>
                  <h4 className="text-sm font-bold text-slate-900 font-['Outfit',sans-serif]">
                    {c.name}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Phone: {c.phone || 'No phone recorded'}
                  </p>
                </div>
                <button
                  onClick={onOpenNewSale}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold hover:bg-emerald-100"
                >
                  Sell
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
