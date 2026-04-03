import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * Edge Function: Webhook da FastSoft.
 *
 * IMPORTANTE: Retornar 200 SEMPRE para evitar retentativas infinitas.
 *
 * Payload esperado:
 *   { data: { id, status, metadata (string JSON), ... } }
 *
 * Quando status === "PAID" -> marca pedido como pago no Supabase.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('[WEBHOOK] FastSoft payload:', JSON.stringify(body));

    const transactionData = body?.data;
    if (!transactionData) {
      console.warn('[WEBHOOK] Payload sem campo data — ignorado');
      return new Response(JSON.stringify({ received: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const transactionId = transactionData.id;
    const status = transactionData.status;

    // Parse metadata (FastSoft ecoa de volta o que enviamos)
    let metadata: Record<string, unknown> = {};
    try {
      metadata = typeof transactionData.metadata === 'string'
        ? JSON.parse(transactionData.metadata)
        : (transactionData.metadata || {});
    } catch (e) {
      console.error('[WEBHOOK] Metadata parse error:', e);
    }

    if (transactionId && (status === 'PAID' || status === 'FAILED' || status === 'EXPIRED' || status === 'REFUNDED')) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      if (status === 'PAID') {
        // Pagamento confirmado
        const { error } = await supabase
          .from('orders')
          .update({
            payment_status: 'paid',
            status: 'pago',
            paid_at: new Date().toISOString(),
          })
          .eq('fastsoft_transaction_id', transactionId);

        if (error) {
          console.error('[WEBHOOK] DB update error (PAID):', error);
        } else {
          console.log(`[WEBHOOK] Pedido PAGO (tx: ${transactionId}, ref: ${metadata.referral_source || '-'})`);
        }
      } else {
        // FAILED, EXPIRED, REFUNDED → cancelar pedido
        const paymentStatus = status === 'REFUNDED' ? 'refunded' : 'failed';
        const { error } = await supabase
          .from('orders')
          .update({
            payment_status: paymentStatus,
            status: 'cancelado',
          })
          .eq('fastsoft_transaction_id', transactionId);

        if (error) {
          console.error(`[WEBHOOK] DB update error (${status}):`, error);
        } else {
          console.log(`[WEBHOOK] Pedido CANCELADO — status ${status} (tx: ${transactionId})`);
        }
      }
    } else {
      console.log(`[WEBHOOK] Status ${status} recebido (tx: ${transactionId}) — sem ação`);
    }

    // OBRIGATORIO: retornar 200 rapido para o gateway nao retentar
    return new Response(JSON.stringify({ received: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('[WEBHOOK] Erro inesperado:', error);
    // Retorna 200 mesmo em erro para evitar retentativas
    return new Response(JSON.stringify({ received: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
