// Formatting utilities for the Suhail Express app

// Format currency in Yemeni Rial style
export function formatCurrency(amount: number): string {
  const formatted = new Intl.NumberFormat('ar-YE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount || 0);
  return `${formatted} ر.ي`;
}

// Format number in Arabic
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('ar-YE').format(num || 0);
}

// Format date in Arabic with Asia/Aden timezone
export function formatDate(dateString: string | null): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ar', {
      timeZone: 'Asia/Aden',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  } catch {
    return '—';
  }
}

// Format date and time in Arabic with Asia/Aden timezone
export function formatDateTime(dateString: string | null): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ar', {
      timeZone: 'Asia/Aden',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return '—';
  }
}

// Format time only
export function formatTime(dateString: string | null): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ar', {
      timeZone: 'Asia/Aden',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return '—';
  }
}

// Get today's date in YYYY-MM-DD format for date inputs
export function getTodayDate(): string {
  const now = new Date();
  const adenDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Aden' }));
  const year = adenDate.getFullYear();
  const month = String(adenDate.getMonth() + 1).padStart(2, '0');
  const day = String(adenDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Get yesterday's date
export function getYesterdayDate(): string {
  const now = new Date();
  const adenDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Aden' }));
  adenDate.setDate(adenDate.getDate() - 1);
  const year = adenDate.getFullYear();
  const month = String(adenDate.getMonth() + 1).padStart(2, '0');
  const day = String(adenDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Get the start and end of a date in ISO format (for Supabase queries)
export function getDateRange(dateStr: string): { start: string; end: string } {
  const start = new Date(dateStr + 'T00:00:00');
  const end = new Date(dateStr + 'T23:59:59.999');
  return { start: start.toISOString(), end: end.toISOString() };
}

// Build WhatsApp message for a shipment
export function buildDriverWhatsAppMessage(shipment: {
  shipment_number: string;
  shipment_type: string;
  quantity: number;
  quantity_unit: string;
  destination: string | null;
  receiver_name: string | null;
  receiver_phone: string | null;
  driver_total_dues: number;
  parcel_fees: number;
}): string {
  const lines = [
    '*سهيل إكسبرس - تفاصيل الشحنة*',
    '',
    `رقم الشحنة: ${shipment.shipment_number}`,
    `النوع: ${shipment.shipment_type}`,
    `الكمية: ${shipment.quantity} ${shipment.quantity_unit}`,
    `الوجهة: ${shipment.destination || '—'}`,
    `اسم المستلم: ${shipment.receiver_name || '—'}`,
    `هاتف المستلم: ${shipment.receiver_phone || '—'}`,
    '',
    `مستحقات السائق: ${formatCurrency(shipment.driver_total_dues)}`,
    `رسوم الأمانات: ${formatCurrency(shipment.parcel_fees)}`,
  ];
  return encodeURIComponent(lines.join('\n'));
}

export function buildReceiverWhatsAppMessage(shipment: {
  shipment_number: string;
  shipment_type: string;
  quantity: number;
  quantity_unit: string;
  sender_name: string | null;
  sender_phone: string | null;
  driver_name: string | null;
  parcel_fees: number;
}): string {
  const lines = [
    '*سهيل إكسبرس - شحنة قادمة إليك*',
    '',
    `رقم الشحنة: ${shipment.shipment_number}`,
    `النوع: ${shipment.shipment_type}`,
    `الكمية: ${shipment.quantity} ${shipment.quantity_unit}`,
    `المرسل: ${shipment.sender_name || '—'}`,
    `هاتف المرسل: ${shipment.sender_phone || '—'}`,
    `السائق: ${shipment.driver_name || '—'}`,
    `رسوم الأمانات: ${formatCurrency(shipment.parcel_fees)}`,
  ];
  return encodeURIComponent(lines.join('\n'));
}

// Convert phone number to international format for wa.me
export function formatPhoneForWhatsApp(phone: string | null): string {
  if (!phone) return '';
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  // If starts with 0, replace with 967 (Yemen country code)
  if (cleaned.startsWith('0')) {
    cleaned = '967' + cleaned.substring(1);
  }
  // If doesn't start with country code, add 967
  if (!cleaned.startsWith('967') && cleaned.length < 10) {
    cleaned = '967' + cleaned;
  }
  return cleaned;
}
