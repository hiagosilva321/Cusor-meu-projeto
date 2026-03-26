import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useWhatsApp } from '@/contexts/WhatsAppContext';
import { supabase } from '@/integrations/supabase/client';
import { apiPost, getCacambaClientApiKey } from '@/lib/api';
import { MessageCircle, Send, Loader2, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { AnimateOnScroll } from '@/components/ui/animate-on-scroll';

interface DumpsterOption {
  size: string;
  title: string;
  price: number;
}

export function ContactFormSection() {
  const navigate = useNavigate();
  const { getWhatsAppUrl, trackClick, available } = useWhatsApp();
  const [loading, setLoading] = useState(false);
  const [sizeOptions, setSizeOptions] = useState<DumpsterOption[]>([]);
  const [selectedPrice, setSelectedPrice] = useState(0);
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
    setForm((prev) => ({ ...prev, [name]: value }));

    if (name === 'tamanho') {
      const found = sizeOptions.find(s => s.size === value);
      if (found) setSelectedPrice(found.price);
    }

    if (name === 'cep') {
      const cleanCep = value.replace(/\D/g, '');
      if (cleanCep.length === 8) {
        fetchAddressByCep(cleanCep);
      }
    }
  };

  const fetchAddressByCep = async (cep: string) => {
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setForm((prev) => ({
          ...prev,
          endereco: data.logradouro || prev.endereco,
          bairro: data.bairro || prev.bairro,
          cidade: data.localidade || prev.cidade,
          estado: data.uf || prev.estado,
          complemento: data.complemento || prev.complemento,
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
    <section id="contato" className="py-20 md:py-28">
      <div className="container">
        <div className="max-w-4xl mx-auto">
          <AnimateOnScroll className="text-center mb-12">
            <span className="text-sm font-semibold text-accent uppercase tracking-wider">Solicite agora</span>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mt-3 mb-4">Faça seu pedido</h2>
            <p className="text-muted-foreground text-lg">Preencha o formulário e pague com PIX.</p>
          </AnimateOnScroll>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <AnimateOnScroll direction="left" className="lg:col-span-3">
              <form onSubmit={handleSubmit} className="space-y-4 p-6 rounded-xl bg-card border shadow-sm">
                <h3 className="font-display text-lg font-bold text-foreground mb-2">Dados Pessoais</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input name="nome" placeholder="Nome completo *" value={form.nome} onChange={handleChange} required maxLength={100} />
                  <Input name="whatsapp" placeholder="WhatsApp *" value={form.whatsapp} onChange={handleChange} required maxLength={20} />
                  <Input name="email" placeholder="E-mail" type="email" value={form.email} onChange={handleChange} maxLength={255} />
                  <Input name="cpf_cnpj" placeholder="CPF ou CNPJ" value={form.cpf_cnpj} onChange={handleChange} maxLength={18} />
                </div>

                <h3 className="font-display text-lg font-bold text-foreground mb-2 pt-4">Endereço de Entrega</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input name="cep" placeholder="CEP" value={form.cep} onChange={handleChange} maxLength={9} />
                  <Input name="endereco" placeholder="Endereço" className="sm:col-span-2" value={form.endereco} onChange={handleChange} maxLength={200} />
                  <Input name="numero" placeholder="Número" value={form.numero} onChange={handleChange} maxLength={10} />
                  <Input name="complemento" placeholder="Complemento" value={form.complemento} onChange={handleChange} maxLength={100} />
                  <Input name="bairro" placeholder="Bairro" value={form.bairro} onChange={handleChange} maxLength={100} />
                  <Input name="cidade" placeholder="Cidade" value={form.cidade} onChange={handleChange} maxLength={100} />
                  <Input name="estado" placeholder="UF" value={form.estado} onChange={handleChange} maxLength={2} />
                </div>

                <h3 className="font-display text-lg font-bold text-foreground mb-2 pt-4">Caçamba</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <select name="tamanho" value={form.tamanho} onChange={handleChange} className={selectClasses}>
                    {sizeOptions.map((s) => (
                      <option key={s.size} value={s.size}>{s.size} - {s.title} (R$ {s.price.toFixed(2)})</option>
                    ))}
                  </select>
                  <select name="quantidade" value={form.quantidade} onChange={handleChange} className={selectClasses}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>{n} caçamba{n > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>

                {valorTotal > 0 && (
                  <div className="p-3 rounded-lg bg-muted text-sm flex justify-between items-center">
                    <span className="text-muted-foreground">Total:</span>
                    <span className="font-bold text-foreground text-base">R$ {valorTotal.toFixed(2)}</span>
                  </div>
                )}

                <Textarea name="observacoes" placeholder="Observações" value={form.observacoes} onChange={handleChange} rows={3} maxLength={1000} />

                <Button type="submit" variant="whatsapp" size="lg" className="w-full" disabled={loading}>
                  {loading ? (
                    <><Loader2 className="mr-2 animate-spin" size={18} /> Gerando PIX...</>
                  ) : (
                    <><CreditCard className="mr-2" size={18} /> Pagar com PIX</>
                  )}
                </Button>
              </form>
            </AnimateOnScroll>

            <AnimateOnScroll direction="right" className="lg:col-span-2 flex flex-col gap-6">
              {available && (
                <div className="p-6 rounded-xl bg-primary text-primary-foreground flex-1">
                  <h3 className="font-display text-xl font-bold mb-4">Dúvidas? Fale pelo WhatsApp</h3>
                  <p className="text-primary-foreground/80 mb-6">
                    Atendimento imediato para tirar suas dúvidas antes de fazer o pedido.
                  </p>
                  <a href={getWhatsAppUrl()} target="_blank" rel="noopener noreferrer" onClick={trackClick}>
                    <Button variant="whatsapp" size="lg" className="w-full">
                      <MessageCircle className="mr-2" /> Abrir WhatsApp
                    </Button>
                  </a>
                </div>
              )}
              <div className="p-6 rounded-xl bg-surface border">
                <h4 className="font-display font-bold text-foreground mb-3">Horário de Atendimento</h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>📅 Segunda a Sexta: 7h às 20h</p>
                  <p>📅 Sábado: 7h às 20h</p>
                  <p>🚨 Emergência: 24 horas</p>
                </div>
              </div>
            </AnimateOnScroll>
          </div>
        </div>
      </div>
    </section>
  );
}
