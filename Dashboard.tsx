import {
  Package,
  Clock,
  PackageCheck,
  XCircle,
  Inbox,
  TrendingUp,
  Wallet,
  CircleDollarSign,
  ArrowLeftRight,
} from 'lucide-react';
import { useMemo } from 'react';
import { useShipments, useDriverPayments } from '@/hooks/useData';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { LoadingSpinner } from '@/components/Loading';

interface DashboardProps {
  onNavigate: (page: 'receive' | 'deliver' | 'search') => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { shipments, loading } = useShipments();
  const { payments } = useDriverPayments();

  const stats = useMemo(() => {
    const total = shipments.length;
    const pending = shipments.filter((s) => s.status === 'pending').length;
    const received = shipments.filter((s) => s.status === 'received').length;
    const delivered = shipments.filter((s) => s.status === 'delivered').length;
    const cancelled = shipments.filter((s) => s.status === 'cancelled').length;

    const totalParcelFees = shipments.reduce((sum, s) => sum + (s.parcel_fees || 0), 0);
    const totalDriverDues = shipments.reduce((sum, s) => sum + (s.driver_total_dues || 0), 0);
    const totalDriverPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalRemaining = totalDriverDues - totalDriverPaid;

    return {
      total,
      pending,
      received,
      delivered,
      cancelled,
      totalParcelFees,
      totalDriverDues,
      totalDriverPaid,
      totalRemaining,
    };
  }, [shipments, payments]);

  if (loading) {
    return <LoadingSpinner text="جاري تحميل البيانات..." />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => onNavigate('receive')}
          className="card flex items-center gap-4 hover:shadow-md hover:border-teal-300 transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center group-hover:bg-teal-100 transition-colors">
            <Package className="w-6 h-6" />
          </div>
          <div className="text-right">
            <p className="font-bold text-slate-800">استلام شحنة جديدة</p>
            <p className="text-sm text-slate-500">إضافة شحنة واردة</p>
          </div>
        </button>

        <button
          onClick={() => onNavigate('deliver')}
          className="card flex items-center gap-4 hover:shadow-md hover:border-teal-300 transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
            <PackageCheck className="w-6 h-6" />
          </div>
          <div className="text-right">
            <p className="font-bold text-slate-800">تسليم شحنة</p>
            <p className="text-sm text-slate-500">إيصال تسليم جديد</p>
          </div>
        </button>

        <button
          onClick={() => onNavigate('search')}
          className="card flex items-center gap-4 hover:shadow-md hover:border-teal-300 transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
            <Inbox className="w-6 h-6" />
          </div>
          <div className="text-right">
            <p className="font-bold text-slate-800">البحث في الشحنات</p>
            <p className="text-sm text-slate-500">بحث وتصفية</p>
          </div>
        </button>
      </div>

      {/* Shipment Status Overview */}
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-3">حالة الشحنات</h2>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <StatusCard
            label="إجمالي الشحنات"
            value={formatNumber(stats.total)}
            icon={<Package className="w-5 h-5" />}
            color="slate"
          />
          <StatusCard
            label="قيد الانتظار"
            value={formatNumber(stats.pending)}
            icon={<Clock className="w-5 h-5" />}
            color="amber"
          />
          <StatusCard
            label="تم الاستلام"
            value={formatNumber(stats.received)}
            icon={<Inbox className="w-5 h-5" />}
            color="blue"
          />
          <StatusCard
            label="تم التسليم"
            value={formatNumber(stats.delivered)}
            icon={<PackageCheck className="w-5 h-5" />}
            color="emerald"
          />
          <StatusCard
            label="ملغي"
            value={formatNumber(stats.cancelled)}
            icon={<XCircle className="w-5 h-5" />}
            color="red"
          />
        </div>
      </div>

      {/* Financial Overview */}
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-3">الملخص المالي</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Office Income */}
          <div className="card bg-gradient-to-br from-teal-50 to-teal-50/50 border-teal-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-800">دخل المكتب (رسوم الأمانات)</h3>
            </div>
            <p className="text-3xl font-bold text-teal-700">
              {formatCurrency(stats.totalParcelFees)}
            </p>
          </div>

          {/* Driver Financials */}
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-slate-700 text-white flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-800">حسابات السائقين</h3>
            </div>
            <div className="space-y-3">
              <FinancialRow
                icon={<CircleDollarSign className="w-4 h-4 text-slate-500" />}
                label="إجمالي المستحقات"
                value={formatCurrency(stats.totalDriverDues)}
              />
              <FinancialRow
                icon={<ArrowLeftRight className="w-4 h-4 text-emerald-600" />}
                label="إجمالي المدفوع"
                value={formatCurrency(stats.totalDriverPaid)}
                valueClass="text-emerald-600"
              />
              <div className="border-t border-slate-200 pt-3">
                <FinancialRow
                  icon={<Wallet className="w-4 h-4 text-amber-600" />}
                  label="المتبقي للسائقين"
                  value={formatCurrency(stats.totalRemaining)}
                  valueClass={
                    stats.totalRemaining > 0
                      ? 'text-amber-600 font-bold'
                      : 'text-emerald-600 font-bold'
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Shipments */}
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-3">أحدث الشحنات</h2>
        <div className="card p-0 overflow-hidden">
          {shipments.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <Inbox className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              <p className="font-semibold">لا توجد شحنات بعد</p>
              <p className="text-sm mt-1">ابدأ باستلام شحنة جديدة</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {shipments.slice(0, 5).map((s) => (
                <div key={s.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                      <Package className="w-5 h-5 text-slate-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{s.shipment_number}</p>
                      <p className="text-xs text-slate-500">
                        {s.shipment_type} • {s.destination || '—'}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={s.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: 'slate' | 'amber' | 'blue' | 'emerald' | 'red';
}) {
  const colors = {
    slate: 'bg-slate-50 text-slate-600 border-slate-200',
    amber: 'bg-amber-50 text-amber-600 border-amber-200',
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    red: 'bg-red-50 text-red-600 border-red-200',
  };

  return (
    <div className="stat-card">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 border ${colors[color]}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-sm text-slate-500 font-semibold mt-0.5">{label}</p>
    </div>
  );
}

function FinancialRow({
  icon,
  label,
  value,
  valueClass = 'text-slate-800',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm text-slate-600 font-semibold">{label}</span>
      </div>
      <span className={`text-sm font-bold ${valueClass}`}>{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    pending: 'قيد الانتظار',
    received: 'تم الاستلام',
    delivered: 'تم التسليم',
    cancelled: 'ملغي',
  };
  const colors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800 border-amber-300',
    received: 'bg-blue-100 text-blue-800 border-blue-300',
    delivered: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    cancelled: 'bg-red-100 text-red-800 border-red-300',
  };

  return (
    <span className={`status-badge ${colors[status] || 'bg-slate-100 text-slate-700 border-slate-300'}`}>
      {labels[status] || status}
    </span>
  );
}
