/**
 * Client para a API FastSoft/FluxoPay.
 * Usado APENAS no admin para consultar/estornar transações.
 * A secret key é buscada do vault via Edge Function proxy.
 */

import { supabase } from '@/integrations/supabase/client';

const FASTSOFT_API_URL = 'https://api.fastsoftbrasil.com';

interface FastSoftTransaction {
  id: string;
  amount: number;
  paymentMethod: string;
  status: string; // WAITING_PAYMENT, PAID, REFUNDED, CANCELED
  customer: {
    name: string;
    email: string;
    document: string;
  };
  pix?: {
    qrcode: string;
    url: string;
    expirationDate: string;
  };
  fees?: {
    amount: number;
    type: string;
  }[];
  amountBaseFee?: number;
  createdAt: string;
  updatedAt: string;
  metadata?: string;
}

interface FastSoftListResponse {
  status: number;
  data: FastSoftTransaction[];
}

interface FastSoftDetailResponse {
  status: number;
  data: FastSoftTransaction;
}

async function getAuthToken(): Promise<string | null> {
  const { data, error } = await supabase.rpc('vault_read_secret', { secret_name: 'FASTSOFT_SECRET_KEY' });
  if (error || !data) return null;
  return btoa(`x:${data}`);
}

export async function listTransactions(status?: string): Promise<FastSoftTransaction[]> {
  const token = await getAuthToken();
  if (!token) return [];

  const url = status
    ? `${FASTSOFT_API_URL}/api/user/transactions?status=${status}`
    : `${FASTSOFT_API_URL}/api/user/transactions`;

  try {
    const res = await fetch(url, {
      headers: { 'Authorization': `Basic ${token}`, 'Content-Type': 'application/json' },
    });
    if (!res.ok) return [];
    const json: FastSoftListResponse = await res.json();
    return json.data || [];
  } catch {
    return [];
  }
}

export async function getTransaction(id: string): Promise<FastSoftTransaction | null> {
  const token = await getAuthToken();
  if (!token) return null;

  try {
    const res = await fetch(`${FASTSOFT_API_URL}/api/user/transactions/${id}`, {
      headers: { 'Authorization': `Basic ${token}`, 'Content-Type': 'application/json' },
    });
    if (!res.ok) return null;
    const json: FastSoftDetailResponse = await res.json();
    return json.data || null;
  } catch {
    return null;
  }
}

export async function refundTransaction(id: string): Promise<{ success: boolean; error?: string }> {
  const token = await getAuthToken();
  if (!token) return { success: false, error: 'Sem acesso ao gateway' };

  try {
    const res = await fetch(`${FASTSOFT_API_URL}/api/user/transactions/${id}/refund`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${token}`, 'Content-Type': 'application/json' },
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.message || 'Erro no estorno' };
    return { success: true };
  } catch {
    return { success: false, error: 'Falha na comunicação com gateway' };
  }
}

export type { FastSoftTransaction };
