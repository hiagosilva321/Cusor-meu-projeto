import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MessageCircle } from 'lucide-react';
import { useWhatsApp } from '@/contexts/WhatsAppContext';
import { motion } from 'framer-motion';

interface DumpsterSize {
  id: string; size: string; title: string; description: string; price: number; order_index: number;
}

const fadeIn = (delay: number) => ({
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' as const },
  transition: { delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] },
});

export function SizesSection() {
  const { getWhatsAppUrl, getCheckoutUrl, trackClick, available } = useWhatsApp();
  const [sizes, setSizes] = useState<DumpsterSize[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('dumpster_sizes').select('*').eq('active', true).order('order_index')
      .then(({ data }) => { if (data) setSizes(data); setLoading(false); });
  }, []);

  if (loading || sizes.length === 0) return null;

  const display = sizes.length > 4 ? sizes.filter(s => s.size !== '4m³') : sizes;

  return (
    <section id="tamanhos" className="py-14 md:py-20 scroll-mt-20" style={{ background: '#051131' }}>
      <div className="container">
        <motion.div {...fadeIn(0)} className="text-center mb-10">
          <h2 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight" style={{ color: '#ffe8cb' }}>
            Quanto custa?
          </h2>
          <p className="mt-2 text-sm" style={{ color: '#9f8e79' }}>
            Preço fechado — entrega, permanência e retirada inclusos.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
          {display.map((item, i) => {
            const popular = item.size === '5m³';
            return (
              <motion.div key={item.id} {...fadeIn(0.06 + i * 0.08)}
                className="relative rounded-xl p-5 flex flex-col h-full transition-all duration-300 hover:-translate-y-1"
                style={{
                  background: popular
                    ? 'linear-gradient(180deg, rgba(30,40,73,1) 0%, rgba(20,32,64,1) 100%)'
                    : 'rgba(19,31,66,0.6)',
                  boxShadow: popular
                    ? '0 0 30px rgba(255,197,108,0.08), 0 0 0 1px rgba(255,197,108,0.2)'
                    : '0 0 0 1px rgba(219,225,255,0.04)',
                }}
              >
                {popular && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full"
                    style={{ background: '#ffc56c', color: '#051131' }}>
                    Mais pedido
                  </span>
                )}

                <div className="text-center mb-4 pt-1">
                  <span className="font-display text-3xl font-extrabold" style={{ color: '#dbe1ff' }}>{item.size}</span>
                  <h3 className="text-sm font-bold mt-0.5" style={{ color: popular ? '#ffe8cb' : '#b8c0d6' }}>{item.title}</h3>
                </div>

                <p className="text-xs text-center mb-4 flex-1 leading-relaxed" style={{ color: '#9f8e79' }}>{item.description}</p>

                <div className="text-center mb-4">
                  <span className="text-2xl font-extrabold" style={{ color: '#ffc56c' }}>
                    R$ {Number(item.price).toFixed(2).replace('.', ',')}
                  </span>
                </div>

                {available ? (
                  <a href={getWhatsAppUrl(`Olá! Quero a caçamba ${item.size} — ${item.title}.`)}
                    target="_blank" rel="noopener noreferrer" onClick={(e) => trackClick(e, 'tamanhos')}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all duration-200"
                    style={{ background: '#12a749', boxShadow: '0 4px 16px rgba(18,167,73,0.25)' }}>
                    <MessageCircle size={15} strokeWidth={2.5} /> Solicitar
                  </a>
                ) : (
                  <a href={getCheckoutUrl()}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-bold transition-all"
                    style={{ background: 'linear-gradient(135deg, #ffe8cb, #ffc56c)', color: '#051131' }}>
                    Solicitar
                  </a>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
