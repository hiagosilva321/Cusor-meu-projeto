/**
 * Normaliza corpo do webhook FastSoft (formatos variam).
 */

function isPaidStatus(status) {
  if (status === undefined || status === null) return false;
  const s = String(status).trim().toUpperCase();
  return (
    s === 'PAID' ||
    s === 'APPROVED' ||
    s === 'CONFIRMED' ||
    s === 'COMPLETED' ||
    s === 'SUCCESS' ||
    s === 'AUTHORIZED' ||
    s === 'SETTLED'
  );
}

function extractTransactionData(body) {
  if (!body || typeof body !== 'object') return null;
  return body.data ?? body.transaction ?? body.payment ?? body.payload ?? body.result ?? null;
}

function extractTransactionId(tx) {
  if (!tx || typeof tx !== 'object') return null;
  const id =
    tx.id ??
    tx.transactionId ??
    tx.transaction_id ??
    tx.chargeId ??
    tx.charge_id ??
    tx.paymentId ??
    tx.payment_id;
  if (id === undefined || id === null) return null;
  return String(id);
}

function parseMetadata(transactionData) {
  let metadata = {};
  const raw = transactionData?.metadata;
  if (raw === undefined || raw === null) return metadata;
  if (typeof raw === 'string') {
    try {
      metadata = JSON.parse(raw);
    } catch {
      metadata = {};
    }
  } else if (typeof raw === 'object') {
    metadata = raw;
  }
  return metadata;
}

function externalRefCandidates(transactionData, metadata) {
  const list = [];
  const push = (v) => {
    if (v !== undefined && v !== null && String(v).trim()) list.push(String(v).trim());
  };
  push(transactionData?.externalRef);
  push(transactionData?.external_ref);
  if (metadata?.order_ref) push(`ped_${metadata.order_ref}`);
  return [...new Set(list)];
}

module.exports = {
  isPaidStatus,
  extractTransactionData,
  extractTransactionId,
  parseMetadata,
  externalRefCandidates,
};
