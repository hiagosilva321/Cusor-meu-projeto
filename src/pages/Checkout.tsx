import { useState, useEffect, useRef } from 'react';
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
  Tag, X, Shield, Truck, Clock, Package,
} from 'lucide-react';
import { toast } from 'sonner';

/* ─── Types ─── */

interface DumpsterSize {
  size: string;
  title: string;
  price: number;
}

/* ─── Keyframes injected once ─── */
const styleId = 'checkout-keyframes';
if (typeof document !== 'undefined' && !document.getElementById(styleId)) {
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    @keyframes ck-fadeUp {
      from { opacity: 0; transform: translateY(18px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes ck-scaleIn {
      from { opacity: 0; transform: scale(0.96); }
      to   { opacity: 1; transform: scale(1); }
    }
    @keyframes ck-shimmer {
      0%   { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    @keyframes ck-pulse-ring {
      0%   { box-shadow: 0 0 0 0 rgba(242,195,107,0.4); }
      70%  { box-shadow: 0 0 0 10px rgba(242,195,107,0); }
      100% { box-shadow: 0 0 0 0 rgba(242,195,107,0); }
    }
    .ck-fade-up { animation: ck-fadeUp 0.45s cubic-bezier(0.22,1,0.36,1) both; }
    .ck-scale-in { animation: ck-scaleIn 0.35s cubic-bezier(0.22,1,0.36,1) both; }
    .ck-stagger-1 { animation-delay: 0.04s; }
    .ck-stagger-2 { animation-delay: 0.08s; }
    .ck-stagger-3 { animation-delay: 0.12s; }
    .ck-stagger-4 { animation-delay: 0.16s; }
    .ck-stagger-5 { animation-delay: 0.20s; }
    .ck-stagger-6 { animation-delay: 0.24s; }
  `;
  document.head.appendChild(style);
}

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
  const [helperPrice, setHelperPrice] = useState(125);
  const [ajudantes, setAjudantes] = useState(0);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
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
        const [sizesRes, settingsRes] = await Promise.all([
          supabase.from('dumpster_sizes').select('size, title, price').eq('active', true).order('order_index'),
          supabase.from('site_settings').select('helper_price').limit(1).single(),
        ]);
        if (settingsRes.data?.helper_price) setHelperPrice(Number(settingsRes.data.helper_price));
        const { data, error } = sizesRes;
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
    setCepLoading(true);
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
    finally { setCepLoading(false); }
  };

  const valorCacamba = selectedPrice * parseInt(form.quantidade || '1');
  const valorAjudantes = ajudantes * helperPrice;
  const subtotal = valorCacamba + valorAjudantes;
  const valorDesconto = Math.round(subtotal * (appliedDiscount / 100) * 100) / 100;
  const valorTotal = subtotal - valorDesconto;
  const sizesReady = sizeOptions.length > 0 && Boolean(form.tamanho);

  const handleApplyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) {
      setCouponError('Digite um codigo de cupom.');
      return;
    }
    setCouponLoading(true);
    setCouponError('');
    try {
      const { data, error } = await supabase.rpc('validate_coupon', { p_code: code });
      if (error || !data || data.length === 0) {
        setCouponError('Cupom invalido ou expirado.');
        setAppliedCoupon('');
        setAppliedDiscount(0);
      } else {
        setAppliedCoupon(code);
        setAppliedDiscount(data[0].discount_percent);
        setCouponError('');
        toast.success(`Cupom ${code} aplicado com ${data[0].discount_percent}% de desconto!`);
      }
    } catch {
      setCouponError('Erro ao validar cupom. Tente novamente.');
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon('');
    setAppliedDiscount(0);
    setCouponInput('');
    setCouponError('');
  };

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
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
        ajudantes,
        valor_ajudantes: valorAjudantes,
        coupon_code: appliedCoupon || null,
        discount_percent: appliedDiscount || undefined,
        valor_desconto: valorDesconto || undefined,
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
        ajudantes,
        status: 'Não pago', order_id: data.order_id,
      }).then(({ error }) => { if (error) console.error('[Lead]', error); });
      storeOrderAccessToken(data.order_id, data.order_token);
      navigate(`/pagamento/${data.order_id}?token=${encodeURIComponent(data.order_token)}`);
    } catch (err: unknown) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Erro ao gerar pagamento. Tente novamente.');
    } finally { setLoading(false); }
  };

  /* ─── UI Helpers ─── */

  const fieldError = (name: string) =>
    errors[name] ? (
      <span role="alert" className="text-[11px] text-red-400 flex items-center gap-1 mt-1.5 pl-0.5">
        <AlertCircle size={11} /> {errors[name]}
      </span>
    ) : null;

  const stepsConfig = [
    { n: 1, icon: ShoppingCart, label: 'Pedido' },
    { n: 2, icon: User, label: 'Dados' },
    { n: 3, icon: MapPin, label: 'Endereço' },
  ];

  /* ─── Reusable styles ─── */
  const inputCls = (hasError?: boolean) =>
    `w-full h-12 rounded-xl bg-[#0c1f38] border ${hasError ? 'border-red-500/50 focus:border-red-400' : 'border-white/[0.06] focus:border-[#f2c36b]/40'} px-4 text-sm text-[#e4eaf5] placeholder:text-slate-500 focus:outline-none focus:ring-2 ${hasError ? 'focus:ring-red-500/20' : 'focus:ring-[#f2c36b]/15'} transition-all duration-200`;

  const labelCls = 'text-[11px] font-semibold text-[#8b9dc3] uppercase tracking-[0.08em] mb-1.5 block';

  const selectCls = `${inputCls()} appearance-none cursor-pointer pr-10`;

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: '#071325' }}>
      {/* Atmospheric background */}
      <div className="fixed inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 80% 50% at 20% 20%, rgba(242,195,107,0.03) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 70%, rgba(31,173,78,0.02) 0%, transparent 50%)',
      }} />

      <SiteHeader />

      <main className="relative pt-24 pb-20 px-4 sm:px-6">
        <div className="max-w-[1100px] mx-auto">

          {/* ═══ Header ═══ */}
          <div className="text-center mb-8 ck-fade-up">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#f2c36b]/[0.08] border border-[#f2c36b]/[0.12] mb-4">
              <Package size={13} className="text-[#f2c36b]" />
              <span className="text-[11px] font-semibold text-[#f2c36b] uppercase tracking-wider">Checkout seguro</span>
            </div>
            <h1 className="font-display text-[28px] sm:text-4xl font-extrabold tracking-tight text-white">
              Finalizar Pedido
            </h1>
            <p className="mt-2 text-sm text-[#7b8fad]">Selecione, preencha e pague com PIX</p>
          </div>

          {/* ═══ Step Indicator ═══ */}
          <div className="flex items-center justify-center mb-10 ck-fade-up ck-stagger-1">
            {stepsConfig.map(({ n, icon: Icon, label }) => (
              <div key={n} className="flex items-center">
                <button
                  onClick={() => n < step && goToStep(n)}
                  disabled={n > step}
                  className="flex items-center gap-2.5 group disabled:cursor-default"
                >
                  <div className={`relative w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500 ${
                    step > n
                      ? 'bg-[#1FAD4E] text-white shadow-[0_0_20px_rgba(31,173,78,0.35)]'
                      : step === n
                        ? 'bg-[#f2c36b]/15 text-[#f2c36b] ring-2 ring-[#f2c36b]/50'
                        : 'bg-white/[0.04] text-[#4a5a75] border border-white/[0.06]'
                  }`}
                    style={step === n ? { animation: 'ck-pulse-ring 2s ease-in-out infinite' } : undefined}
                  >
                    {step > n ? <Check size={17} strokeWidth={3} /> : <Icon size={16} />}
                  </div>
                  <div className="hidden sm:block">
                    <span className={`text-[11px] font-bold uppercase tracking-wider transition-colors ${
                      step > n ? 'text-[#1FAD4E]' : step === n ? 'text-[#f2c36b]' : 'text-[#4a5a75]'
                    }`}>{label}</span>
                  </div>
                </button>
                {n < 3 && (
                  <div className="relative w-14 sm:w-24 h-[2px] mx-3 sm:mx-4 rounded-full bg-white/[0.06] overflow-hidden">
                    <div className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out ${
                      step > n ? 'w-full bg-[#1FAD4E]' : 'w-0'
                    }`} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ═══ Content Grid ═══ */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 lg:gap-8 items-start">

            {/* ─── Form Column ─── */}
            <form ref={formRef} onSubmit={handleSubmit}>
              <div key={step} className="ck-scale-in">

                {/* ════════════════════════════════════════════════
                    Step 1: Size Selection
                    ════════════════════════════════════════════════ */}
                {step === 1 && (
                  <div className="space-y-6">
                    {/* Size card */}
                    <div className="rounded-2xl bg-[#0c1a2e]/80 backdrop-blur-sm border border-white/[0.04] p-5 sm:p-7">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-9 h-9 rounded-xl bg-[#f2c36b]/10 flex items-center justify-center">
                          <ShoppingCart size={16} className="text-[#f2c36b]" />
                        </div>
                        <div>
                          <h2 className="font-display text-base font-bold text-white">Escolha a Caçamba</h2>
                          <p className="text-[11px] text-[#7b8fad] mt-0.5">Selecione o tamanho ideal para sua obra</p>
                        </div>
                      </div>

                      {loadingSizes ? (
                        <div className="py-16 text-center">
                          <div className="relative w-12 h-12 mx-auto mb-4">
                            <Loader2 className="animate-spin text-[#f2c36b] w-12 h-12" />
                          </div>
                          <p className="text-sm text-[#7b8fad]">Carregando tamanhos...</p>
                        </div>
                      ) : sizesError ? (
                        <div className="py-12 text-center">
                          <AlertCircle className="mx-auto mb-3 text-red-400" size={28} />
                          <p className="text-sm text-red-400">{sizesError}</p>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                            {sizeOptions.map((s, idx) => {
                              const selected = form.tamanho === s.size;
                              const isPopular = s.size === '5m³';
                              return (
                                <button
                                  key={s.size} type="button" onClick={() => selectSize(s)}
                                  className={`ck-fade-up ck-stagger-${Math.min(idx + 1, 6)} relative rounded-2xl text-center transition-all duration-300 cursor-pointer group overflow-hidden ${
                                    isPopular ? 'p-5 sm:p-6 row-span-1' : 'p-4 sm:p-5'
                                  } ${
                                    selected
                                      ? 'bg-[#f2c36b]/[0.08] ring-2 ring-[#f2c36b]/50 shadow-[0_0_32px_rgba(242,195,107,0.12)]'
                                      : 'bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] hover:border-white/[0.08]'
                                  }`}
                                >
                                  {isPopular && (
                                    <div className="absolute top-0 left-0 right-0 h-[3px]"
                                      style={{ background: 'linear-gradient(90deg, #1FAD4E, #5ddf79)' }} />
                                  )}
                                  {isPopular && (
                                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider mb-3"
                                      style={{ background: 'linear-gradient(135deg, rgba(31,173,78,0.15), rgba(93,223,121,0.08))', color: '#5ddf79', border: '1px solid rgba(93,223,121,0.15)' }}>
                                      Mais Popular
                                    </div>
                                  )}
                                  <div className={`font-extrabold font-display transition-colors leading-none ${isPopular ? 'text-[32px] sm:text-4xl' : 'text-2xl sm:text-3xl'} ${selected ? 'text-[#f2c36b]' : 'text-white group-hover:text-white/90'}`}>
                                    {s.size}
                                  </div>
                                  <div className="font-medium text-[10px] uppercase tracking-widest text-[#7b8fad] mt-1.5 mb-3">{s.title}</div>
                                  <div className={`font-bold font-display text-lg ${selected ? 'text-[#f2c36b]' : 'text-white/70'}`}>
                                    R$ {s.price.toFixed(0)}
                                  </div>
                                  {selected && (
                                    <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-[#f2c36b] flex items-center justify-center shadow-[0_2px_8px_rgba(242,195,107,0.3)]">
                                      <Check size={13} className="text-[#071325]" strokeWidth={3} />
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                          {fieldError('tamanho')}
                        </>
                      )}
                    </div>

                    {/* Quantity + Helpers */}
                    <div className="rounded-2xl bg-[#0c1a2e]/80 backdrop-blur-sm border border-white/[0.04] p-5 sm:p-7">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label className={labelCls}>Quantidade</label>
                          <div className="relative">
                            <select name="quantidade" value={form.quantidade} onChange={handleChange} className={selectCls}>
                              {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} caçamba{n > 1 ? 's' : ''}</option>)}
                            </select>
                            <ChevronRight size={14} className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-[#7b8fad] pointer-events-none" />
                          </div>
                        </div>
                        <div>
                          <label className={labelCls}>
                            Ajudantes <span className="normal-case tracking-normal font-normal text-[#7b8fad]">(R$ {helperPrice}/un)</span>
                          </label>
                          <div className="relative">
                            <select value={ajudantes} onChange={(e) => setAjudantes(Number(e.target.value))} className={selectCls}>
                              <option value={0}>Sem ajudante</option>
                              {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n} ajudante{n > 1 ? 's' : ''} (+R$ {(n * helperPrice).toFixed(0)})</option>)}
                            </select>
                            <ChevronRight size={14} className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-[#7b8fad] pointer-events-none" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Coupon */}
                    <div className="rounded-2xl bg-[#0c1a2e]/80 backdrop-blur-sm border border-white/[0.04] p-5 sm:p-7">
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-8 h-8 rounded-lg bg-[#f2c36b]/10 flex items-center justify-center">
                          <Tag size={14} className="text-[#f2c36b]" />
                        </div>
                        <span className="text-sm font-bold text-white">Código de desconto</span>
                      </div>
                      {appliedCoupon ? (
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#1FAD4E]/[0.08] border border-[#1FAD4E]/20">
                            <div className="w-5 h-5 rounded-full bg-[#1FAD4E]/20 flex items-center justify-center">
                              <Check size={11} className="text-[#5ddf79]" />
                            </div>
                            <span className="text-sm font-bold text-[#5ddf79]">{appliedCoupon}</span>
                            <span className="text-xs text-[#5ddf79]/70 font-medium">{appliedDiscount}% aplicado</span>
                          </div>
                          <button type="button" onClick={removeCoupon}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-red-400/80 hover:text-red-400 hover:bg-red-400/[0.06] transition-colors">
                            <X size={12} /> Remover
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex gap-2.5">
                            <input
                              type="text"
                              placeholder="Ex: PRIMEIRA10"
                              value={couponInput}
                              onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(''); }}
                              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleApplyCoupon())}
                              maxLength={30}
                              className={`${inputCls(!!couponError)} flex-1`}
                            />
                            <button type="button" onClick={handleApplyCoupon} disabled={couponLoading}
                              className="px-6 h-12 rounded-xl text-sm font-semibold transition-all duration-200 bg-white/[0.06] border border-white/[0.06] text-[#e4eaf5] hover:bg-white/[0.10] hover:border-white/[0.10] disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap">
                              {couponLoading ? <Loader2 size={15} className="animate-spin" /> : 'Aplicar'}
                            </button>
                          </div>
                          {couponError && (
                            <span className="text-[11px] text-red-400 flex items-center gap-1 pl-0.5">
                              <AlertCircle size={11} /> {couponError}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Scheduling */}
                    <div className="rounded-2xl bg-[#0c1a2e]/80 backdrop-blur-sm border border-white/[0.04] p-5 sm:p-7">
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-8 h-8 rounded-lg bg-[#f2c36b]/10 flex items-center justify-center">
                          <CalendarDays size={14} className="text-[#f2c36b]" />
                        </div>
                        <div>
                          <span className="text-sm font-bold text-white block">Agendamento</span>
                          <span className="text-[10px] text-[#7b8fad]">Opcional</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className={labelCls}>Data desejada</label>
                          <input type="date" name="data_entrega" value={form.data_entrega} onChange={handleChange}
                            min={new Date().toISOString().split('T')[0]}
                            max={new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]}
                            className={inputCls()} />
                        </div>
                        <div>
                          <label className={labelCls}>Horário</label>
                          <div className="relative">
                            <select name="horario_entrega" value={form.horario_entrega} onChange={handleChange} className={selectCls}>
                              <option value="manha">Manhã (7h - 12h)</option>
                              <option value="tarde">Tarde (12h - 18h)</option>
                              <option value="dia_todo">Dia todo (7h - 18h)</option>
                            </select>
                            <ChevronRight size={14} className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-[#7b8fad] pointer-events-none" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="rounded-2xl bg-[#0c1a2e]/80 backdrop-blur-sm border border-white/[0.04] p-5 sm:p-7">
                      <label className={labelCls}>Observações <span className="normal-case tracking-normal font-normal text-[#7b8fad]">(opcional)</span></label>
                      <Textarea name="observacoes" placeholder="Informações adicionais sobre a entrega, acesso ao local, etc." value={form.observacoes}
                        onChange={handleChange} rows={3} maxLength={1000}
                        className="border border-white/[0.06] bg-[#0c1f38] text-[#e4eaf5] placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#f2c36b]/15 focus:border-[#f2c36b]/40 rounded-xl resize-none transition-all" />
                    </div>

                    {/* CTA */}
                    <button type="button" onClick={() => goToStep(2)} disabled={!sizesReady}
                      className="w-full flex items-center justify-center gap-2.5 h-14 rounded-2xl font-bold text-[#071325] text-[15px] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(242,195,107,0.3)] active:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
                      style={{ background: 'linear-gradient(135deg, #ffe8cb 0%, #f2c36b 50%, #e0a830 100%)' }}>
                      Continuar <ChevronRight size={18} strokeWidth={2.5} />
                    </button>
                  </div>
                )}

                {/* ════════════════════════════════════════════════
                    Step 2: Personal Data
                    ════════════════════════════════════════════════ */}
                {step === 2 && (
                  <div className="space-y-6">
                    <div className="rounded-2xl bg-[#0c1a2e]/80 backdrop-blur-sm border border-white/[0.04] p-5 sm:p-7">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-9 h-9 rounded-xl bg-[#f2c36b]/10 flex items-center justify-center">
                          <User size={16} className="text-[#f2c36b]" />
                        </div>
                        <div>
                          <h2 className="font-display text-base font-bold text-white">Seus Dados</h2>
                          <p className="text-[11px] text-[#7b8fad] mt-0.5">Informações para contato e nota fiscal</p>
                        </div>
                      </div>

                      <div className="space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="ck-fade-up ck-stagger-1">
                            <label className={labelCls}>Nome completo <span className="text-[#f2c36b]">*</span></label>
                            <input name="nome" placeholder="Seu nome completo" value={form.nome} onChange={handleChange} maxLength={100}
                              className={inputCls(!!errors.nome)} />
                            {fieldError('nome')}
                          </div>
                          <div className="ck-fade-up ck-stagger-2">
                            <label className={labelCls}>WhatsApp <span className="text-[#f2c36b]">*</span></label>
                            <input name="whatsapp" placeholder="(11) 99999-9999" value={form.whatsapp} onChange={handleChange} maxLength={15}
                              className={inputCls(!!errors.whatsapp)} />
                            {fieldError('whatsapp')}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="ck-fade-up ck-stagger-3">
                            <label className={labelCls}>E-mail</label>
                            <input name="email" placeholder="email@exemplo.com" type="email" value={form.email} onChange={handleChange} maxLength={255}
                              className={inputCls(!!errors.email)} />
                            {fieldError('email')}
                          </div>
                          <div className="ck-fade-up ck-stagger-4">
                            <label className={labelCls}>CPF ou CNPJ</label>
                            <input name="cpf_cnpj" placeholder="000.000.000-00" value={form.cpf_cnpj} onChange={handleChange} maxLength={18}
                              className={inputCls(!!errors.cpf_cnpj)} />
                            {fieldError('cpf_cnpj')}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Navigation */}
                    <div className="flex gap-3">
                      <button type="button" onClick={() => setStep(1)}
                        className="flex-1 flex items-center justify-center gap-2 h-13 py-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.06] text-[#b0c0d8] font-semibold text-sm hover:bg-white/[0.07] hover:border-white/[0.10] transition-all">
                        <ChevronLeft size={16} /> Voltar
                      </button>
                      <button type="button" onClick={() => goToStep(3)}
                        className="flex-[2] flex items-center justify-center gap-2.5 h-13 py-3.5 rounded-2xl font-bold text-[#071325] text-[15px] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(242,195,107,0.3)] active:translate-y-0"
                        style={{ background: 'linear-gradient(135deg, #ffe8cb 0%, #f2c36b 50%, #e0a830 100%)' }}>
                        Continuar <ChevronRight size={18} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                )}

                {/* ════════════════════════════════════════════════
                    Step 3: Address
                    ════════════════════════════════════════════════ */}
                {step === 3 && (
                  <div className="space-y-6">
                    <div className="rounded-2xl bg-[#0c1a2e]/80 backdrop-blur-sm border border-white/[0.04] p-5 sm:p-7">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-9 h-9 rounded-xl bg-[#f2c36b]/10 flex items-center justify-center">
                          <MapPin size={16} className="text-[#f2c36b]" />
                        </div>
                        <div>
                          <h2 className="font-display text-base font-bold text-white">Endereço de Entrega</h2>
                          <p className="text-[11px] text-[#7b8fad] mt-0.5">Para onde devemos enviar a caçamba</p>
                        </div>
                      </div>

                      <div className="space-y-5">
                        {/* CEP row */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="ck-fade-up ck-stagger-1">
                            <label className={labelCls}>CEP</label>
                            <div className="relative">
                              <input name="cep" placeholder="00000-000" value={form.cep} onChange={handleChange} maxLength={9}
                                className={inputCls(!!errors.cep)} />
                              {cepLoading && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                  <Loader2 size={14} className="animate-spin text-[#f2c36b]" />
                                </div>
                              )}
                            </div>
                            {fieldError('cep')}
                          </div>
                          <div className="sm:col-span-2 ck-fade-up ck-stagger-2">
                            <label className={labelCls}>Endereço</label>
                            <input name="endereco" placeholder="Rua, Avenida..." value={form.endereco} onChange={handleChange} maxLength={200}
                              className={inputCls()} />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                          <div className="ck-fade-up ck-stagger-3">
                            <label className={labelCls}>Número</label>
                            <input name="numero" placeholder="Nº" value={form.numero} onChange={handleChange} maxLength={10}
                              className={inputCls()} />
                          </div>
                          <div className="ck-fade-up ck-stagger-4">
                            <label className={labelCls}>Complemento</label>
                            <input name="complemento" placeholder="Apto, bloco..." value={form.complemento} onChange={handleChange} maxLength={100}
                              className={inputCls()} />
                          </div>
                          <div className="col-span-2 sm:col-span-1 ck-fade-up ck-stagger-5">
                            <label className={labelCls}>Bairro</label>
                            <input name="bairro" placeholder="Bairro" value={form.bairro} onChange={handleChange} maxLength={100}
                              className={inputCls()} />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                          <div className="col-span-2 sm:col-span-3 ck-fade-up ck-stagger-5">
                            <label className={labelCls}>Cidade</label>
                            <input name="cidade" placeholder="Cidade" value={form.cidade} onChange={handleChange} maxLength={100}
                              className={inputCls()} />
                          </div>
                          <div className="ck-fade-up ck-stagger-6">
                            <label className={labelCls}>UF</label>
                            <input name="estado" placeholder="SP" value={form.estado} onChange={handleChange} maxLength={2}
                              className={`${inputCls()} uppercase`} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Navigation */}
                    <div className="flex gap-3">
                      <button type="button" onClick={() => setStep(2)}
                        className="flex-1 flex items-center justify-center gap-2 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.06] text-[#b0c0d8] font-semibold text-sm hover:bg-white/[0.07] hover:border-white/[0.10] transition-all">
                        <ChevronLeft size={16} /> Voltar
                      </button>
                      <button type="submit" disabled={loading}
                        className="flex-[2] flex items-center justify-center gap-2.5 h-14 rounded-2xl font-bold text-white text-[15px] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(31,173,78,0.35)] active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                        style={{ background: 'linear-gradient(135deg, #5ddf79 0%, #1FAD4E 60%, #168f3e 100%)' }}>
                        {loading ? (
                          <>
                            <Loader2 className="animate-spin" size={18} />
                            <span>Gerando PIX...</span>
                          </>
                        ) : (
                          <>
                            <CreditCard size={18} />
                            <span>Pagar com PIX</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </form>

            {/* ─── Sidebar / Summary ─── */}
            <div className="lg:sticky lg:top-28 h-fit">

              {/* Mobile toggle */}
              <button
                onClick={() => setMobileSummaryOpen(!mobileSummaryOpen)}
                className="lg:hidden w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-[#0c1a2e]/80 border border-white/[0.04] mb-3"
              >
                <div className="flex items-center gap-3">
                  <ShoppingCart size={16} className="text-[#f2c36b]" />
                  <span className="text-sm font-semibold text-white">Resumo do pedido</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-display font-extrabold text-[#f2c36b]">
                    R$ {valorTotal.toFixed(2)}
                  </span>
                  <ChevronRight size={16} className={`text-[#7b8fad] transition-transform duration-300 ${mobileSummaryOpen ? 'rotate-90' : ''}`} />
                </div>
              </button>

              {/* Summary card */}
              <div className={`${mobileSummaryOpen ? 'block' : 'hidden'} lg:block`}>
                <div className="relative rounded-2xl overflow-hidden">
                  {/* Gradient border effect */}
                  <div className="absolute inset-0 rounded-2xl p-px"
                    style={{ background: 'linear-gradient(135deg, rgba(242,195,107,0.15), rgba(255,255,255,0.03), rgba(31,173,78,0.1))' }}>
                    <div className="w-full h-full rounded-2xl bg-[#0a1628]" />
                  </div>

                  <div className="relative p-6 space-y-5">
                    <h3 className="font-display text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <div className="w-1.5 h-4 rounded-full bg-[#f2c36b]" />
                      Resumo do Pedido
                    </h3>

                    <div className="space-y-3.5 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-[#7b8fad] flex items-center gap-2">
                          <Truck size={13} /> Caçamba
                        </span>
                        <span className="font-semibold text-white">{form.tamanho || '—'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#7b8fad] flex items-center gap-2">
                          <Package size={13} /> Quantidade
                        </span>
                        <span className="font-semibold text-white">{form.quantidade}x</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#7b8fad]">Unitário</span>
                        <span className="text-white">R$ {selectedPrice.toFixed(2)}</span>
                      </div>
                      {ajudantes > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-[#7b8fad] flex items-center gap-2">
                            <User size={13} /> Ajudantes ({ajudantes}x)
                          </span>
                          <span className="text-white">R$ {valorAjudantes.toFixed(2)}</span>
                        </div>
                      )}

                      {appliedDiscount > 0 && (
                        <>
                          <div className="h-px bg-white/[0.04]" />
                          <div className="flex justify-between items-center">
                            <span className="text-[#7b8fad]">Subtotal</span>
                            <span className="text-white">R$ {subtotal.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[#5ddf79] flex items-center gap-1.5">
                              <Tag size={12} /> Desconto ({appliedDiscount}%)
                            </span>
                            <span className="text-[#5ddf79] font-semibold">-R$ {valorDesconto.toFixed(2)}</span>
                          </div>
                        </>
                      )}

                      <div className="h-px bg-white/[0.04]" />

                      {/* Total */}
                      <div className="flex justify-between items-baseline pt-1">
                        <span className="font-bold text-white text-sm">Total</span>
                        <span className="font-extrabold font-display text-2xl text-[#f2c36b]">
                          R$ {valorTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Payment method */}
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                      <div className="w-8 h-8 rounded-lg bg-[#1FAD4E]/10 flex items-center justify-center">
                        <CreditCard size={14} className="text-[#5ddf79]" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-white block">PIX</span>
                        <span className="text-[10px] text-[#7b8fad]">Aprovação instantânea</span>
                      </div>
                    </div>

                    {/* Step progress */}
                    <div className="space-y-2.5">
                      {stepsConfig.map(({ n, icon: Icon, label }) => (
                        <div key={n} className="flex items-center gap-3 text-xs">
                          {step > n ? (
                            <div className="w-5 h-5 rounded-full bg-[#1FAD4E]/15 flex items-center justify-center">
                              <Check size={11} className="text-[#5ddf79]" strokeWidth={3} />
                            </div>
                          ) : step === n ? (
                            <div className="w-5 h-5 rounded-full border-2 border-[#f2c36b]/40 bg-[#f2c36b]/[0.06] flex items-center justify-center">
                              <div className="w-1.5 h-1.5 rounded-full bg-[#f2c36b]" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-white/[0.04] border border-white/[0.06]" />
                          )}
                          <span className={`font-medium transition-colors ${
                            step > n ? 'text-[#5ddf79]' : step === n ? 'text-[#f2c36b]' : 'text-[#4a5a75]'
                          }`}>
                            {label}
                          </span>
                          {step > n && (
                            <span className="text-[10px] text-[#5ddf79]/50 ml-auto">Concluído</span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Trust badges */}
                    <div className="pt-2 space-y-2">
                      <div className="flex items-center gap-2.5 text-[11px] text-[#7b8fad]">
                        <Shield size={12} className="text-[#5ddf79]/60 flex-shrink-0" />
                        <span>Pagamento 100% seguro via PIX</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-[11px] text-[#7b8fad]">
                        <Clock size={12} className="text-[#f2c36b]/60 flex-shrink-0" />
                        <span>Entrega rápida após confirmação</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
};

export default Checkout;
