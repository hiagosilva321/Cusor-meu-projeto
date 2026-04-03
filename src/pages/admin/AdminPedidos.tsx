import { useCallback, useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Search,
  Inbox,
  ChevronLeft,
  ChevronRight,
  Eye,
  MessageCircle,
  Loader2,
  RefreshCw,
  Undo2,
  Plus,
  CreditCard,
  Copy,
  CheckCircle,
} from 'lucide-react';
import { getTransaction, refundTransaction } from '@/lib/fastsoft-api';
import { apiPost, type CreatePixChargeRequest, type CreatePixChargeResponse } from '@/lib/api';
import { maskPhone, maskCpfCnpj, maskCep, unmask } from '@/lib/masks';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Order = Tables<'orders'>;

interface StatusOption {
  value: string;
  label: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 15;

const STATUS_OPTIONS: StatusOption[] = [
  { value: '', label: 'Todos' },
  { value: 'paid', label: 'Pago' },
  { value: 'not_paid', label: 'Não pago' },
  { value: 'pending', label: 'Aguardando' },
  { value: 'cancelado', label: 'Cancelado' },
  { value: 'entregue', label: 'Entregue' },
];

const HORARIO_LABELS: Record<string, string> = {
  manha: 'Manhã (7h-12h)',
  tarde: 'Tarde (12h-18h)',
  dia_todo: 'Dia todo (7h-18h)',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function getStatusBadge(order: Order): { label: string; className: string } {
  if (order.status === 'cancelado') {
    return { label: 'Cancelado', className: 'bg-gray-100 text-gray-800 border-gray-200' };
  }
  if (order.status === 'entregue') {
    return { label: 'Entregue', className: 'bg-blue-100 text-blue-800 border-blue-200' };
  }
  if (order.payment_status === 'paid') {
    return { label: 'Pago', className: 'bg-green-100 text-green-800 border-green-200' };
  }
  if (order.payment_status === 'pending') {
    return { label: 'Aguardando', className: 'bg-amber-100 text-amber-800 border-amber-200' };
  }
  if (order.payment_status === 'failed') {
    return { label: 'Não pago', className: 'bg-red-100 text-red-800 border-red-200' };
  }
  return { label: order.payment_status, className: 'bg-gray-100 text-gray-800 border-gray-200' };
}

function matchesStatusFilter(order: Order, filter: string): boolean {
  if (!filter) return true;
  if (filter === 'paid') return order.payment_status === 'paid';
  if (filter === 'not_paid') return order.payment_status === 'failed';
  if (filter === 'pending') return order.payment_status === 'pending';
  if (filter === 'cancelado') return order.status === 'cancelado';
  if (filter === 'entregue') return order.status === 'entregue';
  return true;
}

function cleanWhatsApp(raw: string): string {
  return raw.replace(/\D/g, '');
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminPedidos() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  // -----------------------------------------------------------------------
  // Fetch
  // -----------------------------------------------------------------------
  const fetchOrders = useCallback(async () => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    setOrders(data || []);
    setLoading(false);
  }, []);

  // -----------------------------------------------------------------------
  // Initial fetch + realtime subscription
  // -----------------------------------------------------------------------
  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel('admin-pedidos-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchOrders();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOrders]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  // -----------------------------------------------------------------------
  // Filtering + pagination
  // -----------------------------------------------------------------------
  const filtered = orders.filter((o) => {
    const term = search.toLowerCase();
    const matchSearch =
      !term ||
      o.nome.toLowerCase().includes(term) ||
      o.whatsapp.includes(search) ||
      o.id.slice(0, 8).toLowerCase().includes(term);
    const matchStatus = matchesStatusFilter(o, statusFilter);
    return matchSearch && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // -----------------------------------------------------------------------
  // Loading
  // -----------------------------------------------------------------------
  if (loading) {
    return (
      <AdminLayout title="Pedidos">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-muted-foreground" size={32} />
        </div>
      </AdminLayout>
    );
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <AdminLayout title="Pedidos">
      <Tabs defaultValue="lista" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="lista">Todos os Pedidos</TabsTrigger>
          <TabsTrigger value="novo" className="gap-1.5"><Plus size={14} /> Gerar Pedido PIX</TabsTrigger>
        </TabsList>

        <TabsContent value="lista">
      <div className="space-y-6">
        {/* ------------------------------------------------------------- */}
        {/* Filter Bar                                                     */}
        {/* ------------------------------------------------------------- */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={18}
            />
            <Input
              placeholder="Buscar por nome, telefone ou ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <Badge
            variant="secondary"
            className="h-10 px-4 flex items-center whitespace-nowrap"
          >
            {filtered.length} pedido{filtered.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* Data Table                                                     */}
        {/* ------------------------------------------------------------- */}
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">Data</th>
                <th className="text-left p-3 font-medium">Cliente</th>
                <th className="text-left p-3 font-medium">Caçamba</th>
                <th className="text-left p-3 font-medium">Valor</th>
                <th className="text-left p-3 font-medium hidden lg:table-cell">Entrega</th>
                <th className="text-left p-3 font-medium hidden md:table-cell">Origem</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12">
                    <div className="flex flex-col items-center text-center">
                      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                        <Inbox className="text-muted-foreground" size={28} />
                      </div>
                      <p className="text-muted-foreground font-medium">
                        Nenhum pedido encontrado
                      </p>
                      <p className="text-sm text-muted-foreground/70 mt-1">
                        {search || statusFilter
                          ? 'Tente mudar os filtros de busca.'
                          : 'Os pedidos aparecerão aqui quando chegarem.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((order) => {
                  const badge = getStatusBadge(order);
                  return (
                    <tr
                      key={order.id}
                      className="border-t hover:bg-muted/50 transition-colors"
                    >
                      {/* Data */}
                      <td className="p-3 whitespace-nowrap text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString('pt-BR')}
                      </td>

                      {/* Cliente */}
                      <td className="p-3">
                        <div className="font-medium text-foreground">{order.nome}</div>
                        <div className="text-xs text-muted-foreground">{order.whatsapp}</div>
                      </td>

                      {/* Caçamba */}
                      <td className="p-3 text-muted-foreground">
                        {order.tamanho} x{order.quantidade}
                      </td>

                      {/* Valor */}
                      <td className="p-3 font-medium text-foreground">
                        {formatBRL(Number(order.valor_total))}
                      </td>

                      {/* Entrega (hidden mobile) */}
                      <td className="p-3 text-xs text-muted-foreground hidden lg:table-cell">
                        {order.data_entrega ? (
                          <>
                            {new Date(order.data_entrega + 'T12:00:00').toLocaleDateString('pt-BR')}
                            {' '}
                            {HORARIO_LABELS[order.horario_entrega || ''] || order.horario_entrega || ''}
                          </>
                        ) : (
                          <span className="text-muted-foreground/50">--</span>
                        )}
                      </td>

                      {/* Origem */}
                      <td className="p-3 hidden md:table-cell">
                        {order.referral_source ? (
                          <Badge variant="outline" className="text-xs">{order.referral_source}</Badge>
                        ) : (
                          <span className="text-muted-foreground/50 text-xs">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-3">
                        <Badge className={badge.className}>{badge.label}</Badge>
                      </td>

                      {/* Ações */}
                      <td className="p-3">
                        <div className="flex gap-1">
                          {/* Detail Dialog */}
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" title="Ver detalhes">
                                <Eye size={14} />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-lg">
                              <DialogHeader>
                                <DialogTitle>
                                  Pedido #{order.id.slice(0, 8)}
                                </DialogTitle>
                              </DialogHeader>
                              <OrderDetail order={order} />
                            </DialogContent>
                          </Dialog>

                          {/* WhatsApp */}
                          <a
                            href={`https://wa.me/${cleanWhatsApp(order.whatsapp)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="whatsapp" size="sm" title="Abrir WhatsApp">
                              <MessageCircle size={14} />
                            </Button>
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* --------------------------------------------------------------- */}
          {/* Pagination                                                       */}
          {/* --------------------------------------------------------------- */}
          {filtered.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
              <span className="text-sm text-muted-foreground">
                {(page - 1) * PAGE_SIZE + 1}--{Math.min(page * PAGE_SIZE, filtered.length)} de{' '}
                {filtered.length}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft size={16} />
                </Button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(
                    (p) =>
                      p === 1 || p === totalPages || Math.abs(p - page) <= 1,
                  )
                  .map((p, idx, arr) => (
                    <span key={p} className="flex items-center">
                      {idx > 0 && arr[idx - 1] !== p - 1 && (
                        <span className="px-1 text-muted-foreground">...</span>
                      )}
                      <Button
                        variant={page === p ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setPage(p)}
                        className="min-w-[32px]"
                      >
                        {p}
                      </Button>
                    </span>
                  ))}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
        </TabsContent>

        <TabsContent value="novo">
          <NewOrderForm onCreated={fetchOrders} />
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}

// ---------------------------------------------------------------------------
// New Order Form sub-component
// ---------------------------------------------------------------------------

interface SizeOption { size: string; title: string; price: number; }

function NewOrderForm({ onCreated }: { onCreated: () => void }) {
  const [sizes, setSizes] = useState<SizeOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ orderId: string; token: string; pixCode: string | null; pixQr: string | null; expires: string } | null>(null);
  const [form, setForm] = useState({
    nome: '', whatsapp: '', email: '', cpf_cnpj: '',
    cep: '', endereco: '', numero: '', complemento: '',
    bairro: '', cidade: '', estado: '',
    tamanho: '', quantidade: '1', observacoes: '',
    referral_source: '',
  });

  useEffect(() => {
    supabase.from('dumpster_sizes').select('size, title, price').eq('active', true).order('order_index')
      .then(({ data }) => {
        if (data?.length) {
          setSizes(data);
          setForm(f => ({ ...f, tamanho: data[0].size }));
        }
      });
  }, []);

  const selectedPrice = sizes.find(s => s.size === form.tamanho)?.price || 0;
  const valorTotal = selectedPrice * parseInt(form.quantidade || '1');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let masked = value;
    if (name === 'whatsapp') masked = maskPhone(value);
    else if (name === 'cpf_cnpj') masked = maskCpfCnpj(value);
    else if (name === 'cep') masked = maskCep(value);
    setForm(prev => ({ ...prev, [name]: masked }));

    if (name === 'cep' && unmask(value).length === 8) {
      fetch(`https://viacep.com.br/ws/${unmask(value)}/json/`)
        .then(r => r.json())
        .then(d => { if (!d.erro) setForm(prev => ({ ...prev, endereco: d.logradouro || '', bairro: d.bairro || '', cidade: d.localidade || '', estado: d.uf || '' })); })
        .catch(() => {});
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim() || unmask(form.whatsapp).length < 10) { toast.error('Preencha nome e WhatsApp.'); return; }
    if (!form.tamanho) { toast.error('Selecione o tamanho.'); return; }

    setLoading(true);
    setResult(null);
    try {
      const body: CreatePixChargeRequest = {
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
        data_entrega: null,
        horario_entrega: null,
        referral_source: form.referral_source.trim() || null,
      };

      const data = await apiPost<CreatePixChargeResponse, CreatePixChargeRequest>('create-pix-charge', body);

      setResult({
        orderId: data.order_id,
        token: data.order_token,
        pixCode: data.pix_copy_paste,
        pixQr: data.pix_qr_code,
        expires: data.expires_at,
      });

      // Fire-and-forget lead
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

      toast.success('Pedido PIX gerado!');
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao gerar PIX.');
    } finally {
      setLoading(false);
    }
  };

  const paymentLink = result ? `${window.location.origin}/pagamento/${result.orderId}?token=${result.token}` : '';

  const copyLink = () => {
    navigator.clipboard.writeText(paymentLink);
    toast.success('Link copiado!');
  };

  const copyPix = () => {
    if (result?.pixCode) {
      navigator.clipboard.writeText(result.pixCode);
      toast.success('Código PIX copiado!');
    }
  };

  const selectClasses = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  if (result) {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <Card>
          <CardContent className="p-6 space-y-5">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="text-green-600" size={32} />
              </div>
              <h3 className="font-display text-xl font-bold text-foreground">Pedido PIX Gerado</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {form.nome} — {form.tamanho} x{form.quantidade} — {formatBRL(valorTotal)}
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Link de pagamento</Label>
                <div className="flex gap-2">
                  <Input readOnly value={paymentLink} className="bg-muted text-xs font-mono" />
                  <Button variant="outline" size="sm" onClick={copyLink} className="shrink-0">
                    <Copy size={14} className="mr-1.5" /> Copiar
                  </Button>
                </div>
              </div>

              {result.pixCode && (
                <div className="space-y-1.5">
                  <Label>PIX Copia e Cola</Label>
                  <div className="flex gap-2">
                    <Input readOnly value={result.pixCode} className="bg-muted text-xs font-mono" />
                    <Button variant="outline" size="sm" onClick={copyPix} className="shrink-0">
                      <Copy size={14} className="mr-1.5" /> Copiar
                    </Button>
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Expira em: {new Date(result.expires).toLocaleString('pt-BR')}
              </p>
            </div>

            <Button variant="outline" className="w-full" onClick={() => { setResult(null); setForm(f => ({ ...f, nome: '', whatsapp: '', email: '', cpf_cnpj: '', cep: '', endereco: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '', observacoes: '', referral_source: '' })); }}>
              Gerar novo pedido
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h3 className="font-display text-base font-bold text-foreground mb-3">Dados do Cliente</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Nome *</Label>
                  <Input name="nome" placeholder="Nome completo" value={form.nome} onChange={handleChange} required />
                </div>
                <div className="space-y-1.5">
                  <Label>WhatsApp *</Label>
                  <Input name="whatsapp" placeholder="(11) 99999-9999" value={form.whatsapp} onChange={handleChange} maxLength={15} required />
                </div>
                <div className="space-y-1.5">
                  <Label>E-mail</Label>
                  <Input name="email" placeholder="email@exemplo.com" type="email" value={form.email} onChange={handleChange} />
                </div>
                <div className="space-y-1.5">
                  <Label>CPF/CNPJ</Label>
                  <Input name="cpf_cnpj" placeholder="000.000.000-00" value={form.cpf_cnpj} onChange={handleChange} maxLength={18} />
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-display text-base font-bold text-foreground mb-3">Endereço</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>CEP</Label>
                  <Input name="cep" placeholder="00000-000" value={form.cep} onChange={handleChange} maxLength={9} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Endereço</Label>
                  <Input name="endereco" placeholder="Rua, Avenida..." value={form.endereco} onChange={handleChange} />
                </div>
                <div className="space-y-1.5">
                  <Label>Número</Label>
                  <Input name="numero" placeholder="Nº" value={form.numero} onChange={handleChange} />
                </div>
                <div className="space-y-1.5">
                  <Label>Bairro</Label>
                  <Input name="bairro" placeholder="Bairro" value={form.bairro} onChange={handleChange} />
                </div>
                <div className="space-y-1.5">
                  <Label>Cidade</Label>
                  <Input name="cidade" placeholder="Cidade" value={form.cidade} onChange={handleChange} />
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-display text-base font-bold text-foreground mb-3">Pedido</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Tamanho *</Label>
                  <select name="tamanho" value={form.tamanho} onChange={handleChange} className={selectClasses}>
                    {sizes.map(s => <option key={s.size} value={s.size}>{s.size} — {s.title} (R$ {s.price.toFixed(2)})</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Quantidade</Label>
                  <select name="quantidade" value={form.quantidade} onChange={handleChange} className={selectClasses}>
                    {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Origem (ref)</Label>
                  <Input name="referral_source" placeholder="joao, maria..." value={form.referral_source} onChange={handleChange} />
                </div>
              </div>
              <Textarea name="observacoes" placeholder="Observações (opcional)" value={form.observacoes} onChange={handleChange} rows={2} className="mt-4" />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-muted">
              <span className="text-sm text-muted-foreground">Total:</span>
              <span className="text-2xl font-bold text-foreground">{formatBRL(valorTotal)}</span>
            </div>

            <Button type="submit" size="lg" className="w-full gap-2" disabled={loading}>
              {loading ? <><Loader2 size={18} className="animate-spin" /> Gerando PIX...</> : <><CreditCard size={18} /> Gerar Pedido PIX</>}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Order Detail sub-component (rendered inside Dialog)
// ---------------------------------------------------------------------------

function OrderDetail({ order }: { order: Order }) {
  const badge = getStatusBadge(order);
  const [gwStatus, setGwStatus] = useState<string | null>(null);
  const [gwFee, setGwFee] = useState<number | null>(null);
  const [gwLoading, setGwLoading] = useState(false);
  const [refunding, setRefunding] = useState(false);

  const fullAddress = [
    order.endereco, order.numero, order.complemento,
    order.bairro, order.cidade, order.estado, order.cep,
  ].filter(Boolean).join(', ');

  const handleCheckGateway = async () => {
    if (!order.fastsoft_transaction_id) { toast.error('Pedido sem ID de transação no gateway'); return; }
    setGwLoading(true);
    const tx = await getTransaction(order.fastsoft_transaction_id);
    if (tx) {
      setGwStatus(tx.status);
      setGwFee(tx.amountBaseFee ?? null);
      toast.success(`Gateway: ${tx.status}`);
    } else {
      toast.error('Não foi possível consultar o gateway');
    }
    setGwLoading(false);
  };

  const handleRefund = async () => {
    if (!order.fastsoft_transaction_id) return;
    if (!confirm('Tem certeza que deseja estornar este pagamento?')) return;
    setRefunding(true);
    const result = await refundTransaction(order.fastsoft_transaction_id);
    if (result.success) {
      toast.success('Estorno realizado com sucesso');
      setGwStatus('REFUNDED');
    } else {
      toast.error(result.error || 'Erro ao estornar');
    }
    setRefunding(false);
  };

  return (
    <div className="space-y-4 text-sm">
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        <div className="text-muted-foreground">Nome</div>
        <div className="font-medium">{order.nome}</div>
        <div className="text-muted-foreground">WhatsApp</div>
        <div>{order.whatsapp}</div>
        {order.email && <><div className="text-muted-foreground">Email</div><div>{order.email}</div></>}
        {order.cpf_cnpj && <><div className="text-muted-foreground">CPF/CNPJ</div><div>{order.cpf_cnpj}</div></>}
      </div>

      <hr />
      <div><span className="font-semibold">Endereço:</span> {fullAddress || '--'}</div>
      <hr />

      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        <div className="text-muted-foreground">Caçamba</div>
        <div className="font-medium">{order.tamanho} x{order.quantidade}</div>
        <div className="text-muted-foreground">Valor unitário</div>
        <div>{formatBRL(Number(order.valor_unitario))}</div>
        <div className="text-muted-foreground">Valor total</div>
        <div className="font-medium">{formatBRL(Number(order.valor_total))}</div>
        <div className="text-muted-foreground">Forma de pagamento</div>
        <div>{order.forma_pagamento}</div>
        <div className="text-muted-foreground">Status</div>
        <div><Badge className={badge.className}>{badge.label}</Badge></div>
        {order.referral_source && (
          <><div className="text-muted-foreground">Origem</div><div><Badge variant="outline">{order.referral_source}</Badge></div></>
        )}
      </div>

      {order.paid_at && (
        <div><span className="text-muted-foreground">Pago em:</span> {new Date(order.paid_at).toLocaleString('pt-BR')}</div>
      )}
      {order.data_entrega && (
        <div>
          <span className="text-muted-foreground">Entrega:</span>{' '}
          {new Date(order.data_entrega + 'T12:00:00').toLocaleDateString('pt-BR')}
          {' -- '}
          {HORARIO_LABELS[order.horario_entrega || ''] || order.horario_entrega || ''}
        </div>
      )}
      {order.observacoes && (
        <div><span className="text-muted-foreground">Observações:</span> {order.observacoes}</div>
      )}

      <div className="text-xs text-muted-foreground pt-2">
        Criado em: {new Date(order.created_at).toLocaleString('pt-BR')}
      </div>

      {/* Gateway */}
      {order.fastsoft_transaction_id && (
        <>
          <hr />
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gateway</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleCheckGateway} disabled={gwLoading}>
                {gwLoading ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <RefreshCw size={14} className="mr-1.5" />}
                Verificar no Gateway
              </Button>
              {order.payment_status === 'paid' && (
                <Button variant="outline" size="sm" onClick={handleRefund} disabled={refunding} className="text-destructive border-destructive/30 hover:bg-destructive/10">
                  {refunding ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Undo2 size={14} className="mr-1.5" />}
                  Estornar
                </Button>
              )}
            </div>
            {gwStatus && (
              <div className="flex items-center gap-3 p-2 rounded-lg bg-muted text-xs">
                <span className="text-muted-foreground">Status gateway:</span>
                <Badge variant="outline">{gwStatus}</Badge>
                {gwFee != null && (
                  <><span className="text-muted-foreground">Taxa:</span> <span>{formatBRL(gwFee / 100)}</span></>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
