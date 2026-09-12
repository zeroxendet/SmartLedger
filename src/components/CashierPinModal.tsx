import React, { useState } from 'react';
import { 
  X, 
  Lock, 
  Unlock, 
  ShieldCheck, 
  KeyRound, 
  Delete,
  AlertCircle
} from 'lucide-react';

interface CashierPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'unlock_owner' | 'set_pin';
  currentPin: string; // e.g. '1234'
  onSuccess: (newPin?: string) => void;
}

export const CashierPinModal: React.FC<CashierPinModalProps> = ({
  isOpen,
  onClose,
  mode,
  currentPin,
  onSuccess,
}) => {
  const [enteredDigits, setEnteredDigits] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmingPin, setConfirmingPin] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDigitClick = (digit: string) => {
    if (enteredDigits.length >= 4) return;
    const next = enteredDigits + digit;
    setEnteredDigits(next);
    setErrorMessage(null);

    if (next.length === 4) {
      evaluatePin(next);
    }
  };

  const handleBackspace = () => {
    setEnteredDigits((prev) => prev.slice(0, -1));
    setErrorMessage(null);
  };

  const evaluatePin = (pin: string) => {
    if (mode === 'unlock_owner') {
      const validPin = currentPin || '1234';
      if (pin === validPin) {
        onSuccess();
        onClose();
      } else {
        setErrorMessage('Incorrect PIN. Default is 1234.');
        setTimeout(() => setEnteredDigits(''), 700);
      }
    } else {
      // mode === 'set_pin'
      if (!confirmingPin) {
        // First entry, now ask for confirmation
        setConfirmingPin(pin);
        setEnteredDigits('');
      } else {
        // Confirmation entry
        if (pin === confirmingPin) {
          onSuccess(pin);
          onClose();
        } else {
          setErrorMessage('PINs do not match. Please try again.');
          setConfirmingPin(null);
          setEnteredDigits('');
        }
      }
    }
  };

  return (
    <div 
      id="cashier-pin-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
    >
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-slate-100 text-slate-800">
              {mode === 'unlock_owner' ? <Lock className="w-5 h-5 text-indigo-600" /> : <KeyRound className="w-5 h-5 text-emerald-600" />}
            </div>
            <div>
              <h3 className="text-base font-bold font-['Outfit',sans-serif] text-slate-900">
                {mode === 'unlock_owner' 
                  ? 'Exit Cashier Mode' 
                  : confirmingPin ? 'Confirm New PIN' : 'Set 4-Digit Cashier PIN'}
              </h3>
              <p className="text-xs text-slate-500">
                {mode === 'unlock_owner' 
                  ? 'Enter Owner PIN to unlock full management' 
                  : confirmingPin ? 'Re-enter your 4-digit PIN' : 'Restricts staff to Sell & Inventory'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PIN Indicators */}
        <div className="flex flex-col items-center space-y-3">
          <div className="flex items-center gap-4">
            {[0, 1, 2, 3].map((idx) => {
              const isFilled = enteredDigits.length > idx;
              return (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full border-2 transition-all ${
                    isFilled
                      ? 'bg-indigo-600 border-indigo-600 scale-110 shadow-sm'
                      : 'bg-slate-100 border-slate-300'
                  }`}
                />
              );
            })}
          </div>

          {errorMessage ? (
            <p className="text-xs font-semibold text-rose-600 flex items-center gap-1 animate-shake">
              <AlertCircle className="w-3.5 h-3.5" />
              {errorMessage}
            </p>
          ) : (
            <p className="text-[11px] text-slate-400">
              {mode === 'unlock_owner' && '(Default PIN: 1234)'}
            </p>
          )}
        </div>

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigitClick(digit)}
              className="py-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-800 text-lg font-bold transition-all shadow-sm cursor-pointer"
            >
              {digit}
            </button>
          ))}
          <div />
          <button
            type="button"
            onClick={() => handleDigitClick('0')}
            className="py-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-800 text-lg font-bold transition-all shadow-sm cursor-pointer"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="py-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-600 flex items-center justify-center transition-all shadow-sm cursor-pointer"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Footer info */}
        <div className="text-center pt-2 border-t border-slate-100 text-[11px] text-slate-400">
          Staff Cashiers can only ring up sales and check inventory without viewing profit or expense records.
        </div>
      </div>
    </div>
  );
};
