import React, { useState } from 'react';
import { BrandLogo } from './BrandLogo';
import { 
  X, 
  CheckCircle, 
  CheckCircle2,
  ArrowRight, 
  ShieldCheck, 
  Sparkles, 
  KeyRound, 
  Flame, 
  AlertCircle, 
  ExternalLink,
  Lock
} from 'lucide-react';
import { 
  auth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail,
  googleProvider,
  signInWithPopup,
  formatFirebaseErrorMessage
} from '../firebase';
import { 
  fetchSignInMethodsForEmail, 
  GoogleAuthProvider, 
  linkWithCredential, 
  EmailAuthProvider,
  AuthCredential 
} from 'firebase/auth';
import { FirebaseConsoleModal } from './FirebaseConsoleModal';
import { useDevMode } from '../utils/devMode';
import { getAppPublicUrl } from '../utils/domainConfig';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (userName: string, emailOrPhone: string, isNewSetup: boolean, userId?: string) => void;
  onAuthSuccess?: (userName: string, emailOrPhone: string, isNewSetup: boolean, userId?: string) => void;
  onContinueOffline?: (name?: string) => void;
  initialMode?: 'login' | 'signup' | 'forgot';
  isDev?: boolean;
  currentUserEmail?: string | null;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onAuthSuccess,
  initialMode = 'login',
  isDev,
  currentUserEmail,
}) => {
  const { isDevOrOwner: hookIsDev } = useDevMode(currentUserEmail);
  const isDevOrOwner = isDev !== undefined ? isDev : hookIsDev;
  const triggerSuccess = onSuccess || onAuthSuccess || (() => {});
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>(initialMode);
  const [fullName, setFullName] = useState('');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Rich error state with actionable options
  const [errorDetails, setErrorDetails] = useState<{
    title: string;
    message: string;
    actionType?: 'enable_provider' | 'create_account' | 'login' | 'authorize_domain' | 'open_console' | 'continue_with_google' | 'link_password';
  } | null>(null);

  // Account linking state when Google sign-in encounters existing password account
  const [pendingGoogleCred, setPendingGoogleCred] = useState<AuthCredential | null>(null);
  const [linkingEmail, setLinkingEmail] = useState('');
  const [linkingPassword, setLinkingPassword] = useState('');
  const [isLinkingLoading, setIsLinkingLoading] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConsoleModalOpen, setIsConsoleModalOpen] = useState(false);

  if (!isOpen) return null;

  const normalizeEmail = (input: string) => {
    const trimmed = input.trim();
    if (trimmed.includes('@')) {
      return trimmed;
    }
    const sanitized = trimmed.replace(/[^a-zA-Z0-9]/g, '');
    return `${sanitized || 'owner'}@smartledger.app`;
  };

  const handleGoogleSignIn = async () => {
    setErrorDetails(null);
    setIsSubmitting(true);
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      const user = userCredential.user;

      // Update provider registry cache for instant detection across sessions
      try {
        if (user.email) {
          const providers = user.providerData.map((p) => p.providerId);
          localStorage.setItem(
            `smartledger_account_provider_${user.email.toLowerCase()}`,
            JSON.stringify({ providers })
          );
        }
      } catch {}

      setSuccessMessage(`✓ Signed in as ${user.displayName || user.email}!`);
      setTimeout(() => {
        setIsSubmitting(false);
        triggerSuccess(
          user.displayName || 'Business Owner',
          user.email || '',
          false,
          user.uid
        );
        onClose();
      }, 700);
    } catch (err: any) {
      setIsSubmitting(false);

      // Handle account linking: user already has an Email/Password account with the same email
      if (err.code === 'auth/account-exists-with-different-credential') {
        const email = err.customData?.email || err.email || emailOrPhone;
        const cred = GoogleAuthProvider.credentialFromError(err);
        setPendingGoogleCred(cred);
        setLinkingEmail(email);
        setErrorDetails({
          title: 'Link Your Google Account',
          message: `An account already exists for "${email}". Enter your account password to link your Google account to your business data.`,
          actionType: 'link_password',
        });
        return;
      }

      const formatted = formatFirebaseErrorMessage(err);
      setErrorDetails(formatted);
    }
  };

  const handleVerifyAndLinkAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkingPassword) {
      return;
    }
    setIsLinkingLoading(true);
    try {
      // 1. Authenticate with existing email and password
      const userCredential = await signInWithEmailAndPassword(auth, linkingEmail, linkingPassword);
      const user = userCredential.user;

      // 2. Link pending Google credential directly to the existing UID (Never creates duplicate UID!)
      if (pendingGoogleCred) {
        await linkWithCredential(user, pendingGoogleCred);
      }

      // 3. Update provider registry cache
      try {
        const providers = user.providerData.map((p) => p.providerId);
        if (!providers.includes('google.com')) providers.push('google.com');
        localStorage.setItem(
          `smartledger_account_provider_${linkingEmail.toLowerCase()}`,
          JSON.stringify({ providers })
        );
      } catch {}

      setSuccessMessage('✓ Google account successfully linked to your existing business ledger!');
      setTimeout(() => {
        setIsLinkingLoading(false);
        triggerSuccess(
          user.displayName || fullName || 'Business Owner',
          user.email || linkingEmail,
          false,
          user.uid
        );
        onClose();
      }, 800);
    } catch (linkErr: any) {
      setIsLinkingLoading(false);
      if (linkErr.code === 'auth/wrong-password' || linkErr.code === 'auth/invalid-credential') {
        setErrorDetails({
          title: 'Incorrect Password',
          message: 'The password entered does not match our records for this account.',
          actionType: 'link_password',
        });
      } else {
        setErrorDetails({
          title: 'Linking Error',
          message: linkErr.message || 'Failed to link Google credential. Please try again.',
          actionType: 'link_password',
        });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorDetails(null);
    setSuccessMessage('');
    setIsSubmitting(true);

    const emailValue = normalizeEmail(emailOrPhone);

    try {
      if (mode === 'signup') {
        if (!fullName.trim()) {
          setErrorDetails({
            title: 'Name Required',
            message: 'Please enter your full name or business owner name.',
          });
          setIsSubmitting(false);
          return;
        }
        if (!emailOrPhone.trim()) {
          setErrorDetails({
            title: 'Contact Required',
            message: 'Please enter an email or phone number.',
          });
          setIsSubmitting(false);
          return;
        }
        if (password.length < 6) {
          setErrorDetails({
            title: 'Password Too Short',
            message: 'Password must be at least 6 characters long.',
          });
          setIsSubmitting(false);
          return;
        }
        if (password !== confirmPassword) {
          setErrorDetails({
            title: 'Passwords Do Not Match',
            message: 'Please re-enter your password to ensure they match.',
          });
          setIsSubmitting(false);
          return;
        }

        let createdUid = '';
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, emailValue, password);
          createdUid = userCredential.user.uid;

          // Record provider in registry
          try {
            localStorage.setItem(
              `smartledger_account_provider_${emailValue.toLowerCase()}`,
              JSON.stringify({ providers: ['password'] })
            );
          } catch {}
        } catch (fbErr: any) {
          if (fbErr.code === 'auth/email-already-in-use') {
            // Check if this account was created with Google
            let isGoogleAccount = false;
            try {
              const methods = await fetchSignInMethodsForEmail(auth, emailValue);
              if (methods.includes('google.com')) {
                isGoogleAccount = true;
              }
            } catch {}

            if (isGoogleAccount) {
              setErrorDetails({
                title: 'Account Already Exists with Google',
                message: 'This email is already registered using Google Sign-In. Please sign in with Google, or switch to Log In.',
                actionType: 'continue_with_google',
              });
              setIsSubmitting(false);
              return;
            }

            setErrorDetails({
              title: 'Account Already Exists',
              message: `An account for "${emailOrPhone}" already exists. Please log in with your password.`,
              actionType: 'login',
            });
            setIsSubmitting(false);
            return;
          }

          const formatted = formatFirebaseErrorMessage(fbErr);
          setErrorDetails(formatted);
          setIsSubmitting(false);
          return;
        }

        setSuccessMessage('✓ Account created! Setting up your business ledger...');
        setTimeout(() => {
          setIsSubmitting(false);
          triggerSuccess(fullName, emailOrPhone, true, createdUid || auth.currentUser?.uid);
          onClose();
        }, 700);

      } else if (mode === 'login') {
        if (!emailOrPhone.trim()) {
          setErrorDetails({
            title: 'Input Required',
            message: 'Please enter your email or phone number.',
          });
          setIsSubmitting(false);
          return;
        }
        if (!password) {
          setErrorDetails({
            title: 'Password Required',
            message: 'Please enter your password.',
          });
          setIsSubmitting(false);
          return;
        }

        let loggedInUid = '';
        try {
          const userCredential = await signInWithEmailAndPassword(auth, emailValue, password);
          loggedInUid = userCredential.user.uid;

          // Update provider registry cache
          try {
            if (userCredential.user.email) {
              const providers = userCredential.user.providerData.map((p) => p.providerId);
              localStorage.setItem(
                `smartledger_account_provider_${userCredential.user.email.toLowerCase()}`,
                JSON.stringify({ providers })
              );
            }
          } catch {}
        } catch (fbErr: any) {
          // CRITICAL: Check if this account was created with Google and has no password credential!
          let isGoogleOnly = false;
          try {
            const methods = await fetchSignInMethodsForEmail(auth, emailValue);
            if (methods.includes('google.com') && !methods.includes('password')) {
              isGoogleOnly = true;
            }
          } catch {}

          if (!isGoogleOnly) {
            try {
              const cached = localStorage.getItem(`smartledger_account_provider_${emailValue.toLowerCase()}`);
              if (cached) {
                const parsed = JSON.parse(cached);
                if (parsed.providers?.includes('google.com') && !parsed.providers?.includes('password')) {
                  isGoogleOnly = true;
                }
              }
            } catch {}
          }

          if (isGoogleOnly) {
            setErrorDetails({
              title: 'Google Sign-In Account',
              message: 'This account uses Google Sign-In. Please continue with Google, or create a password from your account settings.',
              actionType: 'continue_with_google',
            });
            setIsSubmitting(false);
            return;
          }

          // Exact, clean error message (No "No Account Found or Password Incorrect" confusion!)
          if (fbErr.code === 'auth/wrong-password' || fbErr.code === 'auth/invalid-credential') {
            setErrorDetails({
              title: 'Login Failed',
              message: 'Email or password is incorrect.',
            });
            setIsSubmitting(false);
            return;
          }

          if (fbErr.code === 'auth/user-not-found') {
            setErrorDetails({
              title: 'No Account Found',
              message: `No account exists for "${emailOrPhone}". Click below to create an account in 1 click.`,
              actionType: 'create_account',
            });
            setIsSubmitting(false);
            return;
          }

          const formatted = formatFirebaseErrorMessage(fbErr);
          setErrorDetails(formatted);
          setIsSubmitting(false);
          return;
        }

        setSuccessMessage('✓ Logged in! Loading your business ledger...');
        setTimeout(() => {
          setIsSubmitting(false);
          const name = fullName.trim() || auth.currentUser?.displayName || 'Business Owner';
          triggerSuccess(name, emailOrPhone, false, loggedInUid || auth.currentUser?.uid);
          onClose();
        }, 600);

      } else if (mode === 'forgot') {
        // Secure, standard password reset flow
        if (!emailOrPhone.trim()) {
          setErrorDetails({
            title: 'Email Required',
            message: 'Please enter your registered email address.',
          });
          setIsSubmitting(false);
          return;
        }

        try {
          if (emailValue.includes('@')) {
            const publicUrl = getAppPublicUrl();
            try {
              // Attempt to direct the reset link back to the custom/canonical app URL
              await sendPasswordResetEmail(auth, emailValue, {
                url: publicUrl,
                handleCodeInApp: false,
              });
            } catch {
              // Fallback to standard Firebase reset flow if custom domain is not yet verified in console
              await sendPasswordResetEmail(auth, emailValue);
            }
          }
          setSuccessMessage('✓ Password reset link sent! Check your email inbox for instructions to reset your password.');
        } catch (fbErr: any) {
          if (fbErr.code === 'auth/invalid-email') {
            setErrorDetails({
              title: 'Invalid Email Format',
              message: 'Please enter a valid email address (e.g. owner@business.com).',
            });
            setIsSubmitting(false);
            return;
          }

          // Check if it's a Google-only account
          let isGoogleOnly = false;
          try {
            const methods = await fetchSignInMethodsForEmail(auth, emailValue);
            if (methods.includes('google.com') && !methods.includes('password')) {
              isGoogleOnly = true;
            }
          } catch {}

          if (isGoogleOnly) {
            setErrorDetails({
              title: 'Google Account',
              message: 'This account uses Google Sign-In and does not have a password yet. Please continue with Google or set a password in Settings.',
              actionType: 'continue_with_google',
            });
            setIsSubmitting(false);
            return;
          }

          // Standard OWASP protection: show clean confirmation without revealing user existence
          setSuccessMessage('✓ If an account matches this email, instructions to reset your password have been sent.');
        }

        setTimeout(() => {
          setIsSubmitting(false);
        }, 1200);
      }
    } catch (err: any) {
      setErrorDetails(formatFirebaseErrorMessage(err));
      setIsSubmitting(false);
    }
  };

  const handleCreateAccountInstead = () => {
    setMode('signup');
    setErrorDetails(null);
    if (!fullName && emailOrPhone) {
      const suggestedName = emailOrPhone.includes('@') ? emailOrPhone.split('@')[0] : 'Business Owner';
      setFullName(suggestedName.charAt(0).toUpperCase() + suggestedName.slice(1));
    }
    if (password && !confirmPassword) {
      setConfirmPassword(password);
    }
  };

  return (
    <>
      <div 
        id="smartledger-auth-modal" 
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in overflow-y-auto"
      >
        <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-4">
          {/* Modal Header */}
          <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
            <BrandLogo size="sm" lightMode={true} tagline={false} />
            <button
              id="auth-modal-close-btn"
              type="button"
              onClick={onClose}
              className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 sm:p-8">
            {successMessage ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 font-['Outfit',sans-serif]">{successMessage}</h3>
                <p className="text-sm text-slate-500">Preparing your business ledger...</p>
              </div>
            ) : (
              <>
                {mode === 'signup' && (
                  <div className="mb-5">
                    <h2 className="text-2xl font-bold text-slate-900 font-['Outfit',sans-serif]">Create your account</h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Your business records are isolated and protected in Cloud Firestore.
                    </p>
                  </div>
                )}

                {mode === 'login' && (
                  <div className="mb-5">
                    <h2 className="text-2xl font-bold text-slate-900 font-['Outfit',sans-serif]">Welcome Back 👋</h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Log in to access your sales, debts, inventory, and reports.
                    </p>
                  </div>
                )}

                {mode === 'forgot' && (
                  <div className="mb-5">
                    <h2 className="text-2xl font-bold text-slate-900 font-['Outfit',sans-serif]">Reset Password</h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Enter your registered email address to receive secure reset instructions.
                    </p>
                  </div>
                )}

                {/* Google 1-Click Sign-in Button */}
                {mode !== 'forgot' && (
                  <div className="space-y-3 mb-4">
                    <button
                      type="button"
                      id="auth-google-signin-btn"
                      onClick={handleGoogleSignIn}
                      disabled={isSubmitting}
                      className="w-full py-2.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-sm transition-all cursor-pointer"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
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
                      <span>Continue with Google</span>
                    </button>

                    <div className="relative flex items-center justify-center">
                      <div className="border-t border-slate-200 w-full" />
                      <span className="bg-white px-2.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Or use email
                      </span>
                      <div className="border-t border-slate-200 w-full" />
                    </div>
                  </div>
                )}

                {/* Helpful Actionable Error Box */}
                {errorDetails && (
                  <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl space-y-2">
                    <div className="flex items-start gap-2 text-red-800">
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" />
                      <div>
                        <h4 className="text-xs font-bold">{errorDetails.title}</h4>
                        <p className="text-xs text-red-700 mt-0.5 leading-relaxed">{errorDetails.message}</p>
                      </div>
                    </div>

                    {/* Action button: Continue with Google */}
                    {errorDetails.actionType === 'continue_with_google' && (
                      <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        disabled={isSubmitting}
                        className="w-full mt-2 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                          <path
                            fill="#ffffff"
                            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                          />
                        </svg>
                        <span>Continue with Google</span>
                      </button>
                    )}

                    {/* Action button: Link Password Credential */}
                    {errorDetails.actionType === 'link_password' && (
                      <form onSubmit={handleVerifyAndLinkAccount} className="mt-2 space-y-2 pt-2 border-t border-red-200">
                        <label className="block text-[11px] font-bold text-slate-800">
                          Password for {linkingEmail}:
                        </label>
                        <input
                          type="password"
                          required
                          placeholder="Enter your account password"
                          value={linkingPassword}
                          onChange={(e) => setLinkingPassword(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <button
                          type="submit"
                          disabled={isLinkingLoading}
                          className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Lock className="w-3 h-3" />
                          <span>{isLinkingLoading ? 'Verifying...' : 'Verify & Link Google Account'}</span>
                        </button>
                      </form>
                    )}

                    {errorDetails.actionType === 'create_account' && (
                      <button
                        type="button"
                        onClick={handleCreateAccountInstead}
                        className="w-full mt-1.5 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <span>Create Account with "{emailOrPhone}"</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}

                    {errorDetails.actionType === 'login' && (
                      <button
                        type="button"
                        onClick={() => { setMode('login'); setErrorDetails(null); }}
                        className="w-full mt-1.5 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <span>Switch to Log In</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}

                    {errorDetails.actionType === 'enable_provider' && isDevOrOwner && (
                      <div className="space-y-1.5 mt-2">
                        <button
                          type="button"
                          onClick={() => setIsConsoleModalOpen(true)}
                          className="w-full py-1.5 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Flame className="w-3.5 h-3.5 fill-white" />
                          <span>Open Firebase Console Fix Guide</span>
                        </button>
                      </div>
                    )}

                    {errorDetails.actionType === 'authorize_domain' && isDevOrOwner && (
                      <button
                        type="button"
                        onClick={() => setIsConsoleModalOpen(true)}
                        className="w-full mt-1.5 py-1.5 px-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <span>How to Authorize Domain in Firebase</span>
                      </button>
                    )}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3.5">
                  {mode === 'signup' && (
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                        Full name
                      </label>
                      <input
                        id="signup-fullname"
                        type="text"
                        required
                        placeholder="e.g. John Mukamana"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-xs sm:text-sm font-medium text-slate-900"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                      {mode === 'forgot' ? 'Registered Email Address' : 'Email or Phone'}
                    </label>
                    <input
                      id="auth-email-phone"
                      type={mode === 'forgot' ? 'email' : 'text'}
                      required
                      placeholder={mode === 'forgot' ? 'e.g. owner@business.com' : 'e.g. owner@business.com or 0788 123 456'}
                      value={emailOrPhone}
                      onChange={(e) => setEmailOrPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-xs sm:text-sm font-medium text-slate-900"
                    />
                  </div>

                  {/* Password fields are NOT shown in forgot mode */}
                  {mode !== 'forgot' && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                          Password
                        </label>
                        {mode === 'login' && (
                          <button
                            type="button"
                            id="auth-forgot-password-link"
                            onClick={() => { setMode('forgot'); setErrorDetails(null); }}
                            className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer"
                          >
                            Forgot Password?
                          </button>
                        )}
                      </div>
                      <input
                        id="auth-password"
                        type="password"
                        required
                        placeholder="At least 6 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-xs sm:text-sm font-medium text-slate-900"
                      />
                    </div>
                  )}

                  {mode === 'signup' && (
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                        Confirm password
                      </label>
                      <input
                        id="auth-confirm-password"
                        type="password"
                        required
                        placeholder="Re-enter password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-xs sm:text-sm font-medium text-slate-900"
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    id="auth-submit-btn"
                    disabled={isSubmitting}
                    className="w-full mt-2 py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs sm:text-sm tracking-wide shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <span>
                      {mode === 'signup' && (isSubmitting ? 'Creating Account...' : 'Create Account')}
                      {mode === 'login' && (isSubmitting ? 'Logging In...' : 'Log In')}
                      {mode === 'forgot' && (isSubmitting ? 'Sending Link...' : 'Send Password Reset Link')}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>

                {/* Switcher */}
                <div className="mt-5 pt-4 border-t border-slate-100 text-center space-y-3">
                  {mode === 'login' && (
                    <p className="text-xs sm:text-sm text-slate-600">
                      Don't have an account?{' '}
                      <button
                        type="button"
                        id="switch-to-signup-btn"
                        onClick={() => { setMode('signup'); setErrorDetails(null); }}
                        className="font-bold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer"
                      >
                        Create Account
                      </button>
                    </p>
                  )}
                  {mode === 'signup' && (
                    <p className="text-xs sm:text-sm text-slate-600">
                      Already have an account?{' '}
                      <button
                        type="button"
                        id="switch-to-login-btn"
                        onClick={() => { setMode('login'); setErrorDetails(null); }}
                        className="font-bold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer"
                      >
                        Log In
                      </button>
                    </p>
                  )}
                  {mode === 'forgot' && (
                    <button
                      type="button"
                      onClick={() => { setMode('login'); setErrorDetails(null); }}
                      className="text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 hover:underline cursor-pointer"
                    >
                      Back to Log In
                    </button>
                  )}

                  {/* Firebase Console Connection Helper Link (Restricted to Owner/Dev) */}
                  {isDevOrOwner && (
                    <div className="pt-2 flex flex-col items-center gap-2">
                      <button
                        type="button"
                        id="auth-open-console-guide-btn"
                        onClick={() => setIsConsoleModalOpen(true)}
                        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-amber-700 transition-colors cursor-pointer"
                      >
                        <Flame className="w-3.5 h-3.5 text-amber-500" />
                        <span>Trouble logging in? Connect Firebase Console Guide</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Firebase Console Setup Modal */}
      <FirebaseConsoleModal
        isOpen={isConsoleModalOpen}
        onClose={() => setIsConsoleModalOpen(false)}
      />
    </>
  );
};
export default AuthModal;
