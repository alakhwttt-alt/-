import {
  Package,
  MapPin,
  User,
  Phone,
  Truck,
  Calendar,
  Scale,
  Ruler,
  FileText,
  Image as ImageIcon,
  MessageCircle,
  Plus,
  Loader2,
  TrendingUp,
  Wallet,
  ArrowLeftRight,
  Clock,
  CheckCircle2,
  XCircle,
  Inbox,
  Building2,
  UserPlus,
} from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Shipment } from '@/types';
import { PAYMENT_METHODS } from '@/types';
import { useShipmentPayments, useStatusHistory } from '@/hooks/useData';
import {
  formatCurrency,
  formatDateTime,
  formatDate,
  formatPhoneForWhatsApp,
  buildDriverWhatsAppMessage,
  buildReceiverWhatsAppMessage,
} from '@/lib/utils';
import { Modal } from '@/components/Modal';
import { showToast } from '@/components/Toast';
import { LoadingSpinner } from '@/components/Loading';

function saveSingleContact(name: string, phone: string, org: string) {
  if (!phone) {
    showToast('warning', 'لا يوجد رقم للحفظ');
    return;
  }
  const vcard = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${name || 'بدون اسم'}`,
    `TEL;TYPE=CELL:${phone}`,
    `ORG:${org}`,
    'END:VCARD',
  ].join('\n');
  const blob = new Blob(['\uFEFF' + vcard], { type: 'text/vcard;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name || 'contact'}.vcf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('success', 'تم تنزيل بطاقة جهة الاتصال');
}

interface ShipmentDetailsProps {
  shipment: Shipment | null;
  onClose: () => void;
}

export function ShipmentDetails({ shipment, onClose }: ShipmentDetailsProps) {
  const { payments, loading: paymentsLoading } = useShipmentPayments(shipment?.id || null);
  const { history, loading: historyLoading } = useStatusHistory(shipment?.id || null);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: '', payment_method: 'نقد', notes: '' });
  const [savingPayment, setSavingPayment] = useState(false);
  const [showImage, setShowImage] = useState(false);

  if (!shipment) return null;

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = (shipment.driver_total_dues || 0) - totalPaid;

  const handleAddPayment = async () => {
    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      showToast('error', 'أدخل مبلغاً صحيحاً');
      return;
    }
    setSavingPayment(true);
    try {
      const { error } = await supabase.from('driver_payments').insert({
        shipment_id: shipment.id,
        driver_name: shipment.driver_name,
        amount: parseFloat(paymentForm.amount),
        payment_method: paymentForm.payment_method,
        notes: paymentForm.notes || null,
      });
      if (error) throw error;
      showToast('success', 'تم تسجيل الدفعة بنجاح');
      setPaymentForm({ amount: '', payment_method: 'نقد', notes: '' });
      setShowAddPayment(false);
    } catch (err) {
      showToast('error', 'فشل تسجيل الدفعة');
    } finally {
      setSavingPayment(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    try {
      const { error } = await supabase.from('driver_payments').delete().eq('id', paymentId);
      if (error) throw error;
      showToast('success', 'تم حذف الدفعة');
    } catch {
      showToast('error', 'فشل حذف الدفعة');
    }
  };

  const handleCancel = async () => {
    try {
      const { error: shipError } = await supabase
        .from('shipments')
        .update({ status: 'cancelled' })
        .eq('id', shipment.id);
      if (shipError) throw shipError;

      await supabase.from('shipment_status_history').insert({
        shipment_id: shipment.id,
        from_status: shipment.status,
        to_status: 'cancelled',
        notes: 'تم إلغاء الشحنة',
      });

      showToast('success', 'تم إلغاء الشحنة');
      onClose();
    } catch {
      showToast('error', 'فشل إلغاء الشحنة');
    }
  };

  const driverWaLink = shipment.driver_phone
    ? `https://wa.me/${formatPhoneForWhatsApp(shipment.driver_phone)}?text=${buildDriverWhatsAppMessage(shipment)}`
    : null;

  const receiverWaLink = shipment.receiver_phone
    ? `https://wa.me/${formatPhoneForWhatsApp(shipment.receiver_phone)}?text=${buildReceiverWhatsAppMessage(shipment)}`
    : null;

  return (
    <Modal isOpen={!!shipment} onClose={onClose} title={`شحنة ${shipment.shipment_number}`} size="xl">
      <div className="space-y-5">
        {/* Status & Image */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <StatusBadge status={shipment.status} />
          <span className="text-sm text-slate-500 font-semibold flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {formatDateTime(shipment.created_at)}
          </span>
        </div>

        {shipment.image_url && (
          <button
            onClick={() => setShowImage(true)}
            className="block w-full rounded-xl overflow-hidden border border-slate-200 hover:border-teal-300 transition-colors"
          >
            <img
              src={shipment.image_url}
              alt="صورة الشحنة"
              className="w-full h-48 object-cover"
            />
          </button>
        )}

        {/* Shipment Details */}
        <div className="bg-slate-50 rounded-xl p-4 space-y-3">
          <h3 className="font-bold text-slate-700 flex items-center gap-2">
            <Package className="w-5 h-5 text-teal-600" />
            تفاصيل الشحنة
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <DetailRow icon={<Package className="w-4 h-4" />} label="النوع" value={shipment.shipment_type} />
            <DetailRow icon={<Inbox className="w-4 h-4" />} label="الكمية" value={`${shipment.quantity} ${shipment.quantity_unit}`} />
            {shipment.size_type && <DetailRow icon={<Ruler className="w-4 h-4" />} label="الحجم" value={shipment.size_type} />}
            {shipment.weight != null && <DetailRow icon={<Scale className="w-4 h-4" />} label="الوزن" value={`${shipment.weight} ${shipment.weight_unit || 'كجم'}`} />}
            <DetailRow icon={<FileText className="w-4 h-4" />} label="نوع المصدر" value={shipment.source_type || '—'} />
            {shipment.source_name && <DetailRow icon={<User className="w-4 h-4" />} label="المصدر" value={shipment.source_name} />}
            {shipment.source_phone && <DetailRow icon={<Building2 className="w-4 h-4" />} label="هاتف المصدر" value={shipment.source_phone} />}
            <DetailRow icon={<MapPin className="w-4 h-4" />} label="الوجهة" value={shipment.destination || '—'} />
          </div>
        </div>

        {/* Parties */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <PartyCard title="المرسل" name={shipment.sender_name} phone={shipment.sender_phone} />
          <PartyCard title="المستلم" name={shipment.receiver_name} phone={shipment.receiver_phone} onSaveContact={() => saveSingleContact(shipment.receiver_name || '', shipment.receiver_phone || '', 'سهيل إكسبرس - مستلم')} />
          <PartyCard title="السائق" name={shipment.driver_name} phone={shipment.driver_phone} onSaveContact={() => saveSingleContact(shipment.driver_name || '', shipment.driver_phone || '', 'سهيل إكسبرس - سائق')} />
          <PartyCard title="مكتب المصدر" name={shipment.source_name} phone={shipment.source_phone} onSaveContact={() => saveSingleContact(shipment.source_name || '', shipment.source_phone || '', 'سهيل إكسبرس - مكتب مصدر')} />
        </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <FinanceCard label="رسوم الأمانات" value={formatCurrency(shipment.parcel_fees || 0)} color="teal" icon={<TrendingUp className="w-4 h-4" />} />
          <FinanceCard label="مستحقات السائق" value={formatCurrency(shipment.driver_total_dues || 0)} color="slate" icon={<Wallet className="w-4 h-4" />} />
          <FinanceCard label="مدفوع للسائق" value={formatCurrency(totalPaid)} color="emerald" icon={<ArrowLeftRight className="w-4 h-4" />} />
          <FinanceCard
            label="متبقي للسائق"
            value={formatCurrency(remaining)}
            color={remaining > 0 ? 'amber' : 'emerald'}
            icon={<Wallet className="w-4 h-4" />}
          />
        </div>

        {/* WhatsApp Actions */}
        {(driverWaLink || receiverWaLink) && (
          <div className="flex flex-col sm:flex-row gap-3">
            {driverWaLink && (
              <a href={driverWaLink} target="_blank" rel="noopener noreferrer" className="btn-whatsapp flex-1">
                <MessageCircle className="w-5 h-5" />
                واتساب للسائق
              </a>
            )}
            {receiverWaLink && (
              <a href={receiverWaLink} target="_blank" rel="noopener noreferrer" className="btn-whatsapp flex-1">
                <MessageCircle className="w-5 h-5" />
                واتساب للمستلم
              </a>
            )}
          </div>
        )}

        {/* Driver Payments */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-teal-600" />
              مدفوعات السائق
            </h3>
            <button
              onClick={() => setShowAddPayment(true)}
              className="flex items-center gap-1 text-sm font-semibold text-teal-600 hover:text-teal-700"
            >
              <Plus className="w-4 h-4" />
              إضافة دفعة
            </button>
          </div>

          {paymentsLoading ? (
            <LoadingSpinner size="sm" />
          ) : payments.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">لا توجد مدفوعات مسجلة</p>
          ) : (
            <div className="space-y-2">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between bg-slate-50 rounded-lg p-3">
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{formatCurrency(p.amount)}</p>
                    <p className="text-xs text-slate-500">
                      {p.payment_method || '—'} • {formatDateTime(p.paid_at)}
                    </p>
                    {p.notes && <p className="text-xs text-slate-400 mt-0.5">{p.notes}</p>}
                  </div>
                  <button
                    onClick={() => handleDeletePayment(p.id)}
                    className="text-red-400 hover:text-red-600 text-xs font-semibold"
                  >
                    حذف
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add Payment Form */}
          {showAddPayment && (
            <div className="mt-3 bg-teal-50 rounded-lg p-3 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="input-label">المبلغ</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input-field"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="input-label">طريقة الدفع</label>
                  <select
                    className="input-field"
                    value={paymentForm.payment_method}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="input-label">ملاحظات</label>
                <input
                  type="text"
                  className="input-field"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  placeholder="ملاحظات..."
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddPayment}
                  disabled={savingPayment}
                  className="btn-primary flex-1 flex items-center justify-center gap-1"
                >
                  {savingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  حفظ
                </button>
                <button onClick={() => setShowAddPayment(false)} className="btn-secondary">
                  إلغاء
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Status Timeline */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="font-bold text-slate-700 flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-teal-600" />
            سجل الحالات
          </h3>
          {historyLoading ? (
            <LoadingSpinner size="sm" />
          ) : history.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">لا يوجد سجل</p>
          ) : (
            <div className="space-y-2">
              {history.map((h, idx) => (
                <div key={h.id} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full ${idx === 0 ? 'bg-teal-500' : 'bg-slate-300'}`} />
                    {idx < history.length - 1 && <div className="w-0.5 h-6 bg-slate-200" />}
                  </div>
                  <div className="pb-2">
                    <p className="text-sm font-semibold text-slate-700">
                      {statusLabel(h.to_status)}
                    </p>
                    <p className="text-xs text-slate-400">{formatDateTime(h.changed_at)}</p>
                    {h.notes && <p className="text-xs text-slate-500 mt-0.5">{h.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        {(shipment.notes || shipment.delivery_notes) && (
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 space-y-2">
            {shipment.notes && (
              <div>
                <p className="text-xs font-bold text-amber-700 mb-0.5">ملاحظات</p>
                <p className="text-sm text-slate-700">{shipment.notes}</p>
              </div>
            )}
            {shipment.delivery_notes && (
              <div>
                <p className="text-xs font-bold text-amber-700 mb-0.5">ملاحظات التسليم</p>
                <p className="text-sm text-slate-700">{shipment.delivery_notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Cancel button */}
        {shipment.status !== 'cancelled' && shipment.status !== 'delivered' && (
          <button
            onClick={handleCancel}
            className="w-full text-red-600 hover:bg-red-50 font-semibold py-3 rounded-xl border border-red-200 transition-colors flex items-center justify-center gap-2"
          >
            <XCircle className="w-5 h-5" />
            إلغاء الشحنة
          </button>
        )}

        {/* Timestamps */}
        <div className="text-xs text-slate-400 space-y-1 border-t border-slate-100 pt-3">
          {shipment.received_at && <p>تاريخ الاستلام: {formatDate(shipment.received_at)}</p>}
          {shipment.delivered_at && <p>تاريخ التسليم: {formatDate(shipment.delivered_at)}</p>}
        </div>
      </div>

      {/* Image Modal */}
      {showImage && shipment.image_url && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setShowImage(false)}
        >
          <img src={shipment.image_url} alt="صورة الشحنة" className="max-w-full max-h-full rounded-lg" />
        </div>
      )}
    </Modal>
  );
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'قيد الانتظار',
    received: 'تم الاستلام',
    delivered: 'تم التسليم',
    cancelled: 'ملغي',
  };
  return labels[status] || status;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800 border-amber-300',
    received: 'bg-blue-100 text-blue-800 border-blue-300',
    delivered: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    cancelled: 'bg-red-100 text-red-800 border-red-300',
  };
  return (
    <span className={`status-badge ${colors[status] || 'bg-slate-100 text-slate-700 border-slate-300'}`}>
      {statusLabel(status)}
    </span>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-slate-400">{icon}</span>
      <span className="text-slate-500 font-semibold">{label}:</span>
      <span className="text-slate-800">{value}</span>
    </div>
  );
}

function PartyCard({ title, name, phone, onSaveContact }: { title: string; name: string | null; phone: string | null; onSaveContact?: () => void }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3">
      <p className="text-xs font-bold text-slate-400 mb-1">{title}</p>
      <p className="font-semibold text-slate-800 text-sm">{name || '—'}</p>
      <div className="flex items-center gap-2 mt-1">
        {phone && (
          <a
            href={`https://wa.me/${formatPhoneForWhatsApp(phone)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-teal-600 flex items-center gap-1 hover:underline"
            dir="ltr"
          >
            <Phone className="w-3 h-3" />
            {phone}
          </a>
        )}
        {onSaveContact && phone && (
          <button
            onClick={onSaveContact}
            className="text-xs text-blue-600 flex items-center gap-1 hover:underline ml-auto"
            title="حفظ في جهات الاتصال"
          >
            <UserPlus className="w-3 h-3" />
            حفظ
          </button>
        )}
      </div>
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
  icon: React.ReactNode;
}) {
  const colors = {
    teal: 'bg-teal-50 border-teal-200 text-teal-700',
    slate: 'bg-slate-50 border-slate-200 text-slate-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
  };
  return (
    <div className={`rounded-xl border p-3 ${colors[color]}`}>
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <p className="text-xs font-semibold opacity-80">{label}</p>
      </div>
      <p className="text-base font-bold">{value}</p>
    </div>
  );
}
