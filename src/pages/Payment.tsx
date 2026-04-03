import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { apiPost, type PublicOrderStatusRequest, type PublicOrderStatusResponse } from '@/lib/api';
import { getOrderAccessToken } from '@/lib/order-access';
import { SiteHeader } from '@/components/landing/SiteHeader';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { Button } from '@/components/ui/button';
import { CheckCircle, Copy, Clock, Loader2, QrCode, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useWhatsApp } from '@/contexts/WhatsAppContext';

const Payment = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { getWhatsAppUrl, rememberReferralSource, trackClick, available } = useWhatsApp();
  const [order, setOrder] = useState<PublicOrderStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!orderId) return;
    const accessToken = getOrderAccessToken(orderId, searchParams.get('token'));

    if (!accessToken) {
      toast.error('Link de pagamento inválido ou expirado.');
      navigate('/', { replace: true });
      return;
    }

    let cancelled = false;
    let intervalId: number | undefined;

    const confirmedUrl = `/pagamento-confirmado/${orderId}?token=${encodeURIComponent(accessToken)}`;

    const fetchOrder = async (): Promise<PublicOrderStatusResponse | null> => {
      try {
        const data = await apiPost<PublicOrderStatusResponse, PublicOrderStatusRequest>(
          'get-order-status',
          { order_id: orderId, access_token: accessToken },
        );

        if (cancelled) {
          return null;
        }

        setOrder(data);
        rememberReferralSource(data.referral_source);
        setLoading(false);
        return data;
      } catch {
        if (!cancelled) {
          toast.error('Pedido não encontrado ou link inválido.');
          navigate('/', { replace: true });
        }
        return null;
      }
    };

    (async () => {
      const initialOrder = await fetchOrder();
      if (!initialOrder || cancelled) {
        return;
      }

      if (initialOrder.payment_status === 'paid') {
        navigate(confirmedUrl, { replace: true });
        return;
      }

      intervalId = window.setInterval(async () => {
        const updatedOrder = await fetchOrder();
        if (updatedOrder?.payment_status === 'paid') {
          window.clearInterval(intervalId);
          navigate(confirmedUrl, { replace: true });
        }
      }, 5000);
    })();

    return () => {
      cancelled = true;
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [orderId, navigate, rememberReferralSource, searchParams]);

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
                {order?.pix_qr_code ? (
                  <img
                    src={`data:image/png;base64,${order.pix_qr_code}`}
                    alt="QR Code PIX"
                    className="w-48 h-48 md:w-56 md:h-56"
                  />
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
              <span>Aguardando confirmação do pagamento. Atualização automática a cada 5 segundos.</span>
            </div>

            {available && (
              <div className="pt-2 border-t border-border">
                <a
                  href={getWhatsAppUrl('Olá! Preciso de ajuda com meu pedido PIX.')}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => trackClick(e, 'pagamento')}
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
    </div>
  );
};

export default Payment;
