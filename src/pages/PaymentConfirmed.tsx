import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { SiteHeader } from '@/components/landing/SiteHeader';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { WhatsAppFloatingButton } from '@/components/landing/WhatsAppFloatingButton';
import { Button } from '@/components/ui/button';
import { CheckCircle, Home, Loader2 } from 'lucide-react';

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
          <div className="p-8 rounded-2xl bg-card border shadow-sm text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-whatsapp/10 flex items-center justify-center mx-auto">
              <CheckCircle className="text-whatsapp" size={40} />
            </div>

            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Pagamento Confirmado!</h1>
              <p className="text-muted-foreground mt-2">Seu pedido foi recebido e o pagamento via PIX foi confirmado com sucesso.</p>
            </div>

            {order && (
              <div className="p-4 rounded-lg bg-muted/50 space-y-2 text-sm text-left">
                <p className="font-medium text-foreground">Detalhes do Pedido</p>
                <div className="flex justify-between"><span className="text-muted-foreground">Pedido</span><span className="font-mono text-xs">{order.id?.slice(0, 8)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Caçamba</span><span>{order.tamanho}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Quantidade</span><span>{order.quantidade}</span></div>
                <div className="flex justify-between font-bold"><span>Total pago</span><span>R$ {Number(order.valor_total || 0).toFixed(2)}</span></div>
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              Entraremos em contato pelo WhatsApp para agendar a entrega da caçamba.
            </p>

            <Link to="/">
              <Button size="lg" className="w-full">
                <Home className="mr-2" size={18} /> Voltar ao Início
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
