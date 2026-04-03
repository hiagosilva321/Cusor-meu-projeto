import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
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
import { ShoppingCart, MapPin, User, CreditCard, Loader2, CalendarDays, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface DumpsterSize {
  size: string;
  title: string;
  price: number;
}

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
          .from('dumpster_sizes')
          .select('size, title, price')
          .eq('active', true)
          .order('order_index');

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
    } catch (err) {
      console.error('Erro ao buscar CEP:', err);
    }
  };

  const valorTotal = selectedPrice * parseInt(form.quantidade || '1');
  const sizesReady = sizeOptions.length > 0 && Boolean(form.tamanho);

  const validateStep = (targetStep: number): boolean => {
    if (targetStep === 1 && !sizesReady) {
      const message = sizesError || 'Aguarde os tamanhos carregarem antes de continuar.';
      setErrors({ tamanho: message });
      toast.error(message);
      return false;
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
      const firstError = result.error.issues[0]?.message;
      if (firstError) toast.error(firstError);
      return false;
    }
    setErrors({});
    return true;
  };

  const goToStep = (target: number) => {
    if (target > step) {
      if (!validateStep(step)) return;
    }
    setStep(target);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(2) || !validateStep(3)) return;

    setLoading(true);
    try {
      const requestBody: CreatePixChargeRequest = {
        nome: form.nome.trim(),
        whatsapp: unmask(form.whatsapp),
        email: form.email.trim() || null,
        cpf_cnpj: unmask(form.cpf_cnpj) || null,
        cep: unmask(form.cep) || null,
        endereco: form.endereco.trim() || null,
        numero: form.numero.trim() || null,
        complemento: form.complemento.trim() || null,
        bairro: form.bairro.trim() || null,
        cidade: form.cidade.trim() || null,
        estado: form.estado.trim() || null,
        tamanho: form.tamanho,
        quantidade: parseInt(form.quantidade),
        valor_unitario: selectedPrice,
        observacoes: form.observacoes.trim() || null,
        data_entrega: form.data_entrega || null,
        horario_entrega: form.horario_entrega || null,
        referral_source: referralSource,
      };

      // Gera cobrança PIX (cria order no banco)
      const data = await apiPost<CreatePixChargeResponse, CreatePixChargeRequest>(
        'create-pix-charge',
        requestBody,
      );

      // Fire-and-forget: lead insert não bloqueia navegação ao pagamento
      supabase.from('leads').insert({
        nome: form.nome.trim(),
        whatsapp: unmask(form.whatsapp),
        email: form.email.trim() || '',
        cpf_cnpj: unmask(form.cpf_cnpj) || '',
        cep: unmask(form.cep) || '',
        endereco: form.endereco.trim() || '',
        numero: form.numero.trim() || '',
        complemento: form.complemento.trim() || '',
        bairro: form.bairro.trim() || '',
        cidade: form.cidade.trim() || '',
        estado: form.estado.trim() || '',
        tamanho: form.tamanho,
        quantidade: parseInt(form.quantidade),
        observacoes: form.observacoes.trim() || '',
        status: 'Não pago',
        order_id: data.order_id,
      }).then(({ error }) => {
        if (error) console.error('[Lead insert failed]', error);
      });

      storeOrderAccessToken(data.order_id, data.order_token);
      navigate(`/pagamento/${data.order_id}?token=${encodeURIComponent(data.order_token)}`);
    } catch (err: unknown) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Erro ao gerar pagamento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const selectClasses = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  const fieldError = (name: string) =>
    errors[name] ? (
      <span id={`error-${name}`} role="alert" className="text-xs text-destructive flex items-center gap-1 mt-1">
        <AlertCircle size={12} /> {errors[name]}
      </span>
    ) : null;

  const steps = [
    { n: 1, icon: ShoppingCart, label: 'Pedido' },
    { n: 2, icon: User, label: 'Dados' },
    { n: 3, icon: MapPin, label: 'Endereço' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="pt-24 pb-16">
        <div className="container max-w-4xl">
          <div className="text-center mb-8">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">Finalizar Pedido</h1>
            <p className="text-muted-foreground mt-2">Preencha os dados e pague com PIX</p>
          </div>

          {/* Steps indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {steps.map(({ n, icon: Icon, label }) => (
              <div key={n} className="flex items-center gap-2">
                <button
                  onClick={() => goToStep(n)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    step === n
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : step > n
                        ? 'bg-primary/20 text-primary'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {step > n ? <CheckCircle2 size={14} /> : <Icon size={14} />}
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sm:hidden">{n}</span>
                </button>
                {n < 3 && (
                  <div className={`w-8 h-0.5 transition-colors ${step > n ? 'bg-primary' : 'bg-muted'}`} />
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form */}
            <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
              {step === 1 && (
                <div className="p-6 rounded-xl bg-card border shadow-sm space-y-4">
                  <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                    <ShoppingCart size={18} /> Escolha a Caçamba
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">Tamanho *</label>
                      <select
                        name="tamanho"
                        value={form.tamanho}
                        onChange={handleChange}
                        className={selectClasses}
                        disabled={loadingSizes || sizeOptions.length === 0}
                      >
                        {loadingSizes && <option value="">Carregando tamanhos...</option>}
                        {!loadingSizes && sizeOptions.length === 0 && <option value="">Sem tamanhos disponíveis</option>}
                        {sizeOptions.map(s => (
                          <option key={s.size} value={s.size}>{s.size} - {s.title} (R$ {s.price.toFixed(2)})</option>
                        ))}
                      </select>
                      {fieldError('tamanho')}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">Quantidade *</label>
                      <select name="quantidade" value={form.quantidade} onChange={handleChange} className={selectClasses}>
                        {[1, 2, 3, 4, 5].map(n => (
                          <option key={n} value={n}>{n} caçamba{n > 1 ? 's' : ''}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="pt-2 border-t">
                    <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2 mb-3">
                      <CalendarDays size={16} /> Agendamento de Entrega
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1 block">Data desejada</label>
                        <Input
                          type="date"
                          name="data_entrega"
                          value={form.data_entrega}
                          onChange={handleChange}
                          min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                          max={new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1 block">Horário</label>
                        <select name="horario_entrega" value={form.horario_entrega} onChange={handleChange} className={selectClasses}>
                          <option value="manha">Manhã (7h - 12h)</option>
                          <option value="tarde">Tarde (12h - 18h)</option>
                          <option value="dia_todo">Dia todo (7h - 18h)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <Textarea name="observacoes" placeholder="Observações (opcional)" value={form.observacoes} onChange={handleChange} rows={3} maxLength={1000} />
                  <Button
                    type="button"
                    onClick={() => goToStep(2)}
                    className="w-full"
                    size="lg"
                    disabled={loadingSizes || sizeOptions.length === 0}
                  >
                    {loadingSizes ? 'Carregando tamanhos...' : 'Continuar'}
                  </Button>
                </div>
              )}

              {step === 2 && (
                <div className="p-6 rounded-xl bg-card border shadow-sm space-y-4">
                  <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                    <User size={18} /> Seus Dados
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">Nome completo *</label>
                      <Input
                        name="nome"
                        placeholder="Nome completo"
                        value={form.nome}
                        onChange={handleChange}
                        maxLength={100}
                        className={errors.nome ? 'border-destructive' : ''}
                      />
                      {fieldError('nome')}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">WhatsApp *</label>
                      <Input
                        name="whatsapp"
                        placeholder="(11) 99999-9999"
                        value={form.whatsapp}
                        onChange={handleChange}
                        maxLength={15}
                        className={errors.whatsapp ? 'border-destructive' : ''}
                      />
                      {fieldError('whatsapp')}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">E-mail</label>
                      <Input
                        name="email"
                        placeholder="email@exemplo.com"
                        type="email"
                        value={form.email}
                        onChange={handleChange}
                        maxLength={255}
                        className={errors.email ? 'border-destructive' : ''}
                      />
                      {fieldError('email')}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">CPF ou CNPJ</label>
                      <Input
                        name="cpf_cnpj"
                        placeholder="000.000.000-00"
                        value={form.cpf_cnpj}
                        onChange={handleChange}
                        maxLength={18}
                        className={errors.cpf_cnpj ? 'border-destructive' : ''}
                      />
                      {fieldError('cpf_cnpj')}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">Voltar</Button>
                    <Button type="button" onClick={() => goToStep(3)} className="flex-1">Continuar</Button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="p-6 rounded-xl bg-card border shadow-sm space-y-4">
                  <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                    <MapPin size={18} /> Endereço de Entrega
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">CEP</label>
                      <Input
                        name="cep"
                        placeholder="00000-000"
                        value={form.cep}
                        onChange={handleChange}
                        maxLength={9}
                        className={errors.cep ? 'border-destructive' : ''}
                      />
                      {fieldError('cep')}
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-sm font-medium text-foreground mb-1 block">Endereço</label>
                      <Input name="endereco" placeholder="Rua, Avenida..." value={form.endereco} onChange={handleChange} maxLength={200} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">Número</label>
                      <Input name="numero" placeholder="Nº" value={form.numero} onChange={handleChange} maxLength={10} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">Complemento</label>
                      <Input name="complemento" placeholder="Apto, bloco..." value={form.complemento} onChange={handleChange} maxLength={100} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">Bairro</label>
                      <Input name="bairro" placeholder="Bairro" value={form.bairro} onChange={handleChange} maxLength={100} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">Cidade</label>
                      <Input name="cidade" placeholder="Cidade" value={form.cidade} onChange={handleChange} maxLength={100} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">UF</label>
                      <Input name="estado" placeholder="SP" value={form.estado} onChange={handleChange} maxLength={2} />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button type="button" variant="outline" onClick={() => setStep(2)} className="flex-1">Voltar</Button>
                    <Button type="submit" variant="whatsapp" size="lg" className="flex-1" disabled={loading}>
                      {loading ? <><Loader2 className="mr-2 animate-spin" size={18} /> Gerando PIX...</> : <><CreditCard className="mr-2" size={18} /> Pagar com PIX</>}
                    </Button>
                  </div>
                </div>
              )}
            </form>

            {/* Order summary */}
            <div className="lg:sticky lg:top-24 h-fit">
              <div className="p-6 rounded-xl bg-card border shadow-sm space-y-4">
                <h3 className="font-display text-lg font-bold text-foreground">Resumo do Pedido</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Caçamba</span>
                    <span className="font-medium text-foreground">{form.tamanho || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Quantidade</span>
                    <span className="font-medium text-foreground">{form.quantidade}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valor unitário</span>
                    <span className="font-medium text-foreground">R$ {selectedPrice.toFixed(2)}</span>
                  </div>
                  <hr className="border-border" />
                  <div className="flex justify-between text-base">
                    <span className="font-bold text-foreground">Total</span>
                    <span className="font-bold text-accent-foreground">R$ {valorTotal.toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted text-sm">
                  <CreditCard size={16} className="text-muted-foreground" />
                  <span className="text-muted-foreground">Pagamento via <strong>PIX</strong></span>
                </div>
                {/* Progress */}
                <div className="space-y-1.5">
                  {steps.map(({ n, label }) => (
                    <div key={n} className="flex items-center gap-2 text-xs">
                      {step > n ? (
                        <CheckCircle2 size={14} className="text-green-500" />
                      ) : step === n ? (
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-primary bg-primary/20" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-muted-foreground/30" />
                      )}
                      <span className={step >= n ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
                    </div>
                  ))}
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
