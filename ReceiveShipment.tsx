import { useState, useCallback, useMemo } from 'react';
import { PackagePlus, Camera, X, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  SHIPMENT_TYPES,
  QUANTITY_UNITS,
  SIZE_TYPES,
  SOURCE_TYPES,
} from '@/types';
import type { Shipment } from '@/types';
import { showToast } from '@/components/Toast';
import { formatCurrency } from '@/lib/utils';
import { useAutocompleteData } from '@/hooks/useAutocomplete';
import { AutocompleteField } from '@/components/AutocompleteField';

export function ReceiveShipment({ onCreated }: { onCreated: (shipment: Shipment) => void }) {
  const { data: acData } = useAutocompleteData();
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [form, setForm] = useState({
    shipment_type: 'قات',
    quantity: 1,
    quantity_unit: 'قطعة',
    size_type: '',
    weight: '',
    weight_unit: 'كجم',
    source_type: 'مكتب أمانات',
    source_name: '',
    source_phone: '',
    destination: '',
    sender_name: '',
    sender_phone: '',
    receiver_name: '',
    receiver_phone: '',
    driver_name: '',
    driver_phone: '',
    parcel_fees: '',
    driver_total_dues: '',
    driver_advance: '',
    notes: '',
  });

  // Build suggestion arrays from autocomplete data
  const suggestions = useMemo(() => {
    const toNameSuggestions = (entries: { name: string; phone: string }[]) =>
      entries.map((e) => ({
        label: e.name,
        sublabel: e.phone || undefined,
        value: e.name,
        pairedValue: e.phone || '',
      }));

    const toPhoneSuggestions = (phones: string[]) =>
      phones.map((p) => ({ label: p, value: p }));

    const toDestSuggestions = (dests: string[]) =>
      dests.map((d) => ({ label: d, value: d }));

    return {
      senderNames: toNameSuggestions(acData.senderNames),
      receiverNames: toNameSuggestions(acData.receiverNames),
      driverNames: toNameSuggestions(acData.driverNames),
      sourceNames: toNameSuggestions(acData.sourceNames),
      senderPhones: toPhoneSuggestions(acData.senderPhones),
      receiverPhones: toPhoneSuggestions(acData.receiverPhones),
      driverPhones: toPhoneSuggestions(acData.driverPhones),
      sourcePhones: toPhoneSuggestions(acData.sourcePhones),
      destinations: toDestSuggestions(acData.destinations),
    };
  }, [acData]);

  const updateForm = (key: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleImageUpload = useCallback(async (file: File) => {
    setUploadingImage(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `shipment-${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('shipment-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('shipment-images')
        .getPublicUrl(fileName);

      setImageUrl(urlData.publicUrl);
      setImagePreview(URL.createObjectURL(file));
      showToast('success', 'تم رفع الصورة بنجاح');
    } catch (err) {
      showToast('error', 'فشل رفع الصورة');
    } finally {
      setUploadingImage(false);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
  };

  const removeImage = () => {
    setImageUrl(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.shipment_type || form.quantity < 1) {
      showToast('error', 'يرجى ملء الحقول المطلوبة');
      return;
    }

    setSaving(true);
    try {
      const { data: shipmentNumber, error: numError } = await supabase.rpc('generate_shipment_number');
      if (numError) throw numError;

      const insertData = {
        shipment_number: shipmentNumber,
        shipment_type: form.shipment_type,
        quantity: form.quantity,
        quantity_unit: form.quantity_unit,
        size_type: form.size_type || null,
        weight: form.weight ? parseFloat(form.weight) : null,
        weight_unit: form.weight_unit,
        image_url: imageUrl,
        source_type: form.source_type,
        source_name: form.source_name || null,
        source_phone: form.source_phone || null,
        destination: form.destination || null,
        sender_name: form.sender_name || null,
        sender_phone: form.sender_phone || null,
        receiver_name: form.receiver_name || null,
        receiver_phone: form.receiver_phone || null,
        driver_name: form.driver_name || null,
        driver_phone: form.driver_phone || null,
        parcel_fees: form.parcel_fees ? parseFloat(form.parcel_fees) : 0,
        driver_total_dues: form.driver_total_dues ? parseFloat(form.driver_total_dues) : 0,
        status: 'received',
        received_at: new Date().toISOString(),
        notes: form.notes || null,
      };

      const { data, error } = await supabase
        .from('shipments')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      await supabase.from('shipment_status_history').insert({
        shipment_id: data.id,
        from_status: null,
        to_status: 'received',
        notes: 'تم استلام الشحنة',
      });

      const advanceAmount = form.driver_advance ? parseFloat(form.driver_advance) : 0;
      if (advanceAmount > 0) {
        await supabase.from('driver_payments').insert({
          shipment_id: data.id,
          driver_name: form.driver_name || null,
          amount: advanceAmount,
          payment_method: 'نقد',
          notes: 'مسلّم مقدم عند الاستلام',
        });
      }

      showToast('success', `تم استلام الشحنة بنجاح - رقم الشحنة: ${shipmentNumber}`);
      onCreated(data as Shipment);
    } catch (err) {
      showToast('error', 'فشل حفظ الشحنة: ' + (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 mb-1">استلام شحنة جديدة</h1>
        <p className="text-sm text-slate-500">أدخل بيانات الشحنة الواردة وسيتم توليد رقم شحنة تلقائياً</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Shipment Type & Quantity */}
        <div className="card">
          <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-teal-600" />
            بيانات الشحنة
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="input-label">نوع الشحنة *</label>
              <select
                className="input-field"
                value={form.shipment_type}
                onChange={(e) => updateForm('shipment_type', e.target.value)}
              >
                {SHIPMENT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="input-label">الكمية *</label>
              <input
                type="number"
                min="1"
                className="input-field"
                value={form.quantity}
                onChange={(e) => updateForm('quantity', parseInt(e.target.value) || 1)}
                required
              />
            </div>
            <div>
              <label className="input-label">وحدة الكمية</label>
              <select
                className="input-field"
                value={form.quantity_unit}
                onChange={(e) => updateForm('quantity_unit', e.target.value)}
              >
                {QUANTITY_UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="input-label">الحجم</label>
              <select
                className="input-field"
                value={form.size_type}
                onChange={(e) => updateForm('size_type', e.target.value)}
              >
                <option value="">— اختر —</option>
                {SIZE_TYPES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="input-label">الوزن</label>
              <input
                type="number"
                step="0.01"
                className="input-field"
                value={form.weight}
                onChange={(e) => updateForm('weight', e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="input-label">وحدة الوزن</label>
              <select
                className="input-field"
                value={form.weight_unit}
                onChange={(e) => updateForm('weight_unit', e.target.value)}
              >
                <option value="كجم">كجم</option>
                <option value="غرام">غرام</option>
                <option value="طن">طن</option>
              </select>
            </div>
          </div>
        </div>

        {/* Image Upload */}
        <div className="card">
          <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Camera className="w-5 h-5 text-teal-600" />
            صورة الشحنة
          </h2>
          {imagePreview ? (
            <div className="relative inline-block">
              <img
                src={imagePreview}
                alt="معاينة الشحنة"
                className="w-48 h-48 object-cover rounded-xl border border-slate-200"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute -top-2 -left-2 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-teal-400 hover:bg-teal-50/50 transition-all">
              {uploadingImage ? (
                <Loader2 className="w-6 h-6 text-teal-600 animate-spin mb-2" />
              ) : (
                <Camera className="w-8 h-8 text-slate-400 mb-2" />
              )}
              <p className="text-sm text-slate-500 font-semibold">
                {uploadingImage ? 'جاري رفع الصورة...' : 'اضغط لرفع صورة الشحنة'}
              </p>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
                disabled={uploadingImage}
              />
            </label>
          )}
        </div>

        {/* Source & Destination */}
        <div className="card">
          <h2 className="font-bold text-slate-800 mb-4">المصدر والوجهة</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="input-label">نوع المصدر</label>
              <select
                className="input-field"
                value={form.source_type}
                onChange={(e) => updateForm('source_type', e.target.value)}
              >
                {SOURCE_TYPES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <AutocompleteField
              label="اسم المصدر / المكتب"
              value={form.source_name}
              onChange={(v) => updateForm('source_name', v)}
              onPairSelect={(v) => updateForm('source_phone', v)}
              suggestions={suggestions.sourceNames}
              placeholder="اسم المكتب أو المصدر"
            />
            <AutocompleteField
              label="هاتف المصدر / المكتب"
              type="tel"
              dir="ltr"
              value={form.source_phone}
              onChange={(v) => updateForm('source_phone', v)}
              suggestions={suggestions.sourcePhones}
              placeholder="7XX XXX XXX"
            />
            <AutocompleteField
              label="الوجهة"
              value={form.destination}
              onChange={(v) => updateForm('destination', v)}
              suggestions={suggestions.destinations}
              placeholder="المدينة / المنطقة"
              className="input-field sm:col-span-2"
            />
          </div>
        </div>

        {/* Parties */}
        <div className="card">
          <h2 className="font-bold text-slate-800 mb-4">بيانات الأطراف</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AutocompleteField
              label="اسم المرسل"
              value={form.sender_name}
              onChange={(v) => updateForm('sender_name', v)}
              onPairSelect={(v) => updateForm('sender_phone', v)}
              suggestions={suggestions.senderNames}
            />
            <AutocompleteField
              label="هاتف المرسل"
              type="tel"
              dir="ltr"
              value={form.sender_phone}
              onChange={(v) => updateForm('sender_phone', v)}
              suggestions={suggestions.senderPhones}
              placeholder="7XX XXX XXX"
            />
            <AutocompleteField
              label="اسم المستلم"
              value={form.receiver_name}
              onChange={(v) => updateForm('receiver_name', v)}
              onPairSelect={(v) => updateForm('receiver_phone', v)}
              suggestions={suggestions.receiverNames}
            />
            <AutocompleteField
              label="هاتف المستلم"
              type="tel"
              dir="ltr"
              value={form.receiver_phone}
              onChange={(v) => updateForm('receiver_phone', v)}
              suggestions={suggestions.receiverPhones}
              placeholder="7XX XXX XXX"
            />
          </div>
        </div>

        {/* Driver & Financial */}
        <div className="card">
          <h2 className="font-bold text-slate-800 mb-4">بيانات السائق والمالية</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <AutocompleteField
              label="اسم السائق"
              value={form.driver_name}
              onChange={(v) => updateForm('driver_name', v)}
              onPairSelect={(v) => updateForm('driver_phone', v)}
              suggestions={suggestions.driverNames}
            />
            <AutocompleteField
              label="هاتف السائق"
              type="tel"
              dir="ltr"
              value={form.driver_phone}
              onChange={(v) => updateForm('driver_phone', v)}
              suggestions={suggestions.driverPhones}
              placeholder="7XX XXX XXX"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-teal-50 rounded-xl p-4 border border-teal-200">
              <label className="input-label text-teal-800">رسوم الأمانات (دخل المكتب)</label>
              <input
                type="number"
                step="0.01"
                className="input-field text-lg font-bold"
                value={form.parcel_fees}
                onChange={(e) => updateForm('parcel_fees', e.target.value)}
                placeholder="0.00"
              />
              <p className="text-xs text-teal-600 mt-1.5 font-semibold">
                {form.parcel_fees ? formatCurrency(parseFloat(form.parcel_fees)) : 'المبلغ الذي يحصله المكتب'}
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <label className="input-label text-slate-700">إجمالي مستحقات السائق</label>
              <input
                type="number"
                step="0.01"
                className="input-field text-lg font-bold"
                value={form.driver_total_dues}
                onChange={(e) => updateForm('driver_total_dues', e.target.value)}
                placeholder="0.00"
              />
              <p className="text-xs text-slate-500 mt-1.5 font-semibold">
                {form.driver_total_dues ? formatCurrency(parseFloat(form.driver_total_dues)) : 'الأجر المتفق عليه مع السائق'}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
              <label className="input-label text-amber-800">مسلّم للسائق (مقدم)</label>
              <input
                type="number"
                step="0.01"
                className="input-field text-lg font-bold"
                value={form.driver_advance}
                onChange={(e) => updateForm('driver_advance', e.target.value)}
                placeholder="0.00"
              />
              <p className="text-xs text-amber-600 mt-1.5 font-semibold">
                {form.driver_advance ? formatCurrency(parseFloat(form.driver_advance)) : 'مبلغ مدفوع مقدم للسائق'}
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col justify-center">
              <label className="input-label text-slate-700">المتبقي للسائق</label>
              <p className="text-2xl font-bold text-slate-800 py-2">
                {formatCurrency(
                  (form.driver_total_dues ? parseFloat(form.driver_total_dues) : 0) -
                  (form.driver_advance ? parseFloat(form.driver_advance) : 0)
                )}
              </p>
              <p className="text-xs text-slate-500 font-semibold">محسوب تلقائياً</p>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="card">
          <label className="input-label">ملاحظات</label>
          <textarea
            className="input-field min-h-[80px] resize-y"
            value={form.notes}
            onChange={(e) => updateForm('notes', e.target.value)}
            placeholder="أي ملاحظات إضافية..."
          />
        </div>

        {/* Submit */}
        <div className="flex gap-3 pb-6">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary flex-1 flex items-center justify-center gap-2 text-lg py-4"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
            {saving ? 'جاري الحفظ...' : 'استلام الشحنة'}
          </button>
        </div>
      </form>
    </div>
  );
}
