import React, { useState } from 'react';
import { Expense, ExpenseCategory, CurrencyCode } from '../types';
import { formatCurrency, detectExpenseAnomaly } from '../utils/calculations';
import { X, AlertTriangle, ArrowRight, Check } from 'lucide-react';

interface ExpensesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency: CurrencyCode;
  existingExpenses: Expense[];
  onAddExpense: (expense: Expense) => void;
}

const CATEGORIES: { category: ExpenseCategory; icon: string }[] = [
  { category: 'Rent', icon: '🏢' },
  { category: 'Electricity', icon: '⚡' },
  { category: 'Water', icon: '💧' },
  { category: 'Transport', icon: '🚐' },
  { category: 'Salary', icon: '👥' },
  { category: 'Marketing', icon: '📢' },
  { category: 'Fuel', icon: '⛽' },
  { category: 'Cleaning', icon: '🧹' },
  { category: 'Packaging', icon: '📦' },
  { category: 'Maintenance', icon: '🔧' },
  { category: 'Other', icon: '💸' },
];

export const ExpensesModal: React.FC<ExpensesModalProps> = ({
  isOpen,
  onClose,
  currency,
  existingExpenses,
  onAddExpense,
}) => {
  const [category, setCategory] = useState<ExpenseCategory>('Electricity');
  const [amount, setAmount] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [paidVia, setPaidVia] = useState<string>('Cash');

  // AI Mistake Detection (Step 31)
  const [aiWarning, setAiWarning] = useState<{
    show: boolean;
    suggestedValues: number[];
    message: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleAttemptSave = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return;

    // Check anomaly if not already confirmed
    if (!aiWarning) {
      const anomalyCheck = detectExpenseAnomaly(category, numAmount, existingExpenses);
      if (anomalyCheck.isAnomaly && anomalyCheck.suggestedValues) {
        setAiWarning({
          show: true,
          suggestedValues: anomalyCheck.suggestedValues,
          message: anomalyCheck.message || '⚠️ Unusually high expense recorded.',
        });
        return;
      }
    }

    finalizeExpense(numAmount);
  };

  const finalizeExpense = (finalAmount: number) => {
    const newExpense: Expense = {
      id: `exp_${Date.now()}`,
      category,
      amount: finalAmount,
      notes: notes.trim() || `${category} payment`,
      paidVia,
      date: new Date().toISOString(),
    };

    onAddExpense(newExpense);
    handleClose();
  };

  const handleClose = () => {
    setAmount('');
    setNotes('');
    setAiWarning(null);
    onClose();
  };

  return (
    <div 
      id="smartledger-expenses-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold font-['Outfit',sans-serif]">💸 Spend Money (Expense)</h3>
            <p className="text-xs text-slate-400">Record payments for bills, supplies, and upkeep</p>
          </div>
          <button
            id="expense-modal-close-btn"
            onClick={handleClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* STEP 31: AI MISTAKE WARNING POPUP */}
          {aiWarning && (
            <div 
              id="ai-expense-mistake-box"
              className="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl space-y-3 animate-fade-in text-amber-900"
            >
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-amber-900">
                    SmartLedger AI Warning: High Expense
                  </h4>
                  <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                    {aiWarning.message}
                  </p>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap gap-2">
                {aiWarning.suggestedValues.map((val, idx) => (
                  <button
                    key={idx}
                    type="button"
                    id={`ai-suggest-val-${idx}`}
                    onClick={() => finalizeExpense(val)}
                    className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Use {formatCurrency(val, currency)}
                  </button>
                ))}
                <button
                  type="button"
                  id="ai-suggest-edit"
                  onClick={() => setAiWarning(null)}
                  className="py-2 px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  Edit Amount
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleAttemptSave} className="space-y-4">
            {/* Category Selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                Choose Category
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {CATEGORIES.map((c) => {
                  const isSelected = category === c.category;
                  return (
                    <button
                      key={c.category}
                      type="button"
                      id={`exp-cat-${c.category.toLowerCase()}`}
                      onClick={() => { setCategory(c.category); setAiWarning(null); }}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="text-lg block mb-0.5">{c.icon}</span>
                      <span className="text-[11px] leading-tight block">{c.category}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Amount ({currency})
              </label>
              <input
                id="expense-amount-input"
                type="number"
                min="1"
                required
                placeholder="e.g. 45000"
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setAiWarning(null); }}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-lg text-slate-900"
              />
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Paid Via
              </label>
              <div className="flex gap-2">
                {['Cash', 'Mobile Money', 'Bank'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPaidVia(m)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      paidVia === m
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes / Description */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Notes (Optional)
              </label>
              <input
                id="expense-notes-input"
                type="text"
                placeholder="e.g. Monthly electricity token for ovens"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
            </div>

            <button
              id="save-expense-btn"
              type="submit"
              className="w-full py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm tracking-wide shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Save Expense</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
