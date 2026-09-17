import React, { useState } from 'react';
import { 
  Archive, 
  X, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Package, 
  Users, 
  Truck, 
  Receipt, 
  Download,
  Info,
  ChevronRight,
  ShieldCheck,
  Trash2
} from 'lucide-react';
import { ArchivedBusinessPeriod, BusinessProfile } from '../types';
import { formatCurrency } from '../utils/calculations';
import { DeleteArchivedPeriodModal } from './DeleteArchivedPeriodModal';

interface ArchivedPeriodDetailsModalProps {
  period: ArchivedBusinessPeriod | null;
  isOpen: boolean;
  onClose: () => void;
  profile?: BusinessProfile;
  isCashierMode?: boolean;
  onUnlockCashierMode?: () => void;
  onDeleteArchivedPeriod?: (period: ArchivedBusinessPeriod) => Promise<{ success: boolean; message?: string; error?: string }>;
}

export const ArchivedPeriodDetailsModal: React.FC<ArchivedPeriodDetailsModalProps> = ({
  period,
  isOpen,
  onClose,
  profile,
  isCashierMode = false,
  onUnlockCashierMode,
  onDeleteArchivedPeriod,
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'products' | 'sales' | 'expenses' | 'customers' | 'suppliers'>('summary');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  if (!isOpen || !period) return null;

  const currency = period.currency || 'RWF';

  const handleExportCSV = () => {
    // Generate simple readable CSV of sales
    let csvContent = `data:text/csv;charset=utf-8,`;
    csvContent += `ARCHIVED PERIOD EXPORT: ${period.periodLabel}\n`;
    csvContent += `Started: ${new Date(period.startedAt).toLocaleDateString()}, Archived: ${new Date(period.archivedAt).toLocaleDateString()}\n\n`;
    csvContent += `SALES RECORDS\n`;
    csvContent += `Invoice #,Date,Customer,Payment Method,Total Amount,Profit\n`;
    
    period.sales.forEach((s) => {
      csvContent += `"${s.invoiceNumber || s.id}","${new Date(s.date).toLocaleDateString()}","${s.customerName || 'Walk-in'}","${s.paymentMethod}",${s.totalAmount},${s.profit || 0}\n`;
    });

    csvContent += `\nEXPENSES RECORDS\n`;
    csvContent += `Category,Date,Notes,Amount\n`;
    period.expenses.forEach((e) => {
      csvContent += `"${e.category}","${new Date(e.date).toLocaleDateString()}","${e.notes || ''}",${e.amount}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Archived_${period.periodLabel.replace(/[^a-zA-Z0-9]/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div 
      id="archived-period-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-fadeIn"
    >
      <div 
        id="archived-period-modal-container"
        className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6 max-h-[92vh] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="archived-period-title"
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30 shrink-0">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-300 bg-indigo-950/80 border border-indigo-700/50 px-2 py-0.5 rounded-md">
                  Archived Record • Read Only
                </span>
                <span className="text-xs text-slate-400">Period #{period.periodNumber}</span>
              </div>
              <h3 id="archived-period-title" className="text-base sm:text-lg font-bold text-white mt-0.5">
                {period.periodLabel}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-export-archived-csv"
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-1.5 rounded-xl bg-indigo-700 hover:bg-indigo-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Download CSV report of archived period"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            {onDeleteArchivedPeriod && (
              <button
                id="btn-delete-archived-from-details"
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                title="Permanently delete this archived period"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Delete Permanently</span>
              </button>
            )}

            <button
              id="btn-close-archived-modal"
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Safety & Isolation Notice */}
        <div className="bg-indigo-50/90 border-b border-indigo-100 px-6 py-2.5 text-xs text-indigo-900 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              <strong>Archived Vault:</strong> These records are permanently preserved and completely isolated from your active business dashboard.
            </span>
          </div>
          <span className="hidden md:inline text-[11px] text-indigo-700">
            Archived on {new Date(period.archivedAt).toLocaleDateString()}
          </span>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-slate-200 overflow-x-auto bg-slate-50 shrink-0 text-xs font-semibold">
          {[
            { id: 'summary' as const, label: 'Overview', count: null },
            { id: 'products' as const, label: 'Products', count: period.products.length },
            { id: 'sales' as const, label: 'Sales', count: period.sales.length },
            { id: 'expenses' as const, label: 'Expenses', count: period.expenses.length },
            { id: 'customers' as const, label: 'Customers', count: period.customers.length },
            { id: 'suppliers' as const, label: 'Suppliers', count: period.suppliers.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-t-xl border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-700 font-bold bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: SUMMARY */}
          {activeTab === 'summary' && (
            <div className="space-y-6">
              {/* Metric KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Total Sales</span>
                  <p className="text-xl font-black text-emerald-900 mt-1">
                    {formatCurrency(period.summary.totalSales, currency)}
                  </p>
                  <p className="text-[10px] text-emerald-700 mt-0.5">{period.summary.salesCount} sale(s)</p>
                </div>

                <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200">
                  <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wider">Net Profit</span>
                  <p className="text-xl font-black text-teal-900 mt-1">
                    {formatCurrency(period.summary.totalProfit, currency)}
                  </p>
                  <p className="text-[10px] text-teal-700 mt-0.5">After operating costs</p>
                </div>

                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200">
                  <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">Total Expenses</span>
                  <p className="text-xl font-black text-rose-900 mt-1">
                    {formatCurrency(period.summary.totalExpenses, currency)}
                  </p>
                  <p className="text-[10px] text-rose-700 mt-0.5">{period.summary.expensesCount} item(s)</p>
                </div>

                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200">
                  <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">Catalog Size</span>
                  <p className="text-xl font-black text-blue-900 mt-1">
                    {period.summary.productsCount} Products
                  </p>
                  <p className="text-[10px] text-blue-700 mt-0.5">Archived inventory</p>
                </div>
              </div>

              {/* Timeline Info Box */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <span>Period Details</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600">
                  <div>
                    <span className="font-semibold text-slate-700">Started: </span>
                    {new Date(period.startedAt).toLocaleString()}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Archived: </span>
                    {new Date(period.archivedAt).toLocaleString()}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Customer Records: </span>
                    {period.customers.length} debtors/customers
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Supplier Records: </span>
                    {period.suppliers.length} vendors
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PRODUCTS */}
          {activeTab === 'products' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{period.products.length} archived product(s) in catalog</span>
              </div>
              {period.products.length === 0 ? (
                <p className="text-center py-8 text-slate-400 text-xs">No products in this archived period.</p>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                  {period.products.map((prod) => (
                    <div key={prod.id} className="p-3.5 hover:bg-slate-50 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-900">{prod.name}</p>
                        <p className="text-[11px] text-slate-500">{prod.category} &bull; Final Stock: {prod.stock}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold text-slate-900">{formatCurrency(prod.sellingPrice, currency)}</span>
                        {prod.buyingPrice && (
                          <p className="text-[10px] text-slate-400">Cost: {formatCurrency(prod.buyingPrice, currency)}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SALES */}
          {activeTab === 'sales' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{period.sales.length} completed transaction(s)</span>
              </div>
              {period.sales.length === 0 ? (
                <p className="text-center py-8 text-slate-400 text-xs">No sales recorded in this archived period.</p>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                  {period.sales.map((sale) => (
                    <div key={sale.id} className="p-3.5 hover:bg-slate-50 flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{sale.invoiceNumber || 'Sale'}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
                            {sale.paymentMethod}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {sale.customerName || 'Walk-in customer'} &bull; {new Date(sale.date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold text-emerald-600">+{formatCurrency(sale.totalAmount, currency)}</span>
                        {sale.profit != null && (
                          <p className="text-[10px] text-teal-600">Profit: +{formatCurrency(sale.profit, currency)}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: EXPENSES */}
          {activeTab === 'expenses' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{period.expenses.length} recorded expense(s)</span>
              </div>
              {period.expenses.length === 0 ? (
                <p className="text-center py-8 text-slate-400 text-xs">No expenses recorded in this archived period.</p>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                  {period.expenses.map((exp) => (
                    <div key={exp.id} className="p-3.5 hover:bg-slate-50 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900">{exp.category}</span>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {exp.notes || 'Operating expense'} &bull; {new Date(exp.date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold text-rose-600">-{formatCurrency(exp.amount, currency)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: CUSTOMERS */}
          {activeTab === 'customers' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{period.customers.length} customer accounts</span>
              </div>
              {period.customers.length === 0 ? (
                <p className="text-center py-8 text-slate-400 text-xs">No customers recorded in this archived period.</p>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                  {period.customers.map((cust) => (
                    <div key={cust.id} className="p-3.5 hover:bg-slate-50 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900">{cust.name}</span>
                        {cust.phone && <p className="text-[11px] text-slate-500">{cust.phone}</p>}
                      </div>
                      <div className="text-right">
                        <span className={`font-bold ${cust.amountOwed > 0 ? 'text-amber-700' : 'text-slate-500'}`}>
                          {cust.amountOwed > 0 ? `Owed: ${formatCurrency(cust.amountOwed, currency)}` : 'Settled'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: SUPPLIERS */}
          {activeTab === 'suppliers' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{period.suppliers.length} supplier account(s)</span>
              </div>
              {period.suppliers.length === 0 ? (
                <p className="text-center py-8 text-slate-400 text-xs">No suppliers recorded in this archived period.</p>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                  {period.suppliers.map((supp) => (
                    <div key={supp.id} className="p-3.5 hover:bg-slate-50 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900">{supp.name}</span>
                        {supp.phone && <p className="text-[11px] text-slate-500">{supp.phone}</p>}
                      </div>
                      <div className="text-right">
                        <span className={`font-bold ${supp.amountOwed > 0 ? 'text-rose-700' : 'text-slate-500'}`}>
                          {supp.amountOwed > 0 ? `Owed: ${formatCurrency(supp.amountOwed, currency)}` : 'Paid'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500">
            SmartLedger Historical Archive &bull; Read-only record
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Close Vault
          </button>
        </div>
      </div>

      {profile && onDeleteArchivedPeriod && (
        <DeleteArchivedPeriodModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          period={period}
          profile={profile}
          isCashierMode={isCashierMode}
          onUnlockCashierMode={onUnlockCashierMode}
          onConfirmDelete={async (targetPeriod) => {
            const res = await onDeleteArchivedPeriod(targetPeriod);
            if (res.success) {
              setIsDeleteModalOpen(false);
              onClose();
            }
            return res;
          }}
        />
      )}
    </div>
  );
};
