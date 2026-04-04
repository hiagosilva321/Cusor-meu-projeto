import { useState, useEffect, useCallback } from 'react';
import { MessageCircle, Clock, ShieldCheck, Truck, ArrowRight } from 'lucide-react';
import { useWhatsApp } from '@/contexts/WhatsAppContext';
import { useSiteSettings } from '@/hooks/use-site-settings';
import { motion, AnimatePresence } from 'framer-motion';
import heroSlide1 from '@/assets/hero-slide-1.png';
import heroSlide2 from '@/assets/hero-slide-2.png';
import heroSlide3 from '@/assets/hero-slide-3.png';
import heroSlide4 from '@/assets/hero-slide-4.png';

const slides = [heroSlide1, heroSlide2, heroSlide3, heroSlide4];

const defaultTrustMarks = [
  { label: 'Entrega hoje', highlight: false },
  { label: 'Licença CETESB', highlight: true },
  { label: '15+ caminhões', highlight: false },
];

const trustIcons = [Clock, ShieldCheck, Truck];

const reveal = (delay: number) => ({
  initial: { opacity: 0, y: 36, filter: 'blur(6px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  transition: { delay, duration: 0.9, ease: [0.16, 1, 0.3, 1] },
});

export function HeroSection() {
  const { getWhatsAppUrl, getCheckoutUrl, trackClick, available } = useWhatsApp();
  const { settings } = useSiteSettings();
  const [current, setCurrent] = useState(0);

  const trustMarks = ((settings?.hero_trust_marks as any[]) || defaultTrustMarks).map((m, i) => ({
    icon: trustIcons[i] || Clock,
    label: m.label,
    highlight: !!m.highlight,
  }));

  const advance = useCallback(() => setCurrent((p) => (p + 1) % slides.length), []);

  useEffect(() => {
    const id = setInterval(advance, 5500);
    return () => clearInterval(id);
  }, [advance]);

  return (
    <section className="relative min-h-[92vh] flex items-end overflow-hidden" style={{ background: '#051131' }}>
      {/* ── Background carousel with ken-burns ── */}
      <AnimatePresence initial={false}>
        <motion.img
          key={current}
          src={slides[current]}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover will-change-transform"
          initial={{ opacity: 0, scale: 1.12 }}
          animate={{ opacity: 1, scale: 1.04 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 6, ease: 'linear' }}
          loading="eager"
        />
      </AnimatePresence>

      {/* ── Directional gradient: dark left → semi-transparent right ── */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(105deg, rgba(5,17,49,0.98) 0%, rgba(5,17,49,0.92) 35%, rgba(5,17,49,0.6) 65%, rgba(5,17,49,0.3) 100%)',
      }} />
      {/* Vertical anchor into next section */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(to top, #051131 0%, transparent 35%)',
      }} />

      {/* ── Noise texture ── */}
      <div className="absolute inset-0 opacity-[0.035] mix-blend-overlay pointer-events-none" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      }} />

      {/* ── Industrial glow — radial golden light on content area ── */}
      <div className="absolute top-1/3 left-[15%] w-[500px] h-[500px] rounded-full pointer-events-none" style={{
        background: 'radial-gradient(circle, rgba(255,197,108,0.06) 0%, transparent 70%)',
      }} />

      {/* ── Golden horizon line ── */}
      <motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ delay: 1.6, duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        className="absolute bottom-0 left-0 right-0 h-px origin-left"
        style={{ background: 'linear-gradient(to right, transparent, rgba(255,197,108,0.4) 30%, rgba(255,197,108,0.4) 70%, transparent)' }}
      />

      {/* ── Slide indicators ── */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {slides.map((_, i) => (
          <button key={i} onClick={() => setCurrent(i)} aria-label={`Slide ${i + 1}`}
            className="h-[3px] rounded-full transition-all duration-700"
            style={{ width: i === current ? 36 : 10, background: i === current ? '#ffc56c' : 'rgba(219,225,255,0.12)' }}
          />
        ))}
      </div>

      {/* ── Content ── */}
      <div className="container relative z-10 pb-20 pt-28 md:pt-36 lg:pt-40 md:pb-24">
        <div className="max-w-[560px]">
          {/* Badge */}
          <motion.div {...reveal(0.08)}>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold uppercase" style={{
              letterSpacing: '0.14em',
              color: '#ffe8cb',
              background: 'rgba(255,197,108,0.08)',
              border: '1px solid rgba(255,197,108,0.18)',
              backdropFilter: 'blur(8px)',
            }}>
              <span className="text-sm leading-none">⚡</span>
              {settings?.hero_badge || 'Entrega no mesmo dia em SP e Região'}
            </span>
          </motion.div>

          {/* Headline — Plus Jakarta Sans, extrabold, editorial scale */}
          <motion.h1 {...reveal(0.24)} className="mt-7 mb-5" style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 800,
            fontSize: 'clamp(2.2rem, 4.5vw + 0.5rem, 3.75rem)',
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
            color: '#ffe8cb',
          }}
            dangerouslySetInnerHTML={{
              __html: settings?.hero_title || 'Aluguel de Caçambas<br />com Entrega <span style="background:linear-gradient(135deg,#ffc56c 0%,#ffba44 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;text-shadow:0 0 60px rgba(255,197,108,0.15)">Rápida e Segura</span>',
            }}
          />

          {/* Body */}
          <motion.p {...reveal(0.4)} className="max-w-[440px] mb-9" style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '1.125rem',
            lineHeight: 1.7,
            color: '#c9baa8',
          }}>
            {settings?.hero_subtitle || 'Preço fechado com entrega, permanência e retirada. Sem surpresas. Solicite agora e receba sua caçamba hoje.'}
          </motion.p>

          {/* CTAs — larger, with glow */}
          <motion.div {...reveal(0.54)} className="flex flex-col sm:flex-row gap-3 mb-8">
            {available ? (
              <a href={getWhatsAppUrl()} target="_blank" rel="noopener noreferrer" onClick={(e) => trackClick(e, 'hero')}
                className="group inline-flex items-center justify-center gap-2.5 rounded-xl px-10 py-[18px] text-[17px] font-bold text-white transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02]"
                style={{
                  background: 'linear-gradient(135deg, #15b84f 0%, #0d8a3a 100%)',
                  boxShadow: '0 12px 36px rgba(18,167,73,0.4), 0 0 60px rgba(93,223,121,0.1), 0 0 0 1px rgba(93,223,121,0.12), inset 0 1px 0 rgba(255,255,255,0.1)',
                }}>
                <MessageCircle size={19} strokeWidth={2.5} />
                {settings?.hero_cta_primary || 'Pedir pelo WhatsApp'}
              </a>
            ) : (
              <a href={getCheckoutUrl()}
                className="inline-flex items-center justify-center gap-2 rounded-xl px-8 py-4 text-base font-bold transition-all duration-200 hover:-translate-y-1"
                style={{
                  color: '#051131',
                  background: 'linear-gradient(135deg, #ffe8cb 0%, #ffc56c 100%)',
                  boxShadow: '0 10px 30px rgba(255,197,108,0.3), 0 0 0 1px rgba(255,197,108,0.2)',
                }}>
                Solicitar Caçamba
              </a>
            )}
            <a href="#tamanhos"
              className="inline-flex items-center justify-center gap-2 rounded-xl px-7 py-4 text-base font-medium transition-all duration-200 hover:-translate-y-0.5 group"
              style={{
                color: '#dbe1ff',
                border: '1px solid rgba(159,142,121,0.25)',
                backdropFilter: 'blur(6px)',
                background: 'rgba(5,17,49,0.4)',
              }}>
              {settings?.hero_cta_secondary || 'Ver Tamanhos e Preços'}
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" style={{ color: '#ffc56c' }} />
            </a>
          </motion.div>

          {/* Trust marks — glassmorphic pills with industrial glow on highlight */}
          <motion.div {...reveal(0.68)} className="flex flex-wrap gap-2.5">
            {trustMarks.map((mark) => (
              <div key={mark.label} className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300" style={{
                background: mark.highlight
                  ? 'linear-gradient(135deg, rgba(255,197,108,0.1) 0%, rgba(255,186,68,0.06) 100%)'
                  : 'rgba(19,30,62,0.7)',
                backdropFilter: 'blur(12px)',
                border: mark.highlight
                  ? '1px solid rgba(255,197,108,0.3)'
                  : '1px solid rgba(219,225,255,0.06)',
                boxShadow: mark.highlight
                  ? '0 0 30px rgba(255,197,108,0.1), inset 0 1px 0 rgba(255,197,108,0.08)'
                  : '0 2px 8px rgba(0,0,0,0.15)',
              }}>
                <mark.icon size={14} strokeWidth={2.2} style={{ color: mark.highlight ? '#ffc56c' : '#9f8e79' }} />
                <span className="text-[12px] font-semibold" style={{
                  color: mark.highlight ? '#ffe8cb' : '#b8c0d6',
                  letterSpacing: '0.015em',
                }}>
                  {mark.label}
                </span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
