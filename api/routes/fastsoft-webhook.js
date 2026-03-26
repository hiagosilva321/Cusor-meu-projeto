const { getSupabaseAdmin } = require('../lib/supabase');
const {
  isPaidStatus,
  extractTransactionData,
  extractTransactionId,
  parseMetadata,
  externalRefCandidates,
} = require('../lib/fastsoft-webhook-parse');

const paidUpdate = {
  payment_status: 'paid',
  status: 'pago',
  paid_at: new Date().toISOString(),
};

async function fastsoftWebhook(req, res) {
  try {
    const body = req.body;
    console.log('FastSoft Webhook received:', JSON.stringify(body));

    const transactionData = extractTransactionData(body);
    if (!transactionData) {
      console.warn('[fastsoft-webhook] Sem payload de transação reconhecido');
      return res.json({ received: true, note: 'no_transaction_payload' });
    }

    if (!isPaidStatus(transactionData.status)) {
      console.log('[fastsoft-webhook] Ignorado — status:', transactionData.status);
      return res.json({ received: true, note: 'not_paid' });
    }

    const transactionId = extractTransactionId(transactionData);
    const metadata = parseMetadata(transactionData);
    const supabase = getSupabaseAdmin();

    if (transactionId) {
      const { data: byTx, error: errTx } = await supabase
        .from('orders')
        .update(paidUpdate)
        .eq('fastsoft_transaction_id', transactionId)
        .select('id');

      if (errTx) {
        console.error('DB update (transaction_id) error:', errTx);
        throw errTx;
      }
      if (byTx?.length) {
        console.log('Order updated to paid for transaction:', transactionId);
        return res.json({ received: true, updated: byTx.length });
      }
    }

    for (const ref of externalRefCandidates(transactionData, metadata)) {
      const { data: byRef, error: errRef } = await supabase
        .from('orders')
        .update(paidUpdate)
        .eq('fastsoft_external_ref', ref)
        .select('id');

      if (errRef) {
        console.error('DB update (external_ref) error:', errRef);
        throw errRef;
      }
      if (byRef?.length) {
        console.log('Order updated to paid for external_ref:', ref);
        return res.json({ received: true, updated: byRef.length });
      }
    }

    console.warn('[fastsoft-webhook] Pagamento PAID mas nenhum pedido encontrado. txId=', transactionId, 'refs=', externalRefCandidates(transactionData, metadata));
    return res.json({ received: true, warning: 'no_matching_order' });

  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: error.message });
  }
}

module.exports = { fastsoftWebhook };
