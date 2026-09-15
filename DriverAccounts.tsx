import { useState, useMemo } from 'react';
import { Users, Wallet, TrendingUp, ArrowLeftRight, Search, ChevronDown, ChevronUp, Truck, UserPlus } from 'lucide-react';
import { useShipments, useDriverPayments } from '@/hooks/useData';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { exportDriversVCard } from '@/lib/exportUtils';
import { showToast } from '@/components/Toast';
import { LoadingSpinner, EmptyState } from '@/components/Loading';

export function DriverAccounts() {
  const { shipments, loading: shipLoading } = useShipments();
  const { payments, loading: payLoading } = useDriverPayments();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDriver, setExpandedDriver] = useState<string | null>(null);

  const driverData = useMemo(() => {
    const driverMap = new Map<string, {
      name: string;
      phone: string;
      totalDues: number;
      totalPaid: number;
      shipmentCount: number;
      payments: typeof payments;
    }>();

    // Aggregate dues from shipments
    for (const s of shipments) {
      if (!s.driver_name) continue;
      const key = s.driver_name;
      if (!driverMap.has(key)) {
        driverMap.set(key, {
          name: s.driver_name,
          phone: s.driver_phone || '',
          totalDues: 0,
          totalPaid: 0,
          shipmentCount: 0,
          payments: [],
        });
      }
      const driver = driverMap.get(key)!;
      driver.totalDues += s.driver_total_dues || 0;
      driver.shipmentCount += 1;
      if (s.driver_phone) driver.phone = s.driver_phone;
    }

    // Aggregate payments
    for (const p of payments) {
      const key = p.driver_name || '';
      if (!driverMap.has(key)) {
        driverMap.set(key, {
          name: key,
          phone: '',
          totalDues: 0,
          totalPaid: 0,
          shipmentCount: 0,
          payments: [],
        });
      }
      const driver = driverMap.get(key)!;
      driver.totalPaid += p.amount;
      driver.payments.push(p);
    }

    let drivers = Array.from(driverMap.values()).map((d) => ({
      ...d,
      remaining: d.totalDues - d.totalPaid,
    }));

    // Sort by remaining descending
    drivers.sort((a, b) => b.remaining - a.remaining);

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      drivers = drivers.filter((d) => d.name.toLowerCase().includes(q) || d.phone.includes(q));
    }

    return drivers;
  }, [shipments, payments, searchQuery]);

  const totals = useMemo(() => {
    return driverData.reduce(
      (acc, d) => ({
        totalDues: acc.totalDues + d.totalDues,
        totalPaid: acc.totalPaid + d.totalPaid,
        totalRemaining: acc.totalRemaining + d.remaining,
      }),
      { totalDues: 0, totalPaid: 0, totalRemaining: 0 }
    );
  }, [driverData]);

  if (shipLoading || payLoading) {
    return <LoadingSpinner text="جاري تحميل حسابات السائقين..." />;
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 mb-1">حسابات السائقين</h1>
        <p className="text-sm text-slate-500">إجمالي المستحقات والمدفوعات والمتبقي لكل سائق</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="stat-card bg-slate-50 border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-slate-500" />
            <p className="text-sm font-semibold text-slate-600">إجمالي المستحقات</p>
          </div>
          <p className="text-xl font-bold text-slate-800">{formatCurrency(totals.totalDues)}</p>
        </div>
        <div className="stat-card bg-emerald-50 border-emerald-200">
          <div className="flex items-center gap-2 mb-2">
            <ArrowLeftRight className="w-5 h-5 text-emerald-600" />
            <p className="text-sm font-semibold text-emerald-700">إجمالي المدفوع</p>
          </div>
          <p className="text-xl font-bold text-emerald-700">{formatCurrency(totals.totalPaid)}</p>
        </div>
        <div className="stat-card bg-amber-50 border-amber-200">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-5 h-5 text-amber-600" />
            <p className="text-sm font-semibold text-amber-700">إجمالي المتبقي</p>
          </div>
          <p className="text-xl font-bold text-amber-700">{formatCurrency(totals.totalRemaining)}</p>
        </div>
      </div>

      {/* Search + Export */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            className="input-field pr-12"
            placeholder="ابحث عن سائق..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button
          onClick={() => {
            const ok = exportDriversVCard(shipments);
            if (ok) showToast('success', 'تم تصدير أرقام السائقين');
            else showToast('warning', 'لا توجد أرقام سائقين');
          }}
          className="btn-secondary flex items-center gap-2 whitespace-nowrap"
        >
          <UserPlus className="w-4 h-4" />
          تصدير أرقام السائقين
        </button>
      </div>

      {/* Driver List */}
      {driverData.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8 text-slate-300" />}
          title="لا يوجد سائقون"
          description="لم يتم تسجيل أي شحنات بسائقين بعد"
        />
      ) : (
        <div className="space-y-3">
          {driverData.map((driver) => (
            <div key={driver.name} className="card p-0 overflow-hidden">
              {/* Driver Header */}
              <button
                onClick={() =>
                  setExpandedDriver(expandedDriver === driver.name ? null : driver.name)
                }
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-right"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                    <Truck className="w-6 h-6 text-slate-500" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{driver.name}</p>
                    {driver.phone && (
                      <p className="text-xs text-slate-400" dir="ltr">{driver.phone}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-0.5">
                      {driver.shipmentCount} شحنة
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-left">
                    <p className={`text-sm font-bold ${driver.remaining > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {formatCurrency(driver.remaining)}
                    </p>
                    <p className="text-xs text-slate-400">المتبقي</p>
                  </div>
                  {expandedDriver === driver.name ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )}
                </div>
              </button>

              {/* Driver Expanded Details */}
              {expandedDriver === driver.name && (
                <div className="border-t border-slate-100 p-4 space-y-3 animate-fade-in">
                  {/* Financial Summary */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-slate-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-slate-500 font-semibold mb-1">المستحقات</p>
                      <p className="text-sm font-bold text-slate-800">{formatCurrency(driver.totalDues)}</p>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-emerald-600 font-semibold mb-1">المدفوع</p>
                      <p className="text-sm font-bold text-emerald-700">{formatCurrency(driver.totalPaid)}</p>
                    </div>
                    <div className={`rounded-lg p-3 text-center ${driver.remaining > 0 ? 'bg-amber-50' : 'bg-emerald-50'}`}>
                      <p className={`text-xs font-semibold mb-1 ${driver.remaining > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        المتبقي
                      </p>
                      <p className={`text-sm font-bold ${driver.remaining > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                        {formatCurrency(driver.remaining)}
                      </p>
                    </div>
                  </div>

                  {/* Payment History */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-700 mb-2">سجل المدفوعات</h4>
                    {driver.payments.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-3">لا توجد مدفوعات</p>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {driver.payments
                          .sort((a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime())
                          .map((p) => (
                            <div key={p.id} className="flex items-center justify-between bg-slate-50 rounded-lg p-3">
                              <div>
                                <p className="font-bold text-slate-800 text-sm">{formatCurrency(p.amount)}</p>
                                <p className="text-xs text-slate-500">
                                  {p.payment_method || '—'} • {formatDateTime(p.paid_at)}
                                </p>
                                {p.notes && <p className="text-xs text-slate-400 mt-0.5">{p.notes}</p>}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
