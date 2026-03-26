/**
 * URL que a FastSoft deve chamar quando o PIX é pago.
 * Em produção tem de ser HTTPS público (não localhost).
 *
 * Ordem:
 * 1) FASTSOFT_POSTBACK_URL — URL completa (recomendado)
 * 2) PUBLIC_SITE_URL + /api/fastsoft-webhook — mesmo servidor Node (Nginx → /api)
 * 3) SUPABASE_URL + /functions/v1/fastsoft-webhook — Edge Function (só se deployada)
 * 4) localhost — só desenvolvimento
 */
function resolveFastsoftPostbackUrl() {
  const explicit = process.env.FASTSOFT_POSTBACK_URL?.trim();
  if (explicit) return explicit;

  const site = process.env.PUBLIC_SITE_URL?.trim().replace(/\/$/, '');
  if (site) {
    return `${site}/api/fastsoft-webhook`;
  }

  const supabase = process.env.SUPABASE_URL?.trim().replace(/\/$/, '');
  if (supabase) {
    return `${supabase}/functions/v1/fastsoft-webhook`;
  }

  const port = process.env.PORT || 3001;
  return `http://127.0.0.1:${port}/api/fastsoft-webhook`;
}

module.exports = { resolveFastsoftPostbackUrl };
