import React, { useState } from 'react';
import { Customer, Sale, CurrencyCode } from '../types';
import { formatCurrency } from '../utils/calculations';
import { User, Plus, CheckCircle2, Phone, Calendar, ArrowRight, X, DollarSign } from 'lucide-react';

interface CustomersViewProps {
  customers: Customer[];
  sales: Sale[];
  currency: CurrencyCode;
  isBeginner: boolean;
  onAddCustomer: (name: string, phone?: string, initialDebt?: number) => void;
  onRecordCustomerPayment: (customerId: string, amount: number, notes?: string) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  sales,
  currency,
  isBeginner,
  onAddCustomer,
  onRecordCustomerPayment,
}) => {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  // Add form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [initialDebt, setInitialDebt] = useState('');

  // Payment form
  const [payAmount, setPayAmount] = useState('');
  const [payNotes, setPayNotes] = useState('Paid in cash');

  const totalOwed = customers.reduce((acc, c) => acc + (c.amountOwed || 0), 0);

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAddCustomer(name.trim(), phone.trim(), parseFloat(initialDebt) || 0);
    setName('');
    setPhone('');
    setInitialDebt('');
    setIsAddOpen(false);
  };

  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) return;

    onRecordCustomerPayment(selectedCustomer.id, amount, payNotes);
    setIsPaymentOpen(false);
    setSelectedCustomer(null);
    setPayAmount('');
  };

  return (
    <div id="smartledger-customers-view" className="space-y-6">
      {/* Header with summary pill */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-['Outfit',sans-serif] text-slate-900">
            {isBeginner ? 'People Who Owe You' : 'Customers (Accounts Receivable)'}
          </h2>
          <p className="text-xs text-slate-500">
            {isBeginner ? 'Customers who bought on credit and need to pay' : 'Outstanding credit balances and repayment logs'}
          </p>
        </div>

        <button
          id="add-customer-open-btn"
          onClick={() => setIsAddOpen(true)}
          className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Customer</span>
        </button>
      </div>

      {/* Summary card */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-amber-800">Total Money You Are Owed</span>
          <p className="text-2xl font-extrabold text-amber-950 font-['Outfit',sans-serif]">
            {formatCurrency(totalOwed, currency)}
          </p>
        </div>
        <div className="text-right text-xs text-amber-800">
          <span className="font-bold">{customers.filter((c) => c.amountOwed > 0).length}</span> customers owe money
        </div>
      </div>

      {/* Customer list */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {customers.map((c) => {
          const hasDebt = c.amountOwed > 0;
          return (
            <div
              key={c.id}
              id={`customer-card-${c.id}`}
              onClick={() => setSelectedCustomer(c)}
              className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-sm">
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{c.name}</h4>
                      {c.phone && <p className="text-[11px] text-slate-400">{c.phone}</p>}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      hasDebt ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {hasDebt ? 'Owes Money' : 'Settled'}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-baseline justify-between">
                  <span className="text-xs text-slate-500">Owes:</span>
                  <span className={`text-base font-extrabold ${hasDebt ? 'text-amber-700' : 'text-slate-400'}`}>
                    {hasDebt ? `🔴 ${formatCurrency(c.amountOwed, currency)}` : '0 RWF'}
                  </span>
                </div>

                {c.dueDate && hasDebt && (
                  <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>Due: {c.dueDate}</span>
                  </p>
                )}
              </div>

              <div className="mt-3 pt-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCustomer(c);
                    setIsPaymentOpen(true);
                  }}
                  className="w-full py-2 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Record Payment</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* STEP 26: CUSTOMER DETAILS MODAL */}
      {selectedCustomer && !isPaymentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold font-['Outfit',sans-serif]">
                  {selectedCustomer.name}
                </h3>
                <p className="text-xs text-slate-400">{selectedCustomer.phone || 'Customer Profile'}</p>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-1 rounded-full text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-center">
                <span className="text-xs font-semibold text-amber-800 block">Total Amount Owed</span>
                <span className="text-2xl font-extrabold text-amber-950">
                  🔴 {formatCurrency(selectedCustomer.amountOwed, currency)}
                </span>
                {selectedCustomer.dueDate && (
                  <p className="text-xs text-amber-700 mt-1">Due date: {selectedCustomer.dueDate}</p>
                )}
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Credit Purchase History
                </h4>
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-36 overflow-y-auto text-xs">
                  {sales
                    .filter((s) => s.customerId === selectedCustomer.id || s.customerName === selectedCustomer.name)
                    .map((s) => (
                      <div key={s.id} className="p-2.5 flex justify-between items-center">
                        <div>
                          <span className="font-bold text-slate-800">{s.invoiceNumber}</span>
                          <p className="text-[11px] text-slate-500">{new Date(s.date).toLocaleDateString()}</p>
                        </div>
                        <span className="font-bold text-slate-900">{formatCurrency(s.totalAmount, currency)}</span>
                      </div>
                    ))}
                </div>
              </div>

              <button
                id="customer-record-payment-btn"
                onClick={() => setIsPaymentOpen(true)}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
              >
                [Record Payment]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT MODAL */}
      {isPaymentOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="text-base font-bold font-['Outfit',sans-serif]">
                Record Payment from {selectedCustomer.name}
              </h3>
              <button
                onClick={() => setIsPaymentOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="p-5 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Debt:</span>
                  <span className="font-bold text-amber-700">{formatCurrency(selectedCustomer.amountOwed, currency)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Amount Paid ({currency})
                </label>
                <input
                  id="cust-pay-amount"
                  type="number"
                  min="1"
                  max={selectedCustomer.amountOwed || undefined}
                  required
                  placeholder="e.g. 15000"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-bold text-base"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Payment Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cleared via Mobile Money"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <button
                id="submit-cust-payment-btn"
                type="submit"
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md"
              >
                Confirm Payment Received
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ADD CUSTOMER MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="text-base font-bold font-['Outfit',sans-serif]">+ Add New Customer</h3>
              <button
                onClick={() => setIsAddOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Customer Name
                </label>
                <input
                  id="new-cust-name-input"
                  type="text"
                  required
                  placeholder="e.g. Mary Kayitesi"
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
                  placeholder="e.g. 0783 987 654"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Initial Debt Owed (Optional)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={initialDebt}
                  onChange={(e) => setInitialDebt(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <button
                id="save-new-customer-btn"
                type="submit"
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md"
              >
                Save Customer
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
