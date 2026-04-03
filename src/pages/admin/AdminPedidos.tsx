import { useCallback, useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
} from 'lucide-react';

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
    </AdminLayout>
  );
}

// ---------------------------------------------------------------------------
// Order Detail sub-component (rendered inside Dialog)
// ---------------------------------------------------------------------------

function OrderDetail({ order }: { order: Order }) {
  const badge = getStatusBadge(order);
  const fullAddress = [
    order.endereco,
    order.numero,
    order.complemento,
    order.bairro,
    order.cidade,
    order.estado,
    order.cep,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="space-y-4 text-sm">
      {/* Client info */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        <div className="text-muted-foreground">Nome</div>
        <div className="font-medium">{order.nome}</div>

        <div className="text-muted-foreground">WhatsApp</div>
        <div>{order.whatsapp}</div>

        {order.email && (
          <>
            <div className="text-muted-foreground">Email</div>
            <div>{order.email}</div>
          </>
        )}

        {order.cpf_cnpj && (
          <>
            <div className="text-muted-foreground">CPF/CNPJ</div>
            <div>{order.cpf_cnpj}</div>
          </>
        )}
      </div>

      <hr />

      {/* Address */}
      <div>
        <span className="font-semibold">Endereço:</span>{' '}
        {fullAddress || '--'}
      </div>

      <hr />

      {/* Order details */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        <div className="text-muted-foreground">Caçamba</div>
        <div className="font-medium">
          {order.tamanho} x{order.quantidade}
        </div>

        <div className="text-muted-foreground">Valor unitário</div>
        <div>{formatBRL(Number(order.valor_unitario))}</div>

        <div className="text-muted-foreground">Valor total</div>
        <div className="font-medium">{formatBRL(Number(order.valor_total))}</div>

        <div className="text-muted-foreground">Forma de pagamento</div>
        <div>{order.forma_pagamento}</div>

        <div className="text-muted-foreground">Status</div>
        <div>
          <Badge className={badge.className}>{badge.label}</Badge>
        </div>
      </div>

      {order.paid_at && (
        <div>
          <span className="text-muted-foreground">Pago em:</span>{' '}
          {new Date(order.paid_at).toLocaleString('pt-BR')}
        </div>
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
        <div>
          <span className="text-muted-foreground">Observações:</span>{' '}
          {order.observacoes}
        </div>
      )}

      <div className="text-xs text-muted-foreground pt-2">
        Criado em: {new Date(order.created_at).toLocaleString('pt-BR')}
      </div>
    </div>
  );
}
