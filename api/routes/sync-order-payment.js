const { getSupabaseAdmin } = require('../lib/supabase');
const {
  isPaidStatus,
  extractTransactionData,
} = require('../lib/fastsoft-webhook-parse');
const { verifyCeoToken, getCeoClientIdFromRequest, getCeoTokenFromRequest } = require('../lib/ceo-cookie');

function resolveStatus(body) {
  const tx = extractTransactionData(body);
  const raw =
    tx?.status ??
    tx?.paymentStatus ??
    tx?.payment_status ??
    body?.data?.status ??
    body?.status;
  return raw;
}

/**
 * GET /api/orders/:orderId/sync-payment
 * (opcional) Cookie CEO: se existir, só sincroniza se o pedido pertencer ao mesmo cliente.
 */
async function syncOrderPayment(req, res) {
  try {
    const { orderId } = req.params;
    if (!orderId) {
      return res.status(400).json({ error: 'orderId obrigatório' });
    }

    const supabase = getSupabaseAdmin();
    const { data: order, error } = await supabase
      .from('orders')
      .select('id, payment_status, fastsoft_transaction_id, client_id')
      .eq('id', orderId)
      .maybeSingle();

    if (error || !order) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    const token = getCeoTokenFromRequest(req);
    if (token && verifyCeoToken(token)) {
      const sessionCid = getCeoClientIdFromRequest(req);
      if (sessionCid && order.client_id && order.client_id !== sessionCid) {
        return res.status(403).json({ error: 'Pedido não pertence a este cliente.' });
      }
    }

    if (order.payment_status === 'paid') {
      return res.json({ payment_status: 'paid', synced: false });
    }

    const txId = order.fastsoft_transaction_id;
    if (!txId) {
      return res.json({ payment_status: 'pending', synced: false, reason: 'no_fastsoft_transaction' });
    }

    const FASTSOFT_SECRET_KEY = process.env.FASTSOFT_SECRET_KEY;
    if (!FASTSOFT_SECRET_KEY) {
      return res.status(503).json({ error: 'FASTSOFT_SECRET_KEY não configurada' });
    }

    const tokenBase64 = Buffer.from(`x:${FASTSOFT_SECRET_KEY}`).toString('base64');
    const url = `https://api.fastsoftbrasil.com/api/user/transactions/${encodeURIComponent(txId)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${tokenBase64}`,
        Accept: 'application/json',
      },
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.warn('[sync-order-payment] FastSoft GET', response.status, JSON.stringify(body).slice(0, 500));
      return res.json({
        payment_status: 'pending',
        synced: false,
        fastsoft_http_status: response.status,
      });
    }

    const status = resolveStatus(body);
    if (!isPaidStatus(status)) {
      return res.json({
        payment_status: 'pending',
        synced: false,
        fastsoft_status: status ?? null,
      });
    }

    const updatePayload = {
      payment_status: 'paid',
      status: 'pago',
      paid_at: new Date().toISOString(),
    };

    const { data: updated, error: upErr } = await supabase
      .from('orders')
      .update(updatePayload)
      .eq('id', orderId)
      .select('id')
      .maybeSingle();

    if (upErr) {
      console.error('[sync-order-payment] update error:', upErr);
      return res.status(500).json({ error: 'Erro ao atualizar pedido' });
    }

    return res.json({
      payment_status: 'paid',
      synced: Boolean(updated),
    });
  } catch (e) {
    console.error('[sync-order-payment]', e);
    return res.status(500).json({ error: e.message || 'Erro no servidor' });
  }
}

module.exports = { syncOrderPayment };
