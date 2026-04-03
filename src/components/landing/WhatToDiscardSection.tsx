import { Recycle, Truck, Leaf } from 'lucide-react';
import { motion } from 'framer-motion';

const items = [
  { icon: Recycle, text: 'Entulho, madeira, ferro, gesso e mais' },
  { icon: Truck, text: 'Retirada rápida no seu endereço' },
  { icon: Leaf, text: 'Destinação ecológica responsável' },
];

export function WhatToDiscardSection() {
  return (
    <section className="py-14 md:py-20" style={{ background: '#0e1a3a' }}>
      <div className="container">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-8">
          <h2 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight" style={{ color: '#ffe8cb' }}>
            O que pode jogar?
          </h2>
          <p className="mt-2 text-sm" style={{ color: '#9f8e79' }}>A gente cuida de tudo.</p>
        </motion.div>

        <div className="flex flex-wrap justify-center gap-3 max-w-2xl mx-auto">
          {items.map(({ icon: Icon, text }, i) => (
            <motion.div key={text}
              initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.4 }}
              className="flex items-center gap-3 px-5 py-3 rounded-xl" style={{ background: 'rgba(19,30,62,0.6)', border: '1px solid rgba(219,225,255,0.04)' }}>
              <Icon size={18} strokeWidth={1.8} style={{ color: '#ffc56c' }} />
              <span className="text-sm font-medium" style={{ color: '#b8c0d6' }}>{text}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
