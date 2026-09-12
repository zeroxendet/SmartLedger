import React, { useState } from 'react';
import { OtherIncome, IncomeSource, CurrencyCode } from '../types';
import { formatCurrency } from '../utils/calculations';
import { X, ArrowRight, Coins } from 'lucide-react';

interface IncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency: CurrencyCode;
  onAddIncome: (income: OtherIncome) => void;
}

export const IncomeModal: React.FC<IncomeModalProps> = ({
  isOpen,
  onClose,
  currency,
  onAddIncome,
}) => {
  const [source, setSource] = useState<IncomeSource>('Service');
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return;

    const newIncome: OtherIncome = {
      id: `inc_${Date.now()}`,
      source,
      amount: numAmount,
      description: description.trim() || `${source} Income`,
      date: new Date().toISOString(),
    };

    onAddIncome(newIncome);
    setAmount('');
    setDescription('');
    onClose();
  };

  return (
    <div 
      id="smartledger-income-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-lg font-bold font-['Outfit',sans-serif]">💰 Receive Money</h3>
              <p className="text-xs text-slate-400">Record non-product income, services, or loans</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Where did this money come from?
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { source: 'Service' as IncomeSource, label: '🛠️ Service Income' },
                { source: 'Investment' as IncomeSource, label: '💼 Investment' },
                { source: 'Loan' as IncomeSource, label: '🏦 Loan Received' },
                { source: 'Other' as IncomeSource, label: '✨ Other Income' },
              ].map((s) => (
                <button
                  key={s.source}
                  type="button"
                  onClick={() => setSource(s.source)}
                  className={`p-3 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
                    source === s.source
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Amount ({currency})
            </label>
            <input
              id="income-amount-input"
              type="number"
              min="1"
              required
              placeholder="e.g. 100000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 font-bold text-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Description
            </label>
            <input
              id="income-desc-input"
              type="text"
              placeholder="e.g. Catering service for wedding order"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <button
            id="save-income-btn"
            type="submit"
            className="w-full py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm tracking-wide shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Record Income</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
