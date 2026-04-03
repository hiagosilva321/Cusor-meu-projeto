import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * Edge Function: Cria transacao PIX na FastSoft e salva pedido no Supabase.
 *
 * Auth FastSoft: Basic base64("x:<FASTSOFT_SECRET_KEY>")
 * Endpoint:     POST <FASTSOFT_API_URL>/api/user/transactions
 *
 * Resposta FastSoft:
 *   data.pix.qrcode  -> Base64 da imagem PNG do QR Code
 *   data.pix.url     -> Codigo EMV copia-e-cola do PIX
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { nome, whatsapp, email, cpf_cnpj, cep, endereco, numero, complemento, bairro, cidade, estado, tamanho, quantidade, valor_unitario, observacoes, data_entrega, horario_entrega, referral_source } = await req.json();

    if (!nome || !whatsapp || !tamanho || !valor_unitario) {
      return new Response(JSON.stringify({ error: 'Campos obrigatorios: nome, whatsapp, tamanho, valor_unitario' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const qtd = Math.max(1, Math.min(Number(quantidade) || 1, 99));
    if (typeof valor_unitario !== 'number' || valor_unitario <= 0 || valor_unitario > 100000) {
      return new Response(JSON.stringify({ error: 'Valor unitario invalido.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const valor_total = valor_unitario * qtd;
    const amount = Math.round(valor_total * 100); // centavos

    let FASTSOFT_SECRET_KEY = Deno.env.get('FASTSOFT_SECRET_KEY');
    const FASTSOFT_API_URL = Deno.env.get('FASTSOFT_API_URL') || 'https://api.fastsoftbrasil.com';

    // Fallback: buscar secret do vault do Supabase se não estiver em env
    if (!FASTSOFT_SECRET_KEY) {
      try {
        const vaultClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
        const { data: vaultData } = await vaultClient.rpc('vault_read_secret', { secret_name: 'FASTSOFT_SECRET_KEY' });
        if (vaultData) FASTSOFT_SECRET_KEY = vaultData;
      } catch (e) {
        console.error('[CREATE-PIX] Vault fallback error:', e);
      }
    }

    if (!FASTSOFT_SECRET_KEY) {
      console.error('[CREATE-PIX] FASTSOFT_SECRET_KEY ausente (env + vault)');
      return new Response(JSON.stringify({ error: 'Gateway de pagamento indisponivel.' }), { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // FastSoft Basic Auth: base64("x:<secret_key>")
    const authString = `x:${FASTSOFT_SECRET_KEY}`;
    const tokenBase64 = base64Encode(new TextEncoder().encode(authString));

    const orderRef = crypto.randomUUID().slice(0, 8);

    const cleanDoc = (cpf_cnpj || '').replace(/\D/g, '');
    const docType = cleanDoc.length > 11 ? 'CNPJ' : 'CPF';

    // IP do cliente para antifraude
    const forwardedFor = req.headers.get('x-forwarded-for');
    const clientIp = forwardedFor
      ? String(forwardedFor).split(',')[0].trim()
      : '127.0.0.1';

    // URL do webhook
    const WEBHOOK_URL = Deno.env.get('FASTSOFT_WEBHOOK_URL')
      || `${Deno.env.get('SUPABASE_URL')}/functions/v1/fastsoft-webhook`;

    // Payload FastSoft (conforme doc oficial)
    const payload = {
      amount,
      paymentMethod: 'PIX',
      customer: {
        name: nome,
        email: email || `${whatsapp.replace(/\D/g, '')}@noemail.com`,
        document: {
          number: cleanDoc || '00000000000',
          type: docType,
        },
        phone: whatsapp.replace(/\D/g, ''),
        externaRef: `cli_${orderRef}`,
      },
      shipping: {
        fee: 0,
        address: {
          street: endereco || '',
          streetNumber: numero || '',
          complement: complemento || '',
          zipCode: (cep || '').replace(/\D/g, ''),
          neighborhood: bairro || '',
          city: cidade || '',
          state: estado || '',
          country: 'br',
        },
      },
      items: [{
        title: `Cacamba ${tamanho} x${qtd}`,
        unitPrice: amount,
        quantity: 1,
        tangible: false,
        externalRef: `ped_${orderRef}`,
      }],
      postbackUrl: WEBHOOK_URL,
      metadata: {
        order_ref: orderRef,
        referral_source: referral_source || null,
      },
      traceable: true,
      ip: clientIp,
      pix: {
        expiresInDays: 1,
      },
    };

    // Chamar FastSoft API
    const response = await fetch(`${FASTSOFT_API_URL}/api/user/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${tokenBase64}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('FastSoft error:', JSON.stringify(data));
      return new Response(JSON.stringify({ error: 'Erro interno ao processar pagamento.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const txData = data.data;

    // ── Campos da resposta FastSoft ──
    // txData.pix.qrcode -> Base64 da imagem PNG (para <img>)
    // txData.pix.url    -> Codigo EMV copia-e-cola (texto)
    const pixQrCodeBase64 = txData?.pix?.qrcode || null;
    const pixCopyPaste = txData?.pix?.url || null;
    const pixExpiresAt = txData?.pix?.expirationDate
      || new Date(Date.now() + 86400000).toISOString();

    // Salvar pedido no banco
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: order, error: dbError } = await supabase.from('orders').insert({
      nome,
      whatsapp,
      email: email || '',
      cpf_cnpj: cpf_cnpj || '',
      cep: cep || '',
      endereco: endereco || '',
      numero: numero || '',
      complemento: complemento || '',
      bairro: bairro || '',
      cidade: cidade || '',
      estado: estado || '',
      tamanho,
      quantidade: qtd,
      valor_unitario,
      valor_total,
      forma_pagamento: 'pix',
      status: 'aguardando_pagamento',
      payment_status: 'pending',
      fastsoft_transaction_id: txData?.id || null,
      fastsoft_external_ref: `ped_${orderRef}`,
      pix_qr_code: pixQrCodeBase64,
      pix_qr_code_url: null,
      pix_copy_paste: pixCopyPaste,
      pix_expires_at: pixExpiresAt,
      observacoes: observacoes || '',
      data_entrega: data_entrega || null,
      horario_entrega: horario_entrega || null,
      referral_source: referral_source || null,
    }).select().single();

    if (dbError) {
      console.error('DB error:', dbError);
      throw dbError;
    }

    return new Response(JSON.stringify({
      order_id: order.id,
      order_token: order.public_access_token,
      pix_qr_code: pixQrCodeBase64,
      pix_copy_paste: pixCopyPaste,
      expires_at: pixExpiresAt,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('[CREATE-PIX] Erro:', error);
    return new Response(JSON.stringify({ error: 'Erro interno ao processar pagamento.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
