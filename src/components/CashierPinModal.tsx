import React, { useState, useEffect } from 'react';
import { 
  X, 
  Lock, 
  Unlock, 
  ShieldCheck, 
  KeyRound, 
  Delete,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  RotateCcw
} from 'lucide-react';

interface CashierPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'unlock_owner' | 'set_pin';
  currentPin: string; // e.g. '1234'
  onSuccess: (newPin?: string) => void;
  isOwner?: boolean;
}

export const CashierPinModal: React.FC<CashierPinModalProps> = ({
  isOpen,
  onClose,
  mode: initialMode,
  currentPin,
  onSuccess,
}) => {
  const effectiveCurrentPin = currentPin || '1234';

  const [activeTab, setActiveTab] = useState<'unlock_owner' | 'set_pin'>(initialMode);
  // For 'set_pin' mode:
  // If user is already owner or knows current pin, they verify current -> enter new -> confirm new
  const [setupStep, setSetupStep] = useState<'verify_current' | 'enter_new' | 'confirm_new'>('enter_new');
  const [enteredDigits, setEnteredDigits] = useState<string>('');
  const [newPinCandidate, setNewPinCandidate] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showDigits, setShowDigits] = useState<boolean>(false);

  // Sync activeTab whenever initialMode changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialMode);
      setEnteredDigits('');
      setNewPinCandidate('');
      setErrorMessage(null);
      setSuccessMessage(null);
      // If setting pin, if current pin is not default '1234', require verifying current pin first
      if (initialMode === 'set_pin') {
        setSetupStep(effectiveCurrentPin === '1234' ? 'enter_new' : 'verify_current');
      }
    }
  }, [isOpen, initialMode, effectiveCurrentPin]);

  // Handle keyboard inputs (0-9, Backspace, Escape)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Backspace') {
        handleBackspace();
        return;
      }
      if (/^[0-9]$/.test(e.key)) {
        handleDigitClick(e.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, enteredDigits, activeTab, setupStep, newPinCandidate]);

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

  const handleResetCurrentStep = () => {
    setEnteredDigits('');
    setErrorMessage(null);
  };

  const evaluatePin = (pin: string) => {
    if (activeTab === 'unlock_owner') {
      if (pin === effectiveCurrentPin) {
        setSuccessMessage('PIN Verified! Unlocking Owner Mode...');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 500);
      } else {
        setErrorMessage(`Incorrect PIN. ${effectiveCurrentPin === '1234' ? '(Default PIN is 1234)' : 'Please try again.'}`);
        setTimeout(() => setEnteredDigits(''), 700);
      }
      return;
    }

    // activeTab === 'set_pin'
    if (setupStep === 'verify_current') {
      if (pin === effectiveCurrentPin) {
        setSetupStep('enter_new');
        setEnteredDigits('');
        setErrorMessage(null);
      } else {
        setErrorMessage('Current PIN is incorrect. Default is 1234.');
        setTimeout(() => setEnteredDigits(''), 700);
      }
    } else if (setupStep === 'enter_new') {
      setNewPinCandidate(pin);
      setSetupStep('confirm_new');
      setEnteredDigits('');
      setErrorMessage(null);
    } else if (setupStep === 'confirm_new') {
      if (pin === newPinCandidate) {
        setSuccessMessage(`PIN successfully set to ${pin}!`);
        setTimeout(() => {
          onSuccess(pin);
          onClose();
        }, 700);
      } else {
        setErrorMessage('PINs do not match. Please re-enter.');
        setEnteredDigits('');
        setSetupStep('enter_new');
      }
    }
  };

  const switchTab = (tab: 'unlock_owner' | 'set_pin') => {
    setActiveTab(tab);
    setEnteredDigits('');
    setErrorMessage(null);
    setSuccessMessage(null);
    if (tab === 'set_pin') {
      setSetupStep(effectiveCurrentPin === '1234' ? 'enter_new' : 'verify_current');
    }
  };

  return (
    <div 
      id="cashier-pin-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
    >
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col p-6 space-y-5">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`p-2.5 rounded-2xl ${activeTab === 'unlock_owner' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
              {activeTab === 'unlock_owner' ? <Lock className="w-5 h-5" /> : <KeyRound className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold font-['Outfit',sans-serif] text-slate-900 leading-tight">
                {activeTab === 'unlock_owner' ? 'Cashier Mode Security' : 'Choose Cashier PIN'}
              </h3>
              <p className="text-xs text-slate-500">
                {activeTab === 'unlock_owner' 
                  ? 'Protect business profits and reports' 
                  : 'Set a custom 4-digit secret code'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close PIN modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl text-xs font-bold text-slate-600">
          <button
            type="button"
            onClick={() => switchTab('unlock_owner')}
            className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'unlock_owner'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'hover:text-slate-900'
            }`}
          >
            <Unlock className="w-3.5 h-3.5" />
            <span>Unlock Owner</span>
          </button>
          <button
            type="button"
            onClick={() => switchTab('set_pin')}
            className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'set_pin'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'hover:text-slate-900'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Choose PIN</span>
          </button>
        </div>

        {/* Step Guide / Instructions */}
        <div className="text-center px-2">
          {activeTab === 'unlock_owner' ? (
            <p className="text-xs font-medium text-slate-600">
              Enter your 4-digit PIN to exit Cashier mode and restore full owner management.
            </p>
          ) : (
            <div className="space-y-1">
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                {setupStep === 'verify_current' && 'Step 1 of 3: Verify Current PIN'}
                {setupStep === 'enter_new' && (effectiveCurrentPin === '1234' ? 'Step 1 of 2: Choose 4-Digit PIN' : 'Step 2 of 3: Choose New PIN')}
                {setupStep === 'confirm_new' && 'Step Final: Confirm New PIN'}
              </span>
              <p className="text-xs text-slate-600 font-medium">
                {setupStep === 'verify_current' && 'Enter your current PIN (default: 1234)'}
                {setupStep === 'enter_new' && 'Choose a memorable 4-digit PIN for your cashier station'}
                {setupStep === 'confirm_new' && 'Re-enter your new 4-digit PIN to confirm and secure'}
              </p>
            </div>
          )}
        </div>

        {/* PIN Indicators Display */}
        <div className="flex flex-col items-center space-y-2 py-2">
          <div className="flex items-center gap-3">
            {[0, 1, 2, 3].map((idx) => {
              const isFilled = enteredDigits.length > idx;
              const digitVal = enteredDigits[idx];
              return (
                <div
                  key={idx}
                  className={`w-12 h-14 rounded-2xl border-2 flex items-center justify-center text-xl font-black font-mono transition-all duration-200 ${
                    isFilled
                      ? activeTab === 'unlock_owner'
                        ? 'bg-indigo-50 border-indigo-600 text-indigo-700 scale-105 shadow-sm'
                        : 'bg-emerald-50 border-emerald-600 text-emerald-700 scale-105 shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-transparent'
                  }`}
                >
                  {isFilled ? (showDigits ? digitVal : '●') : ''}
                </div>
              );
            })}
          </div>

          {/* Visibility Toggle & Reset */}
          <div className="flex items-center justify-between w-full px-4 pt-1">
            <button
              type="button"
              onClick={() => setShowDigits(!showDigits)}
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors cursor-pointer"
            >
              {showDigits ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-slate-400" />}
              <span>{showDigits ? 'Hide PIN' : 'Show digits'}</span>
            </button>

            {enteredDigits.length > 0 && (
              <button
                type="button"
                onClick={handleResetCurrentStep}
                className="text-[11px] font-semibold text-slate-400 hover:text-rose-600 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}
          </div>

          {/* Status Message */}
          {errorMessage && (
            <p className="text-xs font-bold text-rose-600 flex items-center gap-1 animate-shake mt-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMessage}</span>
            </p>
          )}

          {successMessage && (
            <p className="text-xs font-bold text-emerald-600 flex items-center gap-1 animate-fade-in mt-1">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{successMessage}</span>
            </p>
          )}

          {!errorMessage && !successMessage && activeTab === 'unlock_owner' && (
            <p className="text-[11px] text-slate-400">
              {effectiveCurrentPin === '1234' ? 'Default PIN is 1234' : 'Enter your custom 4-digit PIN'}
            </p>
          )}
        </div>

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2.5 pt-1">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigitClick(digit)}
              className="py-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-800 text-xl font-bold transition-all shadow-xs cursor-pointer active:scale-95 touch-manipulation font-mono"
            >
              {digit}
            </button>
          ))}
          <div className="flex items-center justify-center">
            {activeTab === 'set_pin' && setupStep === 'confirm_new' ? (
              <button
                type="button"
                onClick={() => {
                  setSetupStep('enter_new');
                  setEnteredDigits('');
                  setErrorMessage(null);
                }}
                className="text-[11px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                Back
              </button>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => handleDigitClick('0')}
            className="py-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-800 text-xl font-bold transition-all shadow-xs cursor-pointer active:scale-95 touch-manipulation font-mono"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            aria-label="Backspace"
            className="py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-600 flex items-center justify-center transition-all shadow-xs cursor-pointer active:scale-95 touch-manipulation"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Footer info banner */}
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-2 text-[11px] text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>
            {activeTab === 'unlock_owner'
              ? 'Forgot your PIN? Switch to "Choose PIN" tab to configure a new PIN or verify with current code.'
              : 'Choosing a custom PIN prevents cashiers or unauthorized staff from viewing business profits, expenses, or reports.'}
          </span>
        </div>
      </div>
    </div>
  );
};

