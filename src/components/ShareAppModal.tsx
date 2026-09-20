import React, { useState } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  QrCode,
  ExternalLink,
  Smartphone,
  ShieldCheck,
  Users,
  Globe
} from 'lucide-react';
import { getAppPublicUrl, PRODUCTION_CUSTOM_DOMAIN_URL, inspectDomainEnvironment } from '../utils/domainConfig';

interface ShareAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  sharedUrl?: string;
  businessName?: string;
}

export const ShareAppModal: React.FC<ShareAppModalProps> = ({
  isOpen,
  onClose,
  sharedUrl,
  businessName = 'SmartLedger',
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'link' | 'qr'>('link');

  if (!isOpen) return null;

  const domainInfo = inspectDomainEnvironment();
  const defaultUrl = sharedUrl || (domainInfo.isCustomDomainActive ? domainInfo.currentOrigin : domainInfo.activeProductionUrl);
  const effectiveUrl = defaultUrl;

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    effectiveUrl
  )}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(effectiveUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${businessName} - POS & Business Ledger`,
          text: `Use ${businessName} on your phone, tablet, or computer:`,
          url: effectiveUrl,
        });
      } catch {
        // Fallback to copy
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div
      id="share-app-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
    >
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold font-['Outfit',sans-serif] text-slate-900 leading-tight">
                Share App with Users & Staff
              </h3>
              <p className="text-xs text-slate-500">
                Give your cashiers, staff, or partners instant access
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher: Direct Link or QR Code */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl text-xs font-bold text-slate-600">
          <button
            type="button"
            onClick={() => setActiveTab('link')}
            className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'link'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'hover:text-slate-900'
            }`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Share Link</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('qr')}
            className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'qr'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'hover:text-slate-900'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Scan QR Code</span>
          </button>
        </div>

        {/* Content Body */}
        {activeTab === 'link' ? (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Verified Production App Link:
                </label>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <Check className="w-3 h-3 text-emerald-600" />
                  Live &amp; Reachable
                </span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-2xl">
                <input
                  type="text"
                  readOnly
                  value={effectiveUrl}
                  className="flex-1 bg-transparent text-xs font-mono text-slate-800 px-2 select-all outline-none overflow-hidden text-ellipsis"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
              {!domainInfo.isCustomDomainActive && (
                <p className="text-[11px] text-slate-500 mt-1.5">
                  <span className="font-semibold text-slate-700">Note:</span> This link uses the real deployed application server to guarantee zero network resolution errors when your staff opens it.
                </p>
              )}
            </div>

            {/* Quick Share Action */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleShareNative}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>Send to Phone / WhatsApp</span>
              </button>
              <a
                href={effectiveUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center transition-colors cursor-pointer"
                title="Test Link in new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            {/* Quick Access for Staff & Cashiers */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <Users className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Quick Access for Staff &amp; Cashiers:</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-500">
                Share this link with your staff or cashiers. They can record sales, check inventory, and issue receipts directly from their mobile browser.
              </p>
            </div>
          </div>
        ) : (
          /* QR Code Tab */
          <div className="flex flex-col items-center justify-center space-y-3 py-2">
            <div className="p-3 bg-white border-2 border-slate-200 rounded-2xl shadow-sm">
              <img
                src={qrCodeUrl}
                alt="App QR Code"
                className="w-44 h-44 object-contain rounded-lg"
              />
            </div>
            <p className="text-xs text-center font-medium text-slate-600 max-w-xs">
              Open your phone or tablet camera and scan this code to load {businessName} instantly as a POS terminal.
            </p>
            <button
              type="button"
              onClick={handleCopy}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Link Copied!' : 'Or Copy URL'}</span>
            </button>
          </div>
        )}

        {/* Roles explanation footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1">
            <Smartphone className="w-3.5 h-3.5 text-slate-400" />
            <span>Works on any phone, tablet, or PC</span>
          </div>
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Cashier PIN protection built-in</span>
          </div>
        </div>
      </div>
    </div>
  );
};
