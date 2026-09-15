import type { Shipment, DeliveryReceipt } from '@/types';
import { formatDateTime, formatCurrency, formatPhoneForWhatsApp } from '@/lib/utils';

// Trigger a browser download for a text blob
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob(['\uFEFF' + content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============ CSV / Excel export ============

function csvEscape(value: string | number | null | undefined): string {
  if (value == null) return '';
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function exportShipmentsCSV(shipments: Shipment[], receipts: DeliveryReceipt[]) {
  const receiptMap = new Map<string, DeliveryReceipt>();
  for (const r of receipts) receiptMap.set(r.shipment_id, r);

  const headers = [
    'رقم الشحنة', 'التاريخ', 'النوع', 'الكمية', 'وحدة الكمية', 'الحجم',
    'الوزن', 'وحدة الوزن', 'نوع المصدر', 'اسم المصدر', 'هاتف المصدر',
    'الوجهة', 'اسم المرسل', 'هاتف المرسل', 'اسم المستلم', 'هاتف المستلم',
    'اسم السائق', 'هاتف السائق', 'رسوم الأمانات', 'مستحقات السائق',
    'الحالة', 'تاريخ الاستلام', 'تاريخ التسليم', 'مبلغ التسليم', 'طريقة الدفع',
    'رقم الإيصال', 'ملاحظات',
  ];

  const rows = shipments.map((s) => {
    const receipt = receiptMap.get(s.id);
    const statusLabels: Record<string, string> = {
      pending: 'قيد الانتظار', received: 'تم الاستلام',
      delivered: 'تم التسليم', cancelled: 'ملغي',
    };
    return [
      s.shipment_number, formatDateTime(s.created_at), s.shipment_type,
      s.quantity, s.quantity_unit, s.size_type || '',
      s.weight || '', s.weight_unit || '', s.source_type || '',
      s.source_name || '', s.source_phone || '',
      s.destination || '', s.sender_name || '', s.sender_phone || '',
      s.receiver_name || '', s.receiver_phone || '',
      s.driver_name || '', s.driver_phone || '',
      s.parcel_fees || 0, s.driver_total_dues || 0,
      statusLabels[s.status] || s.status,
      formatDateTime(s.received_at), formatDateTime(s.delivered_at),
      receipt?.delivered_amount || '', receipt?.payment_method || '',
      receipt?.receipt_number || '', s.notes || '',
    ].map(csvEscape).join(',');
  });

  const csv = [headers.map(csvEscape).join(','), ...rows].join('\n');
  downloadFile(csv, `shipments-${Date.now()}.csv`, 'text/csv;charset=utf-8;');
}

export function exportReceiptsCSV(receipts: DeliveryReceipt[], shipmentMap: Map<string, Shipment>) {
  const headers = [
    'رقم الإيصال', 'تاريخ التسليم', 'رقم الشحنة', 'نوع الشحنة',
    'الوجهة', 'اسم المستلم', 'هاتف المستلم', 'المبلغ المسلّم',
    'طريقة الدفع', 'ملاحظات',
  ];

  const rows = receipts.map((r) => {
    const s = shipmentMap.get(r.shipment_id);
    return [
      r.receipt_number, formatDateTime(r.delivered_at),
      s?.shipment_number || '', s?.shipment_type || '',
      s?.destination || '', r.receiver_name || '', r.receiver_phone || '',
      r.delivered_amount || 0, r.payment_method || '', r.notes || '',
    ].map(csvEscape).join(',');
  });

  const csv = [headers.map(csvEscape).join(','), ...rows].join('\n');
  downloadFile(csv, `receipts-${Date.now()}.csv`, 'text/csv;charset=utf-8;');
}

// ============ vCard contact export ============

function vcardEntry(name: string, phone: string, org: string): string {
  const safeName = name || 'بدون اسم';
  return [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${safeName}`,
    `TEL;TYPE=CELL:${phone}`,
    org ? `ORG:${org}` : '',
    'END:VCARD',
  ].filter(Boolean).join('\n');
}

export function exportReceiversVCard(shipments: Shipment[]) {
  const seen = new Set<string>();
  const cards: string[] = [];

  for (const s of shipments) {
    if (!s.receiver_name && !s.receiver_phone) continue;
    const key = (s.receiver_name || '') + '|' + (s.receiver_phone || '');
    if (seen.has(key)) continue;
    seen.add(key);
    cards.push(vcardEntry(s.receiver_name || '', s.receiver_phone || '', 'سهيل إكسبرس - مستلم'));
  }

  if (cards.length === 0) return false;
  downloadFile(cards.join('\n'), `receivers-${Date.now()}.vcf`, 'text/vcard;charset=utf-8;');
  return true;
}

export function exportDriversVCard(shipments: Shipment[]) {
  const seen = new Set<string>();
  const cards: string[] = [];

  for (const s of shipments) {
    if (!s.driver_name && !s.driver_phone) continue;
    const key = (s.driver_name || '') + '|' + (s.driver_phone || '');
    if (seen.has(key)) continue;
    seen.add(key);
    cards.push(vcardEntry(s.driver_name || '', s.driver_phone || '', 'سهيل إكسبرس - سائق'));
  }

  if (cards.length === 0) return false;
  downloadFile(cards.join('\n'), `drivers-${Date.now()}.vcf`, 'text/vcard;charset=utf-8;');
  return true;
}

export function exportSourcesVCard(shipments: Shipment[]) {
  const seen = new Set<string>();
  const cards: string[] = [];

  for (const s of shipments) {
    if (!s.source_name && !s.source_phone) continue;
    const key = (s.source_name || '') + '|' + (s.source_phone || '');
    if (seen.has(key)) continue;
    seen.add(key);
    cards.push(vcardEntry(s.source_name || '', s.source_phone || '', 'سهيل إكسبرس - مكتب مصدر'));
  }

  if (cards.length === 0) return false;
  downloadFile(cards.join('\n'), `sources-${Date.now()}.vcf`, 'text/vcard;charset=utf-8;');
  return true;
}

// ============ PDF print export ============

export function printShipmentsPDF(shipments: Shipment[], receipts: DeliveryReceipt[], dateLabel: string) {
  const receiptMap = new Map<string, DeliveryReceipt>();
  for (const r of receipts) receiptMap.set(r.shipment_id, r);

  const statusLabels: Record<string, string> = {
    pending: 'قيد الانتظار', received: 'تم الاستلام',
    delivered: 'تم التسليم', cancelled: 'ملغي',
  };

  const rows = shipments.map((s) => {
    const r = receiptMap.get(s.id);
    return `<tr>
      <td>${s.shipment_number}</td>
      <td>${formatDateTime(s.created_at)}</td>
      <td>${s.shipment_type}</td>
      <td>${s.quantity} ${s.quantity_unit}</td>
      <td>${s.destination || '—'}</td>
      <td>${s.receiver_name || '—'}</td>
      <td>${s.receiver_phone || '—'}</td>
      <td>${s.driver_name || '—'}</td>
      <td>${formatCurrency(s.parcel_fees || 0)}</td>
      <td>${formatCurrency(s.driver_total_dues || 0)}</td>
      <td>${statusLabels[s.status] || s.status}</td>
      <td>${r ? formatCurrency(r.delivered_amount) : '—'}</td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8">
<title>تقرير الشحنات - ${dateLabel}</title>
<style>
  body { font-family: 'Cairo', sans-serif; padding: 20px; color: #1e293b; }
  h1 { text-align: center; margin-bottom: 5px; }
  .subtitle { text-align: center; color: #64748b; margin-bottom: 20px; font-size: 14px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: right; }
  th { background: #f1f5f9; font-weight: bold; white-space: nowrap; }
  tr:nth-child(even) { background: #f8fafc; }
  .footer { margin-top: 20px; text-align: center; color: #94a3b8; font-size: 11px; }
</style>
</head>
<body>
  <h1>سهيل إكسبرس - تقرير الشحنات</h1>
  <div class="subtitle">${dateLabel} • عدد الشحنات: ${shipments.length}</div>
  <table>
    <thead>
      <tr>
        <th>رقم الشحنة</th><th>التاريخ</th><th>النوع</th><th>الكمية</th>
        <th>الوجهة</th><th>المستلم</th><th>هاتف المستلم</th><th>السائق</th>
        <th>رسوم الأمانات</th><th>مستحقات السائق</th><th>الحالة</th><th>مبلغ التسليم</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">تم إنشاؤه بواسطة نظام سهيل إكسبرس</div>
</body>
</html>`;

  printHTML(html);
}

export function printReceiptsPDF(receipts: DeliveryReceipt[], shipmentMap: Map<string, Shipment>, dateLabel: string) {
  const rows = receipts.map((r) => {
    const s = shipmentMap.get(r.shipment_id);
    return `<tr>
      <td>${r.receipt_number}</td>
      <td>${formatDateTime(r.delivered_at)}</td>
      <td>${s?.shipment_number || '—'}</td>
      <td>${s?.shipment_type || '—'}</td>
      <td>${s?.destination || '—'}</td>
      <td>${r.receiver_name || '—'}</td>
      <td>${r.receiver_phone || '—'}</td>
      <td>${formatCurrency(r.delivered_amount || 0)}</td>
      <td>${r.payment_method || '—'}</td>
    </tr>`;
  }).join('');

  const total = receipts.reduce((sum, r) => sum + (r.delivered_amount || 0), 0);

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8">
<title>تقرير الإيصالات - ${dateLabel}</title>
<style>
  body { font-family: 'Cairo', sans-serif; padding: 20px; color: #1e293b; }
  h1 { text-align: center; margin-bottom: 5px; }
  .subtitle { text-align: center; color: #64748b; margin-bottom: 20px; font-size: 14px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: right; }
  th { background: #f1f5f9; font-weight: bold; white-space: nowrap; }
  tr:nth-child(even) { background: #f8fafc; }
  .total { text-align: center; margin-top: 16px; font-size: 16px; font-weight: bold; color: #0f766e; }
  .footer { margin-top: 20px; text-align: center; color: #94a3b8; font-size: 11px; }
</style>
</head>
<body>
  <h1>سهيل إكسبرس - تقرير إيصالات التسليم</h1>
  <div class="subtitle">${dateLabel} • عدد الإيصالات: ${receipts.length}</div>
  <table>
    <thead>
      <tr>
        <th>رقم الإيصال</th><th>تاريخ التسليم</th><th>رقم الشحنة</th><th>النوع</th>
        <th>الوجهة</th><th>المستلم</th><th>الهاتف</th><th>المبلغ</th><th>طريقة الدفع</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="total">إجمالي المبالغ المسلّمة: ${formatCurrency(total)}</div>
  <div class="footer">تم إنشاؤه بواسطة نظام سهيل إكسبرس</div>
</body>
</html>`;

  printHTML(html);
}

function printHTML(html: string) {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (doc) {
    doc.open();
    doc.write(html);
    doc.close();
  }

  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      // ignore
    }
    setTimeout(() => document.body.removeChild(iframe), 1000);
  };

  // Fallback if onload doesn't fire
  setTimeout(() => {
    try {
      if (iframe.contentWindow) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      }
    } catch {
      // ignore
    }
    setTimeout(() => {
      if (iframe.parentNode) document.body.removeChild(iframe);
    }, 1000);
  }, 500);
}

// Re-export for convenience
export { formatPhoneForWhatsApp };
