import React, { useState } from 'react';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, X, ShieldCheck } from 'lucide-react';
import { createPasswordForCurrentUser } from '../firebase';

interface CreatePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
  hasExistingPassword?: boolean;
  onPasswordCreated?: () => void;
}

export const CreatePasswordModal: React.FC<CreatePasswordModalProps> = ({
  isOpen,
  onClose,
  userEmail,
  hasExistingPassword = false,
  onPasswordCreated,
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please check and try again.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createPasswordForCurrentUser(password);
      if (res.success) {
        setSuccessMessage(
          hasExistingPassword
            ? '✓ Password updated successfully!'
            : '✓ Password created! You can now sign in using either Google or your email and password.'
        );
        setPassword('');
        setConfirmPassword('');
        if (onPasswordCreated) onPasswordCreated();
        setTimeout(() => {
          setIsSubmitting(false);
          setSuccessMessage(null);
          onClose();
        }, 2000);
      } else {
        const msg = res.error?.message || 'Failed to create password. Please try again.';
        if (res.error?.code === 'auth/requires-recent-login') {
          setErrorMessage('For security, please log in with Google again before setting a new password.');
        } else if (res.error?.code === 'auth/weak-password') {
          setErrorMessage('Password is too weak. Please use at least 6 characters with letters and numbers.');
        } else {
          setErrorMessage(msg);
        }
        setIsSubmitting(false);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
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
                {hasExistingPassword ? 'Change Password' : 'Create Password for Email Login'}
              </h3>
              <p className="text-[11px] text-slate-400">Account Security &amp; Access</p>
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
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-slate-900">Success!</h4>
              <p className="text-xs text-slate-600 max-w-xs mx-auto leading-relaxed">
                {successMessage}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-900 leading-relaxed font-medium">
                  {hasExistingPassword
                    ? 'Enter a new password below to update your email/password sign-in credential.'
                    : 'You can create a password so you can also sign in with your email and password.'}
                </p>
              </div>

              {/* Email (Read-only) */}
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

              {/* Password */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  {hasExistingPassword ? 'New Password' : 'Password'}
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
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="btn-save-created-password"
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Saving...' : hasExistingPassword ? 'Update Password' : 'Save Password'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
