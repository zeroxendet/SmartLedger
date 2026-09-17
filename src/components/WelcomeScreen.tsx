import React, { useState } from 'react';
import { BrandLogo } from './BrandLogo';
import { 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  Shield, 
  TrendingUp, 
  Cloud, 
  Lock, 
  Flame, 
  Code2,
  Eye
} from 'lucide-react';
import { firebaseConfig } from '../firebase';
import { useDevMode } from '../utils/devMode';

interface WelcomeScreenProps {
  onCreateAccount: () => void;
  onLogin: () => void;
  onOpenFirebaseConsole: () => void;
  onContinueOffline?: () => void;
  isDev?: boolean;
  currentUserEmail?: string | null;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onCreateAccount,
  onLogin,
  onOpenFirebaseConsole,
  onContinueOffline,
  isDev,
  currentUserEmail,
}) => {
  const { isDevOrOwner: hookIsDev, toggleDevMode } = useDevMode(currentUserEmail);
  const isDevOrOwner = isDev !== undefined ? isDev : hookIsDev;
  const [clickCount, setClickCount] = useState(0);

  // Secret activation: clicking the copyright 5 times toggles dev mode
  const handleCopyrightClick = () => {
    const next = clickCount + 1;
    setClickCount(next);
    if (next >= 5) {
      toggleDevMode();
      setClickCount(0);
    }
  };

  return (
    <div 
      id="smartledger-welcome-screen"
      className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 text-white flex flex-col justify-between p-6 sm:p-10 relative"
    >
      {/* Developer Mode Floating Indicator for Owner */}
      {isDevOrOwner && (
        <div className="fixed bottom-4 left-4 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-medium backdrop-blur-md shadow-lg">
          <Code2 className="w-3.5 h-3.5 text-amber-400" />
          <span>Owner / Dev Mode</span>
          <button
            onClick={toggleDevMode}
            title="Preview clean customer landing page"
            className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 transition-colors cursor-pointer inline-flex items-center gap-1"
          >
            <Eye className="w-2.5 h-2.5" />
            <span>Test Customer View</span>
          </button>
        </div>
      )}

      {/* Top Brand Bar */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between">
        <BrandLogo size="md" lightMode={true} tagline={true} />
        <div className="flex items-center gap-2 sm:gap-3">
          {/* 1. Developer UI: Top navigation yellow badge (Restricted to Owner/Dev) */}
          {isDevOrOwner && (
            <button
              id="welcome-firebase-console-btn"
              onClick={onOpenFirebaseConsole}
              title="Firebase Console Setup & Diagnostics"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-500/40 bg-amber-950/40 hover:bg-amber-900/40 text-amber-300 text-xs font-semibold transition-all cursor-pointer"
            >
              <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span className="hidden sm:inline">Firebase Console</span>
              <span className="text-[10px] text-amber-400 font-mono">({firebaseConfig.projectId})</span>
            </button>
          )}

          <button
            id="welcome-login-top-btn"
            onClick={onLogin}
            className="px-4 py-1.5 rounded-full border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-200 text-xs font-semibold transition-all cursor-pointer"
          >
            Log In
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-2xl mx-auto text-center my-auto py-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-emerald-400 text-xs font-semibold mb-6">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Multi-User Cloud Business Platform</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight font-['Outfit',sans-serif] leading-tight mb-4">
          Welcome to <span className="text-white">Smart</span><span className="text-emerald-400">Ledger</span>
        </h1>

        <p className="text-lg sm:text-xl text-slate-300 font-medium max-w-xl mx-auto mb-8 leading-relaxed">
          Run your private business with ease &mdash; sales, customer debts, and inventory.
        </p>

        {/* Value Prop Highlights */}
        {/* 5. Developer UI: "Private Workspaces" feature card restricted to Owner/Dev */}
        <div className={`grid grid-cols-1 ${isDevOrOwner ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-3 max-w-xl mx-auto mb-8 text-left`}>
          {isDevOrOwner && (
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <Lock className="w-4 h-4 text-emerald-400 mb-1.5" />
              <p className="text-xs font-bold text-slate-200">Private Workspaces</p>
              <p className="text-[11px] text-slate-400">Your data is isolated and protected in Cloud Firestore</p>
            </div>
          )}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <TrendingUp className="w-4 h-4 text-emerald-400 mb-1.5" />
            <p className="text-xs font-bold text-slate-200">Track Cash & Debts</p>
            <p className="text-[11px] text-slate-400">Live profit, customer credit, and supplier payables</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <Sparkles className="w-4 h-4 text-emerald-400 mb-1.5" />
            <p className="text-xs font-bold text-slate-200">AI Business Partner</p>
            <p className="text-[11px] text-slate-400">Instant answers on margins, cashflow, and stock</p>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto mb-3">
          <button
            id="welcome-create-account-btn"
            onClick={onCreateAccount}
            className="w-full sm:w-auto flex-1 py-3.5 px-8 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base shadow-lg shadow-emerald-950/50 hover:shadow-emerald-900/60 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Create Account</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            id="welcome-login-btn"
            onClick={onLogin}
            className="w-full sm:w-auto flex-1 py-3.5 px-8 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white font-bold text-base border border-slate-700 transition-all flex items-center justify-center cursor-pointer"
          >
            <span>Log In</span>
          </button>
        </div>

        {/* 3. Developer UI: Yellow link "Connect Firebase Console Guide" (Restricted to Owner/Dev) */}
        {isDevOrOwner && (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-xs text-slate-400 pt-1">
            <button
              onClick={onOpenFirebaseConsole}
              className="inline-flex items-center gap-1.5 text-amber-400 hover:text-amber-300 transition-colors cursor-pointer font-medium"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Connect Firebase Console Guide</span>
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl mx-auto text-center py-4 border-t border-slate-900 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span 
          onClick={handleCopyrightClick}
          className="cursor-pointer select-none transition-colors hover:text-slate-400"
          title="SmartLedger — Your Business. Made Simple."
        >
          SmartLedger &copy; {new Date().getFullYear()} — Your Business. Made Simple.
        </span>
        <div className="flex items-center gap-3">
          {/* 4. Developer UI: Footer link "Firebase Settings" (Restricted to Owner/Dev) */}
          {isDevOrOwner && (
            <>
              <button
                onClick={onOpenFirebaseConsole}
                className="text-slate-400 hover:text-white underline cursor-pointer"
              >
                Firebase Settings
              </button>
              <span>&bull;</span>
            </>
          )}
          <span className="text-slate-400 flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-emerald-400 inline" />
            Protected by Cloud Firestore Rules
          </span>
        </div>
      </footer>
    </div>
  );
};
export default WelcomeScreen;
