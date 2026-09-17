import React, { useState } from 'react';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, X, ShieldCheck, ArrowRight, ShieldAlert } from 'lucide-react';
import { createPasswordForCurrentUser, reauthenticateWithGoogle, reauthenticateWithPassword } from '../firebase';

interface CreatePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
  hasExistingPassword?: boolean;
  hasGoogle?: boolean;
  onPasswordCreated?: () => void;
}

export const CreatePasswordModal: React.FC<CreatePasswordModalProps> = ({
  isOpen,
  onClose,
  userEmail,
  hasExistingPassword = false,
  hasGoogle = true,
  onPasswordCreated,
}) => {
  // State
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifyingGoogle, setIsVerifyingGoogle] = useState(false);
  const [isGoogleVerified, setIsGoogleVerified] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleVerifyGoogle = async () => {
    setErrorMessage(null);
    setIsVerifyingGoogle(true);
    try {
      const res = await reauthenticateWithGoogle();
      if (res.success) {
        setIsGoogleVerified(true);
      } else {
        const err = res.error;
        if (err?.code === 'auth/popup-closed-by-user') {
          setErrorMessage('Google verification window was closed. Please try again.');
        } else if (err?.code === 'auth/cancelled-popup-request') {
          // Ignored if rapid click
        } else {
          setErrorMessage(err?.message || 'Failed to authenticate with Google. Please try again.');
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'An unexpected error occurred during Google verification.');
    } finally {
      setIsVerifyingGoogle(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Requirement: If account was created with Google and has no password, verify with Google first
    if (!hasExistingPassword && hasGoogle && !isGoogleVerified) {
      // Proactively trigger Google verification popup
      setIsVerifyingGoogle(true);
      try {
        const googleRes = await reauthenticateWithGoogle();
        if (!googleRes.success) {
          setIsVerifyingGoogle(false);
          if (googleRes.error?.code === 'auth/popup-closed-by-user') {
            setErrorMessage('Please complete the Google verification popup to create your password.');
          } else {
            setErrorMessage(googleRes.error?.message || 'Please verify your Google account before creating a password.');
          }
          return;
        }
        setIsGoogleVerified(true);
      } catch (gErr: any) {
        setIsVerifyingGoogle(false);
        setErrorMessage(gErr?.message || 'Google verification failed.');
        return;
      } finally {
        setIsVerifyingGoogle(false);
      }
    }

    // Password validation
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify and try again.');
      return;
    }

    setIsSubmitting(true);

    try {
      // If changing an existing password and user provided current password, reauthenticate with it first
      if (hasExistingPassword && currentPassword) {
        const reauthRes = await reauthenticateWithPassword(currentPassword);
        if (!reauthRes.success) {
          setIsSubmitting(false);
          setErrorMessage('Current password is incorrect. Please check your password and try again.');
          return;
        }
      }

      // Securely link or update the password credential
      const res = await createPasswordForCurrentUser(password);
      if (res.success) {
        setSuccessMessage(
          hasExistingPassword
            ? '✓ Password updated successfully! You can now use your new password to sign in.'
            : '✓ Password created and linked! You can now sign in using either Google or your email and password.'
        );
        setPassword('');
        setConfirmPassword('');
        setCurrentPassword('');
        if (onPasswordCreated) onPasswordCreated();
        setTimeout(() => {
          setIsSubmitting(false);
          setSuccessMessage(null);
          onClose();
        }, 2200);
      } else {
        const err = res.error;
        if (err?.code === 'auth/requires-recent-login') {
          // If Firebase still complains about recent login, ask to re-authenticate with Google
          setErrorMessage('For security, Google requires you to verify your identity. Please click "Verify with Google" below.');
          setIsGoogleVerified(false);
        } else if (err?.code === 'auth/credential-already-in-use' || err?.code === 'auth/email-already-in-use') {
          setErrorMessage('This email is already associated with another password credential in Firebase. Duplicate account creation is blocked to protect your business data.');
        } else if (err?.code === 'auth/weak-password') {
          setErrorMessage('Password is too weak. Please use at least 6 characters with a combination of letters and numbers.');
        } else {
          setErrorMessage(err?.message || 'Failed to save password. Please try again.');
        }
        setIsSubmitting(false);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred while saving your password.');
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      id="create-password-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
    >
      <div 
        id="create-password-modal"
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center shadow-sm">
              <Lock className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {hasExistingPassword ? 'Change Password' : 'Set Account Password'}
              </h3>
              <p className="text-[11px] text-slate-400">Account Security &amp; Sign-In Linking</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {successMessage ? (
            <div className="py-6 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-slate-900">Success!</h4>
              <p className="text-xs text-slate-600 max-w-xs mx-auto leading-relaxed">
                {successMessage}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Informational callout */}
              <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-900 leading-relaxed font-medium">
                  {hasExistingPassword
                    ? 'Enter a new password below to update your email/password sign-in credential.'
                    : 'Create a secure password to log in with your email and password. Your Google Sign-In and existing business data will remain completely intact.'}
                </p>
              </div>

              {/* Account Email (Read-only) */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Account Email
                </label>
                <input
                  type="text"
                  disabled
                  value={userEmail || 'No email associated'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 text-xs font-mono select-none"
                />
              </div>

              {/* Step 1 for Google-created accounts: Re-authenticate with Google */}
              {!hasExistingPassword && hasGoogle && (
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                      Step 1: Verify Google Identity
                    </span>
                    {isGoogleVerified ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Verified
                      </span>
                    ) : (
                      <span className="text-[11px] text-amber-700 font-medium">
                        Required for security
                      </span>
                    )}
                  </div>

                  {!isGoogleVerified ? (
                    <button
                      id="btn-verify-with-google"
                      type="button"
                      onClick={handleVerifyGoogle}
                      disabled={isVerifyingGoogle || isSubmitting}
                      className="w-full py-2 px-3 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.26 21.36 7.34 24 12 24z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.98 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                        />
                      </svg>
                      <span>{isVerifyingGoogle ? 'Verifying with Google...' : 'Verify with Google Account'}</span>
                    </button>
                  ) : (
                    <p className="text-[11px] text-slate-500 leading-tight">
                      ✓ Google identity authenticated. You can now choose your new password below.
                    </p>
                  )}
                </div>
              )}

              {/* Current password input if user already has a password and wants to change it */}
              {hasExistingPassword && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      id="current-password-input"
                      type={showCurrentPassword ? 'text' : 'password'}
                      required
                      placeholder="Enter your current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Password */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  {hasExistingPassword ? 'New Password' : (!hasExistingPassword && hasGoogle ? 'Step 2: Choose Password' : 'Password')}
                </label>
                <div className="relative">
                  <input
                    id="new-password-input"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Confirm Password
                </label>
                <input
                  id="confirm-password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-red-800 text-xs">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{errorMessage}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting || isVerifyingGoogle}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="btn-save-created-password"
                  type="submit"
                  disabled={isSubmitting || isVerifyingGoogle}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>
                    {isSubmitting
                      ? 'Saving...'
                      : isVerifyingGoogle
                      ? 'Verifying...'
                      : hasExistingPassword
                      ? 'Update Password'
                      : 'Save Password'}
                  </span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
