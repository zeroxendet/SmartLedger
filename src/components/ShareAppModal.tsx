import React, { useState } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Smartphone,
  Globe
} from 'lucide-react';
import { getAppPublicUrl } from '../utils/domainConfig';

interface ShareAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  sharedUrl?: string;
  businessName?: string;
  businessId?: string;
  currentUser?: any;
  isOwner?: boolean;
}

export const ShareAppModal: React.FC<ShareAppModalProps> = ({
  isOpen,
  onClose,
  sharedUrl,
  businessName = 'SmartLedger',
}) => {
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const appUrl = sharedUrl || getAppPublicUrl();
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(appUrl)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(appUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: businessName,
          text: `Open ${businessName} on SmartLedger:`,
          url: appUrl,
        });
      } catch {
        // User cancelled or failed
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold font-['Outfit',sans-serif] text-slate-900">
                Share SmartLedger
              </h3>
              <p className="text-xs text-slate-500">
                Open on another phone, tablet, or desktop
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Application Web Link:
            </label>
            <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-2xl">
              <Globe className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
              <input
                type="text"
                readOnly
                value={appUrl}
                className="flex-1 bg-transparent text-xs font-mono text-slate-800 outline-none select-all truncate px-1"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center justify-center space-y-2 py-2">
            <div className="p-3 bg-white border-2 border-slate-200 rounded-2xl shadow-xs">
              <img
                src={qrCodeUrl}
                alt="App QR Code"
                className="w-40 h-40 object-contain rounded-lg"
              />
            </div>
            <p className="text-[11px] text-center font-medium text-slate-500 max-w-xs">
              Scan code with your mobile camera to open SmartLedger instantly.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleNativeShare}
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>Share App Link</span>
            </button>
            <a
              href={appUrl}
              target="_blank"
              rel="noreferrer"
              className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center transition-colors cursor-pointer"
              title="Open in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 px-6">
          <div className="flex items-center gap-1">
            <Smartphone className="w-3.5 h-3.5 text-slate-400" />
            <span>Works on iOS, Android, and Desktop</span>
          </div>
          <span className="font-semibold text-emerald-700">Ready to Install</span>
        </div>
      </div>
    </div>
  );
};
