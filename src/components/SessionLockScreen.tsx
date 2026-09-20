import React, { useState } from 'react';
import { BrandLogo } from './BrandLogo';
import { BusinessProfile } from '../types';
import { 
  ShieldCheck, 
  Lock, 
  KeyRound, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  LogOut, 
  Building2, 
  User, 
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  formatFirebaseErrorMessage 
} from '../firebase';
import { SESSION_LOCK_TIMEOUT_MINUTES } from '../utils/sessionLock';

interface SessionLockScreenProps {
  profile: BusinessProfile | null;
  currentUserEmail?: string | null;
  currentUserName?: string | null;
  cashierPin?: string;
  onUnlockSuccess: () => void;
  onLogout: () => void;
}

export const SessionLockScreen: React.FC<SessionLockScreenProps> = ({
  profile,
  currentUserEmail,
  currentUserName,
  cashierPin,
  onUnlockSuccess,
  onLogout,
}) => {
  // Determine effective user email and business name
  const effectiveEmail = 
    currentUserEmail || 
    profile?.email || 
    localStorage.getItem('smartledger_locked_user_email') || 
    '';
  const effectiveBusinessName = 
    profile?.name || 
    localStorage.getItem('smartledger_locked_business_name') || 
    'SmartLedger Business';
  const effectiveUserName = 
    currentUserName || 
    profile?.ownerName || 
    localStorage.getItem('smartledger_locked_user_name') || 
    'Business Owner';

  // Has PIN configured?
  const hasPinConfigured = Boolean(profile?.cashierPin || cashierPin);
  const effectivePin = profile?.cashierPin || cashierPin || '';

  // Auth method tab: 'password' | 'pin' | 'google'
  const [authMethod, setAuthMethod] = useState<'password' | 'pin'>('password');
  
  // Password form state
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // PIN form state
  const [pinDigits, setPinDigits] = useState(['', '', '', '']);

  // Loading & error states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successAnimation, setSuccessAnimation] = useState(false);

  // 1. Unlock with Password
  const handlePasswordUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setErrorMessage('Please enter your password to unlock.');
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    try {
      // If we have an email and Firebase auth is active, verify via Firebase
      if (effectiveEmail && effectiveEmail.includes('@') && !effectiveEmail.endsWith('@smartledger.local')) {
        const userCredential = await signInWithEmailAndPassword(auth, effectiveEmail, password);
        await userCredential.user.getIdToken(true);
      } else {
        // Local/offline workspace verification
        // Check if user set a local account password or check standard password
        const storedLocalPass = localStorage.getItem(`smartledger_local_pass_${effectiveEmail}`);
        if (storedLocalPass && storedLocalPass !== password) {
          throw new Error('Incorrect password. Please try again.');
        }
      }

      setSuccessAnimation(true);
      setTimeout(() => {
        setIsLoading(false);
        onUnlockSuccess();
      }, 500);
    } catch (err: any) {
      setIsLoading(false);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setErrorMessage('Incorrect password. Please check and try again.');
      } else {
        const formatted = formatFirebaseErrorMessage(err);
        setErrorMessage(formatted.message || 'Authentication failed. Please try again.');
      }
    }
  };

  // 2. Unlock with Google
  const handleGoogleUnlock = async () => {
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      const user = userCredential.user;
      await user.getIdToken(true);

      // Verify that this Google account matches the locked business account if email is known
      if (effectiveEmail && user.email && effectiveEmail.includes('@') && !effectiveEmail.endsWith('@smartledger.local')) {
        if (user.email.toLowerCase() !== effectiveEmail.toLowerCase()) {
          setErrorMessage(
            `Signed in with ${user.email}, but this business belongs to ${effectiveEmail}. Please sign in with the matching Google account.`
          );
          setIsLoading(false);
          return;
        }
      }

      setSuccessAnimation(true);
      setTimeout(() => {
        setIsLoading(false);
        onUnlockSuccess();
      }, 500);
    } catch (err: any) {
      setIsLoading(false);
      const formatted = formatFirebaseErrorMessage(err);
      setErrorMessage(formatted.message || 'Google authentication was cancelled or failed.');
    }
  };

  // 3. Unlock with 4-Digit PIN
  const handlePinDigitChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const digit = value.slice(-1);
    const newDigits = [...pinDigits];
    newDigits[index] = digit;
    setPinDigits(newDigits);

    // Auto-focus next input
    if (digit && index < 3) {
      const nextInput = document.getElementById(`session-pin-input-${index + 1}`);
      nextInput?.focus();
    }

    // If 4 digits entered, auto-verify
    const fullPin = newDigits.join('');
    if (fullPin.length === 4) {
      verifyPin(fullPin);
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      const prevInput = document.getElementById(`session-pin-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  const verifyPin = (enteredPin: string) => {
    setErrorMessage(null);
    setIsLoading(true);

    setTimeout(() => {
      if (effectivePin && enteredPin === effectivePin) {
        setSuccessAnimation(true);
        setTimeout(() => {
          setIsLoading(false);
          onUnlockSuccess();
        }, 500);
      } else {
        setIsLoading(false);
        setErrorMessage('Incorrect 4-digit PIN. Please try again.');
        setPinDigits(['', '', '', '']);
        const firstInput = document.getElementById('session-pin-input-0');
        firstInput?.focus();
      }
    }, 400);
  };

  return (
    <div 
      id="smartledger-session-lock-screen"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-white overflow-y-auto"
    >
      {/* Background Decorative Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md my-auto flex flex-col items-center">
        
        {/* Brand Logo Header */}
        <div className="mb-6 text-center animate-fade-in">
          <BrandLogo size="lg" lightMode={true} tagline={true} />
        </div>

        {/* Security Shield & Lock Icon Card */}
        <div className="w-full bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 relative overflow-hidden">
          
          {/* Subtle Top Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-amber-400 to-emerald-500" />

          {/* Header Status Badge */}
          <div className="flex flex-col items-center text-center space-y-2.5">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${
              successAnimation 
                ? 'bg-emerald-500/20 text-emerald-400 ring-4 ring-emerald-500/30 scale-110' 
                : 'bg-amber-500/15 text-amber-400 ring-2 ring-amber-500/20 shadow-lg shadow-amber-500/10'
            }`}>
              {successAnimation ? (
                <CheckCircle2 className="w-7 h-7 animate-bounce" />
              ) : (
                <Lock className="w-7 h-7" />
              )}
            </div>

            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl font-black font-['Outfit',sans-serif] tracking-tight text-white">
                Session Locked
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 max-w-xs leading-relaxed">
                For your security, SmartLedger was locked because you were away for {SESSION_LOCK_TIMEOUT_MINUTES} minutes.
              </p>
            </div>
          </div>

          {/* Business & Account Badge */}
          <div className="p-3.5 rounded-2xl bg-slate-800/70 border border-slate-700/60 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xs font-bold text-white truncate">
                  {effectiveBusinessName}
                </h2>
                <p className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-500 shrink-0" />
                  <span>{effectiveUserName}</span>
                  {effectiveEmail && (
                    <span className="text-slate-500">• {effectiveEmail}</span>
                  )}
                </p>
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-700 text-[10px] font-semibold">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>Protected</span>
            </div>
          </div>

          {/* Authentication Method Selector (if PIN available) */}
          {hasPinConfigured && (
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950/80 rounded-2xl border border-slate-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setAuthMethod('password');
                  setErrorMessage(null);
                }}
                className={`py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  authMethod === 'password'
                    ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Password</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthMethod('pin');
                  setErrorMessage(null);
                }}
                className={`py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  authMethod === 'pin'
                    ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>4-Digit PIN</span>
              </button>
            </div>
          )}

          {/* Error Feedback Message */}
          {errorMessage && (
            <div 
              role="alert" 
              className="p-3 bg-red-950/50 border border-red-500/40 rounded-2xl text-xs text-red-300 flex items-start gap-2.5 animate-shake"
            >
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span className="leading-snug">{errorMessage}</span>
            </div>
          )}

          {/* PASSWORD UNLOCK FORM */}
          {authMethod === 'password' && (
            <form onSubmit={handlePasswordUnlock} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Account Password
                </label>
                <div className="relative">
                  <input
                    id="session-lock-password-input"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoFocus
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    disabled={isLoading || successAnimation}
                    className="w-full pl-3.5 pr-10 py-3 rounded-2xl bg-slate-950 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                id="session-unlock-submit-btn"
                type="submit"
                disabled={isLoading || successAnimation || !password}
                className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : successAnimation ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    <span>Session Unlocked!</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Unlock SmartLedger</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Google Sign-in Alternative (if email is known or Google provider enabled) */}
              <div className="pt-2">
                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-slate-800" />
                  <span className="flex-shrink mx-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                    or continue with
                  </span>
                  <div className="flex-grow border-t border-slate-800" />
                </div>

                <button
                  type="button"
                  onClick={handleGoogleUnlock}
                  disabled={isLoading || successAnimation}
                  className="w-full py-2.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-white font-semibold text-xs flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Unlock with Google</span>
                </button>
              </div>
            </form>
          )}

          {/* PIN UNLOCK FORM */}
          {authMethod === 'pin' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400 text-center">
                Enter your 4-digit business security PIN to resume:
              </p>

              <div className="flex items-center justify-center gap-3 py-2">
                {[0, 1, 2, 3].map((index) => (
                  <input
                    key={index}
                    id={`session-pin-input-${index}`}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={pinDigits[index]}
                    onChange={(e) => handlePinDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handlePinKeyDown(index, e)}
                    disabled={isLoading || successAnimation}
                    autoFocus={index === 0}
                    className="w-12 h-14 text-center text-xl font-bold bg-slate-950 border border-slate-700 rounded-2xl text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                ))}
              </div>

              {isLoading && (
                <div className="flex items-center justify-center gap-2 text-xs text-emerald-400">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Verifying PIN...</span>
                </div>
              )}
            </div>
          )}

          {/* Log Out Option */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Not you or want to switch accounts?</span>
            <button
              type="button"
              onClick={onLogout}
              className="font-bold text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>

        </div>

        {/* Security Note Footer */}
        <p className="mt-4 text-[11px] text-slate-500 text-center max-w-xs leading-relaxed">
          SmartLedger Automatic Session Lock protects your business records, revenue, and customer financial data when your device is unattended.
        </p>

      </div>
    </div>
  );
};
