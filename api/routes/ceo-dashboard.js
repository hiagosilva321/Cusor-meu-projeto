const { getSupabaseAdmin } = require('../lib/supabase');
const { verifyCeoToken, getCeoClientIdFromRequest, getCeoTokenFromRequest } = require('../lib/ceo-cookie');
const { getDefaultClientIdFromEnv } = require('../lib/ceo-clients');

/** PIX confirmado ou pedido marcado "Pago" no admin. */
const PAID_OR = 'payment_status.eq.paid,status.eq.pago';

function sameClientId(a, b) {
  return String(a || '').replace(/-/g, '').toLowerCase() === String(b || '').replace(/-/g, '').toLowerCase();
}

/** Pedidos/leads/cliques criados antes do multi-tenant têm client_id NULL — contam só para o cliente default (Pedir). */
function includeNullClientAsLegacy(clientId) {
  return sameClientId(clientId, getDefaultClientIdFromEnv());
}

async function ceoDashboard(req, res) {
  const token = getCeoTokenFromRequest(req);
  if (!token || !verifyCeoToken(token)) {
    return res.status(401).json({ error: 'Sessão CEO inválida ou expirada.' });
  }

  const clientId = getCeoClientIdFromRequest(req);
  if (!clientId) {
    return res.status(401).json({ error: 'Sessão sem cliente. Entre novamente.' });
  }

  try {
    const sb = getSupabaseAdmin();
    const legacy = includeNullClientAsLegacy(clientId);

    const pendingBase = (q) =>
      q.eq('payment_status', 'pending').neq('status', 'pago');

    const paidScoped = (q) => q.or(PAID_OR);

    /** @type {Promise<{ count: number | null; error: Error | null }>[]} */
    const paidParts = [
      paidScoped(sb.from('orders').select('id', { count: 'exact', head: true }).eq('client_id', clientId)),
    ];
    if (legacy) {
      paidParts.push(paidScoped(sb.from('orders').select('id', { count: 'exact', head: true }).is('client_id', null)));
    }

    const pendingParts = [
      pendingBase(sb.from('orders').select('id', { count: 'exact', head: true }).eq('client_id', clientId)),
    ];
    if (legacy) {
      pendingParts.push(pendingBase(sb.from('orders').select('id', { count: 'exact', head: true }).is('client_id', null)));
    }

    const paidRowParts = [
      paidScoped(sb.from('orders').select('valor_total').eq('client_id', clientId)),
    ];
    if (legacy) {
      paidRowParts.push(paidScoped(sb.from('orders').select('valor_total').is('client_id', null)));
    }

    const leadsParts = [sb.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', clientId)];
    if (legacy) {
      leadsParts.push(sb.from('leads').select('id', { count: 'exact', head: true }).is('client_id', null));
    }

    const clicksParts = [
      sb.from('whatsapp_clicks').select('id', { count: 'exact', head: true }).eq('client_id', clientId),
    ];
    if (legacy) {
      clicksParts.push(sb.from('whatsapp_clicks').select('id', { count: 'exact', head: true }).is('client_id', null));
    }

    const allPromises = [...paidParts, ...pendingParts, ...paidRowParts, ...leadsParts, ...clicksParts];
    const results = await Promise.all(allPromises);

    let i = 0;
    const takeCounts = (n) => {
      const slice = results.slice(i, i + n);
      i += n;
      return slice;
    };

    const paidRes = takeCounts(paidParts.length);
    const pendRes = takeCounts(pendingParts.length);
    const paidRowsRes = takeCounts(paidRowParts.length);
    const leadsRes = takeCounts(leadsParts.length);
    const clicksRes = takeCounts(clicksParts.length);

    const errs = results.map((r) => r.error).filter(Boolean);
    if (errs.length) {
      console.error('ceoDashboard supabase', errs);
      return res.status(500).json({ error: 'Erro ao ler indicadores.' });
    }

    const sumCounts = (arr) => arr.reduce((acc, r) => acc + (r.count ?? 0), 0);
    const paidCount = sumCounts(paidRes);
    const pendingPayCount = sumCounts(pendRes);

    let sum = 0;
    for (const r of paidRowsRes) {
      for (const row of r.data || []) {
        sum += Number(row.valor_total) || 0;
      }
    }

    const leadsCount = sumCounts(leadsRes);
    const clicksCount = sumCounts(clicksRes);

    return res.json({
      paidCount,
      pendingPayCount,
      revenueTotal: sum,
      leadsCount,
      clicksCount,
    });
  } catch (e) {
    console.error('ceoDashboard', e);
    return res.status(500).json({ error: e.message || 'Erro no servidor.' });
  }
}

module.exports = { ceoDashboard };
