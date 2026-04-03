import { Truck, Clock, ShieldCheck, Leaf, Headphones, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';

const benefits = [
  { icon: Clock, title: 'Mesmo dia', desc: 'Sua obra não para.' },
  { icon: DollarSign, title: 'Preço fechado', desc: 'Zero taxa extra.' },
  { icon: Headphones, title: 'WhatsApp direto', desc: 'Sem burocracia.' },
  { icon: Leaf, title: 'Descarte legal', desc: 'Normas ambientais.' },
  { icon: Truck, title: 'Frota própria', desc: 'Equipe treinada.' },
  { icon: ShieldCheck, title: 'Licenciada', desc: 'Tudo em dia.' },
];

const fadeIn = (delay: number) => ({
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' as const },
  transition: { delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
});

export function BenefitsSection() {
  return (
    <section id="beneficios" className="py-14 md:py-20" style={{ background: '#0e1a3a' }}>
      <div className="container">
        <motion.div {...fadeIn(0)} className="text-center mb-10">
          <h2 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight" style={{ color: '#ffe8cb' }}>
            Por que a gente?
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 max-w-4xl mx-auto">
          {benefits.map((b, i) => (
            <motion.div key={b.title} {...fadeIn(0.04 + i * 0.06)}
              className="flex flex-col items-center text-center p-4 rounded-xl transition-colors duration-300"
              style={{ background: 'rgba(19,30,62,0.6)' }}
            >
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-2" style={{ background: 'rgba(255,197,108,0.08)' }}>
                <b.icon size={18} strokeWidth={1.8} style={{ color: '#ffc56c' }} />
              </div>
              <h3 className="text-xs font-bold mb-0.5" style={{ color: '#dbe1ff' }}>{b.title}</h3>
              <p className="text-[10px]" style={{ color: '#9f8e79' }}>{b.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
