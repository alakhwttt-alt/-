/*
# Create Suhail Express Core Tables

## Overview
This migration creates the core database schema for "Suhail Express" — a shipment, parcel, and safekeeping (أمانات) management system.
It creates four tables, enables Row Level Security, and adds policies for single-tenant access (no auth required).

## Tables Created

### 1. shipments
Stores all shipment records with financial tracking.
- id: UUID primary key
- shipment_number: Unique shipment number (format: SH-YYYYMMDD-XXXX)
- shipment_type: Type of shipment (قات, كرتون, مبيد, ثياب, etc.)
- quantity: Number of items
- quantity_unit: Unit of quantity (قطعة, كرتونة, etc.)
- size_type: Size classification
- weight: Weight value
- weight_unit: Unit of weight (كجم)
- image_url: URL to shipment image in Supabase Storage
- source_type: Source type (مكتب أمانات / مرسل مباشر)
- source_name: Name of source/office
- destination: Destination location
- sender_name, sender_phone: Sender contact info
- receiver_name, receiver_phone: Receiver contact info
- driver_name, driver_phone: Driver contact info
- parcel_fees: Safekeeping service fees (office income)
- driver_total_dues: Total agreed driver wages
- status: Shipment status (pending, received, delivered, cancelled)
- received_at, delivered_at: Timestamps for status changes
- delivery_notes, notes: Additional notes

### 2. driver_payments
Records payments made to drivers for specific shipments.
- id: UUID primary key
- shipment_id: FK to shipments (CASCADE delete)
- driver_name: Driver name
- amount: Payment amount (must be > 0)
- payment_method: Method of payment
- notes: Payment notes
- paid_at: When payment was made
- created_at: Record creation timestamp

### 3. delivery_receipts
Generated when a shipment is delivered.
- id: UUID primary key
- shipment_id: FK to shipments (CASCADE delete)
- receipt_number: Unique receipt number (format: DR-YYYYMMDD-XXXX)
- receiver_name, receiver_phone: Who received the shipment
- delivered_amount: Amount collected on delivery
- payment_method: Payment method for delivery
- notes: Receipt notes
- delivered_at: When delivery occurred
- delivered_by: UUID of user who delivered
- created_at: Record creation timestamp

### 4. shipment_status_history
Tracks status changes for each shipment.
- id: UUID primary key
- shipment_id: FK to shipments (CASCADE delete)
- from_status: Previous status
- to_status: New status
- changed_by: UUID of user who changed status
- changed_at: When the change occurred
- notes: Change notes

## Security
- RLS enabled on all tables.
- Single-tenant (no auth): policies allow anon + authenticated full CRUD access.
- This is an intentionally shared/public internal business tool.

## Important Notes
1. All tables use gen_random_uuid() for primary keys.
2. Foreign keys use ON DELETE CASCADE for data integrity.
3. Shipment numbers and receipt numbers are auto-generated via database functions.
4. driver_payments.amount has a CHECK constraint ensuring positive amounts.
5. Timestamps default to now() in UTC; the app converts to Asia/Aden timezone for display.
*/

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- TABLE: shipments
-- ============================================
CREATE TABLE IF NOT EXISTS shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_number TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  shipment_type TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  quantity_unit TEXT NOT NULL DEFAULT 'قطعة',
  size_type TEXT,
  weight NUMERIC(10,2),
  weight_unit TEXT DEFAULT 'كجم',
  image_url TEXT,
  source_type TEXT,
  source_name TEXT,
  destination TEXT,
  sender_name TEXT,
  sender_phone TEXT,
  receiver_name TEXT,
  receiver_phone TEXT,
  driver_name TEXT,
  driver_phone TEXT,
  parcel_fees NUMERIC(12,2) DEFAULT 0,
  driver_total_dues NUMERIC(12,2) DEFAULT 0,
  status TEXT DEFAULT 'pending',
  received_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  delivery_notes TEXT,
  notes TEXT
);

ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (idempotency)
DROP POLICY IF EXISTS "anon_select_shipments" ON shipments;
DROP POLICY IF EXISTS "anon_insert_shipments" ON shipments;
DROP POLICY IF EXISTS "anon_update_shipments" ON shipments;
DROP POLICY IF EXISTS "anon_delete_shipments" ON shipments;

CREATE POLICY "anon_select_shipments" ON shipments FOR SELECT
  TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_shipments" ON shipments FOR INSERT
  TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_shipments" ON shipments FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_shipments" ON shipments FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================
-- TABLE: driver_payments
-- ============================================
CREATE TABLE IF NOT EXISTS driver_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  driver_name TEXT,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  payment_method TEXT,
  notes TEXT,
  paid_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE driver_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_driver_payments" ON driver_payments;
DROP POLICY IF EXISTS "anon_insert_driver_payments" ON driver_payments;
DROP POLICY IF EXISTS "anon_update_driver_payments" ON driver_payments;
DROP POLICY IF EXISTS "anon_delete_driver_payments" ON driver_payments;

CREATE POLICY "anon_select_driver_payments" ON driver_payments FOR SELECT
  TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_driver_payments" ON driver_payments FOR INSERT
  TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_driver_payments" ON driver_payments FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_driver_payments" ON driver_payments FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================
-- TABLE: delivery_receipts
-- ============================================
CREATE TABLE IF NOT EXISTS delivery_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  receipt_number TEXT UNIQUE NOT NULL,
  receiver_name TEXT,
  receiver_phone TEXT,
  delivered_amount NUMERIC(12,2) DEFAULT 0,
  payment_method TEXT,
  notes TEXT,
  delivered_at TIMESTAMPTZ DEFAULT now(),
  delivered_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE delivery_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_delivery_receipts" ON delivery_receipts;
DROP POLICY IF EXISTS "anon_insert_delivery_receipts" ON delivery_receipts;
DROP POLICY IF EXISTS "anon_update_delivery_receipts" ON delivery_receipts;
DROP POLICY IF EXISTS "anon_delete_delivery_receipts" ON delivery_receipts;

CREATE POLICY "anon_select_delivery_receipts" ON delivery_receipts FOR SELECT
  TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_delivery_receipts" ON delivery_receipts FOR INSERT
  TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_delivery_receipts" ON delivery_receipts FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_delivery_receipts" ON delivery_receipts FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================
-- TABLE: shipment_status_history
-- ============================================
CREATE TABLE IF NOT EXISTS shipment_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID REFERENCES shipments(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID,
  changed_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT
);

ALTER TABLE shipment_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_status_history" ON shipment_status_history;
DROP POLICY IF EXISTS "anon_insert_status_history" ON shipment_status_history;
DROP POLICY IF EXISTS "anon_update_status_history" ON shipment_status_history;
DROP POLICY IF EXISTS "anon_delete_status_history" ON shipment_status_history;

CREATE POLICY "anon_select_status_history" ON shipment_status_history FOR SELECT
  TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_status_history" ON shipment_status_history FOR INSERT
  TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_status_history" ON shipment_status_history FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_status_history" ON shipment_status_history FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================
-- INDEXES for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_created_at ON shipments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shipments_driver_name ON shipments(driver_name);
CREATE INDEX IF NOT EXISTS idx_shipments_shipment_number ON shipments(shipment_number);
CREATE INDEX IF NOT EXISTS idx_driver_payments_shipment_id ON driver_payments(shipment_id);
CREATE INDEX IF NOT EXISTS idx_delivery_receipts_shipment_id ON delivery_receipts(shipment_id);
CREATE INDEX IF NOT EXISTS idx_status_history_shipment_id ON shipment_status_history(shipment_id);

-- ============================================
-- FUNCTION: generate_shipment_number
-- Auto-generates unique shipment numbers: SH-YYYYMMDD-XXXX
-- ============================================
CREATE OR REPLACE FUNCTION generate_shipment_number()
RETURNS TEXT AS $$
DECLARE
  date_part TEXT;
  seq_num INTEGER;
  full_number TEXT;
BEGIN
  date_part := to_char(now() AT TIME ZONE 'Asia/Aden', 'YYYYMMDD');

  -- Get the next sequence number for today
  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(shipment_number FROM 'SH-[0-9]{8}-([0-9]{4})') AS INTEGER
    )
  ), 0) + 1
  INTO seq_num
  FROM shipments
  WHERE shipment_number LIKE 'SH-' || date_part || '-%';

  full_number := 'SH-' || date_part || '-' || lpad(seq_num::TEXT, 4, '0');

  RETURN full_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: generate_receipt_number
-- Auto-generates unique delivery receipt numbers: DR-YYYYMMDD-XXXX
-- ============================================
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TEXT AS $$
DECLARE
  date_part TEXT;
  seq_num INTEGER;
  full_number TEXT;
BEGIN
  date_part := to_char(now() AT TIME ZONE 'Asia/Aden', 'YYYYMMDD');

  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(receipt_number FROM 'DR-[0-9]{8}-([0-9]{4})') AS INTEGER
    )
  ), 0) + 1
  INTO seq_num
  FROM delivery_receipts
  WHERE receipt_number LIKE 'DR-' || date_part || '-%';

  full_number := 'DR-' || date_part || '-' || lpad(seq_num::TEXT, 4, '0');

  RETURN full_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Enable Realtime on all tables
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE shipments;
ALTER PUBLICATION supabase_realtime ADD TABLE driver_payments;
ALTER PUBLICATION supabase_realtime ADD TABLE delivery_receipts;
ALTER PUBLICATION supabase_realtime ADD TABLE shipment_status_history;