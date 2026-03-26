/**
 * Google Tag Manager — eventos na confirmação de pagamento PIX.
 *
 * No GTM crie um acionador:
 * - Tipo: Evento personalizado
 * - Nome do evento: `cacamba_payment_confirmed`
 *
 * Para GA4 / compra, use o evento `purchase` (formato ecommerce abaixo).
 *
 * Opcional: excluir /admin e /hashadmin1 dos disparos usando condição
 * "Page Path não contém /admin" (o mesmo contentor GTM carrega em todo o site).
 */

type OrderForGtm = {
  id: string;
  valor_total: number;
  valor_unitario: number;
  quantidade: number;
  tamanho: string;
  payment_status?: string | null;
};

function getDataLayer(): Record<string, unknown>[] {
  if (typeof window === 'undefined') return [];
  const w = window as Window & { dataLayer?: Record<string, unknown>[] };
  w.dataLayer = w.dataLayer || [];
  return w.dataLayer;
}

/** Evita duplicar conversão ao recarregar a página de obrigado na mesma sessão. */
function alreadySent(orderId: string): boolean {
  try {
    const key = `gtm_pix_purchase_${orderId}`;
    if (sessionStorage.getItem(key)) return true;
    sessionStorage.setItem(key, '1');
    return false;
  } catch {
    return false;
  }
}

/**
 * Dispara `purchase` (GA4 ecommerce) + `cacamba_payment_confirmed` (evento próprio para o GTM).
 */
export function pushPixPaymentConfirmed(order: OrderForGtm): void {
  if (typeof window === 'undefined') return;
  if (order.payment_status && order.payment_status !== 'paid') return;
  if (alreadySent(order.id)) return;

  const dl = getDataLayer();
  const value = Number(order.valor_total) || 0;
  const qty = Math.max(1, Number(order.quantidade) || 1);
  const unit = Number(order.valor_unitario) || (qty > 0 ? value / qty : value);

  dl.push({ ecommerce: null });

  dl.push({
    event: 'purchase',
    ecommerce: {
      transaction_id: order.id,
      value,
      currency: 'BRL',
      tax: 0,
      shipping: 0,
      items: [
        {
          item_id: String(order.tamanho),
          item_name: `Caçamba ${order.tamanho}`,
          item_category: 'cacamba_aluguel',
          price: unit,
          quantity: qty,
        },
      ],
    },
  });

  dl.push({
    event: 'cacamba_payment_confirmed',
    payment_method: 'pix',
    order_id: order.id,
    value,
    currency: 'BRL',
    tamanho_cacamba: order.tamanho,
    quantidade: qty,
  });
}
