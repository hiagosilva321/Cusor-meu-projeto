import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useWhatsApp } from '@/contexts/WhatsAppContext';
import { supabase } from '@/integrations/supabase/client';
import { apiPost, type CreatePixChargeRequest, type CreatePixChargeResponse } from '@/lib/api';
import { storeOrderAccessToken } from '@/lib/order-access';
import { maskPhone, maskCpfCnpj, maskCep, unmask } from '@/lib/masks';
import { getStoredReferralSource } from '@/lib/whatsapp-sticky';
import { MessageCircle, Loader2, CreditCard, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useSiteSettings } from '@/hooks/use-site-settings';

interface DumpsterOption { size: string; title: string; price: number; }

const inputCls = "w-full h-10 rounded-xl bg-[#131f42] border border-white/10 px-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400/40 transition";
const selectCls = "w-full h-10 rounded-xl bg-[#131f42] border border-white/10 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-400/40 transition appearance-none";
const labelCls = "text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block";

export function ContactFormSection() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { getWhatsAppUrl, trackClick, available, assignedReferralSource } = useWhatsApp();
  const { settings } = useSiteSettings();
  const referralSource = searchParams.get('ref') || getStoredReferralSource() || assignedReferralSource || null;
  const [loading, setLoading] = useState(false);
  const [loadingSizes, setLoadingSizes] = useState(true);
  const [sizesError, setSizesError] = useState('');
  const [sizeOptions, setSizeOptions] = useState<DumpsterOption[]>([]);
  const [selectedPrice, setSelectedPrice] = useState(0);
  const [form, setForm] = useState({
    nome: '', whatsapp: '', email: '', cpf_cnpj: '',
    cep: '', endereco: '', numero: '', complemento: '',
    bairro: '', cidade: '', estado: '',
    tamanho: '', quantidade: '1', observacoes: '',
    data_entrega: '', horario_entrega: 'manha',
  });

  useEffect(() => {
    async function fetchSizes() {
      try {
        const { data, error } = await supabase
          .from('dumpster_sizes')
          .select('size, title, price')
          .eq('active', true)
          .order('order_index');

        if (error) throw error;

        if (data?.length) {
          setSizeOptions(data);
          setForm(f => ({ ...f, tamanho: data[0].size }));
          setSelectedPrice(data[0].price);
          setSizesError('');
          return;
        }

        setSizeOptions([]);
        setSizesError('Nenhum tamanho disponível no momento.');
      } catch (err) {
        console.error('Erro ao carregar tamanhos da landing:', err);
        setSizeOptions([]);
        setSizesError('Não foi possível carregar os tamanhos agora.');
      } finally {
        setLoadingSizes(false);
      }
    }
    fetchSizes();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let masked = value;
    if (name === 'whatsapp') masked = maskPhone(value);
    else if (name === 'cpf_cnpj') masked = maskCpfCnpj(value);
    else if (name === 'cep') masked = maskCep(value);
    setForm(prev => ({ ...prev, [name]: masked }));
    if (name === 'tamanho') {
      const found = sizeOptions.find(s => s.size === value);
      if (found) setSelectedPrice(found.price);
    }
    if (name === 'cep') {
      const clean = value.replace(/\D/g, '');
      if (clean.length === 8) fetchCep(clean);
    }
  };

  const fetchCep = async (cep: string) => {
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const d = await res.json();
      if (!d.erro) setForm(prev => ({ ...prev, endereco: d.logradouro || prev.endereco, bairro: d.bairro || prev.bairro, cidade: d.localidade || prev.cidade, estado: d.uf || prev.estado }));
    } catch { /* ignore */ }
  };

  const valorTotal = selectedPrice * parseInt(form.quantidade || '1');
  const sizesReady = sizeOptions.length > 0 && Boolean(form.tamanho);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sizesReady) { toast.error(sizesError || 'Aguarde os tamanhos carregarem antes de continuar.'); return; }
    if (!form.nome.trim() || unmask(form.whatsapp).length < 10) { toast.error('Preencha nome e WhatsApp válido.'); return; }
    setLoading(true);
    try {
      const body: CreatePixChargeRequest = {
        nome: form.nome.trim(), whatsapp: unmask(form.whatsapp),
        email: form.email.trim() || null, cpf_cnpj: unmask(form.cpf_cnpj) || null,
        cep: unmask(form.cep) || null, endereco: form.endereco.trim() || null,
        numero: form.numero.trim() || null, complemento: form.complemento.trim() || null,
        bairro: form.bairro.trim() || null, cidade: form.cidade.trim() || null,
        estado: form.estado.trim() || null, tamanho: form.tamanho,
        quantidade: parseInt(form.quantidade), valor_unitario: selectedPrice,
        observacoes: form.observacoes.trim() || null,
        data_entrega: form.data_entrega || null, horario_entrega: form.horario_entrega || null,
        referral_source: referralSource,
      };
      const data = await apiPost<CreatePixChargeResponse, CreatePixChargeRequest>('create-pix-charge', body);
      // Fire-and-forget: lead insert não bloqueia navegação ao pagamento
      supabase.from('leads').insert({
        nome: form.nome.trim(), whatsapp: unmask(form.whatsapp),
        email: form.email.trim() || '', cpf_cnpj: unmask(form.cpf_cnpj) || '',
        cep: unmask(form.cep) || '', endereco: form.endereco.trim() || '',
        numero: form.numero.trim() || '', complemento: form.complemento.trim() || '',
        bairro: form.bairro.trim() || '', cidade: form.cidade.trim() || '',
        estado: form.estado.trim() || '', tamanho: form.tamanho,
        quantidade: parseInt(form.quantidade), observacoes: form.observacoes.trim() || '',
        status: 'Não pago', order_id: data.order_id,
      }).then(({ error }) => {
        if (error) console.error('[Lead insert failed]', error);
      });

      storeOrderAccessToken(data.order_id, data.order_token);
      navigate(`/pagamento/${data.order_id}?token=${encodeURIComponent(data.order_token)}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao gerar pagamento.');
    } finally { setLoading(false); }
  };

  return (
    <section id="contato" className="py-14 md:py-20 bg-[#0a1628]">
      <div className="container">
        <div className="text-center mb-10">
          <span className="inline-block px-4 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-semibold uppercase tracking-widest mb-4">
            {settings?.contact_badge || 'Solicite agora'}
          </span>
          <h2 className="font-display text-3xl md:text-4xl font-extrabold text-white mb-3 tracking-tight">{settings?.contact_title || 'Faça Seu Pedido'}</h2>
          <p className="text-slate-400">{settings?.contact_subtitle || 'Preencha o formulário e pague com PIX.'}</p>
        </div>

        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Form */}
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-3 space-y-5 p-6 rounded-2xl bg-[#0e1a38] border border-white/5"
          >
            <div>
              <h3 className="font-display text-sm font-bold text-white uppercase tracking-wider mb-3">Dados Pessoais</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input name="nome" placeholder="Nome completo *" required maxLength={100} value={form.nome} onChange={handleChange} className={inputCls} />
                <input name="whatsapp" placeholder="(11) 99999-9999 *" required maxLength={15} value={form.whatsapp} onChange={handleChange} className={inputCls} />
                <input name="email" placeholder="E-mail" type="email" maxLength={255} value={form.email} onChange={handleChange} className={inputCls} />
                <input name="cpf_cnpj" placeholder="000.000.000-00" maxLength={18} value={form.cpf_cnpj} onChange={handleChange} className={inputCls} />
              </div>
            </div>

            <div>
              <h3 className="font-display text-sm font-bold text-white uppercase tracking-wider mb-3">Endereço de Entrega</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <input name="cep" placeholder="00000-000" maxLength={9} value={form.cep} onChange={handleChange} className={inputCls} />
                <input name="endereco" placeholder="Endereço" maxLength={200} value={form.endereco} onChange={handleChange} className={`${inputCls} col-span-2`} />
                <input name="numero" placeholder="Nº" maxLength={10} value={form.numero} onChange={handleChange} className={inputCls} />
                <input name="complemento" placeholder="Complemento" maxLength={100} value={form.complemento} onChange={handleChange} className={inputCls} />
                <input name="bairro" placeholder="Bairro" maxLength={100} value={form.bairro} onChange={handleChange} className={inputCls} />
                <input name="cidade" placeholder="Cidade" maxLength={100} value={form.cidade} onChange={handleChange} className={inputCls} />
                <input name="estado" placeholder="UF" maxLength={2} value={form.estado} onChange={handleChange} className={inputCls} />
              </div>
            </div>

            <div>
              <h3 className="font-display text-sm font-bold text-white uppercase tracking-wider mb-3">Caçamba</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select name="tamanho" value={form.tamanho} onChange={handleChange} className={selectCls}>
                  {loadingSizes && <option value="">Carregando tamanhos...</option>}
                  {!loadingSizes && sizeOptions.length === 0 && <option value="">Sem tamanhos disponíveis</option>}
                  {sizeOptions.map(s => <option key={s.size} value={s.size}>{s.size} - {s.title} (R$ {s.price.toFixed(2)})</option>)}
                </select>
                <select name="quantidade" value={form.quantidade} onChange={handleChange} className={selectCls}>
                  {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} caçamba{n > 1 ? 's' : ''}</option>)}
                </select>
              </div>
            </div>

            <div>
              <h3 className="font-display text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                <CalendarDays size={14} className="text-amber-400" /> Agendamento
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="date" name="data_entrega" value={form.data_entrega} onChange={handleChange}
                  min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                  max={new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]}
                  className={inputCls}
                />
                <select name="horario_entrega" value={form.horario_entrega} onChange={handleChange} className={selectCls}>
                  <option value="manha">Manhã (7h - 12h)</option>
                  <option value="tarde">Tarde (12h - 18h)</option>
                  <option value="dia_todo">Dia todo (7h - 18h)</option>
                </select>
              </div>
            </div>

            {valorTotal > 0 && (
              <div className="flex justify-between items-center p-3 rounded-xl bg-[#131f42]">
                <span className="text-sm text-slate-400">Total:</span>
                <span className="text-xl font-extrabold text-amber-400">R$ {valorTotal.toFixed(2)}</span>
              </div>
            )}

            <textarea name="observacoes" placeholder="Observações (opcional)" rows={2} maxLength={1000} value={form.observacoes} onChange={handleChange}
              className="w-full rounded-xl bg-[#131f42] border border-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-400/40 transition resize-none"
            />

            <button
              type="submit" disabled={loading || loadingSizes || sizeOptions.length === 0}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#1FAD4E] hover:bg-[#179241] text-white font-semibold text-base shadow-lg shadow-green-900/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <><Loader2 className="animate-spin" size={18} /> Gerando PIX...</> : loadingSizes ? 'Carregando tamanhos...' : <><CreditCard size={18} /> Pagar com PIX</>}
            </button>
          </motion.form>

          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-2 flex flex-col gap-4"
          >
            {available && (
              <div className="p-5 rounded-2xl bg-[#0e1a38] border border-[#1FAD4E]/20">
                <h3 className="font-display text-base font-bold text-white mb-2">Dúvidas? Fale pelo WhatsApp</h3>
                <p className="text-sm text-slate-400 mb-4">Atendimento imediato para tirar suas dúvidas.</p>
                <a href={getWhatsAppUrl()} target="_blank" rel="noopener noreferrer" onClick={(e) => trackClick(e, 'contato')}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#1FAD4E] hover:bg-[#179241] text-white font-semibold text-sm transition-all">
                  <MessageCircle size={16} /> Abrir WhatsApp
                </a>
              </div>
            )}
            <div className="p-5 rounded-2xl bg-[#0e1a38] border border-white/5">
              <h4 className="font-display text-sm font-bold text-white uppercase tracking-wider mb-3">Horário de Atendimento</h4>
              <div className="space-y-1.5 text-sm text-slate-400">
                <p>{settings?.business_hours_weekday || 'Seg a Sex: 7h às 20h'}</p>
                <p>{settings?.business_hours_saturday || 'Sábado: 7h às 20h'}</p>
                <p className="text-amber-400/80">{settings?.business_hours_emergency || 'Emergência: 24 horas'}</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
