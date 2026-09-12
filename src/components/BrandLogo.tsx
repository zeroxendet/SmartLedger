import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  tagline?: boolean;
  lightMode?: boolean;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showText = true,
  tagline = false,
  lightMode = false,
  className = '',
}) => {
  const iconDimensions = {
    sm: 'w-7 h-7',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  }[size];

  const titleSize = {
    sm: 'text-base font-bold',
    md: 'text-xl font-extrabold',
    lg: 'text-3xl font-extrabold',
    xl: 'text-4xl font-extrabold',
  }[size];

  const subtitleSize = {
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm font-medium',
    xl: 'text-base font-medium',
  }[size];

  return (
    <div className={`flex items-center gap-3 ${className}`} id="smartledger-brand-logo">
      {/* Icon: Letter S, Ledger Sheet Shape & Upward Growth Arrow */}
      <div className={`relative flex-shrink-0 ${iconDimensions} rounded-xl shadow-sm overflow-hidden flex items-center justify-center bg-slate-900 border border-slate-800`}>
        <svg
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full p-1"
        >
          {/* Subtle ledger page fold / background */}
          <path
            d="M16 12H44C46.2091 12 48 13.7909 48 16V48C48 50.2091 46.2091 52 44 52H16C13.7909 52 12 50.2091 12 48V16C12 13.7909 13.7909 12 16 12Z"
            fill="#1e293b"
            stroke="#334155"
            strokeWidth="2"
          />
          {/* Ledger ruled line accents */}
          <line x1="20" y1="20" x2="36" y2="20" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 3" />
          <line x1="20" y1="44" x2="38" y2="44" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" />

          {/* Bold S character */}
          <path
            d="M36 25C36 21.5 32.5 19 28 19C23.5 19 20 22 20 25.5C20 31.5 38 29.5 38 37C38 41.5 33.5 44 28 44C22.5 44 19.5 40.5 19 37.5"
            stroke="#FFFFFF"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Upward Growth Arrow (Emerald Green) */}
          <path
            d="M37 18H47M47 18V28M47 18L35 30"
            stroke="#10B981"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Brand Typography */}
      {showText && (
        <div className="flex flex-col leading-tight">
          <div className="flex items-center tracking-tight">
            <span className={`${titleSize} font-['Outfit',sans-serif] ${lightMode ? 'text-white' : 'text-slate-900'}`}>
              Smart
            </span>
            <span className={`${titleSize} font-['Outfit',sans-serif] text-emerald-600`}>
              Ledger
            </span>
          </div>
          {tagline && (
            <span className={`${subtitleSize} tracking-normal ${lightMode ? 'text-slate-300' : 'text-slate-500'}`}>
              Your Business. Made Simple.
            </span>
          )}
        </div>
      )}
    </div>
  );
};
