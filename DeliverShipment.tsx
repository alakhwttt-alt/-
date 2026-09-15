import { useState, useMemo, useCallback } from 'react';
import {
  PackageCheck,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  Phone,
  MapPin,
  Package,
  User,
  Receipt as ReceiptIcon,
  ArrowLeft,
  TrendingUp,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useShipments, useShipmentPayments } from '@/hooks/useData';
import type { Shipment, DeliveryReceipt } from '@/types';
import {
  formatCurrency,
  formatDateTime,
  formatPhoneForWhatsApp,
} from '@/lib/utils';
import { PAYMENT_METHODS } from '@/types';
import { showToast } from '@/components/Toast';
import { LoadingSpinner, EmptyState } from '@/components/Loading';
import { ConfirmModal } from '@/components/Modal';

export function DeliverShipment({ onDelivered }: { onDelivered: (receipt: DeliveryReceipt) => void }) {
  const { shipments, loading } = useShipments();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [delivering, setDelivering] = useState(false);

  // Delivery form state
  const [deliverForm, setDeliverForm] = useState({
    receiver_name: '',
    receiver_phone: '',
    delivered_amount: '',
    payment_method: 'نقد',
    notes: '',
  });

  // Filter shipments that can be delivered (received status only)
  const deliverableShipments = useMemo(() => {
    const filtered = shipments.filter((s) => s.status === 'received');
    if (!searchQuery.trim()) return filtered;
    const q = searchQuery.trim().toLowerCase();
    return filtered.filter(
      (s) =>
        s.shipment_number.toLowerCase().includes(q) ||
        (s.sender_name || '').toLowerCase().includes(q) ||
        (s.receiver_name || '').toLowerCase().includes(q) ||
        (s.sender_phone || '').includes(q) ||
        (s.receiver_phone || '').includes(q) ||
        (s.driver_name || '').toLowerCase().includes(q) ||
        (s.destination || '').toLowerCase().includes(q)
    );
  }, [shipments, searchQuery]);

  const handleSelectShipment = useCallback((shipment: Shipment) => {
    setSelectedShipment(shipment);
    setDeliverForm({
      receiver_name: shipment.receiver_name || '',
      receiver_phone: shipment.receiver_phone || '',
      delivered_amount: '',
      payment_method: 'نقد',
      notes: '',
    });
  }, []);

  const handleDeliver = async () => {
    if (!selectedShipment) return;
    setDelivering(true);

    try {
      // Generate receipt number
      const { data: receiptNumber, error: numError } = await supabase.rpc('generate_receipt_number');
      if (numError) throw numError;

      // Update shipment status to delivered
      const { error: shipError } = await supabase
        .from('shipments')
        .update({
          status: 'delivered',
          delivered_at: new Date().toISOString(),
          delivery_notes: deliverForm.notes || null,
        })
        .eq('id', selectedShipment.id);

      if (shipError) throw shipError;

      // Create delivery receipt
      const { data: receipt, error: receiptError } = await supabase
        .from('delivery_receipts')
        .insert({
          shipment_id: selectedShipment.id,
          receipt_number: receiptNumber,
          receiver_name: deliverForm.receiver_name || selectedShipment.receiver_name,
          receiver_phone: deliverForm.receiver_phone || selectedShipment.receiver_phone,
          delivered_amount: deliverForm.delivered_amount ? parseFloat(deliverForm.delivered_amount) : 0,
          payment_method: deliverForm.payment_method,
          notes: deliverForm.notes || null,
          delivered_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (receiptError) throw receiptError;

      // Insert status history
      await supabase.from('shipment_status_history').insert({
        shipment_id: selectedShipment.id,
        from_status: 'received',
        to_status: 'delivered',
        notes: 'تم تسليم الشحنة',
      });

      showToast('success', `تم تسليم الشحنة - رقم الإيصال: ${receiptNumber}`);
      setSelectedShipment(null);
      setShowConfirm(false);
      onDelivered(receipt as DeliveryReceipt);
    } catch (err) {
      showToast('error', 'فشل التسليم: ' + (err as Error).message);
    } finally {
      setDelivering(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="جاري تحميل الشحنات..." />;
  }

  const selectedShipmentNumber = selectedShipment?.shipment_number || '';

  // Shipment Detail View
  if (selectedShipment) {
    return (
      <ShipmentDeliveryDetail
        shipment={selectedShipment}
        deliverForm={deliverForm}
        setDeliverForm={setDeliverForm}
        onBack={() => setSelectedShipment(null)}
        onConfirm={() => setShowConfirm(true)}
      />
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 mb-1">تسليم شحنة</h1>
        <p className="text-sm text-slate-500">ابحث عن الشحنة ثم أكد التسليم وسيتم توليد إيصال تلقائياً</p>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          className="input-field pr-12 text-lg"
          placeholder="ابحث برقم الشحنة، الاسم، الهاتف، الوجهة..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Shipments List */}
      {deliverableShipments.length === 0 ? (
        <EmptyState
          icon={<PackageCheck className="w-8 h-8 text-slate-300" />}
          title={searchQuery ? 'لا توجد نتائج' : 'لا توجد شحنات جاهزة للتسليم'}
          description={searchQuery ? 'جرّب بحثاً مختلفاً' : 'جميع الشحنات تم تسليمها أو لم يتم استلام أي شحنة بعد'}
        />
      ) : (
        <div className="space-y-3">
          {deliverableShipments.map((s) => (
            <button
              key={s.id}
              onClick={() => handleSelectShipment(s)}
              className="card w-full text-right hover:shadow-md hover:border-teal-300 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                    <Package className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{s.shipment_number}</p>
                    <p className="text-sm text-slate-500">
                      {s.shipment_type} • {s.quantity} {s.quantity_unit}
                    </p>
                    {s.destination && (
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        {s.destination}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-left">
                  <span className="status-badge bg-blue-100 text-blue-800 border-blue-300">
                    تم الاستلام
                  </span>
                  <p className="text-xs text-slate-400 mt-1.5">{formatDateTime(s.received_at)}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleDeliver}
        title="تأكيد التسليم"
        message={`هل أنت متأكد من تسليم الشحنة ${selectedShipmentNumber}؟ سيتم توليد إيصال تسليم تلقائياً.`}
        confirmText="تأكيد التسليم"
        cancelText="إلغاء"
      />
    </div>
  );
}

function ShipmentDeliveryDetail({
  shipment,
  deliverForm,
  setDeliverForm,
  onBack,
  onConfirm,
}: {
  shipment: Shipment;
  deliverForm: any;
  setDeliverForm: (f: any) => void;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const { payments, loading: paymentsLoading } = useShipmentPayments(shipment.id);

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = (shipment.driver_total_dues || 0) - totalPaid;

  const updateForm = (key: string, value: string) => {
    setDeliverForm((prev: any) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="animate-fade-in">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-4 font-semibold transition-colors"
      >
        <ArrowLeft className="w-5 h-5 rotate-180" />
        رجوع للقائمة
      </button>

      {/* Shipment Info */}
      <div className="card mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">{shipment.shipment_number}</h2>
              <p className="text-sm text-slate-500">
                {shipment.shipment_type} • {shipment.quantity} {shipment.quantity_unit}
              </p>
            </div>
          </div>
          <span className="status-badge bg-blue-100 text-blue-800 border-blue-300">تم الاستلام</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <InfoRow icon={<User className="w-4 h-4" />} label="المرسل" value={`${shipment.sender_name || '—'} - ${shipment.sender_phone || '—'}`} />
          <InfoRow icon={<User className="w-4 h-4" />} label="المستلم" value={`${shipment.receiver_name || '—'} - ${shipment.receiver_phone || '—'}`} />
          <InfoRow icon={<MapPin className="w-4 h-4" />} label="الوجهة" value={shipment.destination || '—'} />
          <InfoRow icon={<User className="w-4 h-4" />} label="السائق" value={`${shipment.driver_name || '—'} - ${shipment.driver_phone || '—'}`} />
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <FinanceCard label="رسوم الأمانات" value={formatCurrency(shipment.parcel_fees || 0)} color="teal" icon={<TrendingUp className="w-5 h-5" />} />
        <FinanceCard label="مستحقات السائق" value={formatCurrency(shipment.driver_total_dues || 0)} color="slate" />
        <FinanceCard label="مدفوع للسائق" value={formatCurrency(totalPaid)} color="emerald" />
        <FinanceCard
          label="متبقي للسائق"
          value={formatCurrency(remaining)}
          color={remaining > 0 ? 'amber' : 'emerald'}
        />
      </div>

      {/* Delivery Form */}
      <div className="card">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <ReceiptIcon className="w-5 h-5 text-teal-600" />
          بيانات التسليم
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="input-label">اسم المستلم</label>
            <input
              type="text"
              className="input-field"
              value={deliverForm.receiver_name}
              onChange={(e) => updateForm('receiver_name', e.target.value)}
              placeholder="من استلم الشحنة"
            />
          </div>
          <div>
            <label className="input-label">هاتف المستلم</label>
            <input
              type="tel"
              className="input-field"
              value={deliverForm.receiver_phone}
              onChange={(e) => updateForm('receiver_phone', e.target.value)}
              placeholder="7XX XXX XXX"
              dir="ltr"
            />
          </div>
          <div>
            <label className="input-label">المبلغ المسلّم</label>
            <input
              type="number"
              step="0.01"
              className="input-field"
              value={deliverForm.delivered_amount}
              onChange={(e) => updateForm('delivered_amount', e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="input-label">طريقة الدفع</label>
            <select
              className="input-field"
              value={deliverForm.payment_method}
              onChange={(e) => updateForm('payment_method', e.target.value)}
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="input-label">ملاحظات التسليم</label>
            <textarea
              className="input-field min-h-[60px] resize-y"
              value={deliverForm.notes}
              onChange={(e) => updateForm('notes', e.target.value)}
              placeholder="أي ملاحظات عن التسليم..."
            />
          </div>
        </div>

        {/* Quick WhatsApp */}
        {shipment.receiver_phone && (
          <a
            href={`https://wa.me/${formatPhoneForWhatsApp(shipment.receiver_phone)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-whatsapp mt-4 w-full"
          >
            <Phone className="w-4 h-4" />
            إرسال واتساب للمستلم
          </a>
        )}

        <button
          onClick={onConfirm}
          className="btn-primary w-full mt-3 flex items-center justify-center gap-2 text-lg py-4"
        >
          <CheckCircle2 className="w-5 h-5" />
          تأكيد التسليم
        </button>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="text-slate-400">{icon}</span>
      <span className="text-slate-500 font-semibold">{label}:</span>
      <span className="text-slate-800">{value}</span>
    </div>
  );
}

function FinanceCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: string;
  color: 'teal' | 'slate' | 'emerald' | 'amber';
  icon?: React.ReactNode;
}) {
  const colors = {
    teal: 'bg-teal-50 border-teal-200 text-teal-700',
    slate: 'bg-slate-50 border-slate-200 text-slate-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
  };

  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      {icon && <div className="mb-2">{icon}</div>}
      <p className="text-xs font-semibold opacity-80 mb-1">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}
