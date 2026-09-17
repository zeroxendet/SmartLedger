import React, { useState, useEffect } from 'react';
import { 
  X, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  RefreshCw, 
  ShieldCheck, 
  Settings, 
  Database, 
  Key, 
  Flame,
  ArrowRight,
  Laptop,
  Globe
} from 'lucide-react';
import { 
  firebaseConfig, 
  testFirebaseConnection, 
  getStoredCustomFirebaseConfig, 
  saveCustomFirebaseConfig, 
  resetCustomFirebaseConfig 
} from '../firebase';
import { PRODUCTION_CUSTOM_DOMAIN, REQUIRED_FIREBASE_AUTHORIZED_DOMAINS } from '../utils/domainConfig';

interface FirebaseConsoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinueOffline?: () => void;
}

export const FirebaseConsoleModal: React.FC<FirebaseConsoleModalProps> = ({
  isOpen,
  onClose,
  onContinueOffline,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    authReady: boolean;
    firestoreReady: boolean;
    projectId: string;
    databaseId: string;
    error?: string;
  } | null>(null);

  // Custom config form
  const [showCustomConfig, setShowCustomConfig] = useState(false);
  const existingCustom = getStoredCustomFirebaseConfig();
  const [apiKey, setApiKey] = useState(existingCustom?.apiKey || firebaseConfig.apiKey || '');
  const [projectId, setProjectId] = useState(existingCustom?.projectId || firebaseConfig.projectId || '');
  const [authDomain, setAuthDomain] = useState(existingCustom?.authDomain || firebaseConfig.authDomain || '');
  const [appId, setAppId] = useState(existingCustom?.appId || firebaseConfig.appId || '');

  const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'run.app';
  const consoleAuthUrl = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/providers`;
  const consoleSettingsUrl = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/settings`;
  const consoleFirestoreUrl = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore`;

  useEffect(() => {
    if (isOpen) {
      handleRunTest();
    }
  }, [isOpen]);

  const handleCopy = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleRunTest = async () => {
    setTesting(true);
    const res = await testFirebaseConnection();
    setTestResult(res);
    setTesting(false);
  };

  const handleSaveCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId.trim() || !apiKey.trim()) return;
    saveCustomFirebaseConfig({
      apiKey: apiKey.trim(),
      projectId: projectId.trim(),
      authDomain: authDomain.trim() || `${projectId.trim()}.firebaseapp.com`,
      appId: appId.trim(),
    });
  };

  const handleResetDefault = () => {
    if (confirm('Reset to default project configuration?')) {
      resetCustomFirebaseConfig();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      id="firebase-console-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in overflow-y-auto"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Flame className="w-5 h-5 fill-amber-500" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-['Outfit',sans-serif]">
                Firebase Console Connection & Login Setup
              </h3>
              <p className="text-xs text-slate-400">
                Connected Project: <span className="text-emerald-400 font-mono font-bold">{firebaseConfig.projectId}</span>
              </p>
            </div>
          </div>
          <button
            id="firebase-console-modal-close"
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 max-h-[80vh] overflow-y-auto space-y-6 text-sm">
          {/* Connection Status Box */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-xs uppercase tracking-wider">Live Status:</span>
                {testResult?.authReady ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Firebase App Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    Connecting...
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-mono">
                Auth Domain: {firebaseConfig.authDomain}
              </p>
            </div>

            <button
              id="firebase-test-connection-btn"
              onClick={handleRunTest}
              disabled={testing}
              className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-300 shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
              <span>{testing ? 'Testing...' : 'Test Connection'}</span>
            </button>
          </div>

          {/* Quick Offline Bypass Option */}
          {onContinueOffline && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Laptop className="w-5 h-5 text-emerald-700 mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-bold text-emerald-950 text-xs uppercase tracking-wide">
                    Want to log in immediately without waiting on Firebase Console?
                  </h4>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Launch a local business workspace right now. All your sales, products, and reports will work immediately with 0 blockers.
                  </p>
                </div>
              </div>
              <button
                id="btn-continue-local-workspace"
                onClick={() => {
                  onContinueOffline();
                  onClose();
                }}
                className="shrink-0 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Log In Locally</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Step by Step Firebase Console Setup */}
          <div className="space-y-4">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span>Fixing Login in Firebase Console (3 Fast Steps)</span>
            </h4>

            {/* Step 1: Enable Email/Password */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0">
                    1
                  </span>
                  <div>
                    <h5 className="font-bold text-slate-900 text-xs sm:text-sm">
                      Enable "Email/Password" Sign-in Provider
                    </h5>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      In newly created Firebase projects, email login is turned off by default.
                      Open your Firebase Console, click <strong>Email/Password</strong>, toggle <strong>Enable</strong>, and click <strong>Save</strong>.
                    </p>
                  </div>
                </div>

                <a
                  href={consoleAuthUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  <span>Open Console</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Step 2: Enable Google Sign-In */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center shrink-0">
                    2
                  </span>
                  <div>
                    <h5 className="font-bold text-slate-900 text-xs sm:text-sm">
                      Enable "Google" Provider (Optional for 1-Click Login)
                    </h5>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      In the same <strong>Sign-in method</strong> tab, click <strong>Add new provider</strong> &rarr; select <strong>Google</strong> &rarr; enter your project support email &rarr; click <strong>Save</strong>.
                    </p>
                  </div>
                </div>

                <a
                  href={consoleAuthUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <span>Providers</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Step 3: Add Authorized Domains */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-800 font-bold text-xs flex items-center justify-center shrink-0">
                    3
                  </span>
                  <div>
                    <h5 className="font-bold text-slate-900 text-xs sm:text-sm">
                      Add Authorized Domains (Custom & Active Domains)
                    </h5>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      To allow Google Sign-In and Password Resets on your production custom domain, add these to your Firebase Authorized Domains:
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      <div className="flex items-center gap-1.5 p-1.5 bg-slate-50 border border-slate-200 rounded-lg">
                        <Globe className="w-3.5 h-3.5 text-emerald-600 ml-1" />
                        <code className="text-[11px] font-mono font-bold text-slate-900 select-all">
                          smartledger.rw
                        </code>
                        <button
                          type="button"
                          onClick={() => handleCopy('smartledger.rw', 'domain-custom')}
                          className="px-2 py-0.5 rounded bg-slate-200 hover:bg-slate-300 text-[10px] font-bold text-slate-700 cursor-pointer"
                        >
                          {copiedField === 'domain-custom' ? 'Copied' : 'Copy'}
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 p-1.5 bg-slate-50 border border-slate-200 rounded-lg">
                        <code className="text-[11px] font-mono text-slate-800 select-all ml-1">
                          www.smartledger.rw
                        </code>
                        <button
                          type="button"
                          onClick={() => handleCopy('www.smartledger.rw', 'domain-www')}
                          className="px-2 py-0.5 rounded bg-slate-200 hover:bg-slate-300 text-[10px] font-bold text-slate-700 cursor-pointer"
                        >
                          {copiedField === 'domain-www' ? 'Copied' : 'Copy'}
                        </button>
                      </div>

                      {currentHost !== 'smartledger.rw' && (
                        <div className="flex items-center gap-1.5 p-1.5 bg-slate-50 border border-slate-200 rounded-lg">
                          <code className="text-[11px] font-mono text-slate-600 select-all ml-1 max-w-[160px] truncate" title={currentHost}>
                            {currentHost}
                          </code>
                          <button
                            type="button"
                            onClick={() => handleCopy(currentHost, 'domain-active')}
                            className="px-2 py-0.5 rounded bg-slate-200 hover:bg-slate-300 text-[10px] font-bold text-slate-700 cursor-pointer"
                          >
                            {copiedField === 'domain-active' ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <a
                  href={consoleSettingsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <span>Settings</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Connect Another Firebase Project Toggle */}
          <div className="pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowCustomConfig(!showCustomConfig)}
              className="text-xs font-semibold text-slate-600 hover:text-emerald-700 flex items-center gap-1.5 cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>
                {showCustomConfig ? 'Hide Custom Firebase Credentials' : 'Want to connect a different Firebase Project? Click here'}
              </span>
            </button>

            {showCustomConfig && (
              <form onSubmit={handleSaveCustom} className="mt-3 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <p className="text-xs text-slate-500">
                  If you created a new project in your own Firebase Console, paste your project's web configuration values here:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 uppercase">Project ID</label>
                    <input
                      type="text"
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                      placeholder="e.g. my-business-app-123"
                      className="w-full mt-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 uppercase">Web API Key</label>
                    <input
                      type="text"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="AIzaSy..."
                      className="w-full mt-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 uppercase">Auth Domain</label>
                    <input
                      type="text"
                      value={authDomain}
                      onChange={(e) => setAuthDomain(e.target.value)}
                      placeholder="my-project.firebaseapp.com"
                      className="w-full mt-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 uppercase">App ID</label>
                    <input
                      type="text"
                      value={appId}
                      onChange={(e) => setAppId(e.target.value)}
                      placeholder="1:123456:web:..."
                      className="w-full mt-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer"
                  >
                    Save & Reconnect
                  </button>
                  {existingCustom && (
                    <button
                      type="button"
                      onClick={handleResetDefault}
                      className="px-3 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs cursor-pointer"
                    >
                      Reset to Default
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Firestore Database ID: <code className="font-mono text-slate-700 font-semibold">{firebaseConfig.projectId}</code>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
