import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Shipment, DriverPayment, DeliveryReceipt, StatusHistory } from '@/types';

// Fetch all shipments with realtime updates
export function useShipments() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchShipments = useCallback(async () => {
    const { data, error } = await supabase
      .from('shipments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setShipments(data as Shipment[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchShipments();

    const channel = supabase
      .channel('shipments-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shipments' }, () => {
        fetchShipments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchShipments]);

  return { shipments, loading, error, refetch: fetchShipments };
}

// Fetch driver payments with realtime
export function useDriverPayments() {
  const [payments, setPayments] = useState<DriverPayment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPayments = useCallback(async () => {
    const { data } = await supabase
      .from('driver_payments')
      .select('*')
      .order('paid_at', { ascending: false });

    if (data) setPayments(data as DriverPayment[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPayments();

    const channel = supabase
      .channel('driver-payments-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_payments' }, () => {
        fetchPayments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPayments]);

  return { payments, loading, refetch: fetchPayments };
}

// Fetch delivery receipts with realtime
export function useDeliveryReceipts() {
  const [receipts, setReceipts] = useState<DeliveryReceipt[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReceipts = useCallback(async () => {
    const { data } = await supabase
      .from('delivery_receipts')
      .select('*')
      .order('delivered_at', { ascending: false });

    if (data) setReceipts(data as DeliveryReceipt[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchReceipts();

    const channel = supabase
      .channel('delivery-receipts-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'delivery_receipts' }, () => {
        fetchReceipts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchReceipts]);

  return { receipts, loading, refetch: fetchReceipts };
}

// Fetch status history for a specific shipment
export function useStatusHistory(shipmentId: string | null) {
  const [history, setHistory] = useState<StatusHistory[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!shipmentId) {
      setHistory([]);
      return;
    }

    const fetchHistory = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('shipment_status_history')
        .select('*')
        .eq('shipment_id', shipmentId)
        .order('changed_at', { ascending: true });

      if (data) setHistory(data as StatusHistory[]);
      setLoading(false);
    };

    fetchHistory();

    const channel = supabase
      .channel(`status-history-${shipmentId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shipment_status_history', filter: `shipment_id=eq.${shipmentId}` },
        fetchHistory
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shipmentId]);

  return { history, loading };
}

// Fetch payments for a specific shipment
export function useShipmentPayments(shipmentId: string | null) {
  const [payments, setPayments] = useState<DriverPayment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!shipmentId) {
      setPayments([]);
      return;
    }

    const fetchPayments = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('driver_payments')
        .select('*')
        .eq('shipment_id', shipmentId)
        .order('paid_at', { ascending: false });

      if (data) setPayments(data as DriverPayment[]);
      setLoading(false);
    };

    fetchPayments();

    const channel = supabase
      .channel(`shipment-payments-${shipmentId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'driver_payments', filter: `shipment_id=eq.${shipmentId}` },
        fetchPayments
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shipmentId]);

  return { payments, loading };
}
