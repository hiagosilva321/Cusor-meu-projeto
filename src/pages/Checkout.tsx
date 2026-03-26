import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { apiPost, getCacambaClientApiKey } from '@/lib/api';
import { SiteHeader } from '@/components/landing/SiteHeader';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { WhatsAppFloatingButton } from '@/components/landing/WhatsAppFloatingButton';
import { ShoppingCart, MapPin, User, CreditCard, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface DumpsterSize {
  size: string;
  title: string;
  price: number;
}

const Checkout = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [sizeOptions, setSizeOptions] = useState<DumpsterSize[]>([]);
  const [selectedPrice, setSelectedPrice] = useState(0);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    nome: '', whatsapp: '', email: '', cpf_cnpj: '',
    cep: '', endereco: '', numero: '', complemento: '',
    bairro: '', cidade: '', estado: '',
    tamanho: '', quantidade: '1', observacoes: '',
  });

  useEffect(() => {
    async function fetchSizes() {
      const { data } = await supabase
        .from('dumpster_sizes')
        .select('size, title, price')
        .eq('active', true)
        .order('order_index');
      if (data && data.length > 0) {
        setSizeOptions(data);
        setForm(f => ({ ...f, tamanho: data[0].size }));
        setSelectedPrice(data[0].price);
      }
    }
    fetchSizes();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));

    if (name === 'tamanho') {
      const found = sizeOptions.find(s => s.size === value);
      if (found) setSelectedPrice(found.price);
    }

    if (name === 'cep') {
      const cleanCep = value.replace(/\D/g, '');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim() || !form.whatsapp.trim()) {
      toast.error('Preencha nome e WhatsApp.');
      return;
    }

    setLoading(true);
    try {
      const pixHeaders = (() => {
        const k = getCacambaClientApiKey();
        return k ? { 'X-Cacamba-Client-Key': k } : undefined;
      })();
      const data = await apiPost(
        'create-pix-charge',
        {
          nome: form.nome.trim(),
          whatsapp: form.whatsapp.trim(),
          email: form.email.trim() || null,
          cpf_cnpj: form.cpf_cnpj.trim() || null,
          cep: form.cep.trim() || null,
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
        },
        pixHeaders,
      );

      navigate(`/pagamento/${data.order_id}`);
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao gerar pagamento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const selectClasses = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

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
            {[
              { n: 1, icon: ShoppingCart, label: 'Pedido' },
              { n: 2, icon: User, label: 'Dados' },
              { n: 3, icon: MapPin, label: 'Endereço' },
            ].map(({ n, icon: Icon, label }) => (
              <div key={n} className="flex items-center gap-2">
                <button
                  onClick={() => n < step && setStep(n)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    step >= n
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <Icon size={14} />
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sm:hidden">{n}</span>
                </button>
                {n < 3 && <div className={`w-8 h-0.5 ${step > n ? 'bg-primary' : 'bg-muted'}`} />}
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
                      <select name="tamanho" value={form.tamanho} onChange={handleChange} className={selectClasses}>
                        {sizeOptions.map(s => (
                          <option key={s.size} value={s.size}>{s.size} - {s.title} (R$ {s.price.toFixed(2)})</option>
                        ))}
                      </select>
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
                  <Textarea name="observacoes" placeholder="Observações (opcional)" value={form.observacoes} onChange={handleChange} rows={3} maxLength={1000} />
                  <Button type="button" onClick={() => setStep(2)} className="w-full" size="lg">
                    Continuar
                  </Button>
                </div>
              )}

              {step === 2 && (
                <div className="p-6 rounded-xl bg-card border shadow-sm space-y-4">
                  <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                    <User size={18} /> Seus Dados
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input name="nome" placeholder="Nome completo *" value={form.nome} onChange={handleChange} required maxLength={100} />
                    <Input name="whatsapp" placeholder="WhatsApp *" value={form.whatsapp} onChange={handleChange} required maxLength={20} />
                    <Input name="email" placeholder="E-mail" type="email" value={form.email} onChange={handleChange} maxLength={255} />
                    <Input name="cpf_cnpj" placeholder="CPF ou CNPJ" value={form.cpf_cnpj} onChange={handleChange} maxLength={18} />
                  </div>
                  <div className="flex gap-3">
                    <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">Voltar</Button>
                    <Button type="button" onClick={() => {
                      if (!form.nome.trim() || !form.whatsapp.trim()) {
                        toast.error('Preencha nome e WhatsApp.');
                        return;
                      }
                      setStep(3);
                    }} className="flex-1">Continuar</Button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="p-6 rounded-xl bg-card border shadow-sm space-y-4">
                  <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                    <MapPin size={18} /> Endereço de Entrega
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Input name="cep" placeholder="CEP" value={form.cep} onChange={handleChange} maxLength={9} />
                    <Input name="endereco" placeholder="Endereço" className="sm:col-span-2" value={form.endereco} onChange={handleChange} maxLength={200} />
                    <Input name="numero" placeholder="Número" value={form.numero} onChange={handleChange} maxLength={10} />
                    <Input name="complemento" placeholder="Complemento" value={form.complemento} onChange={handleChange} maxLength={100} />
                    <Input name="bairro" placeholder="Bairro" value={form.bairro} onChange={handleChange} maxLength={100} />
                    <Input name="cidade" placeholder="Cidade" value={form.cidade} onChange={handleChange} maxLength={100} />
                    <Input name="estado" placeholder="UF" value={form.estado} onChange={handleChange} maxLength={2} />
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
              </div>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
      <WhatsAppFloatingButton />
    </div>
  );
};

export default Checkout;
