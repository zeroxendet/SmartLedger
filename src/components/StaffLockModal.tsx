import React, { useState, useEffect } from 'react';
import { Lock, ShieldAlert, KeyRound, LogOut } from 'lucide-react';
import { StaffMember } from '../types';
import { verifyStaffPin } from '../utils/staffSecurity';

interface StaffLockModalProps {
  isOpen: boolean;
  staff: StaffMember | null;
  businessId: string;
  businessName: string;
  onUnlock: () => void;
  onExitStaffMode: () => void;
  onClose?: () => void;
}

export const StaffLockModal: React.FC<StaffLockModalProps> = ({
  isOpen,
  staff,
  businessId,
  businessName,
  onUnlock,
  onExitStaffMode,
  onClose,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen || !staff) return null;

  const handleKeyClick = (num: string) => {
    if (pin.length < 4) {
      const nextPin = pin + num;
      setPin(nextPin);
      if (nextPin.length === 4) {
        verifyEnteredPin(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError('');
  };

  const handleClear = () => {
    setPin('');
    setError('');
  };

  const verifyEnteredPin = async (inputPin: string) => {
    setIsVerifying(true);
    setError('');

    // Check if staff status is DISABLED
    if (staff.status === 'DISABLED') {
      setError('Your staff access has been disabled by the owner. Please contact your manager.');
      setIsVerifying(false);
      setPin('');
      return;
    }

    try {
      const isValid = await verifyStaffPin(inputPin, staff.cashierPinHash, businessId);
      if (isValid) {
        onUnlock();
      } else {
        setError('Incorrect Cashier PIN. Please try again.');
        setPin('');
      }
    } catch {
      setError('Verification error. Please try again.');
      setPin('');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden p-6 space-y-5">
        <div className="text-center space-y-1">
          <div className="w-14 h-14 rounded-3xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto shadow-sm">
            <Lock className="w-7 h-7" />
          </div>
          <div className="pt-2">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
              Staff Mode Locked
            </span>
            <h3 className="text-xl font-bold text-slate-900 font-['Outfit',sans-serif] mt-1">
              Welcome back, {staff.name}
            </h3>
            <p className="text-xs text-slate-500">
              {businessName} • {staff.role}
            </p>
          </div>
        </div>

        {/* PIN Indicators */}
        <div className="flex justify-center items-center gap-3 py-2">
          {[0, 1, 2, 3].map((index) => {
            const hasChar = pin.length > index;
            return (
              <div
                key={index}
                className={`w-4 h-4 rounded-full border-2 transition-all ${
                  hasChar
                    ? 'bg-indigo-600 border-indigo-600 scale-110'
                    : 'border-slate-300 bg-slate-100'
                }`}
              />
            );
          })}
        </div>

        {error && (
          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs text-center flex items-center justify-center gap-1.5 font-medium animate-shake">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-2.5 pt-1">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              disabled={isVerifying}
              onClick={() => handleKeyClick(digit)}
              className="h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 text-lg font-bold font-mono transition-all flex items-center justify-center"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="h-12 rounded-2xl bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-500 text-xs font-bold transition-all flex items-center justify-center"
          >
            Clear
          </button>
          <button
            type="button"
            disabled={isVerifying}
            onClick={() => handleKeyClick('0')}
            className="h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 text-lg font-bold font-mono transition-all flex items-center justify-center"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="h-12 rounded-2xl bg-slate-50 hover:bg-slate-100 active:scale-95 text-slate-500 text-xs font-bold transition-all flex items-center justify-center"
          >
            ⌫
          </button>
        </div>

        {/* Exit to Owner Mode action */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-center">
          <button
            onClick={onExitStaffMode}
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1.5 py-1 px-3 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Exit Staff Mode / Owner Login</span>
          </button>
        </div>
      </div>
    </div>
  );
};
