import React from 'react';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  Truck, 
  BarChart3,
  Lock,
  LucideIcon
} from 'lucide-react';

export type NavTabId = 'dashboard' | 'products' | 'customers' | 'suppliers' | 'reports';

interface BottomNavBarProps {
  activeTab: string;
  onSelectTab: (tab: NavTabId) => void;
  beginnerMode?: boolean;
  isCashierMode?: boolean;
}

interface NavItemConfig {
  id: NavTabId;
  label: string;
  beginnerLabel?: string;
  icon: LucideIcon;
  ariaLabel: string;
}

const NAV_ITEMS: NavItemConfig[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    beginnerLabel: 'Dashboard',
    icon: LayoutDashboard,
    ariaLabel: 'Navigate to Dashboard',
  },
  {
    id: 'products',
    label: 'Products',
    beginnerLabel: 'Products',
    icon: Package,
    ariaLabel: 'Navigate to Products and Inventory',
  },
  {
    id: 'customers',
    label: 'Customers',
    beginnerLabel: 'Customers',
    icon: Users,
    ariaLabel: 'Navigate to Customers and Receivables',
  },
  {
    id: 'suppliers',
    label: 'Suppliers',
    beginnerLabel: 'Suppliers',
    icon: Truck,
    ariaLabel: 'Navigate to Suppliers and Payables',
  },
  {
    id: 'reports',
    label: 'Reports',
    beginnerLabel: 'Reports',
    icon: BarChart3,
    ariaLabel: 'Navigate to Financial Reports and Analytics',
  },
];

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  onSelectTab,
  beginnerMode = false,
  isCashierMode = false,
}) => {
  return (
    <nav
      id="bottom-navigation-bar"
      aria-label="Mobile Bottom Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 shadow-[0_-4px_24px_rgba(0,0,0,0.35)] select-none pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] pt-1.5 px-2"
    >
      <div className="max-w-md mx-auto grid grid-cols-5 gap-1 items-center">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const displayLabel = beginnerMode && item.beginnerLabel ? item.beginnerLabel : item.label;

          return (
            <button
              key={item.id}
              id={`bottom-nav-tab-${item.id}`}
              type="button"
              onClick={() => onSelectTab(item.id)}
              aria-label={item.ariaLabel}
              aria-current={isActive ? 'page' : undefined}
              className={`group flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-200 cursor-pointer active:scale-95 touch-manipulation relative ${
                isActive ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {/* Icon Container with active glow */}
              <div
                className={`relative flex items-center justify-center w-10 h-7 rounded-full transition-all duration-200 ${
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.35)] ring-1 ring-emerald-500/40'
                    : 'group-hover:bg-slate-800/60 text-slate-400 group-hover:text-slate-200'
                }`}
              >
                <Icon
                  className={`w-4 h-4 transition-transform duration-200 ${
                    isActive ? 'scale-110 stroke-[2.4]' : 'scale-100 stroke-[1.8] group-hover:scale-105'
                  }`}
                />
                {item.id === 'reports' && isCashierMode && (
                  <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 p-0.5 rounded-full shadow-xs">
                    <Lock className="w-2.5 h-2.5" />
                  </span>
                )}
              </div>

              {/* Text Label */}
              <span
                className={`text-[10px] sm:text-[11px] font-medium tracking-tight mt-0.5 truncate max-w-full leading-tight transition-colors duration-200 ${
                  isActive ? 'font-bold text-emerald-400' : 'text-slate-400 group-hover:text-slate-200'
                }`}
              >
                {displayLabel}
              </span>

              {/* Active Indicator Micro-dot */}
              {isActive && (
                <span
                  className="w-1 h-1 rounded-full bg-emerald-400 mt-0.5 shadow-[0_0_4px_#34d399] transition-all"
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
