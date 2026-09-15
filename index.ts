export type ShipmentStatus = 'pending' | 'received' | 'delivered' | 'cancelled';

export interface Shipment {
  id: string;
  shipment_number: string;
  created_at: string;
  shipment_type: string;
  quantity: number;
  quantity_unit: string;
  size_type: string | null;
  weight: number | null;
  weight_unit: string | null;
  image_url: string | null;
  source_type: string | null;
  source_name: string | null;
  source_phone: string | null;
  destination: string | null;
  sender_name: string | null;
  sender_phone: string | null;
  receiver_name: string | null;
  receiver_phone: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  parcel_fees: number;
  driver_total_dues: number;
  status: ShipmentStatus;
  received_at: string | null;
  delivered_at: string | null;
  delivery_notes: string | null;
  notes: string | null;
}

export interface DriverPayment {
  id: string;
  shipment_id: string;
  driver_name: string | null;
  amount: number;
  payment_method: string | null;
  notes: string | null;
  paid_at: string;
  created_at: string;
}

export interface DeliveryReceipt {
  id: string;
  shipment_id: string;
  receipt_number: string;
  receiver_name: string | null;
  receiver_phone: string | null;
  delivered_amount: number;
  payment_method: string | null;
  notes: string | null;
  delivered_at: string;
  delivered_by: string | null;
  created_at: string;
}

export interface StatusHistory {
  id: string;
  shipment_id: string;
  from_status: string | null;
  to_status: string;
  changed_by: string | null;
  changed_at: string;
  notes: string | null;
}

export interface ShipmentWithRelations extends Shipment {
  driver_payments?: DriverPayment[];
  delivery_receipts?: DeliveryReceipt[];
  status_history?: StatusHistory[];
}

export const SHIPMENT_TYPES = [
  'قات',
  'كرتون',
  'مبيد',
  'ثياب',
  'إلكترونيات',
  'أدوية',
  'مواد غذائية',
  'مستندات',
  'أخرى',
];

export const QUANTITY_UNITS = ['قطعة', 'كرتونة', 'كيس', 'حقيبة', 'صندوق', 'ربطة'];

export const SIZE_TYPES = ['صغير', 'متوسط', 'كبير', 'كبير جداً'];

export const SOURCE_TYPES = ['مكتب أمانات', 'مرسل مباشر'];

export const PAYMENT_METHODS = ['نقد', 'تحويل بنكي', 'شيك', 'محفظة إلكترونية'];

export const STATUS_LABELS: Record<ShipmentStatus, string> = {
  pending: 'قيد الانتظار',
  received: 'تم الاستلام',
  delivered: 'تم التسليم',
  cancelled: 'ملغي',
};

export const STATUS_COLORS: Record<ShipmentStatus, string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-300',
  received: 'bg-blue-100 text-blue-800 border-blue-300',
  delivered: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  cancelled: 'bg-red-100 text-red-800 border-red-300',
};
