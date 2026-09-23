import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Building2, 
  Sliders, 
  Shield, 
  RotateCcw, 
  Archive, 
  X, 
  Check, 
  AlertTriangle, 
  Lock, 
  Unlock, 
  Calendar, 
  Sparkles, 
  FileText, 
  ChevronRight, 
  KeyRound,
  Eye,
  DollarSign,
  Trash2,
  CheckCircle2,
  Globe,
  Copy,
  ExternalLink,
  Server,
  Flame,
  Users,
  UserPlus,
  AlertCircle,
  ShieldAlert,
  Loader2
} from 'lucide-react';
import { BusinessProfile, CurrencyCode, BusinessType, ArchivedBusinessPeriod, StaffMember, StaffSession } from '../types';
import { formatCurrency } from '../utils/calculations';
import { auth, linkGoogleToCurrentUser } from '../firebase';
import { isVerifiedOwnerOrDeveloper } from '../utils/devMode';
import { CreatePasswordModal } from './CreatePasswordModal';
import { DeleteArchivedPeriodModal } from './DeleteArchivedPeriodModal';
import { 
  inspectDomainEnvironment, 
  fetchProtectedDomainConfig,
  ProtectedDomainConfig,
  PRODUCTION_CUSTOM_DOMAIN, 
  PRODUCTION_CUSTOM_DOMAIN_URL, 
  FIREBASE_PROJECT_ID,
  FIREBASE_HOSTING_DOMAIN,
  FIREBASE_HOSTING_URL,
  FIREBASE_APP_DOMAIN,
  FALLBACK_BACKUP_URL 
} from '../utils/domainConfig';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: BusinessProfile;
  onUpdateProfile: (updated: Partial<BusinessProfile>) => void;
  archivedPeriods: ArchivedBusinessPeriod[];
  onOpenArchivedPeriod?: (period: ArchivedBusinessPeriod) => void;
  onViewArchivedPeriod?: (period: ArchivedBusinessPeriod) => void;
  onOpenRestartBusiness: () => void;
  onDeleteArchivedPeriod?: (period: ArchivedBusinessPeriod) => Promise<{ success: boolean; message?: string; error?: string }>;
  isCashierMode?: boolean;
  onUnlockCashierMode?: () => void;
  onChangeCashierPin?: () => void;
  onOpenFirebaseConsole?: () => void;
  isDevOrOwner?: boolean;
  currentUser?: any;
  staffSession?: StaffSession | null;
  initialTab?: 'business' | 'preferences' | 'security' | 'staff' | 'domain';
  staffList?: StaffMember[];
  onOpenStaffManagement?: () => void;
  onToggleStaffStatus?: (staffId: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  profile,
  onUpdateProfile,
  archivedPeriods,
  onOpenArchivedPeriod,
  onViewArchivedPeriod,
  onOpenRestartBusiness,
  onDeleteArchivedPeriod,
  isCashierMode = false,
  onUnlockCashierMode,
  onChangeCashierPin,
  onOpenFirebaseConsole,
  isDevOrOwner = false,
  currentUser,
  staffSession,
  initialTab,
  staffList = [],
  onOpenStaffManagement,
  onToggleStaffStatus,
}) => {
  // Strict Owner & Developer Authorization:
  // ONLY verified App Developer / Super Admin OR verified Business Owner can access.
  // Everyone else (Manager, Cashier, Staff, Accountant, Shared user, etc.) has ZERO access.
  const isDomainAuthorized = isVerifiedOwnerOrDeveloper(
    currentUser || auth?.currentUser,
    profile?.id,
    isCashierMode || !!staffSession
  );

  const [activeTab, setActiveTab] = useState<'business' | 'preferences' | 'security' | 'domain'>(() => {
    if (initialTab === 'domain' && isDomainAuthorized) return 'domain';
    if (initialTab && initialTab !== 'domain' && initialTab !== 'staff') return initialTab;
    return 'business';
  });

  const [protectedDomainData, setProtectedDomainData] = useState<ProtectedDomainConfig | null>(null);
  const [isDomainLoading, setIsDomainLoading] = useState<boolean>(false);
  const [domainError, setDomainError] = useState<string | null>(null);

  // If unauthorized user lands on domain tab, immediately redirect them to normal Business Settings
  useEffect(() => {
    if (activeTab === 'domain' && !isDomainAuthorized) {
      setActiveTab('business');
    }
  }, [activeTab, isDomainAuthorized]);

  // Fetch verified domain configuration from the backend security API
  useEffect(() => {
    if (activeTab !== 'domain' || !isDomainAuthorized) return;
    let isMounted = true;
    setIsDomainLoading(true);
    setDomainError(null);

    (async () => {
      try {
        const idToken = auth?.currentUser ? await auth.currentUser.getIdToken() : null;
        const res = await fetchProtectedDomainConfig(idToken, profile?.id);
        if (!isMounted) return;
        if (res.authorized && res.data) {
          setProtectedDomainData(res.data);
        } else {
          setDomainError(res.error || 'Access Restricted: This area is available only to the Business Owner.');
        }
      } catch {
        if (isMounted) {
          setDomainError('Access Restricted: This area is available only to the Business Owner.');
        }
      } finally {
        if (isMounted) {
          setIsDomainLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [activeTab, isDomainAuthorized, profile?.id]);

  const [periodToDelete, setPeriodToDelete] = useState<ArchivedBusinessPeriod | null>(null);
  const [deletedToast, setDeletedToast] = useState<string | null>(null);
  const [copiedDomainField, setCopiedDomainField] = useState<string | null>(null);
  
  // Profile edit state
  const [name, setName] = useState(profile.name || '');
  const [ownerName, setOwnerName] = useState(profile.ownerName || '');
  const [type, setType] = useState<BusinessType>(profile.type || 'Bakery');
  const [currency, setCurrency] = useState<CurrencyCode>(profile.currency || 'RWF');
  const [phone, setPhone] = useState(profile.phone || profile.ownerEmailOrPhone || '');
  const [email, setEmail] = useState(profile.email || '');
  const [address, setAddress] = useState(profile.address || '');
  const [isSavedToast, setIsSavedToast] = useState(false);

  // Preferences state
  const [beginnerMode, setBeginnerMode] = useState(profile.beginnerMode ?? false);
  const [isBakeryMode, setIsBakeryMode] = useState(profile.isBakeryMode ?? false);
  const [allowCustomerCredit, setAllowCustomerCredit] = useState(profile.allowCustomerCredit ?? true);
  const [allowSupplierCredit, setAllowSupplierCredit] = useState(profile.allowSupplierCredit ?? true);
  const [taxRate, setTaxRate] = useState<number>(profile.taxRate ?? 0);
  const [isCreatePasswordOpen, setIsCreatePasswordOpen] = useState(false);
  const [passwordRefreshKey, setPasswordRefreshKey] = useState(0);
  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false);
  const [linkGoogleMsg, setLinkGoogleMsg] = useState<{ text: string; isError: boolean } | null>(null);

  if (!isOpen) return null;

  const handleSaveBusinessInfo = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      name,
      ownerName,
      type,
      currency,
      phone,
      ownerEmailOrPhone: phone || email,
      email,
      address,
      beginnerMode,
      isBakeryMode,
      allowCustomerCredit,
      allowSupplierCredit,
      taxRate: Number(taxRate) || 0,
    });
    setIsSavedToast(true);
    setTimeout(() => setIsSavedToast(false), 3000);
  };

  const periodNumber = profile.periodNumber || 1;
  const startedDate = profile.currentPeriodStartedAt 
    ? new Date(profile.currentPeriodStartedAt).toLocaleDateString()
    : new Date(profile.createdAt || Date.now()).toLocaleDateString();

  return (
    <div 
      id="settings-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-fadeIn"
    >
      <div 
        id="settings-modal-container"
        className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6 max-h-[92vh] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30 shrink-0">
              <SettingsIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-300 bg-emerald-950/80 border border-emerald-700/50 px-2 py-0.5 rounded-md">
                  SmartLedger Settings
                </span>
                <span className="text-xs text-slate-400">{profile.name}</span>
              </div>
              <h2 id="settings-modal-title" className="text-lg font-bold text-white mt-0.5">
                Business Settings &amp; Operations
              </h2>
            </div>
          </div>

          <button
            id="btn-close-settings-modal"
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-slate-200 bg-slate-50 shrink-0 text-xs font-semibold overflow-x-auto">
          <button
            id="settings-tab-business"
            type="button"
            onClick={() => setActiveTab('business')}
            className={`px-4 py-2.5 rounded-t-xl border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'business'
                ? 'border-emerald-600 text-emerald-700 font-bold bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Business</span>
            {archivedPeriods.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">
                {archivedPeriods.length} Archived
              </span>
            )}
          </button>

          <button
            id="settings-tab-preferences"
            type="button"
            onClick={() => setActiveTab('preferences')}
            className={`px-4 py-2.5 rounded-t-xl border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'preferences'
                ? 'border-emerald-600 text-emerald-700 font-bold bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Preferences</span>
          </button>

          <button
            id="settings-tab-security"
            type="button"
            onClick={() => setActiveTab('security')}
            className={`px-4 py-2.5 rounded-t-xl border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'security'
                ? 'border-emerald-600 text-emerald-700 font-bold bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Security &amp; Cashier</span>
            {isCashierMode && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                Locked
              </span>
            )}
          </button>

          {/* TAB 4: CUSTOM DOMAIN & URL - STRICT HIGH-PRIVILEGE OWNER/DEVELOPER ACCESS ONLY */}
          {isDomainAuthorized && (
            <button
              id="settings-tab-domain"
              type="button"
              onClick={() => setActiveTab('domain')}
              className={`px-4 py-2.5 rounded-t-xl border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
                activeTab === 'domain'
                  ? 'border-emerald-600 text-emerald-700 font-bold bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Globe className="w-4 h-4 text-emerald-600" />
              <span>Custom Domain &amp; URL</span>
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                .rw Ready
              </span>
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: BUSINESS (Settings → Business → Restart Business & Archived Data) */}
          {activeTab === 'business' && (
            <div className="space-y-6">
              {/* Active Business Period Status */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shrink-0">
                    #{periodNumber}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-emerald-900">Current Business Period #{periodNumber}</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] font-bold text-emerald-700 uppercase">Active Dashboard</span>
                    </div>
                    <p className="text-xs text-emerald-800 mt-0.5">
                      Started on {startedDate} &bull; All active dashboard metrics and reports reflect this current period.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-bold text-emerald-800 px-2.5 py-1 rounded-lg bg-emerald-100/80 border border-emerald-200">
                    Currency: {profile.currency}
                  </span>
                </div>
              </div>

              {/* 1. Business Profile Form */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-emerald-600" />
                      <span>Business Information</span>
                    </h3>
                    <p className="text-xs text-slate-500">Update your business name, category, and contact details.</p>
                  </div>
                </div>

                <form onSubmit={handleSaveBusinessInfo} className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Business Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Owner Name</label>
                    <input
                      type="text"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Business Type</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value as BusinessType)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-emerald-500 outline-none bg-white"
                    >
                      <option value="Bakery">Bakery</option>
                      <option value="Grocery">Grocery</option>
                      <option value="Restaurant">Restaurant</option>
                      <option value="Boutique">Boutique</option>
                      <option value="Pharmacy">Pharmacy</option>
                      <option value="Electronics">Electronics</option>
                      <option value="Hardware">Hardware</option>
                      <option value="Salon/Barbershop">Salon / Barbershop</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Currency</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-emerald-500 outline-none bg-white"
                    >
                      <option value="RWF">RWF - Rwandan Franc</option>
                      <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="GBP">GBP - British Pound</option>
                      <option value="KES">KES - Kenyan Shilling</option>
                      <option value="UGX">UGX - Ugandan Shilling</option>
                      <option value="NGN">NGN - Nigerian Naira</option>
                      <option value="ZAR">ZAR - South African Rand</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Phone / Mobile Money</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +250 780 000 000"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Location / Address</label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. Kigali, Rwanda"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-emerald-500 outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2 flex items-center justify-end gap-2 pt-2">
                    {isSavedToast && (
                      <span className="text-emerald-700 text-xs font-bold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Saved successfully!
                      </span>
                    )}
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
                    >
                      Save Profile Details
                    </button>
                  </div>
                </form>
              </div>

              {/* 2. ARCHIVED BUSINESS DATA SECTION (Requirement 7 & 8) */}
              <div id="section-archived-business-data" className="p-5 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Archive className="w-4 h-4 text-indigo-700" />
                      <h3 className="text-sm font-bold text-indigo-950">Archived Business Data</h3>
                      <span className="px-2 py-0.5 rounded-full bg-indigo-200 text-indigo-900 text-[10px] font-bold">
                        {archivedPeriods.length} Saved Period{archivedPeriods.length === 1 ? '' : 's'}
                      </span>
                    </div>
                    <p className="text-xs text-indigo-900/80 mt-0.5">
                      Safely preserved records from previous business cycles. These records do not affect your current active dashboard.
                    </p>
                  </div>
                </div>

                {deletedToast && (
                  <div className="p-3.5 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2 animate-fadeIn">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>{deletedToast}</span>
                  </div>
                )}

                {archivedPeriods.length === 0 ? (
                  <div className="p-4 rounded-xl bg-white/80 border border-indigo-100 text-center text-xs text-slate-500 space-y-1">
                    <p className="font-semibold text-slate-700">No archived periods yet.</p>
                    <p className="text-slate-500">
                      When you restart your business, your past records will be safely archived and stored here for permanent reference.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {archivedPeriods.map((archived) => (
                      <div
                        key={archived.id}
                        className="p-3.5 rounded-xl bg-white border border-indigo-200 shadow-sm hover:border-indigo-300 hover:shadow transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-900">{archived.periodLabel}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-bold">
                              Period #{archived.periodNumber}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-500 text-[11px] mt-1">
                            <span>Sales: <strong className="text-emerald-700 font-bold">{formatCurrency(archived.summary.totalSales, archived.currency)}</strong></span>
                            <span>&bull;</span>
                            <span>Profit: <strong className="text-teal-700 font-bold">{formatCurrency(archived.summary.totalProfit, archived.currency)}</strong></span>
                            <span>&bull;</span>
                            <span>Expenses: <strong className="text-rose-700 font-bold">{formatCurrency(archived.summary.totalExpenses, archived.currency)}</strong></span>
                            <span>&bull;</span>
                            <span>{archived.summary.productsCount} products</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => (onOpenArchivedPeriod || onViewArchivedPeriod)?.(archived)}
                            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Records</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setPeriodToDelete(archived)}
                            className="px-3 py-1.5 rounded-xl border border-red-200 hover:border-red-300 bg-red-50/80 hover:bg-red-100 text-red-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                            title={`Permanently delete ${archived.periodLabel}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete Permanently</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. RESTART BUSINESS SECTION (Requirement 10 & 11) */}
              <div 
                id="section-restart-business" 
                className="p-5 rounded-2xl bg-rose-50/60 border-2 border-rose-200/80 space-y-3.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-600/30">
                      <RotateCcw className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-extrabold text-slate-900">Restart Business</h3>
                        <span className="text-[10px] font-bold text-rose-800 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded-md">
                          Owner Protected
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        Start a completely fresh business period without deleting your SmartLedger account. 
                        Your current records will be safely moved to <strong className="font-bold text-slate-800">Archived Business Data</strong>, 
                        and your active dashboard will start fresh with zeroed sales, profit, expenses, products, customers, suppliers, and cash.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white border border-rose-200 text-xs text-slate-600 space-y-1">
                  <div className="flex items-center gap-2 text-rose-900 font-bold">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Before you restart:</span>
                  </div>
                  <p className="text-[11px] text-slate-600 pl-6">
                    &bull; Your login credentials, business profile, and cashier settings are completely safe.
                    <br />
                    &bull; All historical records will be preserved in the archive above.
                    <br />
                    &bull; Requires typing <strong className="font-mono text-rose-600 font-bold">START FRESH</strong> to confirm.
                  </p>
                </div>

                {isCashierMode ? (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>Cashier Mode is active. Unlock as business owner to restart the business.</span>
                    </div>
                    {onUnlockCashierMode && (
                      <button
                        type="button"
                        onClick={onUnlockCashierMode}
                        className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 cursor-pointer"
                      >
                        Enter Owner PIN
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-500">
                      Ideal for new fiscal seasons, annual resets, or clearing initial test data.
                    </span>
                    <button
                      id="btn-settings-restart-business"
                      type="button"
                      onClick={onOpenRestartBusiness}
                      className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-extrabold text-xs shadow-md shadow-rose-600/30 transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Restart Business...</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PREFERENCES */}
          {activeTab === 'preferences' && (
            <div className="space-y-4 text-xs">
              {/* Beginner Mode Toggle */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Beginner Mode (Simplified Terms)</h4>
                  <p className="text-slate-500 mt-0.5">
                    Replaces accounting terms with simple everyday words (e.g. &ldquo;Products&rdquo; instead of &ldquo;Inventory&rdquo;, &ldquo;Customers&rdquo; instead of &ldquo;Receivables&rdquo;).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setBeginnerMode(!beginnerMode);
                    onUpdateProfile({ beginnerMode: !beginnerMode });
                  }}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    beginnerMode ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`block w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                      beginnerMode ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* Bakery Mode Toggle */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Bakery &amp; Production Mode</h4>
                  <p className="text-slate-500 mt-0.5">
                    Enables daily production batch logging and damaged / unsold waste tracking.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsBakeryMode(!isBakeryMode);
                    onUpdateProfile({ isBakeryMode: !isBakeryMode });
                  }}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    isBakeryMode ? 'bg-amber-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`block w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                      isBakeryMode ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* Customer Credit Toggle */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Allow Customer Credit</h4>
                  <p className="text-slate-500 mt-0.5">
                    Permits selling items to customers on debt / pay-later accounts.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAllowCustomerCredit(!allowCustomerCredit);
                    onUpdateProfile({ allowCustomerCredit: !allowCustomerCredit });
                  }}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    allowCustomerCredit ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`block w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                      allowCustomerCredit ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* Supplier Credit Toggle */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Allow Supplier Credit</h4>
                  <p className="text-slate-500 mt-0.5">
                    Permits purchasing stock from suppliers on credit / pay-later terms.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAllowSupplierCredit(!allowSupplierCredit);
                    onUpdateProfile({ allowSupplierCredit: !allowSupplierCredit });
                  }}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    allowSupplierCredit ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`block w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                      allowSupplierCredit ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* Tax Rate Setting */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Estimated VAT / Sales Tax Rate</h4>
                  <p className="text-slate-500 mt-0.5">
                    Percentage used to estimate tax reports and invoice tax summaries (e.g. 18% in Rwanda).
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={taxRate}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setTaxRate(val);
                      onUpdateProfile({ taxRate: val });
                    }}
                    className="w-20 px-3 py-1.5 rounded-xl border border-slate-300 text-right font-bold outline-none"
                  />
                  <span className="font-bold text-slate-700">%</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SECURITY & CASHIER */}
          {activeTab === 'security' && (() => {
            const currentUser = auth.currentUser;
            const userEmail = currentUser?.email || profile.email || profile.ownerEmailOrPhone || '';
            const hasGoogle = currentUser?.providerData.some((p) => p.providerId === 'google.com') ?? false;
            const hasPassword = currentUser?.providerData.some((p) => p.providerId === 'password') ?? false;

            return (
              <div className="space-y-4 text-xs">
                {/* Account & Login Credentials */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        <Lock className="w-4 h-4 text-emerald-600" />
                        <span>Account &amp; Login Methods</span>
                      </h4>
                      <p className="text-slate-500 mt-0.5">
                        Manage how you log into your SmartLedger business ledger.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsCreatePasswordOpen(true)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors cursor-pointer shrink-0"
                    >
                      {hasPassword ? 'Change Password' : 'Create Password'}
                    </button>
                  </div>

                  <div className="pt-2 border-t border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Registered Account Email:</span>
                      <span className="font-semibold text-slate-900">{userEmail || 'Local / Guest'}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Connected Login Methods:</span>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${hasGoogle ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
                          Google {hasGoogle ? '✓' : '—'}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${hasPassword ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
                          Password {hasPassword ? '✓' : 'Not set'}
                        </span>
                      </div>
                    </div>

                    {!hasPassword && hasGoogle && (
                      <div className="mt-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-center justify-between gap-2">
                        <span>
                          💡 You signed in with Google. Create a password so you can also log in directly with your email and password.
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsCreatePasswordOpen(true)}
                          className="font-bold underline text-amber-950 whitespace-nowrap cursor-pointer hover:text-black"
                        >
                          Set password now
                        </button>
                      </div>
                    )}

                    {hasPassword && !hasGoogle && (
                      <div className="mt-2 p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-[11px] flex items-center justify-between gap-2">
                        <span>
                          💡 Link your Google account to log in with 1-click Google Sign-In alongside your password.
                        </span>
                        <button
                          type="button"
                          disabled={isLinkingGoogle}
                          onClick={async () => {
                            setLinkGoogleMsg(null);
                            setIsLinkingGoogle(true);
                            try {
                              const res = await linkGoogleToCurrentUser();
                              if (res.success) {
                                setLinkGoogleMsg({ text: '✓ Google account linked successfully! You can now log in with either Google or your password.', isError: false });
                                setPasswordRefreshKey((k) => k + 1);
                              } else {
                                const err = res.error;
                                if (err?.code === 'auth/credential-already-in-use') {
                                  setLinkGoogleMsg({ text: 'This Google account is already linked to another SmartLedger user. Linking was blocked to prevent overwriting business data.', isError: true });
                                } else if (err?.code === 'auth/popup-closed-by-user') {
                                  setLinkGoogleMsg({ text: 'Google popup was closed before completing linking.', isError: true });
                                } else {
                                  setLinkGoogleMsg({ text: err?.message || 'Failed to link Google account.', isError: true });
                                }
                              }
                            } catch (e: any) {
                              setLinkGoogleMsg({ text: e.message || 'Failed to link Google account.', isError: true });
                            } finally {
                              setIsLinkingGoogle(false);
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold whitespace-nowrap cursor-pointer transition-colors shadow-sm disabled:opacity-50"
                        >
                          {isLinkingGoogle ? 'Connecting...' : 'Link Google'}
                        </button>
                      </div>
                    )}

                    {linkGoogleMsg && (
                      <div className={`p-2 rounded-xl text-[11px] ${linkGoogleMsg.isError ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}`}>
                        {linkGoogleMsg.text}
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        <KeyRound className="w-4 h-4 text-indigo-600" />
                        <span>Owner &amp; Cashier PIN Protection</span>
                      </h4>
                      <p className="text-slate-500 mt-0.5">
                        Locks financial reports, business settings, and restart operations from unauthorized staff.
                      </p>
                    </div>
                    {onChangeCashierPin && (
                      <button
                        type="button"
                        onClick={onChangeCashierPin}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors cursor-pointer"
                      >
                        {profile.cashierPin ? 'Change PIN' : 'Set Owner PIN'}
                      </button>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-slate-600">Current Status:</span>
                    <span className="font-bold text-slate-800">
                      {profile.cashierPin ? 'PIN is configured' : 'No PIN configured (Default: 1234)'}
                    </span>
                  </div>
                </div>

                {isDevOrOwner && onOpenFirebaseConsole && (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-amber-950 text-sm">Firebase Cloud Diagnostics</h4>
                      <p className="text-amber-800 text-xs mt-0.5">
                        View live Firestore sync status and test auth connection diagnostics.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onOpenFirebaseConsole}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition-colors cursor-pointer"
                    >
                      Open Console
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          {/* TAB 4: CUSTOM DOMAIN & PUBLIC URL */}
          {activeTab === 'domain' && (() => {
            // Strict Zero-Trust Authorization: Non-owners/non-developers receive access restricted notice without leaking URLs
            if (!isDomainAuthorized || domainError) {
              return (
                <div className="p-8 text-center space-y-4 max-w-md mx-auto animate-fade-in my-8">
                  <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center mx-auto shadow-sm">
                    <ShieldAlert className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-lg font-bold text-slate-900 font-['Outfit',sans-serif]">Access Restricted</h4>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      This area is available only to the Business Owner.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('business')}
                    className="mt-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                  >
                    Return to Business Settings
                  </button>
                </div>
              );
            }

            if (isDomainLoading || !protectedDomainData) {
              return (
                <div className="p-12 text-center space-y-3 animate-fade-in my-8">
                  <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
                  <div className="text-sm font-bold text-slate-700">Verifying Owner Authorization &amp; Domain Routing...</div>
                  <div className="text-xs text-slate-400">Authenticating with backend security server</div>
                </div>
              );
            }

            const domainInfo = inspectDomainEnvironment();
            const copyText = (text: string, id: string) => {
              navigator.clipboard.writeText(text);
              setCopiedDomainField(id);
              setTimeout(() => setCopiedDomainField(null), 2500);
            };

            return (
              <div className="space-y-6 animate-fade-in">
                {/* Firebase Hosting Primary URL Card */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-950 via-slate-900 to-slate-900 text-white shadow-lg space-y-4 border border-amber-500/30">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0">
                        <Flame className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-lg font-['Outfit',sans-serif]">Firebase Hosting URL</h4>
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30 font-mono">
                            {protectedDomainData.firebaseProjectId}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-0.5">
                          High-speed global CDN deployment URL backed by Google Firebase
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => copyText(protectedDomainData.firebaseHostingUrl, 'fb-hosting')}
                      className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-sm"
                    >
                      {copiedDomainField === 'fb-hosting' ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-slate-950" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Web.app URL</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="text-xs text-amber-300/80 shrink-0">Hosting URL:</span>
                      <code className="text-sm font-mono font-bold text-amber-400 truncate select-all">
                        {protectedDomainData.firebaseHostingUrl}
                      </code>
                    </div>
                    <a
                      href={protectedDomainData.firebaseHostingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-amber-200 hover:text-white flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <span>Visit</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {/* Domain Overview Card */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white shadow-lg space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
                        <Globe className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-lg font-['Outfit',sans-serif]">Live Production Application URL</h4>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                            Verified Working
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-0.5">
                          Active production deployment address for your store, staff invitations, and cashiers
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => copyText(protectedDomainData.activeProductionUrl, 'prod-domain')}
                      className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-sm"
                    >
                      {copiedDomainField === 'prod-domain' ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-slate-950" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Live App URL</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="text-xs text-slate-400 shrink-0">Live URL:</span>
                      <code className="text-sm font-mono font-bold text-emerald-400 truncate select-all">
                        {protectedDomainData.activeProductionUrl}
                      </code>
                    </div>
                    <a
                      href={protectedDomainData.activeProductionUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-slate-300 hover:text-white flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <span>Visit</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* Custom Domain Status banner */}
                  <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Custom Domain ({protectedDomainData.customDomain}):</span>
                      {domainInfo.isCustomDomainActive ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Connected &amp; Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300">
                          <AlertCircle className="w-3.5 h-3.5" /> Pending DNS Setup (Not yet connected)
                        </span>
                      )}
                    </div>
                    {!domainInfo.isCustomDomainActive && (
                      <span className="text-[11px] text-slate-400">
                        Staff &amp; cashiers automatically use the verified live URL above to avoid ERR_NAME_NOT_RESOLVED
                      </span>
                    )}
                  </div>
                </div>

                {/* Connection & Routing Status */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Server className="w-4 h-4 text-indigo-600" />
                    <span>Current Access &amp; Routing Status</span>
                  </h5>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <div className="text-[11px] text-slate-500 font-medium">Current Active Origin</div>
                      <div className="text-xs font-mono font-bold text-slate-800 mt-1 truncate" title={domainInfo.currentOrigin}>
                        {domainInfo.currentOrigin}
                      </div>
                      <div className="mt-1.5 flex items-center gap-1 text-[10px] text-emerald-600 font-semibold">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Dynamic Runtime Origin Detection</span>
                      </div>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <div className="text-[11px] text-slate-500 font-medium">SSL / Encryption Protocol</div>
                      <div className="text-xs font-mono font-bold text-slate-800 mt-1 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span>{domainInfo.isSecureHttps ? 'HTTPS (Secure TLS 1.3)' : 'HTTP (Local Development)'}</span>
                      </div>
                      <div className="mt-1.5 text-[10px] text-slate-500">
                        {domainInfo.isSecureHttps ? 'Encrypted end-to-end for payments & business data' : 'Enforce HTTPS for production'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Firebase Authentication Configuration */}
                <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h5 className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-2">
                        <Shield className="w-4 h-4 text-purple-600" />
                        <span>Firebase Auth Domain Whitelist</span>
                      </h5>
                      <p className="text-xs text-purple-800 mt-1 leading-relaxed">
                        To ensure Google Sign-In, password resets, and session tokens function seamlessly on <code className="font-bold font-mono">{protectedDomainData.customDomain}</code>, these domains must be authorized in your Firebase console:
                      </p>
                    </div>

                    {isDevOrOwner && onOpenFirebaseConsole && (
                      <button
                        type="button"
                        onClick={onOpenFirebaseConsole}
                        className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shrink-0 cursor-pointer"
                      >
                        Open Console
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 pt-1">
                    {protectedDomainData.authorizedDomains.map(domain => (
                      <div key={domain} className="flex items-center justify-between p-2 bg-white rounded-xl border border-purple-100 text-xs">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                          <code className="font-mono font-bold text-slate-800 truncate">{domain}</code>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyText(domain, `copy-${domain}`)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          {copiedDomainField === `copy-${domain}` ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* DNS Setup Guide for Custom Domain */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Globe className="w-4 h-4 text-emerald-600" />
                    <span>DNS Configuration Guide for {protectedDomainData.customDomain}</span>
                  </h5>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    When connecting your domain with your registrar (such as RICTA, Webhost Rwanda, or Cloudflare), configure these DNS records:
                  </p>

                  <div className="space-y-2 text-xs font-mono">
                    {protectedDomainData.dnsRecords.map((record, idx) => (
                      <div key={idx} className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-indigo-600 font-bold">{record.label}</span>
                          {record.recommended && (
                            <span className="text-[10px] text-slate-400 font-sans">Recommended</span>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-slate-700 text-[11px] pt-1">
                          <div><span className="text-slate-400">Type:</span> {record.type}</div>
                          <div><span className="text-slate-400">Host:</span> {record.host}</div>
                          <div className="truncate"><span className="text-slate-400">Target:</span> {record.target}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500">
            SmartLedger Business OS &bull; Period #{periodNumber}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>

      <CreatePasswordModal
        key={passwordRefreshKey}
        isOpen={isCreatePasswordOpen}
        onClose={() => setIsCreatePasswordOpen(false)}
        userEmail={auth.currentUser?.email || profile.email || profile.ownerEmailOrPhone || ''}
        hasExistingPassword={auth.currentUser?.providerData.some((p) => p.providerId === 'password') ?? false}
        hasGoogle={auth.currentUser?.providerData.some((p) => p.providerId === 'google.com') ?? false}
        onPasswordCreated={() => {
          setPasswordRefreshKey((k) => k + 1);
        }}
      />

      {/* Owner Permanent Deletion Confirmation & Security Modal */}
      <DeleteArchivedPeriodModal
        isOpen={Boolean(periodToDelete)}
        onClose={() => setPeriodToDelete(null)}
        period={periodToDelete}
        profile={profile}
        isCashierMode={isCashierMode}
        onUnlockCashierMode={onUnlockCashierMode}
        onConfirmDelete={async (period) => {
          if (!onDeleteArchivedPeriod) return { success: false, error: 'No deletion handler configured.' };
          const res = await onDeleteArchivedPeriod(period);
          if (res.success) {
            setDeletedToast(`Archived business period permanently deleted.`);
            setTimeout(() => setDeletedToast(null), 4000);
          }
          return res;
        }}
      />
    </div>
  );
};
