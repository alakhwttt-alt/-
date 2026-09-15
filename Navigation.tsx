import {
  LayoutDashboard,
  PackagePlus,
  PackageCheck,
  Search,
  Users,
  Receipt,
  Menu,
  X,
  Truck,
  Inbox,
  Download,
} from 'lucide-react';
import { useState } from 'react';

export type Page =
  | 'dashboard'
  | 'receive'
  | 'deliver'
  | 'pending'
  | 'search'
  | 'drivers'
  | 'receipts'
  | 'export';

interface NavigationProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const navItems: { id: Page; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'الرئيسية', icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: 'receive', label: 'استلام شحنة', icon: <PackagePlus className="w-5 h-5" /> },
  { id: 'deliver', label: 'تسليم شحنة', icon: <PackageCheck className="w-5 h-5" /> },
  { id: 'pending', label: 'غير المسلّمة', icon: <Inbox className="w-5 h-5" /> },
  { id: 'search', label: 'البحث', icon: <Search className="w-5 h-5" /> },
  { id: 'drivers', label: 'حسابات السائقين', icon: <Users className="w-5 h-5" /> },
  { id: 'receipts', label: 'إيصالات التسليم', icon: <Receipt className="w-5 h-5" /> },
  { id: 'export', label: 'تصدير البيانات', icon: <Download className="w-5 h-5" /> },
];

export function Navigation({ currentPage, onNavigate }: NavigationProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNavigate = (page: Page) => {
    onNavigate(page);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-l border-slate-200 min-h-screen sticky top-0">
        <div className="px-5 py-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center shadow-md">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">سهيل إكسبرس</h1>
              <p className="text-xs text-slate-400 font-semibold">إدارة الشحنات</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigate(item.id)}
              className={`nav-item w-full text-right ${currentPage === item.id ? 'nav-item-active' : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-slate-200">
          <p className="text-xs text-slate-400 text-center font-semibold">
            سهيل إكسبرس &copy; 2026
          </p>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 z-40 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-base font-bold text-slate-800">سهيل إكسبرس</h1>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
      </header>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative bg-white w-72 max-w-[80vw] h-full flex flex-col animate-slide-in mr-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center">
                  <Truck className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-base font-bold text-slate-800">سهيل إكسبرس</h1>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  className={`nav-item w-full text-right ${currentPage === item.id ? 'nav-item-active' : ''}`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
