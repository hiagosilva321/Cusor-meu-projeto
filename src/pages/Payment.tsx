import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { API_BASE } from '@/lib/api';
import { SiteHeader } from '@/components/landing/SiteHeader';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { Button } from '@/components/ui/button';
import { CheckCircle, Copy, Clock, Loader2, QrCode, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import { useWhatsApp } from '@/contexts/WhatsAppContext';
import { WhatsAppFloatingButton } from '@/components/landing/WhatsAppFloatingButton';

const Payment = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { getWhatsAppUrl, trackClick, available } = useWhatsApp();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!orderId) return;

    const fetchOrder = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error || !data) {
        toast.error('Pedido não encontrado.');
        navigate('/');
        return;
      }

      setOrder(data);
      setLoading(false);

      if (data.payment_status === 'paid') {
        navigate(`/obrigado/${orderId}`);
      }
    };

    fetchOrder();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`order-${orderId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${orderId}`,
      }, (payload) => {
        const updated = payload.new as any;
        setOrder(updated);
        if (updated.payment_status === 'paid') {
          navigate(`/obrigado/${orderId}`);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, navigate]);

  /** A cada 3s consulta a FastSoft (GET transação) via API e confirma pagamento se já estiver pago. */
  useEffect(() => {
    if (!orderId || !order || order.payment_status === 'paid') return;

    let cancelled = false;

    async function syncFromFastSoft() {
      try {
        const res = await fetch(`${API_BASE}/orders/${orderId}/sync-payment`);
        const data = (await res.json()) as { payment_status?: string };
        if (cancelled) return;
        if (data.payment_status === 'paid') {
          setOrder((o) => (o ? { ...o, payment_status: 'paid' } : o));
          navigate(`/obrigado/${orderId}`);
        }
      } catch {
        /* rede temporária — próximo intervalo */
      }
    }

    void syncFromFastSoft();
    const interval = setInterval(() => void syncFromFastSoft(), 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [orderId, order?.id, order?.payment_status, navigate]);

  // Countdown timer
  useEffect(() => {
    if (!order?.pix_expires_at) return;
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const expires = new Date(order.pix_expires_at).getTime();
      const diff = expires - now;
      if (diff <= 0) {
        setTimeLeft('Expirado');
        clearInterval(interval);
        return;
      }
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [order?.pix_expires_at]);

  const handleCopy = async () => {
    if (!order?.pix_copy_paste) return;
    try {
      await navigator.clipboard.writeText(order.pix_copy_paste);
      setCopied(true);
      toast.success('Código PIX copiado!');
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error('Erro ao copiar. Copie manualmente.');
    }
  };

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
          <div className="p-6 md:p-8 rounded-2xl bg-card border shadow-sm text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent-foreground text-sm font-medium">
              <Clock size={14} />
              <span>Expira em {timeLeft}</span>
            </div>

            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">Pagamento via PIX</h1>
              <p className="text-muted-foreground mt-1">Escaneie o QR Code ou copie o código para pagar</p>
            </div>

            <div className="flex justify-center">
              <div className="p-3 bg-background rounded-xl border">
                {order?.pix_copy_paste ? (
                  <QRCodeSVG value={order.pix_copy_paste} size={224} className="w-48 h-48 md:w-56 md:h-56" />
                ) : (
                  <div className="w-48 h-48 md:w-56 md:h-56 flex items-center justify-center bg-muted rounded-lg">
                    <QrCode size={64} className="text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Código PIX Copia e Cola</p>
              <div className="relative">
                <div className="p-3 bg-muted rounded-lg text-xs text-muted-foreground break-all max-h-20 overflow-y-auto font-mono">
                  {order?.pix_copy_paste || 'Código não disponível'}
                </div>
              </div>
              <Button onClick={handleCopy} variant="whatsapp" size="lg" className="w-full">
                {copied ? <><CheckCircle className="mr-2" size={18} /> Copiado!</> : <><Copy className="mr-2" size={18} /> Copiar Código PIX</>}
              </Button>
            </div>

            <div className="p-4 rounded-lg bg-muted/50 space-y-2 text-sm text-left">
              <p className="font-medium text-foreground">Resumo do pedido</p>
              <div className="flex justify-between"><span className="text-muted-foreground">Caçamba</span><span>{order?.tamanho}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Quantidade</span><span>{order?.quantidade}</span></div>
              <div className="flex justify-between font-bold"><span>Total</span><span>R$ {Number(order?.valor_total || 0).toFixed(2)}</span></div>
            </div>

            <div className="flex items-center gap-2 justify-center text-sm text-muted-foreground">
              <Loader2 className="animate-spin" size={14} />
              <span>Aguardando confirmação do pagamento...</span>
            </div>

            {available && (
              <div className="pt-2 border-t border-border">
                <a
                  href={getWhatsAppUrl('Olá! Preciso de ajuda com meu pedido PIX.')}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={trackClick}
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <MessageCircle size={14} />
                  Se tiver alguma dúvida, fale com nosso time no WhatsApp
                </a>
              </div>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
      <WhatsAppFloatingButton />
    </div>
  );
};

export default Payment;
