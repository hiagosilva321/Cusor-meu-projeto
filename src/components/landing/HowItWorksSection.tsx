import { MessageCircle, Truck, Package, Recycle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSiteSettings } from '@/hooks/use-site-settings';

const defaultSteps = [
  { number: '01', title: 'Fale conosco', description: 'Diga o tamanho e endereço pelo WhatsApp.' },
  { number: '02', title: 'Receba no local', description: 'Entregamos no mesmo dia ou na data combinada.' },
  { number: '03', title: 'Use sem pressa', description: 'Preencha a caçamba no seu ritmo de obra.' },
  { number: '04', title: 'A gente retira', description: 'Buscamos e destinamos tudo corretamente.' },
];

const stepIcons = [MessageCircle, Truck, Package, Recycle];

const fadeIn = (delay: number) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' as const },
  transition: { delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] },
});

export function HowItWorksSection() {
  const { settings } = useSiteSettings();
  const steps = ((settings?.howit_steps as any[]) || defaultSteps).map((s, i) => ({
    num: s.number || String(i + 1).padStart(2, '0'),
    icon: stepIcons[i] || MessageCircle,
    title: s.title,
    desc: s.description,
  }));

  return (
    <section id="como-funciona" className="py-14 md:py-20 scroll-mt-20" style={{ background: '#0e1a3a' }}>
      <div className="container">
        <motion.div {...fadeIn(0)} className="text-center mb-10">
          <h2 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight" style={{ color: '#ffe8cb' }}>
            {settings?.howit_title || '4 passos. Sua caçamba no local.'}
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 max-w-4xl mx-auto">
          {steps.map((step, i) => (
            <motion.div key={step.num} {...fadeIn(0.08 + i * 0.1)} className="relative group">
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-6 left-[calc(50%+24px)] w-[calc(100%-48px)] h-px border-t border-dashed z-0" style={{ borderColor: 'rgba(255,197,108,0.15)' }} />
              )}
              <div className="relative z-10 flex flex-col items-center text-center p-4 rounded-xl transition-colors duration-300" style={{ background: 'rgba(19,30,62,0.6)' }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-colors" style={{ background: 'rgba(255,197,108,0.08)', border: '1px solid rgba(255,197,108,0.15)' }}>
                  <step.icon size={18} strokeWidth={1.8} style={{ color: '#ffc56c' }} />
                </div>
                <span className="text-[9px] font-bold uppercase tracking-[0.2em] mb-1" style={{ color: 'rgba(255,197,108,0.5)' }}>{step.num}</span>
                <h3 className="font-display text-sm font-bold mb-1" style={{ color: '#dbe1ff' }}>{step.title}</h3>
                <p className="text-[11px] leading-relaxed" style={{ color: '#9f8e79' }}>{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
