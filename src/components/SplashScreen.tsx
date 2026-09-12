import React, { useEffect } from 'react';
import { BrandLogo } from './BrandLogo';
import { ArrowRight } from 'lucide-react';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 1800);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div 
      id="smartledger-splash-screen"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 text-white p-6 selection:bg-emerald-500 selection:text-white"
    >
      <div className="flex flex-col items-center text-center max-w-sm animate-fade-in">
        {/* Large Logo */}
        <div className="mb-6 transform hover:scale-105 transition-transform duration-300">
          <BrandLogo size="xl" showText={false} />
        </div>

        {/* Brand Text */}
        <h1 className="text-4xl font-extrabold tracking-tight font-['Outfit',sans-serif] mb-2">
          <span>Smart</span>
          <span className="text-emerald-400">Ledger</span>
        </h1>
        
        <p className="text-slate-300 text-lg font-medium tracking-wide mb-8">
          Your Business. Made Simple.
        </p>

        {/* Loading Indicator with Growth Dots */}
        <div className="flex items-center gap-2 mb-10">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse delay-150"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse delay-300"></div>
        </div>

        {/* Quick Skip button */}
        <button
          id="splash-skip-btn"
          onClick={onFinish}
          className="px-5 py-2 rounded-full border border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <span>Continue</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="absolute bottom-6 text-center text-xs text-slate-500">
        Run your business without complicated accounting
      </div>
    </div>
  );
};
