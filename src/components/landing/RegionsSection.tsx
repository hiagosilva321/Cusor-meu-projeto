import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { MapPin } from 'lucide-react';
import { motion } from 'framer-motion';

export function RegionsSection() {
  const [regions, setRegions] = useState<Tables<'regions'>[]>([]);

  useEffect(() => {
    supabase.from('regions').select('*').eq('active', true).order('order_index')
      .then(({ data }) => { if (data) setRegions(data); });
  }, []);

  if (regions.length === 0) return null;

  return (
    <section className="py-14 md:py-20" style={{ background: '#051131' }}>
      <div className="container">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-8">
          <h2 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight" style={{ color: '#ffe8cb' }}>
            Onde atendemos
          </h2>
          <p className="mt-2 text-sm" style={{ color: '#9f8e79' }}>SP capital e região metropolitana.</p>
        </motion.div>

        <div className="flex flex-wrap justify-center gap-2 max-w-3xl mx-auto">
          {regions.map((r, i) => (
            <motion.div key={r.id}
              initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }} transition={{ delay: i * 0.03, duration: 0.3 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(19,30,62,0.7)', border: '1px solid rgba(219,225,255,0.05)' }}>
              <MapPin size={12} style={{ color: '#ffc56c' }} />
              <span className="text-xs font-medium" style={{ color: '#b8c0d6' }}>{r.name}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
