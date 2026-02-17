import { supabase } from '../lib/supabase';

export type PaymentMethodType = 'card' | 'gcash' | 'grabpay' | 'paymaya' | 'qrph';

export interface CheckoutSessionRequest {
  amount: number;
  description: string;
  planId: string;
  tenantId: string;
}

export interface CheckoutSessionResponse {
  checkoutUrl: string;
  sessionId: string;
}

export interface Payment {
  id: string;
  user_id: string;
  tenant_id?: string;
  paymongo_payment_id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method_type: string;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export const createCheckoutSession = async (
  request: CheckoutSessionRequest
): Promise<CheckoutSessionResponse> => {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('User not authenticated');
  }

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment-intent`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to create checkout session');
  }

  return await response.json();
};

export const getUserPayments = async (): Promise<Payment[]> => {
  const { data, error } = await supabase
    .from('paymongo_payments')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const getPaymentById = async (paymentId: string): Promise<Payment | null> => {
  const { data, error } = await supabase
    .from('paymongo_payments')
    .select('*')
    .eq('id', paymentId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const getPaymentByPaymongoId = async (paymongoPaymentId: string): Promise<Payment | null> => {
  const { data, error } = await supabase
    .from('paymongo_payments')
    .select('*')
    .eq('paymongo_payment_id', paymongoPaymentId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const getLatestPendingPayment = async (): Promise<Payment | null> => {
  const { data, error } = await supabase
    .from('paymongo_payments')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

export const formatAmount = (centavos: number): string => {
  const pesos = centavos / 100;
  return `₱${pesos.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const pesosTocentavos = (pesos: number): number => {
  return Math.round(pesos * 100);
};

export const getPaymentMethodLabel = (method: string): string => {
  const labels: Record<string, string> = {
    card: 'Credit/Debit Card',
    gcash: 'GCash',
    grabpay: 'GrabPay',
    grab_pay: 'GrabPay',
    paymaya: 'PayMaya',
    qrph: 'QR Ph',
    instapay: 'InstaPay',
    pesonet: 'PESONet',
  };
  return labels[method] || method;
};

export const getPaymentStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    'succeeded': 'text-green-600',
    'pending': 'text-yellow-600',
    'awaiting_payment_method': 'text-blue-600',
    'awaiting_next_action': 'text-blue-600',
    'processing': 'text-blue-600',
    'failed': 'text-red-600',
    'canceled': 'text-gray-600',
  };
  return colors[status] || 'text-gray-600';
};

export const getPaymentStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    'succeeded': 'Paid',
    'pending': 'Pending',
    'awaiting_payment_method': 'Awaiting Payment',
    'awaiting_next_action': 'Action Required',
    'processing': 'Processing',
    'failed': 'Failed',
    'canceled': 'Canceled',
  };
  return labels[status] || status;
};
