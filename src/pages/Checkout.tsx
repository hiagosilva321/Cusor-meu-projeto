import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { apiPost, type CreatePixChargeRequest, type CreatePixChargeResponse } from '@/lib/api';
import { storeOrderAccessToken } from '@/lib/order-access';
import { maskPhone, maskCpfCnpj, maskCep, unmask } from '@/lib/masks';
import { checkoutStep1Schema, checkoutStep2Schema, checkoutStep3Schema } from '@/lib/validations';
import { getStoredReferralSource } from '@/lib/whatsapp-sticky';
import { SiteHeader } from '@/components/landing/SiteHeader';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { useWhatsApp } from '@/contexts/WhatsAppContext';
import {
  ShoppingCart, MapPin, User, CreditCard, Loader2,
  CalendarDays, Check, AlertCircle, ChevronRight, ChevronLeft,
} from 'lucide-react';
import { toast } from 'sonner';

/* ─── Types ─── */

interface DumpsterSize {
  size: string;
  title: string;
  price: number;
}

/* ─── Styles ─── */

/* Stitch Design System: "The Industrial Architect" — No-Line Rule, Glass & Gradient */
const glassCard = 'rounded-2xl bg-[rgba(42,53,72,0.6)] backdrop-blur-[12px] shadow-[0_8px_32px_rgba(0,0,0,0.4)]';
const inputDark = 'w-full h-11 rounded-lg bg-[#142032] px-4 text-sm text-[#d7e3fc] placeholder:text-[#d2c5b2]/40 focus:outline-none focus:ring-2 focus:ring-[#f2c36b]/30 transition-all duration-200';
const selectDark = `${inputDark} appearance-none cursor-pointer`;
const labelCls = 'text-xs font-semibold text-[#d2c5b2] uppercase tracking-[0.05em] mb-1.5 block';

/* ─── Component ─── */

const Checkout = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { assignedReferralSource } = useWhatsApp();
  const referralSource = searchParams.get('ref') || getStoredReferralSource() || assignedReferralSource || null;

  const [loading, setLoading] = useState(false);
  const [loadingSizes, setLoadingSizes] = useState(true);
  const [sizesError, setSizesError] = useState('');
  const [sizeOptions, setSizeOptions] = useState<DumpsterSize[]>([]);
  const [selectedPrice, setSelectedPrice] = useState(0);
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
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
          .from('dumpster_sizes').select('size, title, price').eq('active', true).order('order_index');
        if (error) throw error;
        if (data && data.length > 0) {
          setSizeOptions(data);
          setForm(f => ({ ...f, tamanho: data[0].size }));
          setSelectedPrice(data[0].price);
          setSizesError('');
          return;
        }
        setSizeOptions([]);
        setSizesError('Nenhum tamanho disponível no momento.');
      } catch (err) {
        console.error('Erro ao carregar tamanhos:', err);
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
    setErrors(prev => ({ ...prev, [name]: '' }));
    if (name === 'tamanho') {
      const found = sizeOptions.find(s => s.size === value);
      if (found) setSelectedPrice(found.price);
    }
    if (name === 'cep') {
      const cleanCep = unmask(value);
      if (cleanCep.length === 8) fetchAddressByCep(cleanCep);
    }
  };

  const selectSize = (size: DumpsterSize) => {
    setForm(prev => ({ ...prev, tamanho: size.size }));
    setSelectedPrice(size.price);
    setErrors(prev => ({ ...prev, tamanho: '' }));
  };

  const fetchAddressByCep = async (cep: string) => {
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setForm(prev => ({
          ...prev,
          endereco: data.logradouro || prev.endereco,
          bairro: data.bairro || prev.bairro,
          cidade: data.localidade || prev.cidade,
          estado: data.uf || prev.estado,
        }));
      }
    } catch (err) { console.error('Erro ao buscar CEP:', err); }
  };

  const valorTotal = selectedPrice * parseInt(form.quantidade || '1');
  const sizesReady = sizeOptions.length > 0 && Boolean(form.tamanho);

  const validateStep = (targetStep: number): boolean => {
    if (targetStep === 1 && !sizesReady) {
      const message = sizesError || 'Aguarde os tamanhos carregarem.';
      setErrors({ tamanho: message }); toast.error(message); return false;
    }
    const schemas = { 1: checkoutStep1Schema, 2: checkoutStep2Schema, 3: checkoutStep3Schema };
    const schema = schemas[targetStep as keyof typeof schemas];
    if (!schema) return true;
    const result = schema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      toast.error(result.error.issues[0]?.message);
      return false;
    }
    setErrors({}); return true;
  };

  const goToStep = (target: number) => {
    if (target > step && !validateStep(step)) return;
    setStep(target);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(2) || !validateStep(3)) return;
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
      supabase.from('leads').insert({
        nome: form.nome.trim(), whatsapp: unmask(form.whatsapp),
        email: form.email.trim() || '', cpf_cnpj: unmask(form.cpf_cnpj) || '',
        cep: unmask(form.cep) || '', endereco: form.endereco.trim() || '',
        numero: form.numero.trim() || '', complemento: form.complemento.trim() || '',
        bairro: form.bairro.trim() || '', cidade: form.cidade.trim() || '',
        estado: form.estado.trim() || '', tamanho: form.tamanho,
        quantidade: parseInt(form.quantidade), observacoes: form.observacoes.trim() || '',
        status: 'Não pago', order_id: data.order_id,
      }).then(({ error }) => { if (error) console.error('[Lead]', error); });
      storeOrderAccessToken(data.order_id, data.order_token);
      navigate(`/pagamento/${data.order_id}?token=${encodeURIComponent(data.order_token)}`);
    } catch (err: unknown) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Erro ao gerar pagamento. Tente novamente.');
    } finally { setLoading(false); }
  };

  const fieldError = (name: string) =>
    errors[name] ? (
      <span role="alert" className="text-xs text-red-400 flex items-center gap-1 mt-1">
        <AlertCircle size={11} /> {errors[name]}
      </span>
    ) : null;

  const stepsConfig = [
    { n: 1, icon: ShoppingCart, label: 'Pedido' },
    { n: 2, icon: User, label: 'Dados' },
    { n: 3, icon: MapPin, label: 'Endereço' },
  ];

  return (
    <div className="min-h-screen" style={{ background: '#071325' }}>
      <SiteHeader />

      <main className="pt-24 pb-20">
        <div className="container max-w-5xl">

          {/* ═══ Header ═══ */}
          <div className="text-center mb-10">
            <h1 className="font-display text-3xl md:text-4xl font-extrabold tracking-[-0.02em]" style={{ color: '#d7e3fc' }}>
              Finalizar Pedido
            </h1>
            <p className="mt-2 text-sm" style={{ color: '#d2c5b2' }}>Selecione, preencha e pague com PIX</p>
          </div>

          {/* ═══ Step Indicator ═══ */}
          <div className="flex items-center justify-center mb-10">
            {stepsConfig.map(({ n, label }) => (
              <div key={n} className="flex items-center">
                <button
                  onClick={() => n < step && goToStep(n)}
                  className="flex items-center gap-2 group"
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                    step > n
                      ? 'bg-[#1FAD4E] text-white shadow-[0_0_16px_rgba(31,173,78,0.4)]'
                      : step === n
                        ? 'bg-[#f2c36b]/20 text-[#f2c36b] border-2 border-[#f2c36b]/60 shadow-[0_0_16px_rgba(212,168,83,0.3)]'
                        : 'bg-white/5 text-slate-500 border border-white/10'
                  }`}>
                    {step > n ? <Check size={16} strokeWidth={3} /> : n}
                  </div>
                  <span className={`text-xs font-semibold uppercase tracking-wider hidden sm:block transition-colors ${
                    step >= n ? 'text-slate-300' : 'text-slate-600'
                  }`}>{label}</span>
                </button>
                {n < 3 && (
                  <div className={`w-12 sm:w-20 h-[2px] mx-2 sm:mx-3 rounded-full transition-all duration-500 ${
                    step > n ? 'bg-[#1FAD4E]' : 'bg-white/10'
                  }`} />
                )}
              </div>
            ))}
          </div>

          {/* ═══ Content ═══ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ─── Form ─── */}
            <form onSubmit={handleSubmit} className="lg:col-span-2">
              <div className="transition-all duration-300" key={step}>

                {/* Step 1: Size Selection */}
                {step === 1 && (
                  <div className={`${glassCard} p-6 md:p-8 space-y-6`}>
                    <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
                      <ShoppingCart size={18} className="text-[#f2c36b]" /> Escolha a Caçamba
                    </h2>

                    {loadingSizes ? (
                      <div className="py-12 text-center">
                        <Loader2 className="animate-spin mx-auto text-[#f2c36b] mb-3" size={28} />
                        <p className="text-slate-400 text-sm">Carregando tamanhos...</p>
                      </div>
                    ) : (
                      <>
                        {/* Size Cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                          {sizeOptions.map((s) => {
                            const selected = form.tamanho === s.size;
                            return (
                              <button
                                key={s.size} type="button" onClick={() => selectSize(s)}
                                className={`relative p-4 rounded-xl text-center transition-all duration-300 cursor-pointer group ${
                                  selected
                                    ? 'bg-[#f2c36b]/10 border-2 border-[#f2c36b]/60 shadow-[0_0_24px_rgba(212,168,83,0.15)]'
                                    : 'bg-white/[0.03] border border-white/[0.06] hover:border-white/20 hover:bg-white/[0.05]'
                                }`}
                              >
                                {s.size === '5m³' && (
                                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-[#5ddf79] text-[#003913] text-[8px] font-bold uppercase tracking-wider whitespace-nowrap">
                                    Mais Popular
                                  </div>
                                )}
                                <div className={`text-2xl font-extrabold font-display mb-1 transition-colors ${selected ? 'text-[#f2c36b]' : 'text-white'}`}>
                                  {s.size}
                                </div>
                                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">{s.title}</div>
                                <div className={`text-lg font-bold font-display ${selected ? 'text-amber-300' : 'text-white/80'}`}>
                                  R$ {s.price.toFixed(0)}
                                </div>
                                {selected && (
                                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#f2c36b] flex items-center justify-center">
                                    <Check size={12} className="text-[#0a1628]" strokeWidth={3} />
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                        {fieldError('tamanho')}

                        {/* Quantity */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className={labelCls}>Quantidade</label>
                            <select name="quantidade" value={form.quantidade} onChange={handleChange} className={selectDark}>
                              {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} caçamba{n > 1 ? 's' : ''}</option>)}
                            </select>
                          </div>
                        </div>

                        {/* Scheduling */}
                        <div className="pt-4 border-t border-white/[0.06]">
                          <h3 className="font-display text-sm font-bold text-white flex items-center gap-2 mb-4">
                            <CalendarDays size={14} className="text-[#f2c36b]" />
                            <span className="uppercase tracking-wider">Agendamento</span>
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className={labelCls}>Data desejada</label>
                              <input type="date" name="data_entrega" value={form.data_entrega} onChange={handleChange}
                                min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                                max={new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]}
                                className={inputDark} />
                            </div>
                            <div>
                              <label className={labelCls}>Horário</label>
                              <select name="horario_entrega" value={form.horario_entrega} onChange={handleChange} className={selectDark}>
                                <option value="manha">Manhã (7h - 12h)</option>
                                <option value="tarde">Tarde (12h - 18h)</option>
                                <option value="dia_todo">Dia todo (7h - 18h)</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        <Textarea name="observacoes" placeholder="Observações (opcional)" value={form.observacoes}
                          onChange={handleChange} rows={2} maxLength={1000}
                          className="bg-[#0a1230] border-white/[0.08] text-white placeholder:text-slate-500 focus:ring-amber-400/30 rounded-xl resize-none" />

                        <button type="button" onClick={() => goToStep(2)} disabled={!sizesReady}
                          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-[#0a1628] text-base transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
                          style={{ background: 'linear-gradient(135deg, #ffe8cb, #D4A853)', boxShadow: '0 8px 24px rgba(212,168,83,0.25)' }}>
                          Continuar <ChevronRight size={18} />
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* Step 2: Personal Data */}
                {step === 2 && (
                  <div className={`${glassCard} p-6 md:p-8 space-y-5`}>
                    <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
                      <User size={18} className="text-[#f2c36b]" /> Seus Dados
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>Nome completo *</label>
                        <input name="nome" placeholder="Nome completo" value={form.nome} onChange={handleChange} maxLength={100}
                          className={`${inputDark} ${errors.nome ? 'border-red-500/50 focus:ring-red-400/30' : ''}`} />
                        {fieldError('nome')}
                      </div>
                      <div>
                        <label className={labelCls}>WhatsApp *</label>
                        <input name="whatsapp" placeholder="(11) 99999-9999" value={form.whatsapp} onChange={handleChange} maxLength={15}
                          className={`${inputDark} ${errors.whatsapp ? 'border-red-500/50 focus:ring-red-400/30' : ''}`} />
                        {fieldError('whatsapp')}
                      </div>
                      <div>
                        <label className={labelCls}>E-mail</label>
                        <input name="email" placeholder="email@exemplo.com" type="email" value={form.email} onChange={handleChange} maxLength={255}
                          className={`${inputDark} ${errors.email ? 'border-red-500/50' : ''}`} />
                        {fieldError('email')}
                      </div>
                      <div>
                        <label className={labelCls}>CPF ou CNPJ</label>
                        <input name="cpf_cnpj" placeholder="000.000.000-00" value={form.cpf_cnpj} onChange={handleChange} maxLength={18}
                          className={`${inputDark} ${errors.cpf_cnpj ? 'border-red-500/50' : ''}`} />
                        {fieldError('cpf_cnpj')}
                      </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button type="button" onClick={() => setStep(1)}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 text-slate-300 font-semibold text-sm hover:bg-white/5 transition-colors">
                        <ChevronLeft size={16} /> Voltar
                      </button>
                      <button type="button" onClick={() => goToStep(3)}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[#0a1628] text-sm transition-all hover:-translate-y-0.5"
                        style={{ background: 'linear-gradient(135deg, #ffe8cb, #D4A853)', boxShadow: '0 8px 24px rgba(212,168,83,0.2)' }}>
                        Continuar <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3: Address */}
                {step === 3 && (
                  <div className={`${glassCard} p-6 md:p-8 space-y-5`}>
                    <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
                      <MapPin size={18} className="text-[#f2c36b]" /> Endereço de Entrega
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className={labelCls}>CEP</label>
                        <input name="cep" placeholder="00000-000" value={form.cep} onChange={handleChange} maxLength={9}
                          className={`${inputDark} ${errors.cep ? 'border-red-500/50' : ''}`} />
                        {fieldError('cep')}
                      </div>
                      <div className="sm:col-span-2">
                        <label className={labelCls}>Endereço</label>
                        <input name="endereco" placeholder="Rua, Avenida..." value={form.endereco} onChange={handleChange} maxLength={200} className={inputDark} />
                      </div>
                      <div>
                        <label className={labelCls}>Número</label>
                        <input name="numero" placeholder="Nº" value={form.numero} onChange={handleChange} maxLength={10} className={inputDark} />
                      </div>
                      <div>
                        <label className={labelCls}>Complemento</label>
                        <input name="complemento" placeholder="Apto, bloco..." value={form.complemento} onChange={handleChange} maxLength={100} className={inputDark} />
                      </div>
                      <div>
                        <label className={labelCls}>Bairro</label>
                        <input name="bairro" placeholder="Bairro" value={form.bairro} onChange={handleChange} maxLength={100} className={inputDark} />
                      </div>
                      <div>
                        <label className={labelCls}>Cidade</label>
                        <input name="cidade" placeholder="Cidade" value={form.cidade} onChange={handleChange} maxLength={100} className={inputDark} />
                      </div>
                      <div>
                        <label className={labelCls}>UF</label>
                        <input name="estado" placeholder="SP" value={form.estado} onChange={handleChange} maxLength={2} className={inputDark} />
                      </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button type="button" onClick={() => setStep(2)}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 text-slate-300 font-semibold text-sm hover:bg-white/5 transition-colors">
                        <ChevronLeft size={16} /> Voltar
                      </button>
                      <button type="submit" disabled={loading}
                        className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white text-sm transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ background: 'linear-gradient(135deg, #15b84f, #0d8a3a)', boxShadow: '0 8px 24px rgba(18,167,73,0.35)' }}>
                        {loading ? <><Loader2 className="animate-spin" size={18} /> Gerando PIX...</> : <><CreditCard size={18} /> Pagar com PIX</>}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </form>

            {/* ─── Sidebar ─── */}
            <div className="lg:sticky lg:top-28 h-fit">
              <div className={`${glassCard} p-6 space-y-5`}>
                <h3 className="font-display text-base font-bold text-white uppercase tracking-wider">Resumo</h3>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Caçamba</span>
                    <span className="font-semibold text-white">{form.tamanho || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Quantidade</span>
                    <span className="font-semibold text-white">{form.quantidade}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Unitário</span>
                    <span className="text-white">R$ {selectedPrice.toFixed(2)}</span>
                  </div>
                  <div className="h-px bg-white/[0.06]" />
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold text-white text-base">Total</span>
                    <span className="font-extrabold font-display text-2xl" style={{ color: '#f2c36b' }}>
                      R$ {valorTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <CreditCard size={15} className="text-slate-500" />
                  <span className="text-xs text-slate-400">Pagamento via <strong className="text-white">PIX</strong></span>
                </div>

                {/* Step checklist */}
                <div className="space-y-2">
                  {stepsConfig.map(({ n, label }) => (
                    <div key={n} className="flex items-center gap-2.5 text-xs">
                      {step > n ? (
                        <div className="w-4 h-4 rounded-full bg-[#1FAD4E] flex items-center justify-center">
                          <Check size={10} className="text-white" strokeWidth={3} />
                        </div>
                      ) : step === n ? (
                        <div className="w-4 h-4 rounded-full border-2 border-[#f2c36b]/60 bg-[#f2c36b]/10" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-white/10" />
                      )}
                      <span className={step >= n ? 'text-slate-300' : 'text-slate-600'}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Security badge */}
      <div className="text-center pb-6" style={{ background: '#071325' }}>
        <div className="flex items-center justify-center gap-2 text-[#d2c5b2]/50 text-xs">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          100% Seguro & Criptografado
        </div>
      </div>
      <SiteFooter />
    </div>
  );
};

export default Checkout;
