import { useState, useMemo } from 'react';
import { Receipt, Search, Calendar, MapPin, User, Phone, X } from 'lucide-react';
import { useDeliveryReceipts, useShipments } from '@/hooks/useData';
import type { DeliveryReceipt, Shipment } from '@/types';
import { formatCurrency, formatDateTime, getTodayDate, getYesterdayDate, getDateRange } from '@/lib/utils';
import { LoadingSpinner, EmptyState } from '@/components/Loading';

type DateFilter = 'all' | 'today' | 'yesterday' | 'custom';

export function ReceiptsPage() {
  const { receipts, loading } = useDeliveryReceipts();
  const { shipments } = useShipments();
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [customDate, setCustomDate] = useState(getTodayDate());

  const shipmentMap = useMemo(() => {
    const map = new Map<string, Shipment>();
    for (const s of shipments) map.set(s.id, s);
    return map;
  }, [shipments]);

  const filteredReceipts = useMemo(() => {
    let result = receipts;

    if (dateFilter !== 'all') {
      const dateStr = dateFilter === 'today' ? getTodayDate() : dateFilter === 'yesterday' ? getYesterdayDate() : customDate;
      const { start, end } = getDateRange(dateStr);
      result = result.filter((r) => {
        const delivered = new Date(r.delivered_at);
        return delivered >= new Date(start) && delivered <= new Date(end);
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((r) => {
        const shipment = shipmentMap.get(r.shipment_id);
        return (
          r.receipt_number.toLowerCase().includes(q) ||
          (r.receiver_name || '').toLowerCase().includes(q) ||
          (r.receiver_phone || '').includes(q) ||
          (shipment?.shipment_number || '').toLowerCase().includes(q) ||
          (shipment?.destination || '').toLowerCase().includes(q)
        );
      });
    }

    return result;
  }, [receipts, searchQuery, dateFilter, customDate, shipmentMap]);

  const totalAmount = useMemo(() => {
    return filteredReceipts.reduce((sum, r) => sum + (r.delivered_amount || 0), 0);
  }, [filteredReceipts]);

  const dateFilterLabels: Record<DateFilter, string> = {
    all: 'الكل',
    today: 'اليوم',
    yesterday: 'أمس',
    custom: 'تاريخ محدد',
  };

  if (loading) {
    return <LoadingSpinner text="جاري تحميل الإيصالات..." />;
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 mb-1">إيصالات التسليم</h1>
        <p className="text-sm text-slate-500">جميع إيصالات التسليم الموّلدة تلقائياً</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="stat-card">
          <p className="text-sm font-semibold text-slate-500 mb-1">عدد الإيصالات</p>
          <p className="text-xl font-bold text-slate-800">{filteredReceipts.length}</p>
        </div>
        <div className="stat-card bg-teal-50 border-teal-200">
          <p className="text-sm font-semibold text-teal-600 mb-1">إجمالي المبالغ المسلّمة</p>
          <p className="text-xl font-bold text-teal-700">{formatCurrency(totalAmount)}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          className="input-field pr-12"
          placeholder="ابحث برقم الإيصال، الشحنة، الاسم..."
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

      {/* Date Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
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

      {/* Receipts List */}
      {filteredReceipts.length === 0 ? (
        <EmptyState
          icon={<Receipt className="w-8 h-8 text-slate-300" />}
          title="لا توجد إيصالات"
          description="لم يتم تسليم أي شحنة بعد"
        />
      ) : (
        <div className="space-y-3">
          {filteredReceipts.map((receipt) => {
            const shipment = shipmentMap.get(receipt.shipment_id);
            return (
              <ReceiptCard key={receipt.id} receipt={receipt} shipment={shipment} />
            );
          })}
        </div>
      )}
    </div>
  );
}

function ReceiptCard({ receipt, shipment }: { receipt: DeliveryReceipt; shipment?: Shipment }) {
  return (
    <div className="card hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center flex-shrink-0">
            <Receipt className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-slate-800">{receipt.receipt_number}</p>
            {shipment && (
              <p className="text-sm text-slate-500">
                شحنة: {shipment.shipment_number} • {shipment.shipment_type}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {receipt.receiver_name && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {receipt.receiver_name}
                </span>
              )}
              {receipt.receiver_phone && (
                <span className="text-xs text-slate-400 flex items-center gap-1" dir="ltr">
                  <Phone className="w-3 h-3" />
                  {receipt.receiver_phone}
                </span>
              )}
              {shipment?.destination && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {shipment.destination}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="text-left flex-shrink-0">
          {receipt.delivered_amount > 0 && (
            <p className="font-bold text-teal-700">{formatCurrency(receipt.delivered_amount)}</p>
          )}
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatDateTime(receipt.delivered_at)}
          </p>
          {receipt.payment_method && (
            <span className="inline-block text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded mt-1">
              {receipt.payment_method}
            </span>
          )}
        </div>
      </div>
      {receipt.notes && (
        <p className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">{receipt.notes}</p>
      )}
    </div>
  );
}
