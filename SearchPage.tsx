import { useState, useMemo } from 'react';
import {
  Search,
  Calendar,
  Package,
  MapPin,
  User,
  Phone,
  X,
  Filter,
  Inbox,
} from 'lucide-react';
import { useShipments } from '@/hooks/useData';
import type { Shipment } from '@/types';
import {
  formatDateTime,
  getTodayDate,
  getYesterdayDate,
  getDateRange,
} from '@/lib/utils';
import { LoadingSpinner, EmptyState } from '@/components/Loading';

type DateFilter = 'all' | 'today' | 'yesterday' | 'custom';

interface SearchPageProps {
  onShipmentClick: (shipment: Shipment) => void;
}

export function SearchPage({ onShipmentClick }: SearchPageProps) {
  const { shipments, loading } = useShipments();
  const [query, setQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [customDate, setCustomDate] = useState(getTodayDate());

  const filteredShipments = useMemo(() => {
    let result = shipments;

    // Date filter
    if (dateFilter !== 'all') {
      const dateStr = dateFilter === 'today' ? getTodayDate() : dateFilter === 'yesterday' ? getYesterdayDate() : customDate;
      const { start, end } = getDateRange(dateStr);
      result = result.filter((s) => {
        const created = new Date(s.created_at);
        return created >= new Date(start) && created <= new Date(end);
      });
    }

    // Text search
    if (query.trim()) {
      const q = query.trim().toLowerCase();
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

    return result;
  }, [shipments, query, dateFilter, customDate]);

  const dateFilterLabels: Record<DateFilter, string> = {
    all: 'الكل',
    today: 'اليوم',
    yesterday: 'أمس',
    custom: 'تاريخ محدد',
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 mb-1">البحث في الشحنات</h1>
        <p className="text-sm text-slate-500">ابحث برقم الشحنة، الإيصال، الاسم، الهاتف، أو الوجهة</p>
      </div>

      {/* Search Input */}
      <div className="relative mb-4">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          className="input-field pr-12 text-lg"
          placeholder="ابحث..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Date Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex items-center gap-1 text-slate-500 font-semibold text-sm ml-2">
          <Filter className="w-4 h-4" />
          <span>الفترة:</span>
        </div>
        {(Object.keys(dateFilterLabels) as DateFilter[]).map((key) => (
          <button
            key={key}
            onClick={() => setDateFilter(key)}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
              dateFilter === key
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {dateFilterLabels[key]}
          </button>
        ))}
        {dateFilter === 'custom' && (
          <input
            type="date"
            className="input-field max-w-[180px] py-2"
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
          />
        )}
      </div>

      {/* Results */}
      {loading ? (
        <LoadingSpinner text="جاري البحث..." />
      ) : filteredShipments.length === 0 ? (
        <EmptyState
          icon={<Inbox className="w-8 h-8 text-slate-300" />}
          title="لا توجد نتائج"
          description="جرّب تعديل البحث أو الفترة الزمنية"
        />
      ) : (
        <>
          <p className="text-sm text-slate-500 font-semibold mb-3">
            عدد النتائج: {filteredShipments.length}
          </p>
          <div className="space-y-3">
            {filteredShipments.map((s) => (
              <ShipmentListItem key={s.id} shipment={s} onClick={() => onShipmentClick(s)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ShipmentListItem({ shipment, onClick }: { shipment: Shipment; onClick: () => void }) {
  const statusLabels: Record<string, string> = {
    pending: 'قيد الانتظار',
    received: 'تم الاستلام',
    delivered: 'تم التسليم',
    cancelled: 'ملغي',
  };
  const statusColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800 border-amber-300',
    received: 'bg-blue-100 text-blue-800 border-blue-300',
    delivered: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    cancelled: 'bg-red-100 text-red-800 border-red-300',
  };

  return (
    <button
      onClick={onClick}
      className="card w-full text-right hover:shadow-md hover:border-teal-300 transition-all group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
            <Package className="w-6 h-6 text-slate-500" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-slate-800 truncate">{shipment.shipment_number}</p>
            <p className="text-sm text-slate-500 truncate">
              {shipment.shipment_type} • {shipment.quantity} {shipment.quantity_unit}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {shipment.destination && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {shipment.destination}
                </span>
              )}
              {shipment.driver_name && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {shipment.driver_name}
                </span>
              )}
              {shipment.receiver_phone && (
                <span className="text-xs text-slate-400 flex items-center gap-1" dir="ltr">
                  <Phone className="w-3 h-3" />
                  {shipment.receiver_phone}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="text-left flex-shrink-0">
          <span className={`status-badge ${statusColors[shipment.status]}`}>
            {statusLabels[shipment.status]}
          </span>
          <p className="text-xs text-slate-400 mt-1.5">{formatDateTime(shipment.created_at)}</p>
        </div>
      </div>
    </button>
  );
}
