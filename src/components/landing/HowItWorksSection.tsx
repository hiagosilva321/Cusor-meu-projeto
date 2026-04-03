import { MessageCircle, Truck, Package, Recycle } from 'lucide-react';
import { motion } from 'framer-motion';

const steps = [
  { num: '01', icon: MessageCircle, title: 'Fale conosco', desc: 'Diga o tamanho e endereço pelo WhatsApp.' },
  { num: '02', icon: Truck, title: 'Receba no local', desc: 'Entregamos no mesmo dia ou na data combinada.' },
  { num: '03', icon: Package, title: 'Use sem pressa', desc: 'Preencha a caçamba no seu ritmo de obra.' },
  { num: '04', icon: Recycle, title: 'A gente retira', desc: 'Buscamos e destinamos tudo corretamente.' },
];

const fadeIn = (delay: number) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' as const },
  transition: { delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] },
});

export function HowItWorksSection() {
  return (
    <section id="como-funciona" className="py-14 md:py-20 scroll-mt-20" style={{ background: '#0e1a3a' }}>
      <div className="container">
        <motion.div {...fadeIn(0)} className="text-center mb-10">
          <h2 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight" style={{ color: '#ffe8cb' }}>
            4 passos. Sua caçamba no local.
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
