import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { SiteHeader } from '@/components/landing/SiteHeader';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { WhatsAppFloatingButton } from '@/components/landing/WhatsAppFloatingButton';
import { Button } from '@/components/ui/button';
import { CheckCircle, Home, Loader2, Heart } from 'lucide-react';
import { pushPixPaymentConfirmed } from '@/lib/gtmDataLayer';

const PaymentConfirmed = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;
    supabase.from('orders').select('*').eq('id', orderId).single().then(({ data }) => {
      setOrder(data);
      setLoading(false);
    });
  }, [orderId]);

  useEffect(() => {
    if (!order || order.payment_status !== 'paid') return;
    pushPixPaymentConfirmed({
      id: order.id,
      valor_total: Number(order.valor_total),
      valor_unitario: Number(order.valor_unitario),
      quantidade: Number(order.quantidade),
      tamanho: String(order.tamanho),
      payment_status: order.payment_status,
    });
  }, [order]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="pt-24 pb-16">
        <div className="container max-w-lg">
          <div className="p-8 md:p-10 rounded-2xl bg-card border shadow-sm text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-whatsapp/10 flex items-center justify-center mx-auto ring-4 ring-whatsapp/5">
              <CheckCircle className="text-whatsapp" size={40} strokeWidth={2} />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium uppercase tracking-widest text-whatsapp">Pagamento recebido</p>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">Obrigado!</h1>
              <p className="text-muted-foreground text-base leading-relaxed max-w-md mx-auto">
                O seu pagamento via PIX foi confirmado com sucesso. O seu pedido já está registado e a nossa equipa
                tratará do próximo passo.
              </p>
            </div>

            {order && (
              <div className="p-4 rounded-xl bg-muted/50 space-y-2 text-sm text-left border border-border/60">
                <p className="font-semibold text-foreground flex items-center gap-2">
                  <Heart size={14} className="text-whatsapp shrink-0" />
                  Resumo do pedido
                </p>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Referência</span>
                  <span className="font-mono text-xs">{order.id?.slice(0, 8)}…</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Caçamba</span>
                  <span>{order.tamanho}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quantidade</span>
                  <span>{order.quantidade}</span>
                </div>
                <div className="flex justify-between font-bold pt-1 border-t border-border/50">
                  <span>Total pago</span>
                  <span className="text-foreground">R$ {Number(order.valor_total || 0).toFixed(2)}</span>
                </div>
              </div>
            )}

            <p className="text-sm text-muted-foreground leading-relaxed">
              Entraremos em contacto pelo <strong className="text-foreground">WhatsApp</strong> para agendar a entrega
              da caçamba.
            </p>

            <Link to="/">
              <Button size="lg" className="w-full" variant="whatsapp">
                <Home className="mr-2" size={18} /> Voltar ao início
              </Button>
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
      <WhatsAppFloatingButton />
    </div>
  );
};

export default PaymentConfirmed;
