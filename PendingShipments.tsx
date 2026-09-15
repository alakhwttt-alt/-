import { useState, useMemo } from 'react';
import {
  Inbox,
  Search,
  ArrowDownUp,
  MapPin,
  User,
  Phone,
  Clock,
  Calendar,
  X,
  Package,
} from 'lucide-react';
import { useShipments } from '@/hooks/useData';
import type { Shipment } from '@/types';
import { formatDateTime, formatDate } from '@/lib/utils';
import { LoadingSpinner, EmptyState } from '@/components/Loading';

type SortBy = 'date_desc' | 'date_asc' | 'receiver_az' | 'receiver_za';

interface PendingShipmentsProps {
  onShipmentClick: (shipment: Shipment) => void;
}

export function PendingShipments({ onShipmentClick }: PendingShipmentsProps) {
  const { shipments, loading } = useShipments();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('date_desc');
  const [showSortMenu, setShowSortMenu] = useState(false);

  const pendingShipments = useMemo(() => {
    // Filter only pending and received (not delivered or cancelled)
    let result = shipments.filter(
      (s) => s.status === 'pending' || s.status === 'received'
    );

    // Text search
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (s) =>
          s.shipment_number.toLowerCase().includes(q) ||
          (s.sender_name || '').toLowerCase().includes(q) ||
          (s.sender_phone || '').includes(q) ||
          (s.receiver_name || '').toLowerCase().includes(q) ||
          (s.receiver_phone || '').includes(q) ||
          (s.driver_name || '').toLowerCase().includes(q) ||
          (s.destination || '').toLowerCase().includes(q) ||
          (s.source_name || '').toLowerCase().includes(q)
      );
    }

    // Sort
    const sorted = [...result];
    switch (sortBy) {
      case 'date_desc':
        sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'date_asc':
        sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'receiver_az':
        sorted.sort((a, b) =>
          (a.receiver_name || 'ـ').localeCompare(b.receiver_name || 'ـ', 'ar')
        );
        break;
      case 'receiver_za':
        sorted.sort((a, b) =>
          (b.receiver_name || 'ـ').localeCompare(a.receiver_name || 'ـ', 'ar')
        );
        break;
    }

    return sorted;
  }, [shipments, searchQuery, sortBy]);

  const sortLabels: Record<SortBy, string> = {
    date_desc: 'الأحدث أولاً',
    date_asc: 'الأقدم أولاً',
    receiver_az: 'اسم المستلم (أ - ي)',
    receiver_za: 'اسم المستلم (ي - أ)',
  };

  const statusLabels: Record<string, string> = {
    pending: 'قيد الانتظار',
    received: 'تم الاستلام',
  };
  const statusColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800 border-amber-300',
    received: 'bg-blue-100 text-blue-800 border-blue-300',
  };

  if (loading) {
    return <LoadingSpinner text="جاري تحميل الشحنات..." />;
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 mb-1">الشحنات غير المسلّمة</h1>
        <p className="text-sm text-slate-500">
          جميع الشحنات قيد الانتظار والمستلمة التي لم تسلّم بعد
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-1">
            <Inbox className="w-5 h-5 text-slate-500" />
            <p className="text-sm font-semibold text-slate-600">الإجمالي</p>
          </div>
          <p className="text-xl font-bold text-slate-800">{pendingShipments.length}</p>
        </div>
        <div className="stat-card bg-amber-50 border-amber-200">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-5 h-5 text-amber-600" />
            <p className="text-sm font-semibold text-amber-700">قيد الانتظار</p>
          </div>
          <p className="text-xl font-bold text-amber-700">
            {pendingShipments.filter((s) => s.status === 'pending').length}
          </p>
        </div>
        <div className="stat-card bg-blue-50 border-blue-200">
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-5 h-5 text-blue-600" />
            <p className="text-sm font-semibold text-blue-700">تم الاستلام</p>
          </div>
          <p className="text-xl font-bold text-blue-700">
            {pendingShipments.filter((s) => s.status === 'received').length}
          </p>
        </div>
      </div>

      {/* Search + Sort */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            className="input-field pr-12"
            placeholder="ابحث برقم الشحنة، الاسم، الهاتف، الوجهة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Sort Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowSortMenu(!showSortMenu)}
            className="btn-secondary flex items-center gap-2 whitespace-nowrap"
          >
            <ArrowDownUp className="w-4 h-4" />
            <span className="text-sm">{sortLabels[sortBy]}</span>
          </button>
          {showSortMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowSortMenu(false)}
              />
              <div className="absolute top-full left-0 mt-1 z-20 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden min-w-[200px]">
                {(Object.keys(sortLabels) as SortBy[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSortBy(key);
                      setShowSortMenu(false);
                    }}
                    className={`w-full text-right px-4 py-3 text-sm font-semibold transition-colors hover:bg-slate-50 ${
                      sortBy === key ? 'text-teal-600 bg-teal-50' : 'text-slate-700'
                    }`}
                  >
                    {sortLabels[key]}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Results */}
      {pendingShipments.length === 0 ? (
        <EmptyState
          icon={<Inbox className="w-8 h-8 text-slate-300" />}
          title={searchQuery ? 'لا توجد نتائج' : 'لا توجد شحنات غير مسلّمة'}
          description={searchQuery ? 'جرّب بحثاً مختلفاً' : 'جميع الشحنات تم تسليمها'}
        />
      ) : (
        <>
          <p className="text-sm text-slate-500 font-semibold mb-3">
            عدد النتائج: {pendingShipments.length}
          </p>
          <div className="space-y-3">
            {pendingShipments.map((s) => (
              <button
                key={s.id}
                onClick={() => onShipmentClick(s)}
                className="card w-full text-right hover:shadow-md hover:border-teal-300 transition-all group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <Package className="w-6 h-6 text-slate-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 truncate">{s.shipment_number}</p>
                      <p className="text-sm text-slate-500 truncate">
                        {s.shipment_type} • {s.quantity} {s.quantity_unit}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {s.receiver_name && (
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {s.receiver_name}
                          </span>
                        )}
                        {s.destination && (
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {s.destination}
                          </span>
                        )}
                        {s.receiver_phone && (
                          <span className="text-xs text-slate-400 flex items-center gap-1" dir="ltr">
                            <Phone className="w-3 h-3" />
                            {s.receiver_phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-left flex-shrink-0">
                    <span className={`status-badge ${statusColors[s.status]}`}>
                      {statusLabels[s.status]}
                    </span>
                    <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(s.created_at)}
                    </p>
                    <p className="text-xs text-slate-400 flex items-center gap-1 justify-end mt-0.5">
                      <Clock className="w-3 h-3" />
                      {formatDateTime(s.received_at || s.created_at)}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
