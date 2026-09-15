/*
# Add source_phone column to shipments

1. Changes
- Added `source_phone` (TEXT, nullable) to `shipments` table.
- Stores the phone number of the source office / safekeeping office.
- Used for direct WhatsApp communication and contact export.

2. Security
- No RLS policy changes needed — existing policies already allow full CRUD on `shipments`.
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shipments' AND column_name = 'source_phone'
  ) THEN
    ALTER TABLE shipments ADD COLUMN source_phone TEXT;
  END IF;
END $$;
