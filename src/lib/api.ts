import { supabase } from "@/integrations/supabase/client";

type JsonRecord = Record<string, unknown>;

export interface CreatePixChargeRequest {
  nome: string;
  whatsapp: string;
  email: string | null;
  cpf_cnpj: string | null;
  cep: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  tamanho: string;
  quantidade: number;
  valor_unitario: number;
  observacoes: string | null;
  data_entrega: string | null;
  horario_entrega: string | null;
  referral_source?: string | null;
}

export interface CreatePixChargeResponse {
  order_id: string;
  order_token: string;
  pix_qr_code: string | null;
  pix_copy_paste: string | null;
  expires_at: string;
}

export interface PublicOrderStatusRequest {
  order_id: string;
  access_token: string;
}

export interface PublicOrderStatusResponse {
  id: string;
  tamanho: string;
  quantidade: number;
  valor_total: number;
  status: string;
  payment_status: string;
  referral_source: string | null;
  pix_qr_code: string | null;
  pix_copy_paste: string | null;
  pix_expires_at: string | null;
  paid_at: string | null;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string" && error) {
    return error;
  }

  return fallback;
}

async function postToEdgeFunction<TResponse>(
  endpoint: string,
  body: JsonRecord,
): Promise<TResponse> {
  const { data, error } = await supabase.functions.invoke(endpoint, {
    body,
  });

  if (error) {
    throw new Error(getErrorMessage(error, "Erro ao chamar Edge Function."));
  }

  return data as TResponse;
}

export async function apiPost<TResponse, TBody extends JsonRecord>(
  endpoint: string,
  body: TBody,
): Promise<TResponse> {
  return postToEdgeFunction<TResponse>(endpoint, body);
}
