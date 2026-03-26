import { useState, useEffect, useCallback } from 'react';
import { MessageCircle, ArrowDown, Shield, Clock, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWhatsApp } from '@/contexts/WhatsAppContext';
import { motion, AnimatePresence } from 'framer-motion';
import heroSlide1 from '@/assets/hero-slide-1.png';
import heroSlide2 from '@/assets/hero-slide-2.png';
import heroSlide3 from '@/assets/hero-slide-3.png';
import heroSlide4 from '@/assets/hero-slide-4.png';

const slides = [heroSlide1, heroSlide2, heroSlide3, heroSlide4];

const trustBadges = [
  { icon: Clock, text: 'Entrega no mesmo dia' },
  { icon: Shield, text: 'Empresa licenciada' },
  { icon: Truck, text: 'Frota própria' },
];

export function HeroSection() {
  const { getWhatsAppUrl, trackClick, available } = useWhatsApp();
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % slides.length);
  }, []);

  useEffect(() => {
    const timer = setInterval(next, 4000);
    return () => clearInterval(timer);
  }, [next]);

  return (
    <section className="relative min-h-[92vh] flex items-center overflow-hidden">
      {/* Slides */}
      <AnimatePresence initial={false}>
        <motion.img
          key={current}
          src={slides[current]}
          alt="Caçamba profissional"
          className="absolute inset-0 w-full h-full object-cover"
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: 'easeInOut' }}
          loading="eager"
        />
      </AnimatePresence>

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-primary/80 to-primary/50" />

      {/* Slide indicators */}
      <div className="absolute bottom-24 md:bottom-20 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            aria-label={`Slide ${i + 1}`}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              i === current ? 'w-8 bg-accent' : 'w-3 bg-primary-foreground/40'
            }`}
          />
        ))}
      </div>

      <div className="container relative z-10 pt-24 pb-12">
        <div className="max-w-2xl">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="inline-block px-4 py-1.5 rounded-full bg-accent/20 text-accent text-sm font-semibold mb-6 backdrop-blur-sm border border-accent/30"
          >
            ⚡ São Paulo e região
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-[2.65rem] xl:text-5xl font-extrabold text-primary-foreground leading-[1.12] mb-6 text-balance"
          >
            Precisa de caçamba hoje?{' '}
            <span className="text-accent">Resolva em 2 minutos pelo WhatsApp.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-lg md:text-xl text-primary-foreground/85 mb-8 max-w-lg leading-relaxed"
          >
            Entrega rápida, preço justo e atendimento imediato.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 mb-10"
          >
            {available && (
              <a href={getWhatsAppUrl()} target="_blank" rel="noopener noreferrer" onClick={trackClick}>
                <Button variant="whatsapp" size="xl" className="w-full sm:w-auto">
                  <MessageCircle className="mr-2" />
                  Fale no WhatsApp agora
                </Button>
              </a>
            )}
            <a href="#tamanhos">
              <Button
                variant="outline"
                size="xl"
                className="w-full sm:w-auto border-2 border-white/90 bg-white/95 text-slate-900 shadow-lg font-semibold hover:bg-white hover:text-slate-900 dark:border-white/90 dark:bg-white/95 dark:text-slate-900"
              >
                Ver tamanhos e preços
              </Button>
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="flex flex-wrap gap-6"
          >
            {trustBadges.map((badge) => (
              <div key={badge.text} className="flex items-center gap-2 text-primary-foreground/70">
                <badge.icon size={16} className="text-accent" />
                <span className="text-sm font-medium">{badge.text}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce hidden md:block">
        <ArrowDown className="text-primary-foreground/30" size={28} />
      </div>
    </section>
  );
}
