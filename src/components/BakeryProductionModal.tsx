import React, { useState } from 'react';
import { Product, ProductionLog, WasteLog, CurrencyCode } from '../types';
import { formatCurrency } from '../utils/calculations';
import { X, Wheat, AlertCircle, Plus, ArrowRight, Trash2 } from 'lucide-react';

interface BakeryProductionModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  currency: CurrencyCode;
  productionLogs: ProductionLog[];
  wasteLogs: WasteLog[];
  onAddProduction: (log: ProductionLog) => void;
  onAddWaste: (log: WasteLog) => void;
}

export const BakeryProductionModal: React.FC<BakeryProductionModalProps> = ({
  isOpen,
  onClose,
  products,
  currency,
  productionLogs,
  wasteLogs,
  onAddProduction,
  onAddWaste,
}) => {
  const [activeTab, setActiveTab] = useState<'production' | 'waste'>('production');

  // Production Form State
  const [prodProductId, setProdProductId] = useState(products[0]?.id || '');
  const [prodQuantity, setProdQuantity] = useState(150);
  const [prodNotes, setProdNotes] = useState('Morning hot batch');

  // Waste Form State
  const [wasteProductId, setWasteProductId] = useState(products[0]?.id || '');
  const [wasteQuantity, setWasteQuantity] = useState(5);
  const [wasteReason, setWasteReason] = useState<'Burned' | 'Unsold' | 'Damaged' | 'Expired' | 'Other'>('Burned');

  if (!isOpen) return null;

  const handleSaveProduction = (e: React.FormEvent) => {
    e.preventDefault();
    const prod = products.find((p) => p.id === prodProductId);
    if (!prod) return;

    const log: ProductionLog = {
      id: `prod_log_${Date.now()}`,
      productId: prod.id,
      productName: prod.name,
      quantityProduced: prodQuantity,
      notes: prodNotes,
      date: new Date().toISOString(),
    };

    onAddProduction(log);
    setProdNotes('');
  };

  const handleSaveWaste = (e: React.FormEvent) => {
    e.preventDefault();
    const prod = products.find((p) => p.id === wasteProductId);
    if (!prod) return;

    const estimatedLoss = wasteQuantity * prod.buyingPrice;

    const log: WasteLog = {
      id: `waste_log_${Date.now()}`,
      productId: prod.id,
      productName: prod.name,
      quantityWasted: wasteQuantity,
      reason: wasteReason,
      estimatedLoss,
      date: new Date().toISOString(),
    };

    onAddWaste(log);
  };

  const totalWastedToday = wasteLogs.reduce((acc, w) => acc + w.quantityWasted, 0);
  const totalWasteCost = wasteLogs.reduce((acc, w) => acc + w.estimatedLoss, 0);

  return (
    <div 
      id="smartledger-bakery-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wheat className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-lg font-bold font-['Outfit',sans-serif]">🥖 Bakery Mode & Operations</h3>
              <p className="text-xs text-slate-400">Daily baking output & waste tracking</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-bold">
          <button
            type="button"
            id="tab-bakery-production"
            onClick={() => setActiveTab('production')}
            className={`flex-1 py-3 text-center border-b-2 transition-all cursor-pointer ${
              activeTab === 'production'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            🍞 Step 39: Production Output
          </button>
          <button
            type="button"
            id="tab-bakery-waste"
            onClick={() => setActiveTab('waste')}
            className={`flex-1 py-3 text-center border-b-2 transition-all cursor-pointer ${
              activeTab === 'waste'
                ? 'border-amber-600 text-amber-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            ⚠️ Step 40: Waste & Damage
          </button>
        </div>

        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* TAB 1: PRODUCTION */}
          {activeTab === 'production' && (
            <div className="space-y-4">
              <form onSubmit={handleSaveProduction} className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                  Record Fresh Production Batch
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Product Made
                    </label>
                    <select
                      id="bakery-prod-select"
                      value={prodProductId}
                      onChange={(e) => setProdProductId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium bg-white"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Quantity Baked / Made
                    </label>
                    <input
                      id="bakery-prod-qty"
                      type="number"
                      min="1"
                      required
                      value={prodQuantity}
                      onChange={(e) => setProdQuantity(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Batch Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 500 morning loaves baked"
                    value={prodNotes}
                    onChange={(e) => setProdNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
                  />
                </div>

                <button
                  id="save-production-btn"
                  type="submit"
                  className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
                >
                  + Add to Stock & Log Output
                </button>
              </form>

              {/* Today's Production Log */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Today's Production Summary
                </h4>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl max-h-40 overflow-y-auto">
                  {productionLogs.map((log) => (
                    <div key={log.id} className="p-3 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900">{log.productName}</span>
                        <p className="text-[11px] text-slate-500">{log.notes || 'Routine bake'}</p>
                      </div>
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                        +{log.quantityProduced} units
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: WASTE */}
          {activeTab === 'waste' && (
            <div className="space-y-4">
              {/* AI Waste Insight Pill */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">AI Waste Partner: </span>
                  <span>
                    You recorded {totalWastedToday} items lost today (~{formatCurrency(totalWasteCost, currency)} cost value).
                    Keep waste below 3% of daily production to protect net margins.
                  </span>
                </div>
              </div>

              <form onSubmit={handleSaveWaste} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Record Damaged or Unsold Stock
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Product
                    </label>
                    <select
                      id="bakery-waste-prod-select"
                      value={wasteProductId}
                      onChange={(e) => setWasteProductId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium bg-white"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Quantity Wasted
                    </label>
                    <input
                      id="bakery-waste-qty"
                      type="number"
                      min="1"
                      required
                      value={wasteQuantity}
                      onChange={(e) => setWasteQuantity(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Reason
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                    {(['Burned', 'Unsold', 'Damaged', 'Expired', 'Other'] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setWasteReason(r)}
                        className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                          wasteReason === r
                            ? 'border-amber-600 bg-amber-100 text-amber-900'
                            : 'border-slate-200 bg-white text-slate-600'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  id="save-waste-btn"
                  type="submit"
                  className="w-full py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
                >
                  Record Waste & Deduct Stock
                </button>
              </form>

              {/* Waste History */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Waste History
                </h4>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl max-h-36 overflow-y-auto">
                  {wasteLogs.map((w) => (
                    <div key={w.id} className="p-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900">{w.productName}</span>
                        <p className="text-[11px] text-amber-700">Reason: {w.reason}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-red-600">-{w.quantityWasted} units</span>
                        <p className="text-[10px] text-slate-400">-{formatCurrency(w.estimatedLoss, currency)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
