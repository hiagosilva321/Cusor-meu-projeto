import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { apiPost, type PublicOrderStatusRequest, type PublicOrderStatusResponse } from '@/lib/api';
import { getOrderAccessToken } from '@/lib/order-access';
import { SiteHeader } from '@/components/landing/SiteHeader';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { CheckCircle, Copy, Clock, Loader2, QrCode, MessageCircle, Shield } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
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
          'get-order-status', { order_id: orderId, access_token: accessToken });
        if (cancelled) return null;
        setOrder(data);
        rememberReferralSource(data.referral_source);
        setLoading(false);
        return data;
      } catch {
        if (!cancelled) { toast.error('Pedido não encontrado ou link inválido.'); navigate('/', { replace: true }); }
        return null;
      }
    };

    (async () => {
      const initial = await fetchOrder();
      if (!initial || cancelled) return;
      if (initial.payment_status === 'paid') { navigate(confirmedUrl, { replace: true }); return; }
      intervalId = window.setInterval(async () => {
        const updated = await fetchOrder();
        if (updated?.payment_status === 'paid') { window.clearInterval(intervalId); navigate(confirmedUrl, { replace: true }); }
      }, 5000);
    })();

    return () => { cancelled = true; if (intervalId) window.clearInterval(intervalId); };
  }, [orderId, navigate, rememberReferralSource, searchParams]);

  useEffect(() => {
    if (!order?.pix_expires_at) return;
    const interval = setInterval(() => {
      const diff = new Date(order.pix_expires_at).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('Expirado'); clearInterval(interval); return; }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${m}:${s.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [order?.pix_expires_at]);

  const handleCopy = async () => {
    if (!pixCode) return;
    try {
      await navigator.clipboard.writeText(pixCode);
      setCopied(true);
      toast.success('Código PIX copiado!');
      setTimeout(() => setCopied(false), 3000);
    } catch { toast.error('Erro ao copiar. Copie manualmente.'); }
  };

  // O gateway retorna o código EMV no campo pix_qr_code (não imagem)
  // pix_copy_paste pode ser null — usar pix_qr_code como fallback
  const pixCode = order?.pix_copy_paste || order?.pix_qr_code || '';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#071325' }}>
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto mb-4" size={40} style={{ color: '#f2c36b' }} />
          <p style={{ color: '#d2c5b2' }} className="text-sm">Carregando pagamento...</p>
        </div>
      </div>
    );
  }

  const isExpired = timeLeft === 'Expirado';

  return (
    <div className="min-h-screen" style={{ background: '#071325' }}>
      <SiteHeader />

      <main className="pt-24 pb-16">
        <div className="container max-w-md mx-auto px-4">

          {/* Timer */}
          <div className="flex justify-center mb-6">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${
              isExpired
                ? 'bg-[#ffb4ab]/10 text-[#ffb4ab]'
                : 'bg-[#5ddf79]/10 text-[#5ddf79]'
            }`}>
              <Clock size={15} />
              {isExpired ? 'PIX expirado' : `Expira em ${timeLeft}`}
            </div>
          </div>

          {/* Main card */}
          <div className="rounded-2xl bg-[rgba(42,53,72,0.6)] backdrop-blur-[12px] shadow-[0_8px_40px_rgba(0,0,0,0.5)] overflow-hidden">

            {/* Header */}
            <div className="p-6 pb-4 text-center">
              <h1 className="font-display text-2xl font-extrabold tracking-[-0.02em]" style={{ color: '#d7e3fc' }}>
                Pagamento via PIX
              </h1>
              <p className="text-sm mt-1" style={{ color: '#d2c5b2' }}>
                Escaneie o QR Code ou copie o código para pagar
              </p>
            </div>

            {/* QR Code */}
            <div className="flex justify-center px-6 pb-5">
              <div className="p-4 rounded-2xl bg-white">
                {pixCode ? (
                  <QRCodeSVG
                    value={pixCode}
                    size={240}
                    level="M"
                    bgColor="#ffffff"
                    fgColor="#071325"
                    className="w-52 h-52 sm:w-60 sm:h-60"
                  />
                ) : (
                  <div className="w-52 h-52 sm:w-60 sm:h-60 flex items-center justify-center">
                    <QrCode size={80} className="text-gray-300" />
                  </div>
                )}
              </div>
            </div>

            {/* PIX Code */}
            <div className="px-6 pb-5 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.05em] text-center" style={{ color: '#d2c5b2' }}>
                Código PIX Copia e Cola
              </p>
              <div className="p-3 rounded-xl bg-[#142032] text-xs font-mono break-all max-h-16 overflow-y-auto" style={{ color: '#d7e3fc' }}>
                {pixCode || 'Código não disponível'}
              </div>
              <button
                onClick={handleCopy}
                disabled={isExpired}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white text-sm transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: copied ? 'linear-gradient(135deg, #1FAD4E, #15803d)' : 'linear-gradient(135deg, #5ddf79, #1FAD4E)',
                  boxShadow: '0 8px 24px rgba(31,173,78,0.3)',
                }}
              >
                {copied ? <><CheckCircle size={18} /> Copiado!</> : <><Copy size={18} /> Copiar Código PIX</>}
              </button>
            </div>

            {/* Divider */}
            <div className="h-px bg-white/[0.06] mx-6" />

            {/* Order Summary */}
            <div className="px-6 py-5 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.05em]" style={{ color: '#d2c5b2' }}>
                Resumo do pedido
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span style={{ color: '#d2c5b2' }}>Caçamba</span>
                  <span className="font-semibold" style={{ color: '#d7e3fc' }}>{order?.tamanho}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: '#d2c5b2' }}>Quantidade</span>
                  <span className="font-semibold" style={{ color: '#d7e3fc' }}>{order?.quantidade}</span>
                </div>
                <div className="flex justify-between items-baseline pt-1">
                  <span className="font-bold" style={{ color: '#d7e3fc' }}>Total</span>
                  <span className="font-extrabold font-display text-xl" style={{ color: '#f2c36b' }}>
                    R$ {Number(order?.valor_total || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="px-6 pb-5">
              <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/[0.03]">
                {isExpired ? (
                  <span className="text-xs" style={{ color: '#ffb4ab' }}>PIX expirado. Gere um novo pedido.</span>
                ) : (
                  <>
                    <Loader2 className="animate-spin" size={13} style={{ color: '#5ddf79' }} />
                    <span className="text-xs" style={{ color: '#d2c5b2' }}>
                      Aguardando pagamento — atualização automática
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* WhatsApp */}
            {available && (
              <div className="px-6 pb-6">
                <a
                  href={getWhatsAppUrl('Olá! Preciso de ajuda com meu pedido PIX.')}
                  target="_blank" rel="noopener noreferrer"
                  onClick={(e) => trackClick(e, 'pagamento')}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
                >
                  <MessageCircle size={15} style={{ color: '#5ddf79' }} />
                  <span className="text-xs" style={{ color: '#d2c5b2' }}>Dúvidas? Fale no WhatsApp</span>
                </a>
              </div>
            )}
          </div>

          {/* Security badge */}
          <div className="flex items-center justify-center gap-2 mt-6 text-xs" style={{ color: 'rgba(210,197,178,0.4)' }}>
            <Shield size={13} />
            100% Seguro & Criptografado
          </div>

        </div>
      </main>

      <SiteFooter />
    </div>
  );
};

export default Payment;
