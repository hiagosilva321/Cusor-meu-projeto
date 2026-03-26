const { getSupabaseAdmin } = require('../lib/supabase');
const { resolveFastsoftPostbackUrl } = require('../lib/fastsoft-postback-url');
const { getClientByApiKey, getDefaultClientIdFromEnv, getClientById } = require('../lib/ceo-clients');
const crypto = require('crypto');

async function createPixCharge(req, res) {
  try {
    const {
      nome, whatsapp, email, cpf_cnpj, cep, endereco, numero,
      complemento, bairro, cidade, estado, tamanho, quantidade,
      valor_unitario, observacoes
    } = req.body;

    // Validação
    if (!nome || !whatsapp || !tamanho || !valor_unitario) {
      return res.status(400).json({
        error: 'Campos obrigatórios: nome, whatsapp, tamanho, valor_unitario'
      });
    }

    const qtd = quantidade || 1;
    const valor_total = valor_unitario * qtd;
    const amount = Math.round(valor_total * 100); // centavos

    const FASTSOFT_SECRET_KEY = process.env.FASTSOFT_SECRET_KEY;
    if (!FASTSOFT_SECRET_KEY) {
      throw new Error('FASTSOFT_SECRET_KEY not configured');
    }

    // FastSoft Basic Auth: base64("x:<secret_key>")
    const tokenBase64 = Buffer.from(`x:${FASTSOFT_SECRET_KEY}`).toString('base64');

    // Ref única do pedido
    const orderRef = crypto.randomUUID().slice(0, 8);

    // Documento limpo
    const cleanDoc = (cpf_cnpj || '').replace(/\D/g, '');
    const docType = cleanDoc.length > 11 ? 'CNPJ' : 'CPF';

    // URL do webhook: ver api/lib/fastsoft-postback-url.js (PUBLIC_SITE_URL ou FASTSOFT_POSTBACK_URL em produção)
    const webhookUrl = resolveFastsoftPostbackUrl();
    console.log('[create-pix-charge] postbackUrl:', webhookUrl);

    // Payload FastSoft
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
        title: `Caçamba ${tamanho} x${qtd}`,
        unitPrice: amount,
        quantity: 1,
        tangible: false,
        externalRef: `ped_${orderRef}`,
      }],
      postbackUrl: webhookUrl,
      metadata: {
        order_ref: orderRef,
      },
      traceable: true,
      pix: {
        expiresInDays: 1,
      },
    };

    // Chamar FastSoft API
    const response = await fetch('https://api.fastsoftbrasil.com/api/user/transactions', {
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
      return res.status(500).json({
        error: 'Erro ao gerar cobrança PIX',
        details: data,
      });
    }

    const txData = data.data;

    // Salvar pedido no banco
    const supabase = getSupabaseAdmin();

    const headerKey = req.headers['x-cacamba-client-key'] || req.headers['X-Cacamba-Client-Key'];
    let clientId = null;
    if (headerKey) {
      const c = await getClientByApiKey(supabase, String(headerKey));
      if (!c) {
        return res.status(401).json({ error: 'Chave de API do projeto inválida. Use o header X-Cacamba-Client-Key.' });
      }
      clientId = c.id;
    } else {
      const def = getDefaultClientIdFromEnv();
      const row = await getClientById(supabase, def);
      clientId = row ? row.id : null;
    }

    const { data: order, error: dbError } = await supabase.from('orders').insert({
      client_id: clientId,
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
      pix_qr_code: txData?.pix?.qrcode || null,
      pix_qr_code_url: null,
      pix_copy_paste: txData?.pix?.qrcode || txData?.pix?.url || null,
      pix_expires_at: txData?.pix?.expirationDate || new Date(Date.now() + 86400000).toISOString(),
      observacoes: observacoes || '',
    }).select().single();

    if (dbError) {
      console.error('DB error:', dbError);
      throw dbError;
    }

    return res.json({
      order_id: order.id,
      pix_qr_code: txData?.pix?.qrcode || null,
      pix_copy_paste: txData?.pix?.qrcode || txData?.pix?.url || null,
      expires_at: txData?.pix?.expirationDate || null,
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

module.exports = { createPixCharge };
