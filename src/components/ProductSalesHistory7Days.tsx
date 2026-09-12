import React, { useState, useMemo } from 'react';
import { Product, Sale, CurrencyCode } from '../types';
import { formatCurrency } from '../utils/calculations';
import { 
  Calendar, 
  RefreshCw, 
  Package, 
  TrendingUp, 
  Clock, 
  ShoppingBag,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Layers,
  ArrowRight
} from 'lucide-react';

interface ProductSalesHistory7DaysProps {
  sales: Sale[];
  products: Product[];
  currency: CurrencyCode;
  isBeginner?: boolean;
  onRefresh?: () => Promise<void> | void;
  onNavigateToSales?: () => void;
}

interface ProductDayAggregate {
  productId: string;
  productName: string;
  category?: string;
  unit: string;
  quantitySold: number;
  totalRevenue: number;
  unitPrice: number;
  transactionCount: number;
}

interface DaySalesData {
  dateStr: string; // YYYY-MM-DD
  displayDate: string; // e.g. "Mon, Sep 8"
  fullFormattedDate: string; // e.g. "Monday, September 8, 2026"
  dayName: string; // "Monday"
  shortDay: string; // "Mon 8"
  relativeLabel: string; // "Today", "Yesterday", or ""
  isToday: boolean;
  isYesterday: boolean;
  products: ProductDayAggregate[];
  totalQuantity: number;
  totalRevenue: number;
  transactionCount: number;
  hasSales: boolean;
}

export const ProductSalesHistory7Days: React.FC<ProductSalesHistory7DaysProps> = ({
  sales,
  products,
  currency,
  isBeginner = false,
  onRefresh,
  onNavigateToSales,
}) => {
  // Selected date filter: 'all' or specific 'YYYY-MM-DD'
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>('Just now');
  const [viewMode, setViewMode] = useState<'grouped' | 'table'>('grouped');
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

  // Helper to normalize any ISO date string to YYYY-MM-DD in local time
  const toLocalDateStr = (dateInput: string | Date): string => {
    try {
      const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
      if (isNaN(d.getTime())) return '';
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return '';
    }
  };

  // 1. Generate the 7-day window: [today minus 6 days, through today] (7 calendar days)
  const sevenDays = useMemo(() => {
    const list: { date: Date; dateStr: string }[] = [];
    const now = new Date();
    // Reset to local day boundaries
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      list.push({
        date: d,
        dateStr: toLocalDateStr(d),
      });
    }
    return list;
  }, []);

  // Set of valid dates in the 7-day window for O(1) membership check
  const sevenDaysDateStrings = useMemo(() => {
    return new Set(sevenDays.map((d) => d.dateStr));
  }, [sevenDays]);

  // Product lookup map by ID and lower-cased name for metadata enrichment
  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach((p) => {
      if (p.id) map.set(p.id, p);
      if (p.name) map.set(p.name.toLowerCase(), p);
    });
    return map;
  }, [products]);

  // 2. Filter sales created within the last 7 days & aggregate data by date and product
  const aggregatedData = useMemo(() => {
    // Map: dateStr -> Map<productKey, ProductDayAggregate>
    const dayMap = new Map<string, Map<string, ProductDayAggregate>>();
    const dayMetaMap = new Map<string, { totalQuantity: number; totalRevenue: number; transactionCount: number }>();

    // Initialize all 7 days with empty maps so zero-sale days are always represented
    sevenDays.forEach(({ dateStr }) => {
      dayMap.set(dateStr, new Map<string, ProductDayAggregate>());
      dayMetaMap.set(dateStr, { totalQuantity: 0, totalRevenue: 0, transactionCount: 0 });
    });

    // Process transactions
    sales.forEach((sale) => {
      const saleDateStr = toLocalDateStr(sale.date);
      if (!saleDateStr || !sevenDaysDateStrings.has(saleDateStr)) {
        return; // Exclude sales outside the 7-day horizon
      }

      const currentDayProducts = dayMap.get(saleDateStr)!;
      const currentMeta = dayMetaMap.get(saleDateStr)!;
      currentMeta.transactionCount += 1;

      // Iterate through sale items
      if (sale.items && sale.items.length > 0) {
        sale.items.forEach((item) => {
          const qty = Number(item.quantity) || 0;
          if (qty <= 0) return;

          // Resolve product info
          const matchedProd = (item.productId && productMap.get(item.productId)) ||
            (item.productName && productMap.get(item.productName.toLowerCase()));

          const pId = item.productId || matchedProd?.id || `unassigned_${item.productName}`;
          const pName = item.productName || matchedProd?.name || 'Unnamed Product';
          const pCat = matchedProd?.category || 'General';
          const pUnit = matchedProd?.unit || 'pcs';

          // Calculate revenue for this line item
          const lineRevenue = item.subtotal ?? 
            item.total ?? 
            (qty * (item.unitPrice ?? item.sellingPrice ?? matchedProd?.sellingPrice ?? 0));

          currentMeta.totalQuantity += qty;
          currentMeta.totalRevenue += lineRevenue;

          const existingAgg = currentDayProducts.get(pId);
          if (existingAgg) {
            existingAgg.quantitySold += qty;
            existingAgg.totalRevenue += lineRevenue;
            existingAgg.transactionCount += 1;
            // Update effective unit price
            existingAgg.unitPrice = existingAgg.quantitySold > 0 
              ? existingAgg.totalRevenue / existingAgg.quantitySold 
              : existingAgg.unitPrice;
          } else {
            currentDayProducts.set(pId, {
              productId: pId,
              productName: pName,
              category: pCat,
              unit: pUnit,
              quantitySold: qty,
              totalRevenue: lineRevenue,
              unitPrice: qty > 0 ? lineRevenue / qty : (item.unitPrice ?? item.sellingPrice ?? 0),
              transactionCount: 1,
            });
          }
        });
      } else if (sale.totalAmount > 0) {
        // Fallback for sales without itemized details
        currentMeta.totalQuantity += 1;
        currentMeta.totalRevenue += sale.totalAmount;
        const generalKey = 'misc_sale';
        const existingAgg = currentDayProducts.get(generalKey);
        if (existingAgg) {
          existingAgg.quantitySold += 1;
          existingAgg.totalRevenue += sale.totalAmount;
          existingAgg.transactionCount += 1;
          existingAgg.unitPrice = existingAgg.totalRevenue / existingAgg.quantitySold;
        } else {
          currentDayProducts.set(generalKey, {
            productId: generalKey,
            productName: 'General Sale',
            category: 'Miscellaneous',
            unit: 'sale',
            quantitySold: 1,
            totalRevenue: sale.totalAmount,
            unitPrice: sale.totalAmount,
            transactionCount: 1,
          });
        }
      }
    });

    // Build the final DaySalesData objects for all 7 days
    const result: DaySalesData[] = sevenDays.map(({ date, dateStr }, index) => {
      const prodMap = dayMap.get(dateStr)!;
      const meta = dayMetaMap.get(dateStr)!;
      const productsList = Array.from(prodMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);

      const isToday = index === 0;
      const isYesterday = index === 1;
      const weekday = date.toLocaleDateString(undefined, { weekday: 'short' });
      const monthShort = date.toLocaleDateString(undefined, { month: 'short' });
      const dayNum = date.getDate();

      const displayDate = `${weekday}, ${monthShort} ${dayNum}`; // e.g. "Mon, Sep 8"
      const fullFormattedDate = date.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      return {
        dateStr,
        displayDate,
        fullFormattedDate,
        dayName: date.toLocaleDateString(undefined, { weekday: 'long' }),
        shortDay: isToday ? 'Today' : isYesterday ? 'Yesterday' : `${weekday} ${dayNum}`,
        relativeLabel: isToday ? 'Today' : isYesterday ? 'Yesterday' : '',
        isToday,
        isYesterday,
        products: productsList,
        totalQuantity: meta.totalQuantity,
        totalRevenue: meta.totalRevenue,
        transactionCount: meta.transactionCount,
        hasSales: productsList.length > 0 && meta.totalQuantity > 0,
      };
    });

    return result;
  }, [sales, sevenDays, sevenDaysDateStrings, productMap]);

  // Overall 7-Day summary metrics
  const overallMetrics = useMemo(() => {
    let grandRevenue = 0;
    let grandQuantity = 0;
    let activeDaysCount = 0;
    const overallProductMap = new Map<string, { name: string; qty: number; revenue: number }>();

    aggregatedData.forEach((day) => {
      grandRevenue += day.totalRevenue;
      grandQuantity += day.totalQuantity;
      if (day.hasSales) activeDaysCount += 1;

      day.products.forEach((p) => {
        const curr = overallProductMap.get(p.productName) || { name: p.productName, qty: 0, revenue: 0 };
        curr.qty += p.quantitySold;
        curr.revenue += p.totalRevenue;
        overallProductMap.set(p.productName, curr);
      });
    });

    let topProduct: { name: string; qty: number; revenue: number } | null = null;
    overallProductMap.forEach((val) => {
      if (!topProduct || val.revenue > topProduct.revenue) {
        topProduct = val;
      }
    });

    return {
      grandRevenue,
      grandQuantity,
      activeDaysCount,
      topProduct,
      avgDailyRevenue: grandRevenue / 7,
    };
  }, [aggregatedData]);

  // Filtered days based on user selection
  const filteredDays = useMemo(() => {
    if (selectedDateFilter === 'all') {
      return aggregatedData;
    }
    return aggregatedData.filter((d) => d.dateStr === selectedDateFilter);
  }, [aggregatedData, selectedDateFilter]);

  // Flat product rows for consolidated table view
  const flatTableRows = useMemo(() => {
    const rows: {
      dateStr: string;
      displayDate: string;
      isToday: boolean;
      product: ProductDayAggregate;
      isFirstOfDate: boolean;
      dateSpan: number;
    }[] = [];

    filteredDays.forEach((day) => {
      if (day.hasSales) {
        day.products.forEach((prod, pIdx) => {
          rows.push({
            dateStr: day.dateStr,
            displayDate: day.displayDate,
            isToday: day.isToday,
            product: prod,
            isFirstOfDate: pIdx === 0,
            dateSpan: day.products.length,
          });
        });
      }
    });

    return rows;
  }, [filteredDays]);

  const handleRefreshClick = async () => {
    setIsRefreshing(true);
    try {
      if (onRefresh) {
        await onRefresh();
      }
      setLastRefreshedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const toggleDayExpansion = (dateStr: string) => {
    setExpandedDays((prev) => ({
      ...prev,
      [dateStr]: prev[dateStr] === undefined ? false : !prev[dateStr],
    }));
  };

  return (
    <section 
      id="seven-day-product-sales-section" 
      className="p-5 sm:p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-6"
      aria-labelledby="seven-day-breakdown-heading"
    >
      {/* 1. Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 
                id="seven-day-breakdown-heading"
                className="text-lg font-bold font-['Outfit',sans-serif] text-slate-900 tracking-tight flex items-center gap-2"
              >
                <span>7-Day Product Sales Breakdown</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Last 7 Days
                </span>
              </h3>
            </div>
          </div>
          <p className="text-xs text-slate-500 pl-10">
            {isBeginner 
              ? 'See exactly how many items you sold and money earned each day this week'
              : 'Detailed daily transaction ledger grouped by product, quantity, unit price, and daily totals'}
          </p>
        </div>

        {/* Action Controls: View Switcher, Refresh & Print */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Mode Toggle */}
          <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-semibold">
            <button
              id="view-mode-grouped-btn"
              type="button"
              onClick={() => setViewMode('grouped')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'grouped'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Daily Cards</span>
            </button>
            <button
              id="view-mode-table-btn"
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Full Table</span>
            </button>
          </div>

          {/* Refresh Toggle */}
          <button
            id="refresh-seven-day-sales-btn"
            type="button"
            disabled={isRefreshing}
            onClick={handleRefreshClick}
            className="py-2 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh 7-day sales from database"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh Data</span>
          </button>
        </div>
      </div>

      {/* 2. Key 7-Day Performance Indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">7-Day Revenue</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <p className="text-xl font-extrabold text-slate-900 font-['Outfit',sans-serif]">
            {formatCurrency(overallMetrics.grandRevenue, currency)}
          </p>
          <p className="text-[10px] text-slate-500">
            Avg {formatCurrency(overallMetrics.avgDailyRevenue, currency)} / day
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Items Sold</span>
            <ShoppingBag className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <p className="text-xl font-extrabold text-slate-900 font-['Outfit',sans-serif]">
            {overallMetrics.grandQuantity.toLocaleString()}
          </p>
          <p className="text-[10px] text-slate-500">
            Across {overallMetrics.activeDaysCount} active days
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Top Product</span>
            <Package className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <p className="text-sm font-bold text-slate-900 truncate" title={overallMetrics.topProduct?.name || 'No sales yet'}>
            {overallMetrics.topProduct?.name || 'No sales yet'}
          </p>
          <p className="text-[10px] text-emerald-700 font-semibold truncate">
            {overallMetrics.topProduct ? `${formatCurrency(overallMetrics.topProduct.revenue, currency)} (${overallMetrics.topProduct.qty} sold)` : '0 sales'}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Sync Status</span>
            <Clock className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Live Scoped</span>
          </p>
          <p className="text-[10px] text-slate-500 truncate">
            Synced: {lastRefreshedAt}
          </p>
        </div>
      </div>

      {/* 3. Quick Date Selector Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            Filter by Day:
          </span>
          {selectedDateFilter !== 'all' && (
            <button
              id="reset-date-filter-btn"
              type="button"
              onClick={() => setSelectedDateFilter('all')}
              className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold cursor-pointer underline"
            >
              Show all 7 days
            </button>
          )}
        </div>

        <div 
          id="seven-day-selector-pills"
          className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none"
        >
          {/* "All 7 Days" Pill */}
          <button
            id="filter-day-all-btn"
            type="button"
            onClick={() => setSelectedDateFilter('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer flex-shrink-0 ${
              selectedDateFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <span>All 7 Days</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
              selectedDateFilter === 'all' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {overallMetrics.grandQuantity} items
            </span>
          </button>

          {/* Individual Day Pills */}
          {aggregatedData.map((day) => {
            const isSelected = selectedDateFilter === day.dateStr;
            return (
              <button
                key={day.dateStr}
                id={`filter-day-${day.dateStr}-btn`}
                type="button"
                onClick={() => setSelectedDateFilter(day.dateStr)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer flex-shrink-0 border ${
                  isSelected
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs font-bold'
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {day.hasSales ? (
                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-500'}`} />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                  )}
                  <span>{day.shortDay}</span>
                </div>

                {day.hasSales && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                    isSelected ? 'bg-emerald-700 text-white' : 'bg-emerald-50 text-emerald-700'
                  }`}>
                    {formatCurrency(day.totalRevenue, currency)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Display Content: Grouped Daily Cards vs Full Table */}
      {viewMode === 'grouped' ? (
        /* GROUPED DAILY BREAKDOWN (Cards with per-day breakdown & Daily Summary Row) */
        <div className="space-y-4">
          {filteredDays.map((day) => {
            const isExpanded = expandedDays[day.dateStr] !== false; // Default expanded

            return (
              <div
                key={day.dateStr}
                id={`day-group-${day.dateStr}`}
                className={`rounded-2xl border transition-all ${
                  day.isToday 
                    ? 'border-emerald-300 bg-emerald-50/20' 
                    : day.hasSales 
                      ? 'border-slate-200 bg-white' 
                      : 'border-slate-200/60 bg-slate-50/40'
                }`}
              >
                {/* Day Header */}
                <div 
                  onClick={() => toggleDayExpansion(day.dateStr)}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-50/80 rounded-t-2xl transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${
                      day.isToday 
                        ? 'bg-emerald-600 text-white shadow-xs' 
                        : day.hasSales
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-200 text-slate-500'
                    }`}>
                      {day.dateStr.slice(-2)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-slate-900">
                          {day.displayDate}
                        </h4>
                        {day.relativeLabel && (
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide ${
                            day.isToday ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {day.relativeLabel}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {day.hasSales
                          ? `${day.products.length} product${day.products.length > 1 ? 's' : ''} sold • ${day.transactionCount} transaction${day.transactionCount > 1 ? 's' : ''}`
                          : 'Zero transactions'}
                      </p>
                    </div>
                  </div>

                  {/* Daily Headline Summary on Header */}
                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    {day.hasSales ? (
                      <div className="text-right">
                        <span className="text-xs text-slate-400 block sm:inline mr-2">Daily Revenue:</span>
                        <span className="font-extrabold text-sm text-emerald-700 font-['Outfit',sans-serif]">
                          {formatCurrency(day.totalRevenue, currency)}
                        </span>
                        <span className="text-[11px] text-slate-500 block font-medium">
                          {day.totalQuantity} items sold
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">No sales</span>
                    )}

                    <button 
                      type="button" 
                      className="p-1.5 text-slate-400 hover:text-slate-600"
                      aria-label="Toggle day expansion"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Day Details: Product Table or Graceful Empty State */}
                {isExpanded && (
                  <div className="border-t border-slate-100 p-4 pt-2">
                    {day.hasSales ? (
                      <div className="space-y-3">
                        {/* Table of items sold on this day */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                                <th className="py-2.5 px-3">Date</th>
                                <th className="py-2.5 px-3">Product Name</th>
                                <th className="py-2.5 px-3 text-right">Quantity Sold</th>
                                <th className="py-2.5 px-3 text-right">Unit Price / Total Revenue</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {day.products.map((prod) => (
                                <tr key={prod.productId} className="hover:bg-slate-50/60 transition-colors">
                                  <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap font-medium">
                                    {day.displayDate}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <div className="flex items-center gap-2">
                                      <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center flex-shrink-0 font-bold text-[11px]">
                                        <Package className="w-3.5 h-3.5" />
                                      </div>
                                      <div>
                                        <span className="font-bold text-slate-900 block">
                                          {prod.productName}
                                        </span>
                                        <span className="text-[10px] text-slate-400">
                                          {prod.category}
                                        </span>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-extrabold text-slate-800 whitespace-nowrap">
                                    <span>{prod.quantitySold}</span>
                                    <span className="text-slate-400 font-normal ml-1 text-[11px]">{prod.unit}</span>
                                  </td>
                                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                    <span className="text-slate-400 text-[11px] mr-2">
                                      @{formatCurrency(prod.unitPrice, currency)}
                                    </span>
                                    <span className="font-bold text-emerald-700 text-xs">
                                      {formatCurrency(prod.totalRevenue, currency)}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Daily Summary Row */}
                        <div 
                          id={`daily-summary-row-${day.dateStr}`}
                          className="p-3 rounded-xl bg-slate-100/90 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-semibold text-slate-800"
                        >
                          <div className="flex items-center gap-2 text-slate-600">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>
                              <strong>Daily Summary ({day.shortDay}):</strong> Total of {day.products.length} product type{day.products.length > 1 ? 's' : ''} moved
                            </span>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-4 text-right">
                            <div>
                              <span className="text-slate-500 font-normal mr-1.5">Total Items Sold:</span>
                              <span className="font-extrabold text-slate-900">
                                {day.totalQuantity.toLocaleString()}
                              </span>
                            </div>
                            <div className="pl-3 border-l border-slate-300">
                              <span className="text-slate-500 font-normal mr-1.5">Total Earnings:</span>
                              <span className="font-extrabold text-emerald-700 font-['Outfit',sans-serif]">
                                {formatCurrency(day.totalRevenue, currency)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Graceful Empty State for day with 0 sales */
                      <div 
                        id={`empty-day-${day.dateStr}`}
                        className="py-6 px-4 text-center rounded-xl bg-slate-50/70 border border-dashed border-slate-200 space-y-1"
                      >
                        <ShoppingBag className="w-6 h-6 text-slate-300 mx-auto" />
                        <p className="text-xs font-semibold text-slate-600">
                          No sales recorded on this day
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {day.fullFormattedDate} had 0 sales transactions entered in the database.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* CONSOLIDATED BREAKDOWN TABLE VIEW */
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4 text-right">Quantity Sold</th>
                  <th className="py-3 px-4 text-right">Unit Price / Total Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {flatTableRows.length > 0 ? (
                  flatTableRows.map((row, idx) => (
                    <tr key={`${row.dateStr}-${row.product.productId}-${idx}`} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-800">{row.displayDate}</span>
                          {row.isToday && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded">
                              Today
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-slate-100 text-slate-500 flex items-center justify-center flex-shrink-0">
                            <Package className="w-3 h-3" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">{row.product.productName}</span>
                            <span className="text-[10px] text-slate-400">{row.product.category}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span className="font-extrabold text-slate-900">{row.product.quantitySold}</span>
                        <span className="text-slate-400 font-normal ml-1 text-[11px]">{row.product.unit}</span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span className="text-slate-400 text-[11px] mr-2">
                          @{formatCurrency(row.product.unitPrice, currency)}
                        </span>
                        <span className="font-bold text-emerald-700 text-xs">
                          {formatCurrency(row.product.totalRevenue, currency)}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-600">No product sales found for this filter</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Try selecting "All 7 Days" or recording a new sale</p>
                    </td>
                  </tr>
                )}
              </tbody>
              {/* Daily Summary & 7-Day Grand Summary Footer */}
              <tfoot>
                <tr className="bg-slate-900 text-white font-bold text-xs">
                  <td className="py-3 px-4" colSpan={2}>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                      <span>7-Day Aggregated Total (All Filtered Days)</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap font-extrabold text-emerald-300">
                    {filteredDays.reduce((acc, d) => acc + d.totalQuantity, 0).toLocaleString()} items
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap font-extrabold text-emerald-400 text-sm font-['Outfit',sans-serif]">
                    {formatCurrency(filteredDays.reduce((acc, d) => acc + d.totalRevenue, 0), currency)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* 5. Helpful footer notice & Quick Action */}
      <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Data is filtered to transactions from today minus 6 days for your active workspace.</span>
        </div>

        {onNavigateToSales && (
          <button
            id="navigate-to-new-sale-btn"
            type="button"
            onClick={onNavigateToSales}
            className="text-emerald-700 hover:text-emerald-800 font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>Record New Sale</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </section>
  );
};
