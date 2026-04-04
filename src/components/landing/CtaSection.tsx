import { MessageCircle } from 'lucide-react';
import { useWhatsApp } from '@/contexts/WhatsAppContext';
import { useSiteSettings } from '@/hooks/use-site-settings';
import { motion } from 'framer-motion';

export function CtaSection() {
  const { getWhatsAppUrl, getCheckoutUrl, trackClick, available } = useWhatsApp();
  const { settings } = useSiteSettings();

  return (
    <section className="py-16 md:py-24 relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #051131 0%, #0e1a3a 50%, #051131 100%)' }}>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(255,197,108,0.04) 0%, transparent 70%)' }} />

      <div className="container relative z-10">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="text-center max-w-lg mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight mb-4" style={{ color: '#ffe8cb' }}>
            {settings?.cta_title || 'Sua caçamba em até 24h.'}
          </h2>
          <p className="text-base mb-8" style={{ color: '#9f8e79' }}>
            {settings?.cta_subtitle || 'Resposta em menos de 5 minutos pelo WhatsApp.'}
          </p>
          {available ? (
            <a href={getWhatsAppUrl()} target="_blank" rel="noopener noreferrer" onClick={(e) => trackClick(e, 'cta')}
              className="inline-flex items-center justify-center gap-2.5 rounded-xl px-10 py-4 text-lg font-bold text-white transition-all duration-200 hover:-translate-y-1"
              style={{ background: 'linear-gradient(135deg, #15b84f, #0d8a3a)', boxShadow: '0 12px 36px rgba(18,167,73,0.4), 0 0 60px rgba(93,223,121,0.08)' }}>
              <MessageCircle size={20} strokeWidth={2.5} /> Solicitar no WhatsApp
            </a>
          ) : (
            <a href={getCheckoutUrl()} className="inline-flex items-center justify-center gap-2 rounded-xl px-10 py-4 text-lg font-bold transition-all hover:-translate-y-1"
              style={{ color: '#051131', background: 'linear-gradient(135deg, #ffe8cb, #ffc56c)', boxShadow: '0 12px 30px rgba(255,197,108,0.3)' }}>
              Solicitar Caçamba
            </a>
          )}
        </motion.div>
      </div>
    </section>
  );
}
