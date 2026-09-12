import React, { useState } from 'react';
import { BusinessProfile, BusinessType, CurrencyCode } from '../types';
import { BrandLogo } from './BrandLogo';
import { 
  ArrowRight, 
  Sparkles, 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Image as ImageIcon,
  User,
  DollarSign,
  ShieldCheck
} from 'lucide-react';

interface BusinessSetupWizardProps {
  userId?: string;
  ownerName: string;
  ownerEmailOrPhone: string;
  onComplete: (profile: BusinessProfile) => void;
}

const BUSINESS_TYPES: { type: BusinessType; icon: string; label: string }[] = [
  { type: 'Bakery', icon: '🥖', label: 'Bakery & Pastries' },
  { type: 'Grocery', icon: '🛒', label: 'Grocery / Supermarket' },
  { type: 'Restaurant', icon: '🍔', label: 'Restaurant / Cafe' },
  { type: 'Boutique', icon: '👗', label: 'Boutique / Fashion' },
  { type: 'Pharmacy', icon: '💊', label: 'Pharmacy / Health' },
  { type: 'Electronics', icon: '📱', label: 'Electronics & Repairs' },
  { type: 'Hardware', icon: '🔧', label: 'Hardware Store' },
  { type: 'Salon/Barbershop', icon: '✂️', label: 'Salon / Barbershop' },
  { type: 'Other', icon: '📦', label: 'General Retail / Other' },
];

const CURRENCY_OPTIONS: { code: CurrencyCode; label: string; symbol: string }[] = [
  { code: 'RWF', label: 'Rwanda Franc', symbol: 'RWF' },
  { code: 'USD', label: 'US Dollar', symbol: '$' },
  { code: 'EUR', label: 'Euro', symbol: '€' },
  { code: 'GBP', label: 'British Pound', symbol: '£' },
  { code: 'KES', label: 'Kenya Shilling', symbol: 'KSh' },
  { code: 'UGX', label: 'Uganda Shilling', symbol: 'USh' },
  { code: 'NGN', label: 'Nigerian Naira', symbol: '₦' },
  { code: 'ZAR', label: 'South African Rand', symbol: 'R' },
];

export const BusinessSetupWizard: React.FC<BusinessSetupWizardProps> = ({
  userId,
  ownerName: initialOwnerName,
  ownerEmailOrPhone,
  onComplete,
}) => {
  const [step, setStep] = useState<number>(1); // 1: Business Identity, 2: Type, 3: Currency & Contact, 4: Credit Preferences, 5: Confirmation
  
  // Form State - strictly zero demo defaults
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState<BusinessType>('Grocery');
  const [ownerName, setOwnerName] = useState(initialOwnerName || '');
  const [phone, setPhone] = useState(ownerEmailOrPhone.includes('@') ? '' : ownerEmailOrPhone);
  const [email, setEmail] = useState(ownerEmailOrPhone.includes('@') ? ownerEmailOrPhone : '');
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [address, setAddress] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [allowCustomerCredit, setAllowCustomerCredit] = useState<boolean>(true);
  const [allowSupplierCredit, setAllowSupplierCredit] = useState<boolean>(true);

  const handleFinish = () => {
    const newProfile: BusinessProfile = {
      id: userId ? `biz_${userId}` : `biz_${Date.now()}`,
      userId: userId || '',
      name: businessName.trim() || `${ownerName || 'My'}'s Business`,
      type: businessType,
      currency,
      allowCustomerCredit,
      allowSupplierCredit,
      ownerName: ownerName.trim() || 'Business Owner',
      ownerEmailOrPhone: email || phone || ownerEmailOrPhone,
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      logoUrl: logoUrl.trim(),
      isBakeryMode: businessType === 'Bakery',
      beginnerMode: true,
      createdAt: new Date().toISOString(),
    };
    onComplete(newProfile);
  };

  return (
    <div 
      id="smartledger-business-setup-wizard"
      className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 selection:bg-emerald-500 selection:text-white"
    >
      <div className="w-full max-w-xl bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden animate-fade-in">
        {/* Progress Bar Header */}
        <div className="bg-slate-900 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <BrandLogo size="sm" lightMode={true} tagline={false} />
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <span>Step {step} of 5</span>
            <div className="flex gap-1 ml-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <div
                  key={s}
                  className={`w-3.5 h-1 rounded-full transition-all ${
                    s <= step ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Wizard Container */}
        <div className="p-6 sm:p-8">
          {/* STEP 1 — Business Identity */}
          {step === 1 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider">
                  Create Your Business Profile
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold font-['Outfit',sans-serif] text-white mt-1">
                  What is your business name?
                </h2>
                <p className="text-slate-400 text-sm mt-0.5">
                  Set up your private, multi-user workspace in Cloud Firestore.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Business Name *</span>
                  </label>
                  <input
                    id="setup-business-name"
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. John's Bakery, Nairobi Fresh Mart, Kigali Electronics"
                    className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Owner Name *</span>
                  </label>
                  <input
                    id="setup-owner-name"
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="Your full name (e.g. John Doe)"
                    className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              <button
                id="setup-step1-continue"
                type="button"
                onClick={() => setStep(2)}
                disabled={!businessName.trim() || !ownerName.trim()}
                className="w-full py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
              >
                <span>Continue to Business Type</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP 2 — Business Type */}
          {step === 2 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider">Step 2 of 5</span>
                <h2 className="text-2xl sm:text-3xl font-extrabold font-['Outfit',sans-serif] text-white mt-1">
                  What type of business do you run?
                </h2>
                <p className="text-slate-400 text-sm mt-0.5">
                  Tailors your inventory units, sales receipts, and operational trackers.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
                {BUSINESS_TYPES.map((bt) => {
                  const isSelected = businessType === bt.type;
                  return (
                    <button
                      key={bt.type}
                      type="button"
                      id={`biz-type-${bt.type.toLowerCase().replace(/[^a-z]/g, '')}`}
                      onClick={() => setBusinessType(bt.type)}
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-950/50 text-white ring-1 ring-emerald-500'
                          : 'border-slate-800 bg-slate-900/60 hover:bg-slate-900 text-slate-300'
                      }`}
                    >
                      <span className="text-2xl mb-1">{bt.icon}</span>
                      <span className="text-xs font-bold">{bt.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-5 py-3 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-semibold text-sm cursor-pointer"
                >
                  Back
                </button>
                <button
                  id="setup-step2-continue"
                  type="button"
                  onClick={() => setStep(3)}
                  className="flex-1 py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 — Currency & Contact Info */}
          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider">Step 3 of 5</span>
                <h2 className="text-2xl sm:text-3xl font-extrabold font-['Outfit',sans-serif] text-white mt-1">
                  Currency & Details
                </h2>
                <p className="text-slate-400 text-sm mt-0.5">
                  Set your trading currency and optional receipt details.
                </p>
              </div>

              {/* Currency Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Currency *</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {CURRENCY_OPTIONS.map((c) => {
                    const isSelected = currency === c.code;
                    return (
                      <button
                        key={c.code}
                        type="button"
                        id={`currency-opt-${c.code.toLowerCase()}`}
                        onClick={() => setCurrency(c.code)}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-950/60 text-emerald-300 ring-1 ring-emerald-500'
                            : 'border-slate-800 bg-slate-900/60 hover:bg-slate-900 text-slate-300'
                        }`}
                      >
                        <span className="block text-sm font-extrabold">{c.code}</span>
                        <span className="text-[10px] text-slate-400">{c.symbol}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Contact and address fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-emerald-400" />
                    <span>Phone Number</span>
                  </label>
                  <input
                    id="setup-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+250 788 000 000"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Mail className="w-3 h-3 text-emerald-400" />
                    <span>Email (Optional)</span>
                  </label>
                  <input
                    id="setup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contact@mybusiness.com"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-emerald-400" />
                    <span>Business Address (Optional)</span>
                  </label>
                  <input
                    id="setup-address"
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. 124 Main Street, Commercial District"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-5 py-3 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-semibold text-sm cursor-pointer"
                >
                  Back
                </button>
                <button
                  id="setup-step3-continue"
                  type="button"
                  onClick={() => setStep(4)}
                  className="flex-1 py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4 — Credit Questions */}
          {step === 4 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider">Step 4 of 5</span>
                <h2 className="text-2xl sm:text-3xl font-extrabold font-['Outfit',sans-serif] text-white mt-1">
                  Credit & Debt Settings
                </h2>
                <p className="text-slate-400 text-sm mt-0.5">
                  Control whether debt tracking is enabled for customers and suppliers.
                </p>
              </div>

              <div className="space-y-3">
                {/* Question 1: Customer Credit */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
                  <p className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                    Do you sell to customers on credit (pay later)?
                  </p>
                  <div className="flex gap-2.5">
                    <button
                      type="button"
                      id="credit-cust-yes"
                      onClick={() => setAllowCustomerCredit(true)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        allowCustomerCredit
                          ? 'bg-emerald-600 border-emerald-500 text-white'
                          : 'bg-slate-800 border-slate-700 text-slate-300'
                      }`}
                    >
                      Yes, record debt
                    </button>
                    <button
                      type="button"
                      id="credit-cust-no"
                      onClick={() => setAllowCustomerCredit(false)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        !allowCustomerCredit
                          ? 'bg-emerald-600 border-emerald-500 text-white'
                          : 'bg-slate-800 border-slate-700 text-slate-300'
                      }`}
                    >
                      Cash only
                    </button>
                  </div>
                </div>

                {/* Question 2: Supplier Credit */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
                  <p className="text-xs font-bold text-slate-200 uppercase tracking-wide">
                    Do you buy stock from suppliers and pay later?
                  </p>
                  <div className="flex gap-2.5">
                    <button
                      type="button"
                      id="credit-supp-yes"
                      onClick={() => setAllowSupplierCredit(true)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        allowSupplierCredit
                          ? 'bg-emerald-600 border-emerald-500 text-white'
                          : 'bg-slate-800 border-slate-700 text-slate-300'
                      }`}
                    >
                      Yes, pay later
                    </button>
                    <button
                      type="button"
                      id="credit-supp-no"
                      onClick={() => setAllowSupplierCredit(false)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        !allowSupplierCredit
                          ? 'bg-emerald-600 border-emerald-500 text-white'
                          : 'bg-slate-800 border-slate-700 text-slate-300'
                      }`}
                    >
                      No, pay upfront
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-5 py-3 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-semibold text-sm cursor-pointer"
                >
                  Back
                </button>
                <button
                  id="setup-step4-continue"
                  type="button"
                  onClick={() => setStep(5)}
                  className="flex-1 py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Review & Complete</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 5 — Workspace Ready */}
          {step === 5 && (
            <div className="text-center py-4 space-y-5 animate-fade-in">
              <div className="w-16 h-16 bg-emerald-950 border border-emerald-500/40 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto shadow-xl">
                <ShieldCheck className="w-8 h-8 text-emerald-400" />
              </div>

              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold font-['Outfit',sans-serif] text-white">
                  Your Workspace Is Ready!
                </h2>
                <p className="text-slate-300 text-xs sm:text-sm max-w-sm mx-auto mt-1 leading-relaxed">
                  Your clean, private business database is initialized on Cloud Firestore.
                </p>
              </div>

              {/* Summary of Configuration */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-left text-xs space-y-2 text-slate-300 max-w-md mx-auto">
                <div className="flex justify-between">
                  <span className="text-slate-500">Business:</span>
                  <span className="font-bold text-white">{businessName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Owner:</span>
                  <span className="font-bold text-white">{ownerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Category:</span>
                  <span className="font-bold text-white">{businessType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Currency:</span>
                  <span className="font-bold text-emerald-400">{currency}</span>
                </div>
                {phone && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Phone:</span>
                    <span className="font-medium text-slate-200">{phone}</span>
                  </div>
                )}
                {address && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Location:</span>
                    <span className="font-medium text-slate-200">{address}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1 border-t border-slate-800 text-[11px] text-emerald-400">
                  <span>Initial Status:</span>
                  <span>Empty Database &bull; 0 Demo Records</span>
                </div>
              </div>

              <button
                id="setup-go-to-business-btn"
                type="button"
                onClick={handleFinish}
                className="w-full py-3.5 px-8 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm shadow-lg shadow-emerald-950/50 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Launch My Business</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
