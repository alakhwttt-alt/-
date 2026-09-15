import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';

interface SuggestionEntry {
  name: string;
  phone: string;
}

interface AutocompleteData {
  senderNames: SuggestionEntry[];
  receiverNames: SuggestionEntry[];
  driverNames: SuggestionEntry[];
  sourceNames: SuggestionEntry[];
  destinations: string[];
  sourcePhones: string[];
  senderPhones: string[];
  receiverPhones: string[];
  driverPhones: string[];
}

export function useAutocompleteData() {
  const [data, setData] = useState<AutocompleteData>({
    senderNames: [],
    receiverNames: [],
    driverNames: [],
    sourceNames: [],
    destinations: [],
    sourcePhones: [],
    senderPhones: [],
    receiverPhones: [],
    driverPhones: [],
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data: rows } = await supabase
        .from('shipments')
        .select('sender_name, sender_phone, receiver_name, receiver_phone, driver_name, driver_phone, source_name, source_phone, destination')
        .order('created_at', { ascending: false })
        .limit(500);

      if (cancelled || !rows) return;

      const seenSender = new Set<string>();
      const seenReceiver = new Set<string>();
      const seenDriver = new Set<string>();
      const seenSource = new Set<string>();
      const seenDest = new Set<string>();
      const seenSourcePhone = new Set<string>();
      const seenSenderPhone = new Set<string>();
      const seenReceiverPhone = new Set<string>();
      const seenDriverPhone = new Set<string>();

      const senderNames: SuggestionEntry[] = [];
      const receiverNames: SuggestionEntry[] = [];
      const driverNames: SuggestionEntry[] = [];
      const sourceNames: SuggestionEntry[] = [];
      const destinations: string[] = [];
      const sourcePhones: string[] = [];
      const senderPhones: string[] = [];
      const receiverPhones: string[] = [];
      const driverPhones: string[] = [];

      for (const r of rows) {
        const sName = (r.sender_name || '').trim();
        const sPhone = (r.sender_phone || '').trim();
        const rName = (r.receiver_name || '').trim();
        const rPhone = (r.receiver_phone || '').trim();
        const dName = (r.driver_name || '').trim();
        const dPhone = (r.driver_phone || '').trim();
        const srcName = (r.source_name || '').trim();
        const srcPhone = (r.source_phone || '').trim();
        const dest = (r.destination || '').trim();

        if (sName) {
          const key = sName.toLowerCase();
          if (!seenSender.has(key)) {
            seenSender.add(key);
            senderNames.push({ name: sName, phone: sPhone });
          }
        }
        if (rName) {
          const key = rName.toLowerCase();
          if (!seenReceiver.has(key)) {
            seenReceiver.add(key);
            receiverNames.push({ name: rName, phone: rPhone });
          }
        }
        if (dName) {
          const key = dName.toLowerCase();
          if (!seenDriver.has(key)) {
            seenDriver.add(key);
            driverNames.push({ name: dName, phone: dPhone });
          }
        }
        if (srcName) {
          const key = srcName.toLowerCase();
          if (!seenSource.has(key)) {
            seenSource.add(key);
            sourceNames.push({ name: srcName, phone: srcPhone });
          }
        }
        if (dest && !seenDest.has(dest.toLowerCase())) {
          seenDest.add(dest.toLowerCase());
          destinations.push(dest);
        }
        if (srcPhone && !seenSourcePhone.has(srcPhone)) {
          seenSourcePhone.add(srcPhone);
          sourcePhones.push(srcPhone);
        }
        if (sPhone && !seenSenderPhone.has(sPhone)) {
          seenSenderPhone.add(sPhone);
          senderPhones.push(sPhone);
        }
        if (rPhone && !seenReceiverPhone.has(rPhone)) {
          seenReceiverPhone.add(rPhone);
          receiverPhones.push(rPhone);
        }
        if (dPhone && !seenDriverPhone.has(dPhone)) {
          seenDriverPhone.add(dPhone);
          driverPhones.push(dPhone);
        }
      }

      if (!cancelled) {
        setData({
          senderNames, receiverNames, driverNames, sourceNames,
          destinations, sourcePhones, senderPhones, receiverPhones, driverPhones,
        });
        setLoaded(true);
      }
    };

    load();

    return () => { cancelled = true; };
  }, []);

  return { data, loaded };
}

export type { SuggestionEntry };
